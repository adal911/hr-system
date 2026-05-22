from bson import ObjectId
from core.db import get_db


def compare_resumes(document_ids):
    """
    Compare 2+ resumes side by side.
    Returns structured comparison with skill overlaps and gaps.
    """
    db = get_db()

    object_ids = [ObjectId(did) for did in document_ids]
    documents = list(
        db.documents.find(
            {"_id": {"$in": object_ids}},
            {"candidate_name": 1, "structured_data": 1},
        )
    )

    if len(documents) < 2:
        return None

    candidates = []
    all_skills_sets = []

    for doc in documents:
        structured = doc.get("structured_data", {})
        skills = structured.get("skills", [])
        skills_set = set(s.lower() for s in skills)
        all_skills_sets.append(skills_set)

        candidates.append({
            "document_id": str(doc["_id"]),
            "candidate_name": doc["candidate_name"],
            "summary": structured.get("summary", ""),
            "skills": skills,
            "experience": structured.get("experience", []),
            "education": structured.get("education", []),
            "projects": structured.get("projects", []),
            "experience_years": _estimate_experience(structured.get("experience", [])),
        })

    # Calculate skill overlaps
    if all_skills_sets:
        common_skills = set.intersection(*all_skills_sets)
    else:
        common_skills = set()

    # Per-candidate unique skills
    for i, candidate in enumerate(candidates):
        others = set()
        for j, s in enumerate(all_skills_sets):
            if j != i:
                others |= s
        unique = all_skills_sets[i] - others
        # Map back to original case
        candidate["unique_skills"] = [
            s for s in candidate["skills"] if s.lower() in unique
        ]

    # Common skills mapped to original case from first candidate
    common_display = []
    for skill in candidates[0]["skills"]:
        if skill.lower() in common_skills and skill not in common_display:
            common_display.append(skill)

    return {
        "candidates": candidates,
        "common_skills": common_display,
        "total_common": len(common_skills),
    }


def _estimate_experience(experience):
    """Rough estimate of total experience entries."""
    return len(experience)
