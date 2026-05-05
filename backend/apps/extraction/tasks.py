"""Celery extraction task with page-range chunking + live progress logging."""
import io
import time
from decimal import Decimal

from celery import shared_task
from django.conf import settings
from django.db import transaction
from pypdf import PdfReader, PdfWriter

from apps.documents.models import Document, InvoiceDraft, InvoiceLineDraft

from .models import ExtractionLog, ExtractionRun
from .prompt import EXTRACTION_PROMPT, PROMPT_VERSION

# Pages per chunk when a PDF is large enough to warrant splitting.
CHUNK_PAGES = 20
CHUNK_THRESHOLD = 30  # PDFs <= this are processed whole


def log(doc, run, message, level=ExtractionLog.LEVEL_INFO, progress=None):
    ExtractionLog.objects.create(
        document=doc, run=run, level=level, message=message[:1024], progress=progress
    )
    if progress is not None:
        Document.objects.filter(pk=doc.pk).update(progress_percent=progress)


def _split_pdf(pdf_bytes: bytes, chunk_size: int = CHUNK_PAGES):
    reader = PdfReader(io.BytesIO(pdf_bytes))
    total = len(reader.pages)
    chunks = []
    for start in range(0, total, chunk_size):
        end = min(start + chunk_size, total)
        writer = PdfWriter()
        for i in range(start, end):
            writer.add_page(reader.pages[i])
        buf = io.BytesIO()
        writer.write(buf)
        chunks.append(
            {"bytes": buf.getvalue(), "start": start + 1, "end": end}
        )
    return chunks, total


def _merge_continuations(invoices):
    """Fold consecutive invoices that share the same invoice_number into one."""
    merged = []
    for inv in invoices:
        num = (inv.get("invoice_number") or "").strip()
        if num and merged and (merged[-1].get("invoice_number") or "").strip() == num:
            prev = merged[-1]
            prev_lines = prev.get("lines") or []
            new_lines = inv.get("lines") or []
            offset = len(prev_lines)
            for i, line in enumerate(new_lines):
                line["line_no"] = offset + i + 1
            prev["lines"] = prev_lines + new_lines
            for k in ("gross_total", "line_discount_total",
                      "header_discount_total", "return_total", "net_total"):
                if inv.get(k):
                    prev[k] = inv[k]
        else:
            merged.append(inv)
    for i, inv in enumerate(merged):
        inv["index_in_document"] = i
    return merged


