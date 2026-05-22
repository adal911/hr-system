from django.urls import path
from . import views

urlpatterns = [
    # Chat sessions
    path("sessions/", views.sessions),
    path("sessions/<str:session_id>/", views.session_detail),
    path("sessions/<str:session_id>/messages/", views.send_message),
]
