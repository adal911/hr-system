"""
License lifecycle — create tenants, manage trials, evaluate license state.

Phase 1: trials work end-to-end without Stripe.
Phase 2 will extend this with Stripe-driven status transitions (webhook handler).
"""
import re
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from core.db import get_db
from billing.plans import TRIAL_DAYS, TRIAL_PLAN, get_plan_or_default


# ─── Status semantics ────────────────────────────────────────────────────────
# trialing   → user is inside the 14-day window
# active     → paid subscription, valid
# past_due   → payment failed, grace period
# cancelled  → user cancelled, runs until period_end then locks
# incomplete → checkout abandoned mid-flow
# expired    → trial ended without payment (derived, not stored)

ACTIVE_STATES = {"trialing", "active"}


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:60] or "company"


def _unique_slug(db, base: str) -> str:
    slug = base
    suffix = 1
    while db.companies.find_one({"slug": slug}):
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


def create_company(name: str, owner_user_id: ObjectId | None = None) -> dict:
    """Create a new tenant. owner_user_id is set after the admin user is created."""
    db = get_db()
    now = datetime.now(timezone.utc)
    slug = _unique_slug(db, slugify(name))

    doc = {
        "name": name.strip(),
        "slug": slug,
        "owner_user_id": owner_user_id,
        "created_at": now,
        "updated_at": now,
    }
    result = db.companies.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def create_trial_license(company_id: ObjectId) -> dict:
    """Start a 14-day Pro trial for a freshly created company."""
    db = get_db()
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=TRIAL_DAYS)

    license_doc = {
        "company_id": company_id,
        "plan": TRIAL_PLAN,
        "status": "trialing",
        "trial_ends_at": trial_end,
        "current_period_end": trial_end,
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "created_at": now,
        "updated_at": now,
    }
    result = db.licenses.insert_one(license_doc)
    license_doc["_id"] = result.inserted_id
    return license_doc


def get_company_license(company_id: ObjectId) -> dict | None:
    """Most recent license for a company (we keep history; latest wins)."""
    if not company_id:
        return None
    db = get_db()
    return db.licenses.find_one(
        {"company_id": company_id},
        sort=[("created_at", -1)],
    )


def license_state(license_doc: dict | None) -> dict:
    """
    Pure function: evaluate a license document into runtime state.

    Returns a dict with:
      status         — the stored status, OR "expired" if trial ran out
      is_active      — bool, may the user perform paid actions?
      is_trial       — bool, are we in trial?
      days_remaining — int, days until trial_ends_at / current_period_end (0 if past)
      plan           — plan id (str)
      plan_meta      — full plan dict (see plans.py)
    """
    if not license_doc:
        return {
            "status": "missing",
            "is_active": False,
            "is_trial": False,
            "days_remaining": 0,
            "plan": None,
            "plan_meta": None,
        }

    now = datetime.now(timezone.utc)
    status = license_doc.get("status", "missing")
    plan_id = license_doc.get("plan")

    trial_end = license_doc.get("trial_ends_at")
    period_end = license_doc.get("current_period_end")
    end_at = period_end or trial_end

    # Trial that ran out without payment → expired
    if status == "trialing" and trial_end and trial_end < now:
        status = "expired"

    # Paid sub that wasn't renewed → expired
    if status in {"active", "cancelled"} and period_end and period_end < now:
        status = "expired"

    days_remaining = 0
    if end_at:
        # Mongo may return naive datetimes; coerce to UTC for safe comparison.
        if end_at.tzinfo is None:
            end_at = end_at.replace(tzinfo=timezone.utc)
        delta = end_at - now
        days_remaining = max(0, delta.days + (1 if delta.seconds > 0 else 0))

    is_active = status in ACTIVE_STATES or status == "past_due"  # grace
    is_trial = status == "trialing"

    return {
        "status": status,
        "is_active": is_active,
        "is_trial": is_trial,
        "days_remaining": days_remaining,
        "plan": plan_id,
        "plan_meta": get_plan_or_default(plan_id) if plan_id else None,
    }
