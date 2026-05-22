from django.urls import path
from . import views

urlpatterns = [
    path("upload/", views.upload_resume),
    path("reextract/", views.reextract_all),
    path("", views.list_resumes),
    path("<str:resume_id>/", views.resume_detail),
    path("<str:resume_id>/delete/", views.delete_resume),
]
