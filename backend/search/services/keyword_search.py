import re
from core.db import get_db

# Common stop words to ignore during search
STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "because", "but", "and", "or", "if", "while", "about", "up", "it",
    "its", "that", "this", "these", "those", "i", "me", "my", "we", "our",
    "you", "your", "he", "him", "his", "she", "her", "they", "them",
    "their", "what", "which", "who", "whom", "whose",
    # HR search specific stop words
    "find", "show", "search", "looking", "look", "want", "get",
    "candidate", "candidates", "resume", "resumes", "cv", "cvs",
    "person", "people", "someone", "anybody",
}


def _tokenize(text):
    """Extract meaningful search terms from query, filtering stop words."""
    text = text.lower().strip()

    # Split by commas, semicolons, or "and" (as separator)
    parts = re.split(r'[,;]|\band\b', text)
    tokens = []

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Split into individual words
        words = part.split()

        # Filter stop words
        meaningful = [w for w in words if w not in STOP_WORDS and len(w) > 1]

        if not meaningful:
            continue

        # If multiple meaningful words remain, keep as a phrase AND as individuals
        if len(meaningful) > 1:
            phrase = " ".join(meaningful)
            tokens.append(phrase)
            tokens.extend(meaningful)
        else:
            tokens.append(meaningful[0])

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            unique.append(t)

    return unique


def _exact_match(token, text):
    """Check if token matches text. Returns score 0-1. Strict matching."""
    if not text:
        return 0.0
    text_lower = text.lower()
    token_lower = token.lower()

    # Exact match
    if token_lower == text_lower:
        return 1.0

    # Token is contained within text as a whole word (e.g. "javascript" in "javascript developer")
    pattern = r'\b' + re.escape(token_lower) + r'\b'
    if re.search(pattern, text_lower):
        return 0.85

    return 0.0


def _search_skills(query_tokens, skills_lower, skills_display):
    """Search across skills with strict matching. Returns (score, matched_skills)."""
    matched_skills = []
    total_score = 0.0

    for token in query_tokens:
        best_score = 0.0
        best_skill = None

        for i, skill_lower in enumerate(skills_lower):
            score = _exact_match(token, skill_lower)
            if score > best_score:
                best_score = score
                best_skill = skills_display[i] if i < len(skills_display) else skill_lower

        if best_score > 0:
            total_score += best_score
            if best_skill and best_skill not in matched_skills:
                matched_skills.append(best_skill)

    return total_score, matched_skills


def _search_experience(query_tokens, experience):
    """Search across experience entries with strict matching."""
    matched = []
    total_score = 0.0

    for exp in experience:
        title = exp.get("title", "")
        company = exp.get("company", "")
        description = exp.get("description", "")

        exp_score = 0.0
        token_hits = 0

        for token in query_tokens:
            # Title match (highest value)
            title_score = _exact_match(token, title)
            if title_score > 0:
                exp_score += title_score * 1.5
                token_hits += 1
                continue

            # Company match
            company_score = _exact_match(token, company)
            if company_score > 0:
                exp_score += company_score * 1.0
                token_hits += 1
                continue

            # Description match — whole word boundary match only
            pattern = r'\b' + re.escape(token) + r'\b'
            if re.search(pattern, description.lower()):
                exp_score += 0.6
                token_hits += 1

        if token_hits > 0:
            total_score += exp_score
            summary = f"{title} at {company}" if company else title
            if summary and summary not in matched:
                matched.append(summary)

    return total_score, matched


def _search_education(query_tokens, education):
    """Search across education entries."""
    matched = []
    total_score = 0.0

    for edu in education:
        degree = edu.get("degree", "")
        institution = edu.get("institution", "")
        year = edu.get("year", "")

        edu_score = 0.0
        token_hits = 0

        for token in query_tokens:
            if _exact_match(token, degree) > 0:
                edu_score += 1.0
                token_hits += 1
            elif _exact_match(token, institution) > 0:
                edu_score += 0.8
                token_hits += 1
            elif token in year:
                edu_score += 0.5
                token_hits += 1

        if token_hits > 0:
            total_score += edu_score
            summary = f"{degree} - {institution}" if institution else degree
            if summary and summary not in matched:
                matched.append(summary)

    return total_score, matched