@shared_task(bind=True, acks_late=True, max_retries=2)
def extract_document(self, document_id: int):
    doc = Document.objects.get(pk=document_id)
    doc.status = Document.STATUS_EXTRACTING
    doc.progress_percent = 0
    doc.save(update_fields=["status", "progress_percent", "updated_at"])

    run = ExtractionRun.objects.create(
        document=doc, status=ExtractionRun.STATUS_RUNNING
    )

    started = time.time()
    try:
        from apps.llm.providers.registry import get_default_provider
        provider = get_default_provider()

        with doc.file.open("rb") as fh:
            pdf_bytes = fh.read()

        # Inspect page count
        try:
            page_count = len(PdfReader(io.BytesIO(pdf_bytes)).pages)
        except Exception:
            page_count = 0
        run.total_pages = page_count
        Document.objects.filter(pk=doc.pk).update(page_count=page_count)
        log(doc, run, f"PDF has {page_count} page(s).", progress=2)

        # Decide: single-shot or chunked?
        if page_count <= CHUNK_THRESHOLD:
            log(doc, run, "Sending whole PDF to extractor…", progress=5)
            chunks = [{"bytes": pdf_bytes, "start": 1, "end": page_count or 1}]
        else:
            chunks, _ = _split_pdf(pdf_bytes, CHUNK_PAGES)
            log(
                doc, run,
                f"Large PDF — split into {len(chunks)} chunk(s) of {CHUNK_PAGES} pages.",
                progress=5,
            )

        run.chunks_total = len(chunks)
        run.save(update_fields=["total_pages", "chunks_total"])

        # Run each chunk and aggregate
        all_invoices = []
        total_input_tokens = 0
        total_output_tokens = 0
        total_raw_cost = Decimal(0)
        document_type = "GENERIC"
        last_raw_response = {}

        for i, ch in enumerate(chunks, start=1):
            log(
                doc, run,
                f"Chunk {i}/{len(chunks)} (pages {ch['start']}–{ch['end']}) — calling LLM…",
                progress=int(5 + 80 * (i - 1) / max(1, len(chunks))),
            )
            t0 = time.time()
            result = provider.extract_invoices(
                pdf_bytes=ch["bytes"],
                prompt=EXTRACTION_PROMPT,
            )
            elapsed_ms = int((time.time() - t0) * 1000)

            payload = result.get("parsed") or {}
            chunk_invoices = payload.get("invoices") or []
            if payload.get("document_type"):
                document_type = payload["document_type"]
            total_input_tokens += int(result.get("input_tokens", 0) or 0)
            total_output_tokens += int(result.get("output_tokens", 0) or 0)
            total_raw_cost += Decimal(str(result.get("raw_cost_usd", 0) or 0))
            last_raw_response = result.get("raw_response", {})

            all_invoices.extend(chunk_invoices)
            run.chunks_done = i
            run.save(update_fields=["chunks_done"])
            log(
                doc, run,
                f"Chunk {i} returned {len(chunk_invoices)} invoice(s) in {elapsed_ms} ms.",
                progress=int(5 + 80 * i / max(1, len(chunks))),
            )

        # Assemble run cost & meta
        run.provider = result["provider"]
        run.model = result["model"]
        run.prompt_version = PROMPT_VERSION
        run.input_tokens = total_input_tokens
        run.output_tokens = total_output_tokens
        run.raw_cost_usd = total_raw_cost.quantize(Decimal("0.000001"))
        markup = Decimal(1) + (Decimal(settings.MARKUP_PERCENT) / Decimal(100))
        run.billed_cost_usd = (run.raw_cost_usd * markup).quantize(Decimal("0.000001"))
        run.raw_response_json = last_raw_response
        run.latency_ms = int((time.time() - started) * 1000)

        # Merge continuations across chunk boundaries
        log(doc, run, f"Merging continuations across {len(all_invoices)} invoice(s)…", progress=88)
        invoices = _merge_continuations(all_invoices)
        doc.template_guess = document_type

        with transaction.atomic():
            InvoiceDraft.objects.filter(document=doc).delete()
            for idx, inv in enumerate(invoices):
                draft = InvoiceDraft.objects.create(
                    document=doc,
                    index_in_document=inv.get("index_in_document", idx),
                    invoice_number=inv.get("invoice_number", "") or "",
                    invoice_date=inv.get("invoice_date") or None,
                    customer_name=inv.get("customer_name", "") or "",
                    customer_code=inv.get("customer_code", "") or "",
                    customer_address=inv.get("customer_address", "") or "",
                    customer_tel=inv.get("customer_tel", "") or "",
                    sales_rep=inv.get("sales_rep", "") or "",
                    route=inv.get("route", "") or "",
                    territory=inv.get("territory", "") or "",
                    payment_type=inv.get("payment_type", "") or "",
                    currency=inv.get("currency", "LKR") or "LKR",
                    gross_total=Decimal(str(inv.get("gross_total", 0) or 0)),
                    line_discount_total=Decimal(str(inv.get("line_discount_total", 0) or 0)),
                    header_discount_total=Decimal(str(inv.get("header_discount_total", 0) or 0)),
                    return_total=Decimal(str(inv.get("return_total", 0) or 0)),
                    net_total=Decimal(str(inv.get("net_total", 0) or 0)),
                )
                for line in inv.get("lines", []):
                    InvoiceLineDraft.objects.create(
                        invoice_draft=draft,
                        line_no=line.get("line_no", 0) or 0,
                        description=line.get("description", "") or "",
                        unit_qty=Decimal(str(line.get("unit_qty", 0) or 0)),
                        free_qty=Decimal(str(line.get("free_qty", 0) or 0)),
                        unit_price=Decimal(str(line.get("unit_price", 0) or 0)),
                        line_discount=Decimal(str(line.get("line_discount", 0) or 0)),
                        gross_value=Decimal(str(line.get("gross_value", 0) or 0)),
                    )

            doc.status = Document.STATUS_DRAFT
            doc.progress_percent = 100
            doc.save(update_fields=["status", "template_guess", "progress_percent", "updated_at"])

        run.status = ExtractionRun.STATUS_SUCCESS
        run.save()
        log(doc, run, f"Done. {len(invoices)} invoice(s) extracted.", progress=100)
        return {"document_id": doc.id, "invoices": len(invoices)}

    except Exception as e:
        run.status = ExtractionRun.STATUS_FAILED
        run.error_message = str(e)
        run.latency_ms = int((time.time() - started) * 1000)
        run.save()
        doc.status = Document.STATUS_FAILED
        doc.error_message = str(e)
        doc.save(update_fields=["status", "error_message", "updated_at"])
        log(doc, run, f"Extraction failed: {e}", level=ExtractionLog.LEVEL_ERROR)
        raise
