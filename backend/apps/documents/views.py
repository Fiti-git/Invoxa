import csv
import hashlib

from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.billing.caps import cap_exceeded
from apps.organizations.models import Organization

from .models import Document, InvoiceDraft, InvoiceLineDraft
from .serializers import (
    DocumentSerializer, DocumentDetailSerializer,
    InvoiceDraftSerializer, InvoiceLineDraftSerializer,
)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    permission_classes = [AllowAny]  # vertical slice — auth wired later
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentDetailSerializer
        return DocumentSerializer

    def create(self, request, *args, **kwargs):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "file is required"}, status=400)
        if not upload.name.lower().endswith(".pdf"):
            return Response({"detail": "only .pdf accepted"}, status=400)
        max_mb = 100
        if upload.size > max_mb * 1024 * 1024:
            return Response(
                {"detail": f"file too large (max {max_mb} MB)"}, status=400
            )

        # Pick org (default org for now — will be request.user.org once auth lands)
        org = (
            request.user.memberships.first().organization
            if request.user.is_authenticated and request.user.memberships.exists()
            else Organization.objects.filter(slug="default").first()
        )

        # Per-org monthly spend cap
        if org:
            exceeded, used, cap = cap_exceeded(org)
            if exceeded:
                return Response(
                    {
                        "detail": f"Monthly spend cap reached: LKR {used} / {cap}. "
                                  "Increase the cap in Settings to continue.",
                        "code": "CAP_EXCEEDED",
                    },
                    status=402,
                )

        # Hash the file for idempotency
        sha = hashlib.sha256()
        for chunk in upload.chunks():
            sha.update(chunk)
        upload.seek(0)
        file_hash = sha.hexdigest()

        # Idempotency: if we've seen this file in this org and extraction succeeded,
        # link to the existing document instead of charging Gemini again.
        existing = (
            Document.objects.filter(file_hash=file_hash, organization=org, status=Document.STATUS_DRAFT)
            .order_by("-created_at")
            .first()
        )
        if existing:
            return Response(
                DocumentSerializer(existing, context={"request": request}).data,
                status=200,
                headers={"X-Idempotent-Hit": "1"},
            )

        doc = Document.objects.create(
            file=upload,
            file_name=upload.name,
            file_hash=file_hash,
            size_bytes=upload.size,
            organization=org,
            uploader=request.user if request.user.is_authenticated else None,
            status=Document.STATUS_UPLOADED,
        )

        # Enqueue extraction
        from apps.extraction.tasks import extract_document
        extract_document.delay(doc.id)

        return Response(
            DocumentSerializer(doc, context={"request": request}).data, status=201
        )

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        """Tail recent extraction log lines for live UI progress."""
        from apps.extraction.models import ExtractionLog
        doc = self.get_object()
        try:
            since_id = int(request.query_params.get("since", 0))
        except ValueError:
            since_id = 0
        rows = (
            ExtractionLog.objects.filter(document=doc, id__gt=since_id)
            .order_by("id")[:200]
        )
        return Response({
            "logs": [
                {
                    "id": r.id,
                    "level": r.level,
                    "message": r.message,
                    "progress": r.progress,
                    "created_at": r.created_at.isoformat(),
                }
                for r in rows
            ],
            "progress_percent": doc.progress_percent,
            "status": doc.status,
        })

    @action(detail=True, methods=["post"])
    def reextract(self, request, pk=None):
        doc = self.get_object()
        from apps.extraction.tasks import extract_document
        doc.status = Document.STATUS_EXTRACTING
        doc.error_message = ""
        doc.progress_percent = 0
        doc.save(update_fields=["status", "error_message", "progress_percent", "updated_at"])
        extract_document.delay(doc.id)
        return Response({"queued": True})


