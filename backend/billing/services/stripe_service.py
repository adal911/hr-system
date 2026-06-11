"""
Stripe SDK wrapper. Keeps Stripe-specific bits out of views/license_service.

The webhook handler in views.py imports `_set_license_from_subscription` to
translate Stripe subscription state into our License documents.
"""
from datetime import datetime, timezone
import stripe
from django.conf import settings
from bson import ObjectId

from core.db import get_db
from billing.plans import get_plan, PLANS


def _client():
    """Initialize Stripe with the current secret key (re-read each call so env
    var changes during dev take effect on next request)."""
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def ensure_stripe_customer(company: dict, license_doc: dict | None) -> str:
    """
    Return a Stripe customer ID for this company. Creates one on first checkout.
    Updates the license doc with the new customer ID.
    """
    if license_doc and license_doc.get("stripe_customer_id"):
        return license_doc["stripe_customer_id"]

    s = _client()
    customer = s.Customer.create(
        name=company.get("name"),
        metadata={
            "company_id": str(company["_id"]),
            "company_slug": company.get("slug", ""),
        },
    )

    db = get_db()
    db.licenses.update_one(
        {"company_id": company["_id"]},
        {
            "$set": {
                "stripe_customer_id": customer.id,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return customer.id


def create_checkout_session(
    *,
    company: dict,
    license_doc: dict | None,
    plan_id: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """Create a Stripe Checkout session for `plan_id` and return its URL."""
    plan = get_plan(plan_id)
    if not plan:
        raise ValueError(f"Unknown plan: {plan_id}")
    price_id = plan.get("stripe_price_id")
    if not price_id:
        raise ValueError(
            f"Plan '{plan_id}' has no STRIPE_PRICE_{plan_id.upper()} env var configured"
        )

    customer_id = ensure_stripe_customer(company, license_doc)

    s = _client()
    session = s.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        allow_promotion_codes=True,
        client_reference_id=str(company["_id"]),
        metadata={
            "company_id": str(company["_id"]),
            "plan_id": plan_id,
        },
        subscription_data={
            "metadata": {
                "company_id": str(company["_id"]),
                "plan_id": plan_id,
            },
        },
    )
    return session.url


def create_portal_session(*, customer_id: str, return_url: str) -> str:
    """Customer Portal lets users update payment, change plan, or cancel."""
    s = _client()
    session = s.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url


# ─── Subscription → License sync ─────────────────────────────────────────────


def _plan_id_from_price(price_id: str) -> str | None:
    for plan in PLANS.values():
        if plan.get("stripe_price_id") == price_id:
            return plan["id"]
    return None


def set_license_from_subscription(subscription: dict) -> None:
    """
    Translate a Stripe Subscription object into our License document.
    Called from the webhook handler.
    """
    company_id_str = (subscription.get("metadata") or {}).get("company_id")
    if not company_id_str:
        # Fall back to customer.metadata.company_id via a lookup
        customer_id = subscription.get("customer")
        if customer_id:
            s = _client()
            customer = s.Customer.retrieve(customer_id)
            company_id_str = (customer.get("metadata") or {}).get("company_id")

    if not company_id_str:
        return  # Webhook for something we didn't create — ignore.

    try:
        company_oid = ObjectId(company_id_str)
    except Exception:
        return

    items = (subscription.get("items") or {}).get("data") or []
    price_id = items[0].get("price", {}).get("id") if items else None
    plan_id = _plan_id_from_price(price_id) if price_id else None

    status = subscription.get("status")
    period_end_ts = subscription.get("current_period_end")
    period_end = (
        datetime.fromtimestamp(period_end_ts, tz=timezone.utc)
        if period_end_ts
        else None
    )

    # Map Stripe statuses to ours
    status_map = {
        "trialing": "trialing",
        "active": "active",
        "past_due": "past_due",
        "unpaid": "past_due",
        "canceled": "cancelled",
        "incomplete": "incomplete",
        "incomplete_expired": "expired",
    }
    our_status = status_map.get(status, status or "incomplete")

    update = {
        "status": our_status,
        "stripe_subscription_id": subscription.get("id"),
        "stripe_customer_id": subscription.get("customer"),
        "current_period_end": period_end,
        "updated_at": datetime.now(timezone.utc),
    }
    if plan_id:
        update["plan"] = plan_id

    db = get_db()
    db.licenses.update_one(
        {"company_id": company_oid},
        {"$set": update},
    )
