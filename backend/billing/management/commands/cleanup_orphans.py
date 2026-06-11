"""
Delete tenant data that has no company_id — i.e. records created before the
multi-tenant migration. Run once after deploying Phase 3.

Usage:
    python manage.py cleanup_orphans            # dry run (counts only)
    python manage.py cleanup_orphans --apply    # actually delete

Also deletes Cloudinary files for orphan documents when possible.
"""
from django.core.management.base import BaseCommand

from core.db import get_db


# Collections that gained a company_id field. A document is "orphan" if the
# field is missing or null.
ORPHAN_QUERY = {"$or": [{"company_id": {"$exists": False}}, {"company_id": None}]}


class Command(BaseCommand):
    help = "Delete pre-tenancy orphan data (no company_id). Use --apply to commit."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually delete. Without this flag, only counts are shown.",
        )
        parser.add_argument(
            "--keep-users",
            action="store_true",
            help="Do not delete orphan users (in case you want to backfill them).",
        )

    def handle(self, *args, **options):
        db = get_db()
        apply = options["apply"]
        keep_users = options["keep_users"]

        collections = ["documents", "chunks", "interviews", "chat_sessions", "chat_messages"]
        if not keep_users:
            collections.append("users")

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"{'APPLYING' if apply else 'DRY RUN —'} orphan cleanup"
        ))

        # chat_messages don't have company_id; delete those whose session is an orphan
        # Handle documents specially to clean Cloudinary too.
        total = 0

        for name in collections:
            if name == "chat_messages":
                continue  # handled below via session linkage
            count = db[name].count_documents(ORPHAN_QUERY)
            total += count
            self.stdout.write(f"  {name}: {count} orphan record(s)")

            if apply and count:
                if name == "documents":
                    self._delete_documents_with_cloudinary(db)
                else:
                    db[name].delete_many(ORPHAN_QUERY)

        # chat_messages: delete those belonging to deleted/orphan sessions.
        # Simplest correct approach: any message whose session_id no longer exists.
        if apply:
            valid_session_ids = set(
                s["_id"] for s in db.chat_sessions.find({}, {"_id": 1})
            )
            orphan_msgs = [
                m["_id"]
                for m in db.chat_messages.find({}, {"_id": 1, "session_id": 1})
                if m.get("session_id") not in valid_session_ids
            ]
            if orphan_msgs:
                db.chat_messages.delete_many({"_id": {"$in": orphan_msgs}})
                self.stdout.write(f"  chat_messages: removed {len(orphan_msgs)} dangling message(s)")

        if apply:
            self.stdout.write(self.style.SUCCESS(
                f"\nDone. Removed {total} orphan record(s) across collections."
            ))
            self.stdout.write(self.style.WARNING(
                "Reminder: existing users without a company_id are still here unless "
                "you ran without --keep-users. New signups always get a company."
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f"\nDry run only. {total} record(s) WOULD be deleted. "
                "Re-run with --apply to commit."
            ))

    def _delete_documents_with_cloudinary(self, db):
        """Delete orphan documents and their Cloudinary files + chunks."""
        try:
            from resumes.services.cloudinary_service import delete_file
        except Exception:
            delete_file = None

        orphans = list(db.documents.find(ORPHAN_QUERY, {"_id": 1, "cloudinary_public_id": 1}))
        for doc in orphans:
            pid = doc.get("cloudinary_public_id")
            if pid and delete_file:
                try:
                    delete_file(pid)
                except Exception:
                    self.stdout.write(self.style.WARNING(
                        f"  (could not delete Cloudinary file {pid}; continuing)"
                    ))
            # Remove the document's chunks too
            db.chunks.delete_many({"document_id": doc["_id"]})

        db.documents.delete_many(ORPHAN_QUERY)
