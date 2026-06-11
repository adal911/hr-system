from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timezone
from bson import ObjectId
from core.db import get_db
from core.permissions import HasActiveLicense
from core.tenant import company_filter, get_company_oid
from .services.chatbot_service import get_response


# ─── Chat Sessions ───────────────────────────────────────────────────────────


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def sessions(request):
    db = get_db()

    if request.method == "GET":
        # List all sessions for this user
        user_sessions = list(
            db.chat_sessions.find({"user_id": request.user.id})
            .sort("updated_at", -1)
        )
        for s in user_sessions:
            s["_id"] = str(s["_id"])
            s["document_id"] = str(s["document_id"])
        return Response(user_sessions)

    # POST - Create new session
    document_id = request.data.get("document_id", "").strip()
    title = request.data.get("title", "").strip()

    if not document_id:
        return Response(
            {"error": "document_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate document exists AND belongs to this company
    try:
        doc = db.documents.find_one(
            {"_id": ObjectId(document_id), **company_filter(request)},
            {"candidate_name": 1},
        )
    except Exception:
        return Response(
            {"error": "Invalid document_id"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not doc:
        return Response(
            {"error": "Resume not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    candidate_name = doc["candidate_name"]
    if not title:
        title = f"Chat about {candidate_name}"

    now = datetime.now(timezone.utc)
    session = {
        "user_id": request.user.id,
        "company_id": get_company_oid(request),
        "username": request.user.username,
        "document_id": ObjectId(document_id),
        "candidate_name": candidate_name,
        "title": title,
        "created_at": now,
        "updated_at": now,
    }
    result = db.chat_sessions.insert_one(session)

    session["_id"] = str(result.inserted_id)
    session["document_id"] = document_id
    return Response(session, status=status.HTTP_201_CREATED)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    db = get_db()

    try:
        session = db.chat_sessions.find_one(
            {"_id": ObjectId(session_id), "user_id": request.user.id}
        )
    except Exception:
        return Response(
            {"error": "Invalid session ID"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not session:
        return Response(
            {"error": "Session not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        # Delete session and its messages
        db.chat_messages.delete_many({"session_id": ObjectId(session_id)})
        db.chat_sessions.delete_one({"_id": ObjectId(session_id)})
        return Response({"message": "Session deleted"})

    # GET - Return session info + messages
    session["_id"] = str(session["_id"])
    session["document_id"] = str(session["document_id"])

    messages = list(
        db.chat_messages.find({"session_id": ObjectId(session_id)})
        .sort("created_at", 1)
    )
    for m in messages:
        m["_id"] = str(m["_id"])
        m["session_id"] = str(m["session_id"])

    session["messages"] = messages
    return Response(session)


# ─── Chat Messages (within a session) ────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasActiveLicense])
def send_message(request, session_id):
    query = request.data.get("query", "").strip()

    if not query:
        return Response(
            {"error": "Query is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    db = get_db()

    # Validate session belongs to this user
    try:
        session = db.chat_sessions.find_one(
            {"_id": ObjectId(session_id), "user_id": request.user.id}
        )
    except Exception:
        return Response(
            {"error": "Invalid session ID"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not session:
        return Response(
            {"error": "Session not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    document_id = session["document_id"]
    now = datetime.now(timezone.utc)

    # Save user message
    user_msg = {
        "session_id": ObjectId(session_id),
        "role": "user",
        "content": query,
        "sources": [],
        "created_at": now,
    }
    db.chat_messages.insert_one(user_msg)

    # Get AI response scoped to this session's document
    result = get_response(query, document_id=str(document_id))

    # Save assistant message
    assistant_msg = {
        "session_id": ObjectId(session_id),
        "role": "assistant",
        "content": result["response"],
        "sources": result["retrieved_chunks"],
        "created_at": datetime.now(timezone.utc),
    }
    db.chat_messages.insert_one(assistant_msg)

    # Update session timestamp
    db.chat_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"updated_at": datetime.now(timezone.utc)}},
    )

    return Response(
        {
            "query": query,
            "response": result["response"],
            "sources": result["retrieved_chunks"],
        }
    )
