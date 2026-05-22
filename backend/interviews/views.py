import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from bson import ObjectId
from datetime import datetime, timezone
from core.db import get_db
from core.permissions import IsHR
from .services.interview_service import get_ai_answer, generate_summary


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def interview_list(request):
    db = get_db()

    if request.method == "GET":
        interviews = list(
            db.interviews.find({}, {"questions": 0}).sort("created_at", -1)
        )
        for i in interviews:
            i["_id"] = str(i["_id"])
            if i.get("document_id"):
                i["document_id"] = str(i["document_id"])
        return Response(interviews)

    # POST — create interview (HR only)
    if request.user.role not in ("admin", "hr"):
        return Response(
            {"error": "Only HR can create interviews"},
            status=status.HTTP_403_FORBIDDEN,
        )

    candidate_name = request.data.get("candidate_name", "").strip()
    document_id = request.data.get("document_id", "").strip()

    if not candidate_name:
        return Response(
            {"error": "candidate_name is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    doc = {
        "candidate_name": candidate_name,
        "document_id": ObjectId(document_id) if document_id else None,
        "interviewer": request.user.username,
        "status": "in_progress",
        "questions": [],
        "summary": "",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = db.interviews.insert_one(doc)

    return Response(
        {
            "id": str(result.inserted_id),
            "candidate_name": candidate_name,
            "status": "in_progress",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def interview_detail(request, interview_id):
    db = get_db()

    try:
        interview = db.interviews.find_one({"_id": ObjectId(interview_id)})
    except Exception:
        return Response(
            {"error": "Invalid ID"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not interview:
        return Response(
            {"error": "Interview not found"}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "DELETE":
        if request.user.role not in ("admin", "hr"):
            return Response(
                {"error": "Only HR can delete interviews"},
                status=status.HTTP_403_FORBIDDEN,
            )
        db.interviews.delete_one({"_id": ObjectId(interview_id)})
        return Response({"message": "Interview deleted"})

    # GET
    interview["_id"] = str(interview["_id"])
    if interview.get("document_id"):
        interview["document_id"] = str(interview["document_id"])
    return Response(interview)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_question(request, interview_id):
    db = get_db()

    try:
        interview = db.interviews.find_one({"_id": ObjectId(interview_id)})
    except Exception:
        return Response(
            {"error": "Invalid ID"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not interview:
        return Response(
            {"error": "Interview not found"}, status=status.HTTP_404_NOT_FOUND
        )

    question_text = request.data.get("question", "").strip()
    if not question_text:
        return Response(
            {"error": "question is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Generate AI-suggested answer from resume context
    ai_answer = get_ai_answer(question_text, interview["candidate_name"])

    question = {
        "id": str(uuid.uuid4()),
        "question_text": question_text,
        "ai_suggested_answer": ai_answer,
        "candidate_answer": "",
        "interviewer_notes": "",
    }

    db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {
            "$push": {"questions": question},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    return Response(question, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_answer(request, interview_id):
    db = get_db()

    try:
        interview = db.interviews.find_one({"_id": ObjectId(interview_id)})
    except Exception:
        return Response(
            {"error": "Invalid ID"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not interview:
        return Response(
            {"error": "Interview not found"}, status=status.HTTP_404_NOT_FOUND
        )

    question_id = request.data.get("question_id", "").strip()
    candidate_answer = request.data.get("candidate_answer", "").strip()
    interviewer_notes = request.data.get("interviewer_notes", "").strip()

    if not question_id:
        return Response(
            {"error": "question_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update the specific question in the array
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    array_filters = [{"q.id": question_id}]
    set_ops = {"updated_at": datetime.now(timezone.utc)}

    if candidate_answer:
        set_ops["questions.$[q].candidate_answer"] = candidate_answer
    if interviewer_notes:
        set_ops["questions.$[q].interviewer_notes"] = interviewer_notes

    result = db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {"$set": set_ops},
        array_filters=array_filters,
    )

    if result.modified_count == 0:
        return Response(
            {"error": "Question not found"}, status=status.HTTP_404_NOT_FOUND
        )

    return Response({"message": "Answer saved"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_interview_summary(request, interview_id):
    db = get_db()

    try:
        interview = db.interviews.find_one({"_id": ObjectId(interview_id)})
    except Exception:
        return Response(
            {"error": "Invalid ID"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not interview:
        return Response(
            {"error": "Interview not found"}, status=status.HTTP_404_NOT_FOUND
        )

    summary = generate_summary(interview)

    db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {
            "$set": {
                "summary": summary,
                "status": "completed",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return Response({"summary": summary, "status": "completed"})
