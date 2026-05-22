from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.permissions import IsHR
from .services.analytics_service import (
    get_dashboard_stats,
    get_skills_distribution,
    get_hiring_pipeline,
    get_recent_activity,
)
from .services.comparison_service import compare_resumes
from .services.jd_matching_service import match_jd_to_resumes
from .services.question_generator import generate_interview_questions


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard overview statistics."""
    stats = get_dashboard_stats()
    skills = get_skills_distribution()
    pipeline = get_hiring_pipeline()
    activity = get_recent_activity()

    return Response({
        "stats": stats,
        "skills_distribution": skills,
        "hiring_pipeline": pipeline,
        "recent_activity": activity,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def compare(request):
    """Compare 2+ resumes side by side."""
    document_ids = request.data.get("document_ids", [])

    if not document_ids or len(document_ids) < 2:
        return Response(
            {"error": "At least 2 document_ids are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(document_ids) > 5:
        return Response(
            {"error": "Maximum 5 resumes can be compared at once"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = compare_resumes(document_ids)

    if result is None:
        return Response(
            {"error": "Could not find the specified resumes"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def jd_match(request):
    """Match a job description against all resumes."""
    jd_text = request.data.get("jd_text", "").strip()
    top_k = int(request.data.get("top_k", "10"))

    if not jd_text:
        return Response(
            {"error": "jd_text is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    top_k = min(max(top_k, 1), 20)
    result = match_jd_to_resumes(jd_text, top_k=top_k)

    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_questions(request):
    """Generate tailored interview questions for a candidate."""
    document_id = request.data.get("document_id", "").strip()
    job_role = request.data.get("job_role", "").strip()
    num_questions = int(request.data.get("num_questions", "10"))

    if not document_id:
        return Response(
            {"error": "document_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    num_questions = min(max(num_questions, 3), 20)
    result = generate_interview_questions(document_id, job_role, num_questions)

    if result is None:
        return Response(
            {"error": "Resume not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(result)