def _search_projects(query_tokens, projects):
    """Search across project entries."""
    matched = []
    total_score = 0.0

    for proj in projects:
        name = proj.get("name", "")
        description = proj.get("description", "")
        technologies = proj.get("technologies", [])
        techs_lower = [t.lower() for t in technologies]

        proj_score = 0.0
        token_hits = 0

        for token in query_tokens:
            # Technology match (strict)
            for tech in techs_lower:
                if _exact_match(token, tech) > 0:
                    proj_score += 0.9
                    token_hits += 1
                    break
            else:
                # Project name match
                if _exact_match(token, name) > 0:
                    proj_score += 0.7
                    token_hits += 1
                else:
                    # Description match — whole word only
                    pattern = r'\b' + re.escape(token) + r'\b'
                    if re.search(pattern, description.lower()):
                        proj_score += 0.4
                        token_hits += 1

        if token_hits > 0:
            total_score += proj_score
            if name and name not in matched:
                matched.append(name)

    return total_score, matched


def _search_summary(query_tokens, summary):
    """Search in the candidate summary. Strict word boundary matching."""
    if not summary:
        return 0.0
    summary_lower = summary.lower()
    score = 0.0
    for token in query_tokens:
        pattern = r'\b' + re.escape(token) + r'\b'
        if re.search(pattern, summary_lower):
            score += 0.3
    return score


