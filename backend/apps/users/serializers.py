from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.organizations.models import Membership, Organization

User = get_user_model()


def _default_org() -> Organization:
    org, _ = Organization.objects.get_or_create(
        slug="default", defaults={"name": "Default Org"}
    )
    return org


class UserSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=Membership.ROLE_CHOICES, required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "is_active", "is_superuser", "role", "password", "permissions",
        ]
        read_only_fields = ["id", "is_superuser", "permissions"]

    def get_permissions(self, obj):
        if obj.is_superuser:
            return sorted(Membership.PERMISSIONS[Membership.ROLE_ADMIN])
        m = obj.memberships.first()
        if not m:
            return []
        return sorted(Membership.PERMISSIONS.get(m.role, set()))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_superuser:
            data["role"] = Membership.ROLE_ADMIN
        else:
            m = instance.memberships.first()
            data["role"] = m.role if m else None
        return data

    def create(self, validated_data):
        role = validated_data.pop("role", Membership.ROLE_MEMBER)
        password = validated_data.pop("password", None) or User.objects.make_random_password()
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        Membership.objects.create(user=user, organization=_default_org(), role=role)
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        password = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        if role:
            m = instance.memberships.first()
            if m:
                m.role = role
                m.save(update_fields=["role"])
            else:
                Membership.objects.create(
                    user=instance, organization=_default_org(), role=role
                )
        return instance


class InvoxaTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        if user.is_superuser:
            token["role"] = Membership.ROLE_ADMIN
        else:
            m = user.memberships.first()
            token["role"] = m.role if m else None
        token["username"] = user.username
        return token
