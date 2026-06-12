from django.urls import path
from . import views

urlpatterns = [
    path("stats/", views.stats, name="monitoring-stats"),
    path("health/", views.health, name="monitoring-health"),
]
