import os
import json
from google import genai

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    return _client


EXTRACTION_PROMPT = """You are a resume parser. Extract structured data from the following resume text.

Return a JSON object with EXACTLY these fields:
{
  "summary": "A 2-3 sentence professional summary of the candidate",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start - End",
      "description": "Brief description of responsibilities"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "Year or range"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ]
}

RULES:
1. Extract ALL skills mentioned anywhere in the resume - programming languages, frameworks, tools, soft skills, etc.
2. Normalize skill names (e.g., "JS" -> "JavaScript", "ML" -> "Machine Learning") but keep them as commonly used terms.
3. Each skill should be a single term or short phrase (e.g., "Python", "React", "Machine Learning", "Project Management").
4. If a section is not found in the resume, use an empty array [].
5. Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.
"""


def extract_structured_data(raw_text):
    """Use Gemini to extract structured data from resume text."""
    user_message = f"""RESUME TEXT:
{raw_text}

Extract the structured data as JSON."""

    response = _get_client().models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        contents=user_message,
        config={
            "system_instruction": EXTRACTION_PROMPT,
            "temperature": 0,
        },
    )

    response_text = response.text.strip()

    # Clean up response - remove markdown code blocks if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first and last lines (```json and ```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines)

    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback: return empty structured data
        data = {
            "summary": "",
            "skills": [],
            "experience": [],
            "education": [],
            "projects": [],
        }

    # Ensure all expected keys exist
    result = {
        "summary": data.get("summary", ""),
        "skills": data.get("skills", []),
        "experience": data.get("experience", []),
        "education": data.get("education", []),
        "projects": data.get("projects", []),
    }

    # Normalize skills to lowercase for consistent matching
    result["skills_lower"] = [s.lower() for s in result["skills"]]

    return result
