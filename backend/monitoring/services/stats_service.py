"""
Per-company statistics derived from the `request_logs` collection plus the
existing quota system.

`request_logs.company_id` is stored as the JWT's STRING form, so all log
aggregations filter by the company_id string. Quota/usage lookups use the
ObjectId form (documents/users store ObjectId).
"""
import re
from datetime import datetime, timedelta, timezone

from core.db import get_db
from billing.services.quota_service import get_usage
from billing.services.license_service import get_company_license, license_state


# Process start — used for an uptime readout in the health panel.
_PROCESS_START = datetime.now(timezone.utc)


# ─── Friendly action labels ──────────────────────────────────────────────────
# Ordered list of (method, path-regex, label). First match wins.
_ACTION_RULES = [
    ("POST", r"^/api/auth/login/?$", "Login"),
    ("POST", r"^/api/auth/signup/?$", "Signup"),
    ("GET", r"^/api/auth/me/?$", "Session check"),
    ("POST", r"^/api/auth/users/create/?$", "Create user"),
    ("GET", r"^/api/auth/users/?$", "View users"),
    ("POST", r"^/api/resumes/upload/?$", "Resume upload"),
    ("GET", r"^/api/resumes/[a-f0-9]+/?$", "View resume"),
    ("GET", r"^/api/resumes/?$", "List resumes"),
    ("DELETE", r"^/api/resumes/.*/delete/?$", "Delete resume"),
    ("POST", r"^/api/resumes/reextract/?$", "Re-extract data"),
    ("GET", r"^/api/search/?$", "Search"),
    ("POST", r"^/api/search/rebuild/?$", "Rebuild index"),
    ("POST", r"^/api/chatbot/sessions/[a-f0-9]+/messages/?$", "Chatbot message"),
    ("POST", r"^/api/chatbot/sessions/?$", "New chat session"),
    ("GET", r"^/api/chatbot/sessions/?$", "List chats"),
    ("POST", r"^/api/interviews/?$", "Create interview"),
    ("GET", r"^/api/interviews/?$", "List interviews"),
    ("POST", r"^/api/interviews/.*/questions/?$", "Add interview question"),
    ("POST", r"^/api/interviews/.*/answer/?$", "Save interview answer"),
    ("POST", r"^/api/interviews/.*/summary/?$", "Generate interview summary"),
    ("POST", r"^/api/analytics/jd-match/?$", "JD match"),
    ("POST", r"^/api/analytics/compare/?$", "Compare candidates"),
    ("POST", r"^/api/analytics/generate-questions/?$", "Generate questions"),
    ("GET", r"^/api/analytics/dashboard/?$", "View dashboard"),
    ("GET", r"^/api/billing/.*", "Billing"),
]


def _label_for(method, path):
    for m, pattern, label in _ACTION_RULES:
        if m == method and re.match(pattern, path):
            return label
    return f"{method} {path}"


