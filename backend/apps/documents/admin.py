from django.contrib import admin
from .models import Document, InvoiceDraft, InvoiceLineDraft


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "file_name", "status", "page_count", "created_at")
    list_filter = ("status",)
    search_fields = ("file_name", "uuid")


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLineDraft
    extra = 0


@admin.register(InvoiceDraft)
class InvoiceDraftAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "index_in_document", "invoice_number", "customer_name", "net_total", "status")
    list_filter = ("status",)
    search_fields = ("invoice_number", "customer_name")
    inlines = [InvoiceLineInline]
