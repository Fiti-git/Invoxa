"""Fake provider — used when no Gemini key is configured.

Lets you see the full upload→extract→draft→edit flow without spending money.
"""
from .base import LlmProvider


class FakeProvider(LlmProvider):
    name = "fake"
    model = "fake-extractor-v1"

    def extract_invoices(self, pdf_bytes: bytes, prompt: str) -> dict:
        parsed = {
            "document_type": "GENERIC",
            "invoices": [
                {
                    "index_in_document": 0,
                    "invoice_number": "DEMO-0001",
                    "invoice_date": "2025-09-01",
                    "customer_name": "Demo Customer (no API key set)",
                    "customer_code": "DEMO0001",
                    "customer_address": "Configure Gemini API key in Settings to extract real data.",
                    "customer_tel": "",
                    "sales_rep": "Demo Rep",
                    "route": "Demo Route",
                    "territory": "Demo Territory",
                    "payment_type": "Cash",
                    "currency": "LKR",
                    "gross_total": 1000.00,
                    "line_discount_total": 0.00,
                    "header_discount_total": 0.00,
                    "return_total": 0.00,
                    "net_total": 1000.00,
                    "lines": [
                        {
                            "line_no": 1,
                            "description": "Sample line item — replace by enabling Gemini",
                            "unit_qty": 1,
                            "free_qty": 0,
                            "unit_price": 1000.00,
                            "line_discount": 0,
                            "gross_value": 1000.00,
                        },
                    ],
                }
            ],
        }
        return {
            "provider": self.name,
            "model": self.model,
            "input_tokens": 0,
            "output_tokens": 0,
            "raw_cost_usd": 0.0,
            "raw_response": {"note": "fake provider — configure Gemini API key"},
            "parsed": parsed,
        }
