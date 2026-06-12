"""
Request-logging middleware. Records each API request into Mongo `request_logs`
so the per-company statistics dashboard can aggregate traffic, visitors, and
top actions.

Design notes:
- Runs on the response so we can capture the final status code.
- Decodes the JWT directly (no DB hit) — company_id is embedded in the token at
  login/signup (see accounts.authentication.generate_token).
- Never raises: logging failures must not affect the user's request.
"""
from datetime import datetime, timezone

import jwt
from django.conf import settings

from core.db import get_db


# Paths we never log: the monitoring endpoints themselves (avoid self-inflation),
# and the Stripe webhook (machine traffic, not a user/visitor).
_SKIP_PREFIXES = ("/api/monitoring/", "/api/billing/webhook")


def _client_ip(request):
    """Best-effort client IP, honoring Render's proxy header."""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _decode_identity(request):
    """Return (user_id, company_id) from the bearer token, or (None, None)."""
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth.startswith("Bearer "):
        return None, None
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except Exception:
        return None, None
    return payload.get("user_id"), payload.get("company_id")


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._log(request, response)
        except Exception:
            pass  # logging must never break the request
        return response

    def _log(self, request, response):
        path = request.path or ""

        # Only log API traffic; skip preflight and excluded prefixes.
        if not path.startswith("/api/"):
            return
        if request.method == "OPTIONS":
            return
        if any(path.startswith(p) for p in _SKIP_PREFIXES):
            return

        user_id, company_id = _decode_identity(request)

        db = get_db()
        db.request_logs.insert_one(
            {
                "path": path,
                "method": request.method,
                "status_code": getattr(response, "status_code", None),
                "user_id": user_id,
                "company_id": company_id,  # stored as the token's string form
                "ip": _client_ip(request),
                "timestamp": datetime.now(timezone.utc),
            }
        )
