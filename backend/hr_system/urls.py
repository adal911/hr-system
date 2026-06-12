from django.urls import path, include

urlpatterns = [
    path("api/auth/", include("accounts.urls")),
    path("api/billing/", include("billing.urls")),
    path("api/resumes/", include("resumes.urls")),
    path("api/search/", include("search.urls")),
    path("api/chatbot/", include("chatbot.urls")),
    path("api/interviews/", include("interviews.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/monitoring/", include("monitoring.urls")),
]
