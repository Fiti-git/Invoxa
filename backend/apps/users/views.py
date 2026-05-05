from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.organizations.models import Membership

from .permissions import IsOrgAdmin, get_role, has_perm
from .serializers import InvoxaTokenSerializer, UserSerializer

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = InvoxaTokenSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        role = get_role(u)
        return Response({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_superuser": u.is_superuser,
            "role": role,
            "permissions": sorted(Membership.PERMISSIONS.get(role, set())) if role else [],
        })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsOrgAdmin()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_superuser:
            return Response(
                {"detail": "Cannot delete superuser."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if instance.id == request.user.id:
            return Response(
                {"detail": "Cannot delete yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def roles(self, request):
        return Response([
            {"value": v, "label": l, "permissions": sorted(Membership.PERMISSIONS[v])}
            for v, l in Membership.ROLE_CHOICES
        ])
