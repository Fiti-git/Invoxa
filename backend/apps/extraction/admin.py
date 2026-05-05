from django.contrib import admin
from .models import ExtractionRun


@admin.register(ExtractionRun)
class ExtractionRunAdmin(admin.ModelAdmin):
    list_display = (
        "id", "document", "provider", "model", "status",
        "input_tokens", "output_tokens", "raw_cost_usd", "billed_cost_usd",
        "latency_ms", "created_at",
    )
    list_filter = ("status", "provider", "model")
