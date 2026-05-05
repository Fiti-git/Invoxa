from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet


class AppSetting(models.Model):
    """Key/value settings, encrypted at rest with Fernet (e.g. Gemini API key)."""

    key = models.CharField(max_length=128, unique=True)
    value_encrypted = models.TextField(blank=True, default="")
    is_secret = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key

    def set_value(self, value: str):
        if value == "":
            self.value_encrypted = ""
            return
        f = Fernet(settings.INVOXA_FERNET_KEY.encode())
        self.value_encrypted = f.encrypt(value.encode()).decode()

    def get_value(self) -> str:
        if not self.value_encrypted:
            return ""
        f = Fernet(settings.INVOXA_FERNET_KEY.encode())
        return f.decrypt(self.value_encrypted.encode()).decode()
