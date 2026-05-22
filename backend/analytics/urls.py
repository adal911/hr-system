from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.dashboard_stats, name="dashboard-stats"),
    path("compare/", views.compare, name="compare-resumes"),
    path("jd-match/", views.jd_match, name="jd-match"),
    path("generate-questions/", views.generate_questions, name="generate-questions"),
]
