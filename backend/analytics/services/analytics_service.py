from core.db import get_db


def _scope(company_id, extra=None):
    """Build a company-scoped Mongo filter, optionally merged with `extra`."""
    query = dict(extra or {})
    if company_id is not None:
        query["company_id"] = company_id
    return query


def get_dashboard_stats(company_id=None):
    """Get overview stats for the dashboard, scoped to one company."""
    db = get_db()

    total_resumes = db.documents.count_documents(_scope(company_id))
    total_interviews = db.interviews.count_documents(_scope(company_id))
    interviews_completed = db.interviews.count_documents(
        _scope(company_id, {"status": "completed"})
    )
    interviews_in_progress = db.interviews.count_documents(
        _scope(company_id, {"status": "in_progress"})
    )
    total_users = db.users.count_documents(_scope(company_id))
    total_chat_sessions = db.chat_sessions.count_documents(_scope(company_id))

    return {
        "total_resumes": total_resumes,
        "total_interviews": total_interviews,
        "interviews_completed": interviews_completed,
        "interviews_in_progress": interviews_in_progress,
        "total_users": total_users,
        "total_chat_sessions": total_chat_sessions,
    }


def get_skills_distribution(company_id=None):
    """Get aggregated skill counts across this company's resumes."""
    db = get_db()

    documents = list(
        db.documents.find(
            _scope(company_id, {"structured_data.skills": {"$exists": True}}),
            {"structured_data.skills": 1},
        )
    )

    skill_counts = {}
    for doc in documents:
        skills = doc.get("structured_data", {}).get("skills", [])
        for skill in skills:
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
    return [{"skill": s, "count": c} for s, c in sorted_skills[:20]]


def get_hiring_pipeline(company_id=None):
    """Get interview pipeline breakdown for this company."""
    db = get_db()

    pipeline = db.interviews.aggregate([
        {"$match": _scope(company_id)},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ])

    result = {"in_progress": 0, "completed": 0}
    for item in pipeline:
        status = item["_id"]
        if status in result:
            result[status] = item["count"]

    return result


def get_recent_activity(company_id=None):
    """Get recent uploads and interviews for this company."""
    db = get_db()

    recent_resumes = list(
        db.documents.find(
            _scope(company_id),
            {"candidate_name": 1, "uploaded_by": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .limit(5)
    )
    for r in recent_resumes:
        r["_id"] = str(r["_id"])
        r["type"] = "resume_upload"
        r.pop("company_id", None)

    recent_interviews = list(
        db.interviews.find(
            _scope(company_id),
            {"candidate_name": 1, "interviewer": 1, "status": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .limit(5)
    )
    for i in recent_interviews:
        i["_id"] = str(i["_id"])
        i["type"] = "interview"
        i.pop("company_id", None)

    activity = recent_resumes + recent_interviews
    activity.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return activity[:10]
