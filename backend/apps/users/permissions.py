from rest_framework.permissions import BasePermission

from apps.organizations.models import Membership


def get_role(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return Membership.ROLE_ADMIN
    m = user.memberships.first()
    return m.role if m else None


def has_perm(user, perm: str) -> bool:
    role = get_role(user)
    if not role:
        return False
    return perm in Membership.PERMISSIONS.get(role, set())


class HasPerm(BasePermission):
    """Usage: permission_classes = [HasPerm("invoices.edit")]"""

    required_perm: str = ""

    def __init__(self, perm: str = ""):
        self.required_perm = perm

    def __call__(self):
        return self

    def has_permission(self, request, view):
        perm = getattr(view, "required_perm", self.required_perm)
        if not perm:
            return request.user.is_authenticated
        return has_perm(request.user, perm)


class IsOrgAdmin(BasePermission):
    def has_permission(self, request, view):
        return has_perm(request.user, "users.manage")
