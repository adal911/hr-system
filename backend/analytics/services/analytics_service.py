from core.db import get_db


def get_dashboard_stats():
    """Get overview stats for the dashboard."""
    db = get_db()

    total_resumes = db.documents.count_documents({})
    total_interviews = db.interviews.count_documents({})
    interviews_completed = db.interviews.count_documents({"status": "completed"})
    interviews_in_progress = db.interviews.count_documents({"status": "in_progress"})
    total_users = db.users.count_documents({})
    total_chat_sessions = db.chat_sessions.count_documents({})

    return {
        "total_resumes": total_resumes,
        "total_interviews": total_interviews,
        "interviews_completed": interviews_completed,
        "interviews_in_progress": interviews_in_progress,
        "total_users": total_users,
        "total_chat_sessions": total_chat_sessions,
    }


def get_skills_distribution():
    """Get aggregated skill counts across all resumes."""
    db = get_db()

    documents = list(
        db.documents.find(
            {"structured_data.skills": {"$exists": True}},
            {"structured_data.skills": 1},
        )
    )

    skill_counts = {}
    for doc in documents:
        skills = doc.get("structured_data", {}).get("skills", [])
        for skill in skills:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    # Sort by count descending, return top 20
    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
    return [{"skill": s, "count": c} for s, c in sorted_skills[:20]]


def get_hiring_pipeline():
    """Get interview pipeline breakdown."""
    db = get_db()

    pipeline = db.interviews.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ])

    result = {"in_progress": 0, "completed": 0}
    for item in pipeline:
        status = item["_id"]
        if status in result:
            result[status] = item["count"]

    return result


def get_recent_activity():
    """Get recent uploads and interviews."""
    db = get_db()

    recent_resumes = list(
        db.documents.find(
            {},
            {"candidate_name": 1, "uploaded_by": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .limit(5)
    )
    for r in recent_resumes:
        r["_id"] = str(r["_id"])
        r["type"] = "resume_upload"

    recent_interviews = list(
        db.interviews.find(
            {},
            {"candidate_name": 1, "interviewer": 1, "status": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .limit(5)
    )
    for i in recent_interviews:
        i["_id"] = str(i["_id"])
        i["type"] = "interview"

    # Merge and sort by date
    activity = recent_resumes + recent_interviews
    activity.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return activity[:10]
