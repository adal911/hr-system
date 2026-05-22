import os
import json
from google import genai
from core.db import get_db

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    return _client


def _extract_jd_requirements(jd_text):
    """Use Gemini to extract structured requirements from a job description."""
    prompt = f"""Extract the key requirements from this job description.

Return a JSON object with:
{{
  "title": "Job title",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "min_experience_years": 0,
  "education_requirements": ["requirement1"],
  "key_responsibilities": ["resp1", "resp2"]
}}

RULES:
1. Normalize skill names (e.g., "JS" -> "JavaScript").
2. Separate required vs preferred/nice-to-have skills.
3. If experience years not specified, use 0.
4. Return ONLY valid JSON, no markdown.

JOB DESCRIPTION:
{jd_text}"""

    response = _get_client().models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        contents=prompt,
        config={"temperature": 0},
    )

    text = response.text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "title": "",
            "required_skills": [],
            "preferred_skills": [],
            "min_experience_years": 0,
            "education_requirements": [],
            "key_responsibilities": [],
        }


def match_jd_to_resumes(jd_text, top_k=10):
    """
    Parse a job description and rank all resumes by fit percentage.
    """
    jd_requirements = _extract_jd_requirements(jd_text)

    db = get_db()
    documents = list(
        db.documents.find(
            {"structured_data": {"$exists": True}},
            {"_id": 1, "candidate_name": 1, "structured_data": 1},
        )
    )

    required_skills = [s.lower() for s in jd_requirements.get("required_skills", [])]
    preferred_skills = [s.lower() for s in jd_requirements.get("preferred_skills", [])]
    edu_requirements = [e.lower() for e in jd_requirements.get("education_requirements", [])]

    results = []

    for doc in documents:
        structured = doc.get("structured_data", {})
        candidate_skills = set(s.lower() for s in structured.get("skills", []))
        candidate_exp = structured.get("experience", [])
        candidate_edu = structured.get("education", [])

        # Required skills match
        required_matched = []
        required_missing = []
        for skill in jd_requirements.get("required_skills", []):
            if _skill_match(skill.lower(), candidate_skills):
                required_matched.append(skill)
            else:
                required_missing.append(skill)

        # Preferred skills match
        preferred_matched = []
        for skill in jd_requirements.get("preferred_skills", []):
            if _skill_match(skill.lower(), candidate_skills):
                preferred_matched.append(skill)

        # Education match
        edu_match = _check_education_match(edu_requirements, candidate_edu)

        # Experience match
        exp_count = len(candidate_exp)

        # Calculate fit score
        req_total = len(required_skills) if required_skills else 1
        pref_total = len(preferred_skills) if preferred_skills else 1

        req_score = len(required_matched) / req_total  # 0-1
        pref_score = len(preferred_matched) / pref_total  # 0-1

        # Weighted: required skills 60%, preferred 25%, education 10%, experience 5%
        fit_score = (
            req_score * 0.60
            + pref_score * 0.25
            + (1.0 if edu_match else 0.0) * 0.10
            + min(exp_count / max(jd_requirements.get("min_experience_years", 1), 1), 1.0) * 0.05
        )

        results.append({
            "document_id": str(doc["_id"]),
            "candidate_name": doc["candidate_name"],
            "fit_score": round(fit_score, 4),
            "required_matched": required_matched,
            "required_missing": required_missing,
            "preferred_matched": preferred_matched,
            "education_match": edu_match,
            "experience_count": exp_count,
            "all_skills": structured.get("skills", []),
            "summary": structured.get("summary", ""),
        })

    results.sort(key=lambda x: x["fit_score"], reverse=True)

    return {
        "jd_requirements": jd_requirements,
        "results": results[:top_k],
        "total_candidates": len(results),
    }


def _skill_match(skill_lower, candidate_skills):
    """Check if a skill matches any in the candidate's skill set."""
    for cs in candidate_skills:
        if skill_lower == cs:
            return True
        if skill_lower in cs or cs in skill_lower:
            return True
    return False


def _check_education_match(edu_requirements, candidate_edu):
    """Check if candidate meets education requirements."""
    if not edu_requirements:
        return True
    if not candidate_edu:
        return False

    edu_text = " ".join(
        f"{e.get('degree', '')} {e.get('institution', '')}".lower()
        for e in candidate_edu
    )

    for req in edu_requirements:
        if req in edu_text:
            return True
        # Check common degree keywords
        req_words = req.split()
        for word in req_words:
            if len(word) > 3 and word in edu_text:
                return True

    return False
