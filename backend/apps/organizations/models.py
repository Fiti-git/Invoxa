from django.conf import settings
from django.db import models


class Organization(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    monthly_cap_lkr = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="0 = unlimited. When monthly billed cost exceeds this, extraction is paused.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Membership(models.Model):
    ROLE_ADMIN = "admin"
    ROLE_MANAGER = "manager"
    ROLE_MEMBER = "member"
    ROLE_VIEWER = "viewer"
    ROLE_ACCOUNTANT = "accountant"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_MANAGER, "Manager"),
        (ROLE_MEMBER, "Member"),
        (ROLE_VIEWER, "Viewer"),
        (ROLE_ACCOUNTANT, "Accountant"),
    ]

    PERMISSIONS = {
        ROLE_ADMIN: {
            "users.manage", "settings.manage",
            "documents.upload", "documents.delete",
            "invoices.edit", "invoices.commit", "invoices.view",
            "templates.manage",
        },
        ROLE_MANAGER: {
            "documents.upload", "documents.delete",
            "invoices.edit", "invoices.commit", "invoices.view",
        },
        ROLE_MEMBER: {
            "documents.upload", "invoices.edit", "invoices.view",
        },
        ROLE_VIEWER: {"invoices.view"},
        ROLE_ACCOUNTANT: {"billing.view"},
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "organization")]
