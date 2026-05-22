from django.urls import path
from . import views

urlpatterns = [
    path("", views.search_resumes),
    path("rebuild/", views.rebuild_index),
]
