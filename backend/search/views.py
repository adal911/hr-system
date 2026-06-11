import re
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.db import get_db
from core.permissions import IsHR, HasActiveLicense
from core.tenant import get_company_oid
from bson import ObjectId
from .services.embedding_service import vector_search, rebuild_embeddings
from .services.keyword_search import keyword_search, STOP_WORDS


def _extract_meaningful_terms(query):
    """Extract meaningful search terms from query for validation."""
    words = query.lower().split()
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


def _validate_vector_result(doc_id, query_terms, company_oid=None):
    """
    Check if a vector-only result actually contains any of the query terms
    in its structured data. Returns (is_valid, score_penalty, structured_data).

    company_oid ensures a vector hit from another tenant is rejected even if the
    vector index filter were ever bypassed (defense in depth).
    """
    db = get_db()
    query = {"_id": ObjectId(doc_id)}
    if company_oid is not None:
        query["company_id"] = company_oid
    doc = db.documents.find_one(
        query,
        {"candidate_name": 1, "structured_data": 1},
    )
    if not doc:
        return False, 0, {}, ""

    structured = doc.get("structured_data", {})
    candidate_name = doc.get("candidate_name", "")

    # Build a searchable text blob from all structured fields
    searchable_parts = []
    searchable_parts.extend(structured.get("skills", []))
    searchable_parts.append(structured.get("summary", ""))
    for exp in structured.get("experience", []):
        searchable_parts.append(exp.get("title", ""))
        searchable_parts.append(exp.get("company", ""))
        searchable_parts.append(exp.get("description", ""))
    for edu in structured.get("education", []):
        searchable_parts.append(edu.get("degree", ""))
        searchable_parts.append(edu.get("institution", ""))
    for proj in structured.get("projects", []):
        searchable_parts.append(proj.get("name", ""))
        searchable_parts.append(proj.get("description", ""))
        searchable_parts.extend(proj.get("technologies", []))

    full_text = " ".join(searchable_parts).lower()

    # Count how many query terms appear in the structured data
    matched_count = 0
    for term in query_terms:
        pattern = r'\b' + re.escape(term) + r'\b'
        if re.search(pattern, full_text):
            matched_count += 1

    if not query_terms:
        return True, 1.0, structured, candidate_name

    coverage = matched_count / len(query_terms)

    # If zero terms match in structured data, reject this result
    if matched_count == 0:
        return False, 0, structured, candidate_name

    return True, coverage, structured, candidate_name


def _is_natural_language_query(query):
    """Detect if query is a natural language sentence vs keyword list."""
    words = query.strip().split()
    if len(words) >= 5 and "," not in query and ";" not in query:
        return True
    nl_indicators = [
        "who ", "that ", "with ", "built ", "worked ",
        "experience in", "background in", "engineers",
        "developers", "candidates", "looking for",
        "find me", "show me", "search for",
        "at scale", "proficient", "familiar with",
    ]
    query_lower = query.lower()
    return any(indicator in query_lower for indicator in nl_indicators)


