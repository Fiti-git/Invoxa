from .models import AppSetting


def get_setting(key: str, default: str = "") -> str:
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