def keyword_search(query, top_k=10, company_id=None):
    """
    Search resumes using keyword matching on ALL structured data fields.
    Searches across: skills, experience, education, projects, and summary.
    Returns per-candidate results with weighted scores.

    Scoring approach:
    - Score is based on what fraction of query tokens actually matched.
    - Candidates with zero meaningful matches are excluded.
    - Skills matches are weighted highest.

    company_id scopes the search to a single tenant when provided.
    """
    db = get_db()
    query_tokens = _tokenize(query)

    if not query_tokens:
        return []

    mongo_query = {"structured_data": {"$exists": True}}
    if company_id is not None:
        mongo_query["company_id"] = company_id

    documents = list(
        db.documents.find(
            mongo_query,
            {
                "_id": 1,
                "candidate_name": 1,
                "structured_data": 1,
            },
        )
    )

    results = []

    # Weights for each section
    WEIGHTS = {
        "skills": 1.0,
        "experience": 0.8,
        "projects": 0.6,
        "education": 0.5,
        "summary": 0.2,
    }

    for doc in documents:
        structured = doc.get("structured_data", {})
        skills_lower = structured.get("skills_lower", [])
        skills_display = structured.get("skills", [])

        # Search all sections
        skill_score, matched_skills = _search_skills(
            query_tokens, skills_lower, skills_display
        )
        exp_score, matched_experience = _search_experience(
            query_tokens, structured.get("experience", [])
        )
        edu_score, matched_education = _search_education(
            query_tokens, structured.get("education", [])
        )
        proj_score, matched_projects = _search_projects(
            query_tokens, structured.get("projects", [])
        )
        summary_score = _search_summary(
            query_tokens, structured.get("summary", "")
        )

        # Count how many distinct tokens got at least one match anywhere
        matched_token_count = 0
        for token in query_tokens:
            # Check if this token matched in ANY section
            token_matched = False

            # Check skills
            for sl in skills_lower:
                if _exact_match(token, sl) > 0:
                    token_matched = True
                    break

            # Check experience
            if not token_matched:
                for exp in structured.get("experience", []):
                    for field in [exp.get("title", ""), exp.get("company", ""), exp.get("description", "")]:
                        if _exact_match(token, field) > 0 or (
                            field and re.search(r'\b' + re.escape(token) + r'\b', field.lower())
                        ):
                            token_matched = True
                            break
                    if token_matched:
                        break

            # Check projects
            if not token_matched:
                for proj in structured.get("projects", []):
                    for tech in proj.get("technologies", []):
                        if _exact_match(token, tech.lower()) > 0:
                            token_matched = True
                            break
                    if not token_matched and re.search(
                        r'\b' + re.escape(token) + r'\b',
                        (proj.get("name", "") + " " + proj.get("description", "")).lower()
                    ):
                        token_matched = True
                    if token_matched:
                        break

            # Check education
            if not token_matched:
                for edu in structured.get("education", []):
                    for field in [edu.get("degree", ""), edu.get("institution", "")]:
                        if _exact_match(token, field) > 0:
                            token_matched = True
                            break
                    if token_matched:
                        break

            # Check summary
            if not token_matched and structured.get("summary"):
                if re.search(r'\b' + re.escape(token) + r'\b', structured["summary"].lower()):
                    token_matched = True

            if token_matched:
                matched_token_count += 1

        if matched_token_count == 0:
            continue

        # Token coverage: what fraction of search terms actually found a match
        token_coverage = matched_token_count / len(query_tokens)

        # Per-section weighted contributions (used for explainability)
        skills_contrib = skill_score * WEIGHTS["skills"]
        exp_contrib = exp_score * WEIGHTS["experience"]
        proj_contrib = proj_score * WEIGHTS["projects"]
        edu_contrib = edu_score * WEIGHTS["education"]
        summary_contrib = summary_score * WEIGHTS["summary"]

        weighted_score = (
            skills_contrib + exp_contrib + proj_contrib + edu_contrib + summary_contrib
        )

        # Normalize by number of tokens to get a per-token average
        per_token_avg = weighted_score / len(query_tokens)

        # Final score: combine per-token strength with coverage
        # This ensures someone matching 1/5 tokens perfectly scores lower
        # than someone matching 4/5 tokens decently
        final_score = (per_token_avg * 0.4 + token_coverage * 0.6)

        # Clamp to 0-1
        final_score = min(max(final_score, 0.0), 1.0)

        # Build score_breakdown: each section's relative contribution to the
        # weighted_score, plus token coverage. Frontend uses this for the
        # "Why this score?" explainability panel.
        total_contrib = weighted_score if weighted_score > 0 else 1.0
        score_breakdown = {
            "skills": {
                "weight": WEIGHTS["skills"],
                "raw_score": round(skill_score, 4),
                "contribution": round(skills_contrib / total_contrib, 4),
            },
            "experience": {
                "weight": WEIGHTS["experience"],
                "raw_score": round(exp_score, 4),
                "contribution": round(exp_contrib / total_contrib, 4),
            },
            "projects": {
                "weight": WEIGHTS["projects"],
                "raw_score": round(proj_score, 4),
                "contribution": round(proj_contrib / total_contrib, 4),
            },
            "education": {
                "weight": WEIGHTS["education"],
                "raw_score": round(edu_score, 4),
                "contribution": round(edu_contrib / total_contrib, 4),
            },
            "summary": {
                "weight": WEIGHTS["summary"],
                "raw_score": round(summary_score, 4),
                "contribution": round(summary_contrib / total_contrib, 4),
            },
            "token_coverage": round(token_coverage, 4),
            "matched_tokens": matched_token_count,
            "total_tokens": len(query_tokens),
            "query_tokens": query_tokens,
        }

        results.append(
            {
                "document_id": str(doc["_id"]),
                "candidate_name": doc["candidate_name"],
                "score": round(final_score, 4),
                "matched_skills": matched_skills,
                "matched_experience": matched_experience,
                "matched_education": matched_education,
                "matched_projects": matched_projects,
                "all_skills": skills_display,
                "summary": structured.get("summary", ""),
                "score_breakdown": score_breakdown,
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]
