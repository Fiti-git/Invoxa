"""Gemini Flash provider via google-genai SDK.

Pricing snapshot for cost estimation (override via env GEMINI_INPUT_USD_PER_1K /
GEMINI_OUTPUT_USD_PER_1K). Defaults reflect Gemini 2.5 Flash class pricing.
"""
import json
import os
import re

from .base import LlmProvider


def _strip_json_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        # remove first fence and language tag
        text = re.sub(r"^```[a-zA-Z]*\n", "", text)
        text = re.sub(r"\n```$", "", text)
    return text.strip()


class GeminiProvider(LlmProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self.input_usd_per_1k = float(os.environ.get("GEMINI_INPUT_USD_PER_1K", "0.000075"))
        self.output_usd_per_1k = float(os.environ.get("GEMINI_OUTPUT_USD_PER_1K", "0.0003"))

    def extract_invoices(self, pdf_bytes: bytes, prompt: str) -> dict:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.api_key)

        response = client.models.generate_content(
            model=self.model,
            contents=[
                types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )

        text = response.text or ""
        try:
            parsed = json.loads(_strip_json_fence(text))
        except json.JSONDecodeError:
            parsed = {"document_type": "GENERIC", "invoices": []}

        usage = getattr(response, "usage_metadata", None)
        input_tokens = getattr(usage, "prompt_token_count", 0) or 0
        output_tokens = getattr(usage, "candidates_token_count", 0) or 0
        raw_cost = (
            input_tokens / 1000.0 * self.input_usd_per_1k
            + output_tokens / 1000.0 * self.output_usd_per_1k
        )

        return {
            "provider": self.name,
            "model": self.model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "raw_cost_usd": raw_cost,
            "raw_response": {"text_preview": text[:1000]},
            "parsed": parsed,
        }
