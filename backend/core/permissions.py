from bson import ObjectId
from rest_framework.permissions import BasePermission

from billing.services.license_service import (
    get_company_license,
    license_state,
)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == "admin"


class IsHR(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role in ("admin", "hr")


class IsInterviewer(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role in ("admin", "hr", "interviewer")


class HasActiveLicense(BasePermission):
    """
    Gate any "paid" endpoint behind an active license (trialing/active/past_due).

    Side effect on the request: attaches request.license_state so views can
    surface usage / quotas without re-querying.

    Users without a company (legacy data created before signup existed) are
    let through to keep the app usable while you migrate them.
    """

    message = "Your trial or subscription has ended. Please upgrade to continue."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        company_id = getattr(request.user, "company_id", None)
        if not company_id:
            # Legacy user with no company — allow until migrated.
            request.license_state = None
            return True

        state = license_state(get_company_license(ObjectId(company_id)))
        request.license_state = state
        return bool(state.get("is_active"))
