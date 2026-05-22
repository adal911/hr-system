from django.urls import path
from . import views

urlpatterns = [
    path("", views.interview_list, name="interview-list"),
    path("<str:interview_id>/", views.interview_detail, name="interview-detail"),
    path("<str:interview_id>/questions/", views.add_question, name="add-question"),
    path("<str:interview_id>/answer/", views.save_answer, name="save-answer"),
    path(
        "<str:interview_id>/summary/",
        views.generate_interview_summary,
        name="generate-summary",
    ),
]