class InvoiceDraftViewSet(viewsets.ModelViewSet):
    queryset = (
        InvoiceDraft.objects.all()
        .select_related("document")
        .prefetch_related("lines")
        .order_by("-document__created_at", "index_in_document")
    )
    serializer_class = InvoiceDraftSerializer
    permission_classes = [AllowAny]
    pagination_class = None  # return all in one shot for the grid

    def update(self, request, *args, **kwargs):
        return self._guarded_update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._guarded_update(request, *args, partial=True, **kwargs)

    def _guarded_update(self, request, *args, **kwargs):
        """Optimistic locking: client sends `updated_at` they last saw."""
        instance = self.get_object()
        client_ts = request.data.get("updated_at") if isinstance(request.data, dict) else None
        if client_ts:
            server_ts = instance.updated_at.isoformat()
            # Truncate microseconds for tolerant comparison
            if client_ts[:19] != server_ts[:19]:
                return Response(
                    {
                        "detail": "This invoice was modified by someone else. "
                                  "Reload to see the latest version before saving.",
                        "code": "STALE",
                        "server_updated_at": server_ts,
                    },
                    status=409,
                )
        return super().partial_update(request, *args, **kwargs) if kwargs.get("partial") else super().update(request, *args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if status_q := params.get("status"):
            qs = qs.filter(status=status_q.upper())
        if doc_id := params.get("document"):
            qs = qs.filter(document_id=doc_id)
        if q := params.get("q"):
            from django.db.models import Q
            qs = qs.filter(
                Q(invoice_number__icontains=q)
                | Q(customer_name__icontains=q)
                | Q(customer_code__icontains=q)
                | Q(document__file_name__icontains=q)
            )
        return qs

    @action(detail=False, methods=["get"], url_path="export.csv")
    def export_csv(self, request):
        """Stream invoices + lines as CSV. Honors the same filters as list."""
        qs = self.filter_queryset(self.get_queryset())

        header = [
            "document", "invoice_index", "invoice_id", "invoice_number",
            "invoice_date", "customer_name", "customer_code", "customer_address",
            "customer_tel", "sales_rep", "route", "territory", "payment_type",
            "currency", "gross_total", "line_discount_total",
            "header_discount_total", "return_total", "net_total", "status",
            "committed_at",
            "line_no", "description", "unit_qty", "free_qty", "unit_price",
            "line_discount", "gross_value",
        ]

        class Echo:
            def write(self, value):
                return value

        writer = csv.writer(Echo())

        def rows():
            yield writer.writerow(header)
            for inv in qs:
                base = [
                    inv.document.file_name if inv.document else "",
                    inv.index_in_document, inv.id, inv.invoice_number,
                    inv.invoice_date.isoformat() if inv.invoice_date else "",
                    inv.customer_name, inv.customer_code,
                    inv.customer_address.replace("\n", " ").replace("\r", " "),
                    inv.customer_tel, inv.sales_rep, inv.route, inv.territory,
                    inv.payment_type, inv.currency,
                    str(inv.gross_total), str(inv.line_discount_total),
                    str(inv.header_discount_total), str(inv.return_total),
                    str(inv.net_total), inv.status,
                    inv.committed_at.isoformat() if inv.committed_at else "",
                ]
                lines = list(inv.lines.all().order_by("line_no"))
                if not lines:
                    yield writer.writerow(base + ["", "", "", "", "", "", ""])
                    continue
                for ln in lines:
                    yield writer.writerow(
                        base + [
                            ln.line_no,
                            (ln.description or "").replace("\n", " ").replace("\r", " "),
                            str(ln.unit_qty), str(ln.free_qty),
                            str(ln.unit_price), str(ln.line_discount),
                            str(ln.gross_value),
                        ]
                    )

        stamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        resp = StreamingHttpResponse(rows(), content_type="text/csv")
        resp["Content-Disposition"] = (
            f'attachment; filename="invoxa-invoices-{stamp}.csv"'
        )
        return resp

    @action(detail=True, methods=["post"])
    def commit(self, request, pk=None):
        from django.utils import timezone
        inv = self.get_object()
        inv.status = InvoiceDraft.STATUS_COMMITTED
        inv.committed_at = timezone.now()
        inv.save(update_fields=["status", "committed_at", "updated_at"])
        return Response(InvoiceDraftSerializer(inv).data)

    @action(detail=True, methods=["post"], url_path="merge_next")
    def merge_next(self, request, pk=None):
        """Merge this invoice draft with the next one in the same document.

        Lines are concatenated and renumbered; totals from the next invoice
        overwrite (since the next page is usually the one that has grand
        totals). The next invoice draft is deleted, and indexes are renumbered.
        """
        from django.db import transaction as db_tx
        inv = self.get_object()
        next_inv = (
            InvoiceDraft.objects.filter(
                document=inv.document,
                index_in_document__gt=inv.index_in_document,
            )
            .order_by("index_in_document")
            .first()
        )
        if not next_inv:
            return Response({"detail": "No next invoice to merge."}, status=400)
        if inv.status == InvoiceDraft.STATUS_COMMITTED or next_inv.status == InvoiceDraft.STATUS_COMMITTED:
            return Response({"detail": "Cannot merge committed invoices."}, status=400)

        with db_tx.atomic():
            offset = inv.lines.count()
            for i, line in enumerate(next_inv.lines.all().order_by("line_no")):
                line.invoice_draft = inv
                line.line_no = offset + i + 1
                line.save(update_fields=["invoice_draft", "line_no"])

            for fld in ("gross_total", "line_discount_total",
                        "header_discount_total", "return_total", "net_total"):
                v = getattr(next_inv, fld, None)
                if v:
                    setattr(inv, fld, v)
            if inv.status == InvoiceDraft.STATUS_DRAFT:
                inv.status = InvoiceDraft.STATUS_EDITED
            inv.save()
            next_inv.delete()

            # Re-index remaining drafts in this document
            for new_idx, d in enumerate(
                InvoiceDraft.objects.filter(document=inv.document)
                .order_by("index_in_document")
            ):
                if d.index_in_document != new_idx:
                    d.index_in_document = new_idx
                    d.save(update_fields=["index_in_document"])

        inv.refresh_from_db()
        return Response(InvoiceDraftSerializer(inv).data)


class InvoiceLineDraftViewSet(viewsets.ModelViewSet):
    queryset = InvoiceLineDraft.objects.all()
    serializer_class = InvoiceLineDraftSerializer
    permission_classes = [AllowAny]
