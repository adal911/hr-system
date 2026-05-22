from django.core.management.base import BaseCommand
from werkzeug.security import generate_password_hash
from datetime import datetime, timezone
from core.db import get_db


class Command(BaseCommand):
    help = "Create the default super admin user if it does not exist"

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            default="admin",
            help="Admin username (default: admin)",
        )
        parser.add_argument(
            "--password",
            type=str,
            default="admin123",
            help="Admin password (default: admin123)",
        )

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]

        db = get_db()
        existing = db.users.find_one({"username": username})

        if existing:
            self.stdout.write(
                self.style.WARNING(f"Admin user '{username}' already exists. Skipping.")
            )
            return

        db.users.insert_one({
            "username": username,
            "password": generate_password_hash(password),
            "role": "admin",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc),
        })

        self.stdout.write(
            self.style.SUCCESS(
                f"Super admin created!\n"
                f"  Username: {username}\n"
                f"  Password: {password}\n"
                f"  Role: admin\n\n"
                f"IMPORTANT: Change this password after first login!"
            )
        )
