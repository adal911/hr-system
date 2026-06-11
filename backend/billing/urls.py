from django.urls import path
from . import views

urlpatterns = [
    path("plans/", views.plans, name="billing-plans"),
    path("license/", views.current_license, name="billing-current-license"),
    path("checkout/", views.create_checkout, name="billing-checkout"),
    path("portal/", views.create_portal, name="billing-portal"),
    path("webhook/", views.webhook, name="billing-webhook"),
]
