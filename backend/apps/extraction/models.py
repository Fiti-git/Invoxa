from django.db import models
from apps.documents.models import Document


class ExtractionRun(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_RUNNING = "RUNNING"
    STATUS_SUCCESS = "SUCCESS"
    STATUS_FAILED = "FAILED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_RUNNING, "Running"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    ]

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="extraction_runs")
    provider = models.CharField(max_length=32, default="gemini")
    model = models.CharField(max_length=64, default="gemini-2.5-flash")
    prompt_version = models.CharField(max_length=32, default="v1")
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    raw_cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    billed_cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    latency_ms = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    error_message = models.TextField(blank=True, default="")
    raw_response_json = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Progress (filled in during chunked extraction of large PDFs)
    total_pages = models.IntegerField(default=0)
    chunks_total = models.IntegerField(default=0)
    chunks_done = models.IntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at", "provider"]),
        ]


class ExtractionLog(models.Model):
    """Append-only progress/event log for live UI tail-ing."""

    LEVEL_INFO = "INFO"
    LEVEL_WARN = "WARN"
    LEVEL_ERROR = "ERROR"
    LEVEL_CHOICES = [(LEVEL_INFO, "Info"), (LEVEL_WARN, "Warn"), (LEVEL_ERROR, "Error")]

    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="logs"
    )
    run = models.ForeignKey(
        ExtractionRun, on_delete=models.CASCADE, related_name="logs",
        null=True, blank=True,
    )
    level = models.CharField(max_length=8, choices=LEVEL_CHOICES, default=LEVEL_INFO)
    message = models.CharField(max_length=1024)
    progress = models.IntegerField(null=True, blank=True)  # 0..100
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["document", "created_at"])]