def _day_start(now):
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def get_company_stats(company_id_str: str) -> dict:
    """Traffic, visitors, top actions and busiest hours for one company."""
    db = get_db()
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)
    today_start = _day_start(now)

    base = {"company_id": company_id_str}

    # ── Traffic per hour (last 24h), zero-filled to 24 buckets ──────────────
    pipeline = [
        {"$match": {**base, "timestamp": {"$gte": since_24h}}},
        {
            "$group": {
                "_id": {
                    "$dateTrunc": {"date": "$timestamp", "unit": "hour"}
                },
                "count": {"$sum": 1},
            }
        },
    ]
    raw = {row["_id"]: row["count"] for row in db.request_logs.aggregate(pipeline)}

    traffic_per_hour = []
    # Build 24 hourly buckets ending at the current hour.
    cursor = since_24h.replace(minute=0, second=0, microsecond=0)
    end = now.replace(minute=0, second=0, microsecond=0)
    while cursor <= end:
        traffic_per_hour.append(
            {
                "hour": cursor.strftime("%H:%M"),
                "iso": cursor.isoformat(),
                "count": raw.get(cursor, 0),
            }
        )
        cursor += timedelta(hours=1)

    # ── Unique visitors (IPs) and active users (user_ids) ───────────────────
    def _distinct(field, since):
        vals = db.request_logs.distinct(
            field, {**base, "timestamp": {"$gte": since}, field: {"$ne": None}}
        )
        return len([v for v in vals if v])

    visitors_24h = _distinct("ip", since_24h)
    visitors_today = _distinct("ip", today_start)
    active_users_24h = _distinct("user_id", since_24h)
    active_users_today = _distinct("user_id", today_start)

    # ── Top actions (last 24h) ──────────────────────────────────────────────
    action_pipeline = [
        {"$match": {**base, "timestamp": {"$gte": since_24h}}},
        {
            "$group": {
                "_id": {"method": "$method", "path": "$path"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 40},
    ]
    label_counts: dict[str, int] = {}
    for row in db.request_logs.aggregate(action_pipeline):
        label = _label_for(row["_id"]["method"], row["_id"]["path"])
        label_counts[label] = label_counts.get(label, 0) + row["count"]
    top_actions = sorted(
        ({"action": k, "count": v} for k, v in label_counts.items()),
        key=lambda x: x["count"],
        reverse=True,
    )[:8]

    # ── Busiest hours (hour-of-day, last 7 days) ────────────────────────────
    since_7d = now - timedelta(days=7)
    hod_pipeline = [
        {"$match": {**base, "timestamp": {"$gte": since_7d}}},
        {
            "$group": {
                "_id": {"$hour": "$timestamp"},
                "count": {"$sum": 1},
            }
        },
    ]
    hod_raw = {row["_id"]: row["count"] for row in db.request_logs.aggregate(hod_pipeline)}
    busiest_hours = [
        {"hour": f"{h:02d}:00", "count": hod_raw.get(h, 0)} for h in range(24)
    ]

    total_24h = sum(b["count"] for b in traffic_per_hour)
    total_all = db.request_logs.count_documents(base)

    return {
        "traffic_per_hour": traffic_per_hour,
        "visitors": {
            "unique_24h": visitors_24h,
            "unique_today": visitors_today,
            "active_users_24h": active_users_24h,
            "active_users_today": active_users_today,
        },
        "top_actions": top_actions,
        "busiest_hours": busiest_hours,
        "totals": {"requests_24h": total_24h, "requests_all_time": total_all},
    }


def get_usage_vs_quota(company_oid) -> dict:
    """Usage counts paired with the company's plan quotas."""
    usage = get_usage(company_oid) if company_oid else {
        "resumes_this_month": 0,
        "total_resumes": 0,
        "users": 0,
        "interviews": 0,
        "month_resets": "",
    }
    state = license_state(get_company_license(company_oid)) if company_oid else {}
    plan_meta = state.get("plan_meta") or {}
    quotas = plan_meta.get("quotas", {})

    return {
        "plan": plan_meta.get("name", "Trial"),
        "usage": usage,
        "quotas": quotas,
    }


def get_health(company_id_str: str) -> dict:
    """Read-only system health + this company's last recorded activity."""
    db = get_db()
    now = datetime.now(timezone.utc)

    db_ok = True
    try:
        db.command("ping")
    except Exception:
        db_ok = False

    last_activity = None
    try:
        latest = db.request_logs.find_one(
            {"company_id": company_id_str},
            sort=[("timestamp", -1)],
            projection={"timestamp": 1},
        )
        if latest and latest.get("timestamp"):
            ts = latest["timestamp"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            last_activity = ts.isoformat()
    except Exception:
        pass

    uptime_seconds = int((now - _PROCESS_START).total_seconds())

    return {
        "status": "online" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "server_time": now.isoformat(),
        "uptime_seconds": uptime_seconds,
        "last_activity": last_activity,
    }
