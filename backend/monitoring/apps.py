from django.apps import AppConfig


class MonitoringConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "monitoring"

    def ready(self):
        """Ensure the request_logs indexes exist (idempotent)."""
        try:
            from pymongo import ASCENDING, DESCENDING
            from core.db import get_db

            db = get_db()
            # Fast company-scoped time-range queries for the stats aggregations.
            db.request_logs.create_index(
                [("company_id", ASCENDING), ("timestamp", DESCENDING)],
                name="company_ts_idx",
            )
            # TTL index: logs self-expire after 30 days so the collection
            # never grows unbounded.
            db.request_logs.create_index(
                [("timestamp", ASCENDING)],
                name="ttl_idx",
                expireAfterSeconds=2_592_000,  # 30 days
            )
        except Exception:
            # Never block app startup on index creation (e.g. DB unreachable
            # during a build step). Indexes will be retried next boot.
            pass
