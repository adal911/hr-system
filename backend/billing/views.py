import logging

import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from bson import ObjectId

from core.db import get_db
from billing.plans import public_catalog, get_plan
from billing.services.license_service import (
    get_company_license,
    license_state,
)
from billing.services.stripe_service import (
    create_checkout_session,
    create_portal_session,
    set_license_from_subscription,
)


logger = logging.getLogger(__name__)


# ─── Public catalog ──────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([AllowAny])
def plans(request):
    """Public endpoint: the plan catalog shown on the pricing page."""
    return Response({"plans": public_catalog()})


# ─── License (authed) ────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_license(request):
    """The signed-in user's company license + computed state."""
    company_id = getattr(request.user, "company_id", None)
    if not company_id:
        return Response(
            {"error": "User has no company"},
            status=status.HTTP_404_NOT_FOUND,
        )

    db = get_db()
    company = db.companies.find_one({"_id": ObjectId(company_id)})
    license_doc = get_company_license(ObjectId(company_id))
    state = license_state(license_doc)

    return Response({
        "company": {
            "id": str(company["_id"]) if company else None,
            "name": company.get("name") if company else None,
            "slug": company.get("slug") if company else None,
        },
        "license": state,
    })


# ─── Checkout (authed) ───────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout(request):
    """
    Body: { plan_id: "starter" | "pro" | "enterprise" }
    Returns: { url: "https://checkout.stripe.com/..." }

    Frontend redirects to `url` and the user pays. On completion, our webhook
    flips the license to `active`.
    """
    if not settings.STRIPE_SECRET_KEY:
        return Response(
            {"error": "Stripe is not configured on this server"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    plan_id = (request.data.get("plan_id") or "").strip()
    if not get_plan(plan_id):
        return Response(
            {"error": "Invalid plan_id"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Only the company admin can initiate a paid checkout
    if request.user.role != "admin":
        return Response(
            {"error": "Only company admins can manage billing"},
            status=status.HTTP_403_FORBIDDEN,
        )

    company_id = getattr(request.user, "company_id", None)
    if not company_id:
        return Response(
            {"error": "User has no company"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    db = get_db()
    company = db.companies.find_one({"_id": ObjectId(company_id)})
    if not company:
        return Response(
            {"error": "Company not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    license_doc = get_company_license(ObjectId(company_id))
    frontend = settings.FRONTEND_URL
    success_url = f"{frontend}/dashboard?upgrade=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{frontend}/pricing?upgrade=cancelled"

    try:
        url = create_checkout_session(
            company=company,
            license_doc=license_doc,
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except Exception as exc:
        logger.exception("Stripe checkout creation failed")
        return Response(
            {"error": f"Could not start checkout: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"url": url})


# ─── Customer Portal (authed) ────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_portal(request):
    """
    Returns: { url: "https://billing.stripe.com/..." }

    Hosted page where the customer can update payment, change plan, or cancel.
    """
    if not settings.STRIPE_SECRET_KEY:
        return Response(
            {"error": "Stripe is not configured on this server"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if request.user.role != "admin":
        return Response(
            {"error": "Only company admins can manage billing"},
            status=status.HTTP_403_FORBIDDEN,
        )

    company_id = getattr(request.user, "company_id", None)
    if not company_id:
        return Response(
            {"error": "User has no company"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    license_doc = get_company_license(ObjectId(company_id))
    customer_id = (license_doc or {}).get("stripe_customer_id")
    if not customer_id:
        return Response(
            {"error": "No Stripe customer yet. Upgrade once before opening the portal."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        url = create_portal_session(
            customer_id=customer_id,
            return_url=f"{settings.FRONTEND_URL}/settings/billing",
        )
    except Exception as exc:
        logger.exception("Stripe portal creation failed")
        return Response(
            {"error": f"Could not open billing portal: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"url": url})


# ─── Webhook ─────────────────────────────────────────────────────────────────


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def webhook(request):
    """
    Stripe → us. Stripe signs every request with the webhook secret; we verify
    that signature before trusting any payload.

    Events we care about:
      • checkout.session.completed    — user just paid → activate license
      • customer.subscription.updated — plan change, renewal, past_due, etc.
      • customer.subscription.deleted — cancellation took effect → expire
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        return Response(
            {"error": "Webhook secret not configured"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return Response({"error": "Invalid payload"}, status=400)
    except stripe.error.SignatureVerificationError:
        return Response({"error": "Invalid signature"}, status=400)

    event_type = event["type"]
    obj = event["data"]["object"]

    try:
        if event_type == "checkout.session.completed":
            # Pull the subscription from Stripe to get authoritative state
            subscription_id = obj.get("subscription")
            if subscription_id:
                sub = stripe.Subscription.retrieve(subscription_id)
                set_license_from_subscription(sub)

        elif event_type in (
            "customer.subscription.created",
            "customer.subscription.updated",
        ):
            set_license_from_subscription(obj)

        elif event_type == "customer.subscription.deleted":
            # Cancellation took effect — mark expired
            from datetime import datetime, timezone
            from billing.services.stripe_service import _client  # noqa: F401

            company_id_str = (obj.get("metadata") or {}).get("company_id")
            if not company_id_str:
                customer_id = obj.get("customer")
                if customer_id:
                    customer = stripe.Customer.retrieve(customer_id)
                    company_id_str = (customer.get("metadata") or {}).get("company_id")

            if company_id_str:
                try:
                    company_oid = ObjectId(company_id_str)
                except Exception:
                    company_oid = None
                if company_oid:
                    db = get_db()
                    db.licenses.update_one(
                        {"company_id": company_oid},
                        {
                            "$set": {
                                "status": "expired",
                                "updated_at": datetime.now(timezone.utc),
                            }
                        },
                    )

        # Other events get a 200 with no-op (Stripe needs a 200 or it retries)
    except Exception:
        logger.exception("Webhook handler failed for event %s", event_type)
        # 200 anyway: don't make Stripe retry forever on our bugs
        return Response({"received": True, "handler_error": True})

    return Response({"received": True})
