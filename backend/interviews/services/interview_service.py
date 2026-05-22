import os
from google import genai
from search.services.embedding_service import vector_search

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    return _client


def get_ai_answer(question, candidate_name):
    """
    Retrieve resume context for a specific candidate and generate
    an AI-suggested answer to an interview question.
    """
    results = vector_search(question, top_k=5)

    # Filter to only this candidate's chunks
    candidate_chunks = [r for r in results if r["candidate_name"] == candidate_name]
    if not candidate_chunks:
        candidate_chunks = results  # Fallback to all results

    if not candidate_chunks:
        return "No relevant resume data found for this candidate."

    context = "\n\n---\n\n".join(
        f"[{r['candidate_name']} - Chunk {r['chunk_index'] + 1}]\n{r['text']}"
        for r in candidate_chunks
    )

    prompt = f"""RESUME CONTEXT:
{context}

INTERVIEW QUESTION:
{question}

Based strictly on the resume context above, provide a suggested answer to this interview question
for candidate {candidate_name}. If the resume doesn't contain relevant information, say so."""

    response = _get_client().models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        contents=prompt,
        config={
            "system_instruction": (
                "You are an AI HR assistant. Generate concise, factual answers "
                "to interview questions based strictly on the candidate's resume data. "
                "Do not make up information."
            ),
            "temperature": 0,
        },
    )
    return response.text


def generate_summary(interview):
    """Generate an AI summary of the interview session."""
    qa_parts = []
    for i, q in enumerate(interview.get("questions", []), 1):
        part = f"Q{i}: {q['question_text']}"
        if q.get("ai_suggested_answer"):
            part += f"\nAI Suggested: {q['ai_suggested_answer']}"
        if q.get("candidate_answer"):
            part += f"\nCandidate Answer: {q['candidate_answer']}"
        if q.get("interviewer_notes"):
            part += f"\nInterviewer Notes: {q['interviewer_notes']}"
        qa_parts.append(part)

    if not qa_parts:
        return "No questions recorded in this interview."

    qa_text = "\n\n".join(qa_parts)

    prompt = f"""INTERVIEW SESSION:
Candidate: {interview.get('candidate_name', 'Unknown')}
Interviewer: {interview.get('interviewer', 'Unknown')}

QUESTIONS & ANSWERS:
{qa_text}

Generate a concise professional interview summary covering:
1. Key strengths observed
2. Areas of concern or gaps
3. Overall assessment and recommendation"""

    response = _get_client().models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        contents=prompt,
        config={
            "system_instruction": (
                "You are an AI HR assistant. Generate concise, professional interview "
                "summaries based on the Q&A data provided. Be objective and balanced."
            ),
            "temperature": 0,
        },
    )
    return response.text
