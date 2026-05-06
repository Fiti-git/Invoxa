import os

from .models import AppSetting

# Settings allowed to be sourced from environment variables. Env wins over DB
# so you can manage these in .env without exposing them in the UI.
ENV_OVERRIDE_KEYS = {
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "EXCHANGERATE_API_KEY",
}


def get_setting(key: str, default: str = "") -> str:
    if key in ENV_OVERRIDE_KEYS:
        env_val = os.environ.get(key)
        if env_val:
            return env_val
    try:
        s = AppSetting.objects.get(key=key)
        return s.get_value() or default
    except AppSetting.DoesNotExist:
        return default


def set_setting(key: str, value: str, is_secret: bool = True) -> AppSetting:
    s, _ = AppSetting.objects.get_or_create(key=key, defaults={"is_secret": is_secret})
    s.is_secret = is_secret
    s.set_value(value)
    s.save()
    return s
