"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { PdfUploadSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const router = useRouter();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const onPick = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    const result = PdfUploadSchema.safeParse(f);
    if (!result.success) {
      toast.error(result.error.issues.map((i) => i.message).join("\n"));
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const doc = await api.uploadDocument(file);
      toast.success(`Uploaded "${doc.file_name}". Extraction queued.`);
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "CAP_EXCEEDED") {
        toast.error(e.message);
      } else {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Upload an invoice PDF</h1>
        <p className="text-sm text-link mt-1">
          Up to 100 MB. Large PDFs are split into 20-page chunks automatically and
          extraction continues in the background — you can close this tab.
        </p>
      </div>

      <label
        className="rounded-xl border-2 border-dashed p-10 text-center bg-background cursor-pointer block hover:bg-lightprimary/30"
        style={{ borderColor: "var(--color-primary)" }}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <Icon
          icon="solar:upload-square-linear"
          width={42}
          className="mx-auto text-primary"
        />
        <div className="mt-2 text-sm font-medium">
          Click to choose a PDF
        </div>
        {file && (
          <p className="mt-3 text-xs text-link">
            Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
          </p>
        )}
      </label>

      <Button onClick={submit} disabled={!file || busy} className="w-full">
        {busy ? "Uploading…" : "Upload & extract"}
      </Button>
    </div>
  );
}