def _hybrid_search(query, top_k=10, company_oid=None):
    """
    Combine keyword search and vector search for best results.
    Keyword search handles exact matching; vector search adds semantic results.
    Vector-only results are validated against structured data to prevent
    irrelevant resumes from appearing.

    company_oid scopes every branch of the search to a single tenant.
    """
    keyword_results = keyword_search(query, top_k=top_k, company_id=company_oid)
    is_semantic = _is_natural_language_query(query)
    query_terms = _extract_meaningful_terms(query)

    if is_semantic:
        try:
            vector_results = vector_search(query, top_k=top_k, company_id=company_oid)
        except Exception:
            vector_results = []

        # Build a map of keyword results by document_id
        merged = {}
        for r in keyword_results:
            merged[r["document_id"]] = {
                **r,
                "search_type": "hybrid",
            }

        # Merge vector results
        for vr in vector_results:
            doc_id = vr["document_id"]
            vector_score = vr["score"]

            if doc_id in merged:
                # Already matched by keywords — boost with vector score
                existing = merged[doc_id]
                # Give keyword match more weight since it's more precise
                combined = existing["score"] * 0.7 + vector_score * 0.3
                existing["score"] = round(min(combined, 1.0), 4)
                existing["search_type"] = "hybrid"
            else:
                # Vector-only result — validate against structured data
                is_valid, coverage, structured, candidate_name = _validate_vector_result(
                    doc_id, query_terms, company_oid
                )

                if not is_valid:
                    continue  # Skip — no query terms found in resume

                # Penalize score based on how few terms actually matched
                adjusted_score = vector_score * coverage

                merged[doc_id] = {
                    "document_id": doc_id,
                    "candidate_name": candidate_name,
                    "score": round(adjusted_score, 4),
                    "matched_skills": [],
                    "matched_experience": [],
                    "matched_education": [],
                    "matched_projects": [],
                    "all_skills": structured.get("skills", []),
                    "summary": structured.get("summary", ""),
                    "search_type": "vector",
                    "score_breakdown": {
                        "skills": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "experience": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "projects": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "education": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "summary": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "token_coverage": coverage,
                        "matched_tokens": int(coverage * len(query_terms)) if query_terms else 0,
                        "total_tokens": len(query_terms),
                        "query_tokens": query_terms,
                        "vector_score": round(vector_score, 4),
                        "semantic_only": True,
                    },
                }

        results = sorted(merged.values(), key=lambda x: x["score"], reverse=True)
        return results[:top_k], "hybrid"

    # Keyword-only queries — fall back to vector if no keyword results
    if not keyword_results:
        try:
            vector_results = vector_search(query, top_k=top_k, company_id=company_oid)
        except Exception:
            return [], "keyword"

        seen = {}
        for r in vector_results:
            doc_id = r["document_id"]
            if doc_id not in seen or r["score"] > seen[doc_id]["score"]:
                is_valid, coverage, structured, candidate_name = _validate_vector_result(
                    doc_id, query_terms, company_oid
                )

                if not is_valid:
                    continue

                adjusted_score = r["score"] * coverage

                seen[doc_id] = {
                    "document_id": doc_id,
                    "candidate_name": candidate_name or r["candidate_name"],
                    "score": round(adjusted_score, 4),
                    "matched_skills": [],
                    "matched_experience": [],
                    "matched_education": [],
                    "matched_projects": [],
                    "all_skills": structured.get("skills", []),
                    "summary": structured.get("summary", ""),
                    "score_breakdown": {
                        "skills": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "experience": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "projects": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "education": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "summary": {"weight": 0, "raw_score": 0, "contribution": 0},
                        "token_coverage": coverage,
                        "matched_tokens": int(coverage * len(query_terms)) if query_terms else 0,
                        "total_tokens": len(query_terms),
                        "query_tokens": query_terms,
                        "vector_score": round(r["score"], 4),
                        "semantic_only": True,
                    },
                }
        return sorted(seen.values(), key=lambda x: x["score"], reverse=True), "vector"

    return keyword_results, "keyword"


@api_view(["GET"])
@permission_classes([IsAuthenticated, HasActiveLicense])
def search_resumes(request):
    query = request.query_params.get("q", "").strip()
    top_k = int(request.query_params.get("top_k", "5"))

    if not query:
        return Response(
            {"error": "Query parameter 'q' is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    top_k = min(max(top_k, 1), 20)

    results, search_type = _hybrid_search(
        query, top_k=top_k, company_oid=get_company_oid(request)
    )

    return Response(
        {
            "query": query,
            "results": results,
            "count": len(results),
            "search_type": search_type,
        }
    )


@api_view(["POST"])
@permission_classes([IsHR])
def rebuild_index(request):
    count = rebuild_embeddings()
    return Response({"message": f"Re-embedded {count} chunks"})
