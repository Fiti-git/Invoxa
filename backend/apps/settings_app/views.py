from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .services import get_setting, set_setting


SETTING_KEYS = [
    ("GEMINI_API_KEY", True),
    ("GEMINI_MODEL", False),
    ("EXCHANGERATE_API_KEY", True),
]


class SettingsView(APIView):
    permission_classes = [AllowAny]  # vertical slice

    def get(self, request):
        out = {}
        for key, is_secret in SETTING_KEYS:
            v = get_setting(key, "")
            if is_secret:
                out[key] = {"set": bool(v), "preview": (v[:4] + "***") if v else ""}
            else:
                out[key] = {"set": bool(v), "value": v}
        return Response(out)

    def post(self, request):
        data = request.data or {}
        updated = []
        valid_keys = {k for k, _ in SETTING_KEYS}
        secret_lookup = dict(SETTING_KEYS)
        for key, value in data.items():
            if key not in valid_keys:
                continue
            set_setting(key, value or "", is_secret=secret_lookup[key])
            updated.append(key)
        return Response({"updated": updated})
