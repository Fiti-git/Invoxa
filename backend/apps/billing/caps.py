"""Per-org monthly spend cap check."""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from apps.extraction.models import ExtractionRun

from .fx import usd_to_lkr_rate


def month_to_date_lkr(org_id) -> Decimal:
    start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    qs = ExtractionRun.objects.filter(
        status=ExtractionRun.STATUS_SUCCESS, created_at__gte=start
    )
    if org_id:
        qs = qs.filter(document__organization_id=org_id)
    total_usd = qs.aggregate(s=Sum("billed_cost_usd"))["s"] or Decimal(0)
    rate = usd_to_lkr_rate() or Decimal(0)
    return (total_usd * rate).quantize(Decimal("0.01"))


def cap_exceeded(org) -> tuple[bool, Decimal, Decimal]:
    """Returns (is_exceeded, used_lkr, cap_lkr). If cap is 0, never exceeded."""
    cap = Decimal(org.monthly_cap_lkr or 0) if org else Decimal(0)
    used = month_to_date_lkr(org.id if org else None)
    if cap == 0:
        return False, used, cap
    return used >= cap, used, cap
