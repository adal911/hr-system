from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.permissions import IsAdmin
from core.tenant import get_company_oid
from .services.stats_service import (
    get_company_stats,
    get_usage_vs_quota,
    get_health,
)


@api_view(["GET"])
@permission_classes([IsAdmin])
def stats(request):
    """Per-company traffic, visitors, top actions, busiest hours, usage vs quota."""
    company_id_str = getattr(request.user, "company_id", None)
    company_oid = get_company_oid(request)

    if not company_id_str:
        # Legacy admin with no company — return empty-but-valid shape.
        return Response({
            "traffic_per_hour": [],
            "visitors": {
                "unique_24h": 0, "unique_today": 0,
                "active_users_24h": 0, "active_users_today": 0,
            },
            "top_actions": [],
            "busiest_hours": [],
            "totals": {"requests_24h": 0, "requests_all_time": 0},
            "usage_vs_quota": get_usage_vs_quota(None),
        })

    data = get_company_stats(company_id_str)
    data["usage_vs_quota"] = get_usage_vs_quota(company_oid)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdmin])
def health(request):
    """Read-only system health + this company's last activity. The frontend
    'Re-check' (rectify) button simply re-calls this endpoint."""
    company_id_str = getattr(request.user, "company_id", None)
    return Response(get_health(company_id_str or ""))
