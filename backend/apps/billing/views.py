from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Avg
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.documents.models import Document
from apps.extraction.models import ExtractionRun

from apps.organizations.models import Organization

from .caps import month_to_date_lkr
from .fx import refresh_rate, to_lkr, usd_to_lkr_rate


def _bucket(qs, rate):
    agg = qs.aggregate(billed=Sum("billed_cost_usd"), count=Count("id"))
    raw = agg["billed"] or Decimal(0)
    billed_lkr = (raw * rate).quantize(Decimal("0.01")) if rate is not None else None
    return {
        "billed_lkr": str(billed_lkr) if billed_lkr is not None else None,
        "extractions": agg["count"] or 0,
    }


class CostSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)

        all_runs = ExtractionRun.objects.all()
        success = all_runs.filter(status=ExtractionRun.STATUS_SUCCESS)

        total_agg = success.aggregate(
            billed=Sum("billed_cost_usd"),
            count=Count("id"),
            avg_latency=Avg("latency_ms"),
        )

        success_rate = 0.0
        if all_runs.count():
            success_rate = round(100.0 * success.count() / all_runs.count(), 2)

        rate = usd_to_lkr_rate()
        total_billed = total_agg["billed"] or Decimal(0)
        total_lkr = (total_billed * rate).quantize(Decimal("0.01")) if rate is not None else None

        return Response(
            {
                "totals": {
                    "billed_lkr": str(total_lkr) if total_lkr is not None else None,
                    "extractions": total_agg["count"] or 0,
                    "avg_latency_ms": int(total_agg["avg_latency"] or 0),
                },
                "last_7d": _bucket(success.filter(created_at__gte=last_7d), rate),
                "last_30d": _bucket(success.filter(created_at__gte=last_30d), rate),
                "documents": {
                    "today": Document.objects.filter(created_at__date=today).count(),
                    "last_7d": Document.objects.filter(created_at__gte=last_7d).count(),
                    "last_30d": Document.objects.filter(created_at__gte=last_30d).count(),
                },
                "success_rate_percent": success_rate,
                "fx": {
                    "currency": "LKR",
                    "usd_lkr": str(rate) if rate is not None else None,
                    "available": rate is not None,
                },
            }
        )


class RecentRunsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        runs = (
            ExtractionRun.objects.select_related("document")
            .order_by("-created_at")[:50]
        )
        rate = usd_to_lkr_rate()
        data = []
        for r in runs:
            billed = r.billed_cost_usd or Decimal(0)
            billed_lkr = (
                (billed * rate).quantize(Decimal("0.01"))
                if rate is not None
                else None
            )
            data.append(
                {
                    "id": r.id,
                    "document_id": r.document_id,
                    "document_name": r.document.file_name if r.document else "",
                    "provider": r.provider,
                    "model": r.model,
                    "status": r.status,
                    "input_tokens": r.input_tokens,
                    "output_tokens": r.output_tokens,
                    "billed_lkr": str(billed_lkr) if billed_lkr is not None else None,
                    "latency_ms": r.latency_ms,
                    "created_at": r.created_at.isoformat(),
                    "error_message": r.error_message,
                }
            )
        return Response(
            {
                "runs": data,
                "currency": "LKR",
                "fx_available": rate is not None,
            }
        )


class FxRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        rate = refresh_rate()
        return Response(
            {"usd_lkr": str(rate) if rate is not None else None, "available": rate is not None}
        )


class CapView(APIView):
    """GET / PUT the current (default) org's monthly spend cap and usage."""
    permission_classes = [AllowAny]

    def _org(self, request):
        if request.user.is_authenticated and request.user.memberships.exists():
            return request.user.memberships.first().organization
        return Organization.objects.filter(slug="default").first()

    def get(self, request):
        org = self._org(request)
        used = month_to_date_lkr(org.id if org else None)
        cap = Decimal(org.monthly_cap_lkr or 0) if org else Decimal(0)
        return Response({
            "org": org.name if org else None,
            "monthly_cap_lkr": str(cap),
            "month_to_date_lkr": str(used),
            "exceeded": cap > 0 and used >= cap,
        })

    def put(self, request):
        org = self._org(request)
        if not org:
            return Response({"detail": "no organization"}, status=400)
        try:
            cap = Decimal(str(request.data.get("monthly_cap_lkr", "0")))
        except Exception:
            return Response({"detail": "invalid cap"}, status=400)
        org.monthly_cap_lkr = cap
        org.save(update_fields=["monthly_cap_lkr"])
        return self.get(request)
