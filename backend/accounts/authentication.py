import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from bson import ObjectId
from core.db import get_db


class MongoUser:
    """Lightweight user object that DRF expects."""

    def __init__(self, user_doc):
        self.id = str(user_doc["_id"])
        self.username = user_doc["username"]
        self.role = user_doc["role"]
        self.is_authenticated = True

    def __str__(self):
        return self.username


class MongoJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid token")

        db = get_db()
        user_doc = db.users.find_one({"_id": ObjectId(payload["user_id"])})
        if not user_doc:
            raise AuthenticationFailed("User not found")

        return (MongoUser(user_doc), token)


def generate_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
