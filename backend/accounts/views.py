from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
from bson import ObjectId
from core.db import get_db
from core.permissions import IsAdmin
from .authentication import generate_token


@api_view(["POST"])
@permission_classes([IsAdmin])
def create_user(request):
    """Admin-only: create a new user with username, password, and role."""
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "").strip()
    role = request.data.get("role", "interviewer")

    if not username or not password:
        return Response(
            {"error": "Username and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if role not in ("admin", "hr", "interviewer"):
        return Response(
            {"error": "Invalid role. Must be admin, hr, or interviewer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(password) < 6:
        return Response(
            {"error": "Password must be at least 6 characters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    db = get_db()
    if db.users.find_one({"username": username}):
        return Response(
            {"error": "Username already exists"},
            status=status.HTTP_409_CONFLICT,
        )

    user_doc = {
        "username": username,
        "password": generate_password_hash(password),
        "role": role,
        "created_by": request.user.username,
        "created_at": datetime.now(timezone.utc),
    }
    result = db.users.insert_one(user_doc)

    return Response(
        {
            "id": str(result.inserted_id),
            "username": username,
            "role": role,
            "message": f"User '{username}' created successfully",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    db = get_db()
    user_doc = db.users.find_one({"username": username})

    if not user_doc or not check_password_hash(user_doc["password"], password):
        return Response(
            {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
        )

    token = generate_token(str(user_doc["_id"]))

    return Response(
        {
            "token": token,
            "user": {
                "id": str(user_doc["_id"]),
                "username": user_doc["username"],
                "role": user_doc["role"],
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(
        {
            "id": request.user.id,
            "username": request.user.username,
            "role": request.user.role,
        }
    )


@api_view(["GET"])
@permission_classes([IsAdmin])
def user_list(request):
    db = get_db()
    users = list(db.users.find({}, {"password": 0}))
    for u in users:
        u["_id"] = str(u["_id"])
    return Response(users)


@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_user(request, user_id):
    """Admin-only: delete a user. Cannot delete yourself."""
    db = get_db()

    if request.user.id == user_id:
        return Response(
            {"error": "You cannot delete your own account"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = db.users.delete_one({"_id": ObjectId(user_id)})
    except Exception:
        return Response(
            {"error": "Invalid user ID"}, status=status.HTTP_400_BAD_REQUEST
        )

    if result.deleted_count == 0:
        return Response(
            {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
        )

    return Response({"message": "User deleted"})


@api_view(["POST"])
@permission_classes([IsAdmin])
def reset_password(request, user_id):
    """Admin-only: reset a user's password."""
    new_password = request.data.get("password", "").strip()

    if not new_password or len(new_password) < 6:
        return Response(
            {"error": "Password must be at least 6 characters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    db = get_db()
    try:
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": generate_password_hash(new_password)}},
        )
    except Exception:
        return Response(
            {"error": "Invalid user ID"}, status=status.HTTP_400_BAD_REQUEST
        )

    if result.matched_count == 0:
        return Response(
            {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
        )

    return Response({"message": "Password reset successfully"})
