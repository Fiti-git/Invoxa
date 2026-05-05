"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any>(null);
  const [err, setErr] = useState("");

  const refresh = () =>
    api
      .listDocuments()
      .then(setDocs)
      .catch((e) => setErr(String(e)));

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Link
          href="/documents/upload"
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: "var(--color-primary)" }}
        >
          + Upload PDF
        </Link>
      </div>
      {err && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{err}</div>}
      <div className="rounded-xl border bg-white p-4">
        <table className="w-full text-sm">
          <thead className="text-left opacity-70">
            <tr>
              <th className="py-2">File</th>
              <th>Status</th>
              <th>Invoices</th>
              <th>Pages</th>
              <th>Uploaded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {docs?.results?.map((d: any) => (
              <tr key={d.id} className="border-t">
                <td className="py-2">{d.file_name}</td>
                <td>
                  <span
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      background:
                        d.status === "DRAFT"
                          ? "var(--color-lightsuccess)"
                          : d.status === "FAILED"
                          ? "var(--color-lighterror)"
                          : "var(--color-lightwarning)",
                    }}
                  >
                    {d.status}
                  </span>
                </td>
                <td>{d.invoice_count}</td>
                <td>{d.page_count ?? "—"}</td>
                <td>{new Date(d.created_at).toLocaleString()}</td>
                <td>
                  <Link
                    href={`/documents/${d.id}`}
                    style={{ color: "var(--color-primary)" }}
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {docs && !docs.results?.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center opacity-60">
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
