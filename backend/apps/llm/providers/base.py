"""LLM provider interface."""
from abc import ABC, abstractmethod


class LlmProvider(ABC):
    name: str = "base"
    model: str = ""

    @abstractmethod
    def extract_invoices(self, pdf_bytes: bytes, prompt: str) -> dict:
        """
        Returns:
          {
            "provider": "gemini" | "openai" | "fake",
            "model": "...",
            "input_tokens": int,
            "output_tokens": int,
            "raw_cost_usd": float,
            "raw_response": dict,   # full provider response for debugging
            "parsed": dict,         # the JSON our prompt asked for
          }
        """
