import os
import json
from google import genai
from bson import ObjectId
from core.db import get_db

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    return _client


def generate_interview_questions(document_id, job_role="", num_questions=10):
    """
    Generate tailored interview questions based on a candidate's resume
    and an optional job role.
    """
    db = get_db()

    doc = db.documents.find_one(
        {"_id": ObjectId(document_id)},
        {"candidate_name": 1, "structured_data": 1, "raw_text": 1},
    )

    if not doc:
        return None

    structured = doc.get("structured_data", {})
    candidate_name = doc.get("candidate_name", "Unknown")

    # Build resume context from structured data
    resume_context = f"Candidate: {candidate_name}\n\n"

    if structured.get("summary"):
        resume_context += f"Summary: {structured['summary']}\n\n"

    if structured.get("skills"):
        resume_context += f"Skills: {', '.join(structured['skills'])}\n\n"

    if structured.get("experience"):
        resume_context += "Experience:\n"
        for exp in structured["experience"]:
            resume_context += f"- {exp.get('title', '')} at {exp.get('company', '')} ({exp.get('duration', '')})\n"
            if exp.get("description"):
                resume_context += f"  {exp['description']}\n"
        resume_context += "\n"

    if structured.get("education"):
        resume_context += "Education:\n"
        for edu in structured["education"]:
            resume_context += f"- {edu.get('degree', '')} from {edu.get('institution', '')} ({edu.get('year', '')})\n"
        resume_context += "\n"

    if structured.get("projects"):
        resume_context += "Projects:\n"
        for proj in structured["projects"]:
            resume_context += f"- {proj.get('name', '')}: {proj.get('description', '')}\n"
            if proj.get("technologies"):
                resume_context += f"  Technologies: {', '.join(proj['technologies'])}\n"
        resume_context += "\n"

    role_context = f"\nTarget Job Role: {job_role}" if job_role else ""

    prompt = f"""Based on this candidate's resume and the target job role, generate {num_questions} tailored interview questions.

{resume_context}
{role_context}

Return a JSON array with objects containing:
{{
  "question": "The interview question",
  "category": "technical|behavioral|situational|experience",
  "difficulty": "easy|medium|hard",
  "purpose": "Why this question is relevant for this candidate"
}}

RULES:
1. Questions should be specific to the candidate's background, not generic.
2. Reference specific skills, projects, or experiences from their resume.
3. Mix technical, behavioral, situational, and experience-based questions.
4. If a job role is specified, align questions with that role's requirements.
5. Include questions that probe gaps or areas that need clarification.
6. Return ONLY valid JSON array, no markdown formatting."""

    response = _get_client().models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        contents=prompt,
        config={
            "system_instruction": (
                "You are an expert HR interviewer. Generate insightful, specific "
                "interview questions tailored to the candidate's background. "
                "Avoid generic questions that could apply to anyone."
            ),
            "temperature": 0.3,
        },
    )

    text = response.text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        questions = json.loads(text)
    except json.JSONDecodeError:
        questions = []

    return {
        "candidate_name": candidate_name,
        "document_id": str(doc["_id"]),
        "job_role": job_role,
        "questions": questions,
    }
