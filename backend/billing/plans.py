"""
Plan catalog — the single source of truth for SaaS tiers.

Quotas are enforced in Phase 3. Stripe Price IDs are populated from env vars in
Phase 2; today they default to empty strings so the catalog is still serializable.
"""
import os

# Trial defaults
TRIAL_DAYS = 14
TRIAL_PLAN = "pro"  # what a new signup gets during the trial


PLANS = {
    "starter": {
        "id": "starter",
        "name": "Starter",
        "tagline": "For solo recruiters and small teams getting started.",
        "price_monthly_usd": 19,
        "stripe_price_id": os.environ.get("STRIPE_PRICE_STARTER", ""),
        "quotas": {
            "users": 1,
            "resumes_per_month": 50,
            "interviews": -1,        # -1 = unlimited
            "chatbot_sessions": -1,
        },
        "features": [
            "1 admin user",
            "50 resumes per month",
            "Unlimited interviews",
            "AI chatbot grounded in resumes",
            "Hybrid keyword + semantic search",
        ],
        "highlight": False,
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "tagline": "For growing HR teams that need collaboration.",
        "price_monthly_usd": 49,
        "stripe_price_id": os.environ.get("STRIPE_PRICE_PRO", ""),
        "quotas": {
            "users": 10,
            "resumes_per_month": 500,
            "interviews": -1,
            "chatbot_sessions": -1,
        },
        "features": [
            "Up to 10 users (admin / HR / interviewer)",
            "500 resumes per month",
            "Everything in Starter",
            "Structured interview workflows",
            "JD-to-candidate matching",
            "Explainable match scoring",
        ],
        "highlight": True,
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "tagline": "For organizations with high-volume recruiting.",
        "price_monthly_usd": 199,
        "stripe_price_id": os.environ.get("STRIPE_PRICE_ENTERPRISE", ""),
        "quotas": {
            "users": -1,
            "resumes_per_month": -1,
            "interviews": -1,
            "chatbot_sessions": -1,
        },
        "features": [
            "Unlimited users",
            "Unlimited resumes",
            "Everything in Pro",
            "Side-by-side candidate comparison",
            "Priority Gemini model (gemini-2.5-pro)",
            "Dedicated onboarding",
        ],
        "highlight": False,
    },
}


def get_plan(plan_id: str) -> dict | None:
    return PLANS.get(plan_id)


def get_plan_or_default(plan_id: str | None) -> dict:
    return PLANS.get(plan_id or TRIAL_PLAN, PLANS[TRIAL_PLAN])


def public_catalog() -> list[dict]:
    """Return plan info safe to send to the public pricing page."""
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "tagline": p["tagline"],
            "price_monthly_usd": p["price_monthly_usd"],
            "features": p["features"],
            "quotas": p["quotas"],
            "highlight": p["highlight"],
        }
        for p in PLANS.values()
    ]
