"""
Per-company usage counting and plan-quota enforcement.

A quota of -1 means unlimited. Resume quota is per calendar month (resets on the
1st); user quota is an absolute cap on active accounts.
"""
from datetime import datetime, timezone
from bson import ObjectId

from core.db import get_db
from billing.services.license_service import get_company_license, license_state


def _month_start(now=None):
    now = now or datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_usage(company_oid: ObjectId) -> dict:
    """Current usage counts for a company."""
    db = get_db()
    month_start = _month_start()

    resumes_this_month = db.documents.count_documents(
        {"company_id": company_oid, "created_at": {"$gte": month_start}}
    )
    total_resumes = db.documents.count_documents({"company_id": company_oid})
    users = db.users.count_documents({"company_id": company_oid})
    interviews = db.interviews.count_documents({"company_id": company_oid})

    return {
        "resumes_this_month": resumes_this_month,
        "total_resumes": total_resumes,
        "users": users,
        "interviews": interviews,
        "month_resets": _next_month_label(),
    }


def _next_month_label():
    now = datetime.now(timezone.utc)
    year = now.year + (1 if now.month == 12 else 0)
    month = 1 if now.month == 12 else now.month + 1
    return datetime(year, month, 1, tzinfo=timezone.utc).strftime("%b %d, %Y")


def _plan_quotas(company_oid: ObjectId) -> dict:
    state = license_state(get_company_license(company_oid))
    plan_meta = state.get("plan_meta") or {}
    return plan_meta.get("quotas", {})


def check_resume_quota(company_oid: ObjectId) -> tuple[bool, str]:
    """
    Returns (allowed, message). message is human-readable if blocked.
    """
    if not company_oid:
        return True, ""  # legacy user, no enforcement

    quotas = _plan_quotas(company_oid)
    limit = quotas.get("resumes_per_month", -1)
    if limit == -1:
        return True, ""

    used = get_usage(company_oid)["resumes_this_month"]
    if used >= limit:
        return (
            False,
            f"Monthly resume limit reached ({used}/{limit}). "
            f"Upgrade your plan or wait until next month to upload more.",
        )
    return True, ""


def check_user_quota(company_oid: ObjectId) -> tuple[bool, str]:
    if not company_oid:
        return True, ""

    quotas = _plan_quotas(company_oid)
    limit = quotas.get("users", -1)
    if limit == -1:
        return True, ""

    used = get_usage(company_oid)["users"]
    if used >= limit:
        return (
            False,
            f"User limit reached ({used}/{limit}). Upgrade your plan to add more team members.",
        )
    return True, ""
