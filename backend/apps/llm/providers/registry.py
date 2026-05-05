"""Provider registry — picks Gemini if a key is configured, else FakeProvider."""
from apps.settings_app.services import get_setting
from .fake import FakeProvider
from .gemini import GeminiProvider


def get_default_provider():
    api_key = get_setting("GEMINI_API_KEY", "")
    model = get_setting("GEMINI_MODEL", "gemini-2.5-flash")
    if api_key:
        return GeminiProvider(api_key=api_key, model=model)
    return FakeProvider()
