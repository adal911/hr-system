from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login),
    path("me/", views.me),
    path("users/", views.user_list),
    path("users/create/", views.create_user),
    path("users/<str:user_id>/delete/", views.delete_user),
    path("users/<str:user_id>/reset-password/", views.reset_password),
]
