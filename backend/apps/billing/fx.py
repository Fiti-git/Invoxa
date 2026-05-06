"""USD → LKR via ExchangeRate-API (https://www.exchangerate-api.com).

Daily-refreshed rate cached in Redis. The API key is stored encrypted in
AppSetting under EXCHANGERATE_API_KEY (configurable from Admin → Settings).
No fallback rate — if the key is missing or the API fails, callers get None
and must handle the absence themselves.
"""
from decimal import Decimal
import logging
from typing import Optional

import requests
from django.conf import settings
from django.core.cache import cache

from apps.settings_app.services import get_setting

log = logging.getLogger(__name__)

CACHE_KEY = "fx:usd_lkr:v3"
CACHE_TTL_SECONDS = 24 * 60 * 60  # daily refresh


def _fetch_rate() -> Optional[Decimal]:
    api_key = get_setting("EXCHANGERATE_API_KEY", "")
    if not api_key:
        return None
    url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/USD"
    try:
        r = requests.get(url, timeout=5)
        r.raise_for_status()
        data = r.json()
        if data.get("result") != "success":
            log.warning("ExchangeRate-API error: %s", data.get("error-type"))
            return None
        rate = data.get("conversion_rates", {}).get("LKR")
        if rate is None:
            return None
        return Decimal(str(rate)) + settings.FX_MARKUP_LKR
    except Exception as e:
        log.warning("ExchangeRate-API fetch failed: %s", e)
        return None


def usd_to_lkr_rate() -> Optional[Decimal]:
    """Returns current USD→LKR rate, or None if unavailable.

    Cached in Redis for 24h. Cache is bypassed when no value is cached or it
    has expired; fetch failures return None (no fallback).
    """
    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return Decimal(str(cached))

    rate = _fetch_rate()
    if rate is not None:
        cache.set(CACHE_KEY, str(rate), CACHE_TTL_SECONDS)
    return rate


def to_lkr(usd) -> Optional[Decimal]:
    """Convert a USD amount to LKR using the current rate, or None if unavailable."""
    rate = usd_to_lkr_rate()
    if rate is None:
        return None
    if usd in (None, ""):
        return Decimal(0)
    amount = usd if isinstance(usd, Decimal) else Decimal(str(usd))
    return (amount * rate).quantize(Decimal("0.01"))


def refresh_rate() -> Optional[Decimal]:
    """Force-refresh the cached rate (used by the manual refresh button)."""
    cache.delete(CACHE_KEY)
    return usd_to_lkr_rate()
