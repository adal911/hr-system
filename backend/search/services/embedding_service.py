import os
from google import genai
from bson import ObjectId
from core.db import get_db

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    return _client


def generate_embedding(text):
    """Generate embedding for a text using Gemini gemini-embedding-001."""
    result = _get_client().models.embed_content(
        model="gemini-embedding-001",
        contents=text,
    )
    return result.embeddings[0].values


def embed_and_store_chunks(document_id, chunks, candidate_name):
    """Generate embeddings for chunks and store them in MongoDB."""
    db = get_db()
    chunk_docs = []

    for i, chunk_text in enumerate(chunks):
        embedding = generate_embedding(chunk_text)
        chunk_docs.append(
            {
                "document_id": document_id,
                "chunk_index": i,
                "text": chunk_text,
                "candidate_name": candidate_name,
                "embedding": embedding,
            }
        )

    if chunk_docs:
        db.chunks.insert_many(chunk_docs)

    return len(chunk_docs)


def vector_search(query, top_k=5, document_id=None):
    """Search chunks using MongoDB Atlas Vector Search.

    Args:
        query: Search query text
        top_k: Number of results to return
        document_id: Optional ObjectId or string to filter chunks by document
    """
    db = get_db()

    query_embedding = generate_embedding(query)

    vector_search_stage = {
        "$vectorSearch": {
            "index": "vector_index",
            "path": "embedding",
            "queryVector": query_embedding,
            "numCandidates": top_k * 10,
            "limit": top_k,
        }
    }

    # Filter by document_id if provided
    if document_id:
        if isinstance(document_id, str):
            document_id = ObjectId(document_id)
        vector_search_stage["$vectorSearch"]["filter"] = {
            "document_id": document_id
        }

    pipeline = [
        vector_search_stage,
        {
            "$project": {
                "_id": 1,
                "document_id": 1,
                "candidate_name": 1,
                "chunk_index": 1,
                "text": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    results = list(db.chunks.aggregate(pipeline))

    return [
        {
            "chunk_id": str(r["_id"]),
            "document_id": str(r["document_id"]),
            "candidate_name": r.get("candidate_name", ""),
            "chunk_index": r.get("chunk_index", 0),
            "text": r["text"],
            "score": round(r.get("score", 0), 4),
        }
        for r in results
    ]


def rebuild_embeddings():
    """Re-embed all existing chunks in MongoDB."""
    db = get_db()
    chunks = list(db.chunks.find({}, {"_id": 1, "text": 1}))

    count = 0
    for chunk in chunks:
        embedding = generate_embedding(chunk["text"])
        db.chunks.update_one(
            {"_id": chunk["_id"]}, {"$set": {"embedding": embedding}}
        )
        count += 1

    return count
