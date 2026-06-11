from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
from bson import ObjectId
from core.db import get_db
from core.permissions import IsAdmin
from billing.services.license_service import (
    create_company,
    create_trial_license,
    get_company_license,
    license_state,
)
from .authentication import generate_token


# ─── Public: company signup ──────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    """
    Public self-service signup. Creates company + admin user + trial license
    atomically (best-effort — Mongo doesn't transact across collections by
    default; we roll back manually on failure).
    """
    company_name = (request.data.get("company_name") or "").strip()
    username = (request.data.get("username") or "").strip()
    password = (request.data.get("password") or "").strip()

    if not company_name or not username or not password:
        return Response(
            {"error": "company_name, username, and password are required"},
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
            {"error": "Username already taken"},
            status=status.HTTP_409_CONFLICT,
        )

    # 1) Company
    company = create_company(company_name)

    try:
        # 2) Admin user inside that company
        now = datetime.now(timezone.utc)
        user_doc = {
            "username": username,
            "password": generate_password_hash(password),
            "role": "admin",
            "company_id": company["_id"],
            "created_by": "self_signup",
            "created_at": now,
        }
        user_result = db.users.insert_one(user_doc)
        user_id = user_result.inserted_id

        # 3) Link company → owner
        db.companies.update_one(
            {"_id": company["_id"]},
            {"$set": {"owner_user_id": user_id, "updated_at": now}},
        )

        # 4) Start trial
        license_doc = create_trial_license(company["_id"])
    except Exception as exc:
        # Best-effort rollback: orphan company is harmless but tidy up.
        db.companies.delete_one({"_id": company["_id"]})
        return Response(
            {"error": f"Signup failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    token = generate_token(str(user_id))
    state = license_state(license_doc)

    return Response(
        {
            "token": token,
            "user": {
                "id": str(user_id),
                "username": username,
                "role": "admin",
                "company_id": str(company["_id"]),
            },
            "company": {
                "id": str(company["_id"]),
                "name": company["name"],
                "slug": company["slug"],
            },
            "license": state,
        },
        status=status.HTTP_201_CREATED,
    )


# ─── Auth ────────────────────────────────────────────────────────────────────


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
                "company_id": (
                    str(user_doc["company_id"]) if user_doc.get("company_id") else None
                ),
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    company_id = getattr(request.user, "company_id", None)

    company_payload = None
    license_payload = None
    if company_id:
        db = get_db()
        company = db.companies.find_one({"_id": ObjectId(company_id)})
        if company:
            company_payload = {
                "id": str(company["_id"]),
                "name": company.get("name"),
                "slug": company.get("slug"),
            }
        license_payload = license_state(get_company_license(ObjectId(company_id)))

    return Response(
        {
            "id": request.user.id,
            "username": request.user.username,
            "role": request.user.role,
            "company_id": company_id,
            "company": company_payload,
            "license": license_payload,
        }
    )


# ─── Admin: user management (scoped to caller's company) ─────────────────────


@api_view(["POST"])
@permission_classes([IsAdmin])
def create_user(request):
    """Admin-only: create a new user inside the caller's company."""
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

    company_id = getattr(request.user, "company_id", None)
    user_doc = {
        "username": username,
        "password": generate_password_hash(password),
        "role": role,
        "company_id": ObjectId(company_id) if company_id else None,
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


@api_view(["GET"])
@permission_classes([IsAdmin])
def user_list(request):
    """List users in the caller's company (admins outside any company see all — legacy data)."""
    db = get_db()
    company_id = getattr(request.user, "company_id", None)
    query = {"company_id": ObjectId(company_id)} if company_id else {}
    users = list(db.users.find(query, {"password": 0}))
    for u in users:
        u["_id"] = str(u["_id"])
        if u.get("company_id"):
            u["company_id"] = str(u["company_id"])
    return Response(users)


@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_user(request, user_id):
    """Admin-only: delete a user in the caller's company. Cannot delete yourself."""
    db = get_db()

    if request.user.id == user_id:
        return Response(
            {"error": "You cannot delete your own account"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    company_id = getattr(request.user, "company_id", None)
    try:
        query = {"_id": ObjectId(user_id)}
        if company_id:
            query["company_id"] = ObjectId(company_id)
        result = db.users.delete_one(query)
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
    """Admin-only: reset a user's password (within caller's company)."""
    new_password = request.data.get("password", "").strip()

    if not new_password or len(new_password) < 6:
        return Response(
            {"error": "Password must be at least 6 characters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    db = get_db()
    company_id = getattr(request.user, "company_id", None)
    try:
        query = {"_id": ObjectId(user_id)}
        if company_id:
            query["company_id"] = ObjectId(company_id)
        result = db.users.update_one(
            query,
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
