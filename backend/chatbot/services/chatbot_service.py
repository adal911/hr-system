import os
from google import genai
from bson import ObjectId
from core.db import get_db
from search.services.embedding_service import vector_search

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    return _client

SYSTEM_PROMPT = """You are an AI HR assistant for a recruitment system called HR Data Room.
Your role is to answer questions about candidates based STRICTLY on the resume content provided below.

RULES:
1. ONLY use information from the provided resume chunks to answer questions.
2. If the answer is not found in the provided context, say "I don't have enough information in the resumes to answer that."
3. Do NOT make up or hallucinate any information about candidates.
4. Be concise and professional in your responses.
5. When referencing information, mention which candidate it comes from.
6. If asked about something unrelated to HR or the resumes, politely redirect to HR-related topics.
"""


def get_response(query, document_id=None, top_k=5):
    """
    RAG pipeline:
    1. Retrieve relevant chunks via vector search (scoped to document if provided)
    2. Assemble context from chunks
    3. Send to Gemini with grounding prompt
    4. Return response + retrieved chunks
    """
    # Step 1: Retrieve relevant chunks (scoped to specific document if provided)
    search_results = vector_search(query, top_k=top_k, document_id=document_id)

    # Fallback: if vector search with filter returned nothing, fetch chunks directly
    if not search_results and document_id:
        db = get_db()
        doc_oid = ObjectId(document_id) if isinstance(document_id, str) else document_id
        chunks = list(
            db.chunks.find(
                {"document_id": doc_oid},
                {"embedding": 0},
            ).sort("chunk_index", 1)
        )
        search_results = [
            {
                "chunk_id": str(c["_id"]),
                "document_id": str(c["document_id"]),
                "candidate_name": c.get("candidate_name", ""),
                "chunk_index": c.get("chunk_index", 0),
                "text": c["text"],
                "score": 1.0,
            }
            for c in chunks[:top_k]
        ]

    # Step 2: Assemble context
    if not search_results:
        context = "No relevant resume data found."
    else:
        context_parts = []
        for r in search_results:
            context_parts.append(
                f"[{r['candidate_name']} - Chunk {r['chunk_index'] + 1}]\n{r['text']}"
            )
        context = "\n\n---\n\n".join(context_parts)

    # Step 3: Generate response
    user_message = f"""RESUME CONTEXT:
{context}

USER QUESTION:
{query}

Answer based strictly on the resume context above."""

    response = _get_client().models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        contents=user_message,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "temperature": 0,
        },
    )

    return {
        "response": response.text,
        "retrieved_chunks": [
            {
                "chunk_id": r["chunk_id"],
                "candidate_name": r["candidate_name"],
                "score": r["score"],
            }
            for r in search_results
        ],
    }
