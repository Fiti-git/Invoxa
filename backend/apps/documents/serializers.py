from django.db import transaction
from rest_framework import serializers

from .models import Document, InvoiceDraft, InvoiceLineDraft


class InvoiceLineDraftSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = InvoiceLineDraft
        fields = [
            "id", "line_no", "description", "unit_qty", "free_qty",
            "unit_price", "line_discount", "gross_value", "extra_json",
        ]


class InvoiceDraftSerializer(serializers.ModelSerializer):
    lines = InvoiceLineDraftSerializer(many=True, required=False)
    document_file_name = serializers.CharField(
        source="document.file_name", read_only=True
    )
    line_count = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceDraft
        fields = [
            "id", "document", "document_file_name", "index_in_document",
            "invoice_number", "invoice_date",
            "customer_name", "customer_code", "customer_address", "customer_tel",
            "sales_rep", "route", "territory", "payment_type",
            "gross_total", "line_discount_total", "header_discount_total",
            "return_total", "net_total", "currency", "extra_json", "status",
            "committed_at", "created_at", "updated_at", "line_count", "lines",
        ]
        read_only_fields = ["created_at", "updated_at", "committed_at"]

    def get_line_count(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "lines" in obj._prefetched_objects_cache:
            return len(obj._prefetched_objects_cache["lines"])
        return obj.lines.count()

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if instance.status == InvoiceDraft.STATUS_DRAFT:
            instance.status = InvoiceDraft.STATUS_EDITED
        instance.save()

        if lines_data is not None:
            existing = {l.id: l for l in instance.lines.all()}
            seen_ids = set()
            for idx, line in enumerate(lines_data):
                line_id = line.pop("id", None)
                line.setdefault("line_no", idx + 1)
                if line_id and line_id in existing:
                    obj = existing[line_id]
                    for k, v in line.items():
                        setattr(obj, k, v)
                    obj.save()
                    seen_ids.add(line_id)
                else:
                    obj = InvoiceLineDraft.objects.create(
                        invoice_draft=instance, **line
                    )
                    seen_ids.add(obj.id)
            for old_id, old_obj in existing.items():
                if old_id not in seen_ids:
                    old_obj.delete()
        return instance


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    invoice_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "uuid", "file_name", "size_bytes", "page_count", "status",
            "template_guess", "error_message", "created_at", "updated_at",
            "file_url", "invoice_count",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None

    def get_invoice_count(self, obj):
        return obj.invoices.count()


class DocumentDetailSerializer(DocumentSerializer):
    invoices = InvoiceDraftSerializer(many=True, read_only=True)

    class Meta(DocumentSerializer.Meta):
        fields = DocumentSerializer.Meta.fields + ["invoices"]
