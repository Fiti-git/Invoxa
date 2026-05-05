import uuid
from django.conf import settings
from django.db import models
from apps.organizations.models import Organization


def document_upload_path(instance, filename):
    return f"org_{instance.organization_id}/{instance.uuid}.pdf"


class Document(models.Model):
    STATUS_UPLOADED = "UPLOADED"
    STATUS_EXTRACTING = "EXTRACTING"
    STATUS_DRAFT = "DRAFT"
    STATUS_REVIEWED = "REVIEWED"
    STATUS_COMMITTED = "COMMITTED"
    STATUS_FAILED = "FAILED"
    STATUS_CHOICES = [
        (STATUS_UPLOADED, "Uploaded"),
        (STATUS_EXTRACTING, "Extracting"),
        (STATUS_DRAFT, "Draft"),
        (STATUS_REVIEWED, "Reviewed"),
        (STATUS_COMMITTED, "Committed"),
        (STATUS_FAILED, "Failed"),
    ]

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="documents", null=True, blank=True
    )
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
    )
    file = models.FileField(upload_to=document_upload_path)
    file_name = models.CharField(max_length=512)
    file_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    size_bytes = models.BigIntegerField(default=0)
    page_count = models.IntegerField(null=True, blank=True)
    progress_percent = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    template_guess = models.CharField(max_length=64, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "-created_at"]),
            models.Index(fields=["organization", "status"]),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.status})"


class InvoiceDraft(models.Model):
    STATUS_DRAFT = "DRAFT"
    STATUS_EDITED = "EDITED"
    STATUS_COMMITTED = "COMMITTED"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_EDITED, "Edited"),
        (STATUS_COMMITTED, "Committed"),
    ]

    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="invoices"
    )
    index_in_document = models.IntegerField()
    invoice_number = models.CharField(max_length=128, blank=True, default="")
    invoice_date = models.DateField(null=True, blank=True)
    customer_name = models.CharField(max_length=512, blank=True, default="")
    customer_code = models.CharField(max_length=128, blank=True, default="")
    customer_address = models.TextField(blank=True, default="")
    customer_tel = models.CharField(max_length=64, blank=True, default="")
    sales_rep = models.CharField(max_length=200, blank=True, default="")
    route = models.CharField(max_length=128, blank=True, default="")
    territory = models.CharField(max_length=200, blank=True, default="")
    payment_type = models.CharField(max_length=64, blank=True, default="")
    gross_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    line_discount_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    header_discount_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    return_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="LKR")
    extra_json = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    committed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["document", "index_in_document"]
        unique_together = [("document", "index_in_document")]


class InvoiceLineDraft(models.Model):
    invoice_draft = models.ForeignKey(
        InvoiceDraft, on_delete=models.CASCADE, related_name="lines"
    )
    line_no = models.IntegerField()
    description = models.CharField(max_length=512)
    unit_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    free_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    line_discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    gross_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    extra_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["invoice_draft", "line_no"]
