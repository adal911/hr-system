"""
Multi-tenant helpers. Every read/write in the app routes through here so
company scoping is consistent and centralized.
"""
from bson import ObjectId


def get_company_oid(request):
    """Return the caller's company_id as an ObjectId, or None (legacy users)."""
    company_id = getattr(request.user, "company_id", None)
    if not company_id:
        return None
    try:
        return ObjectId(company_id)
    except Exception:
        return None


def company_filter(request):
    """
    Build a Mongo query fragment that scopes results to the caller's company.

    Returns {"company_id": ObjectId(...)} for a normal tenant user, or {} for a
    legacy user with no company (so the app stays usable while migrating). After
    the orphan-cleanup migration runs, every real user has a company.
    """
    oid = get_company_oid(request)
    return {"company_id": oid} if oid else {}
