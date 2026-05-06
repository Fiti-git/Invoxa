"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { hasPerm } = useAuth();
  const canSeeCost = hasPerm("billing.view");
  const canSeeDocs = hasPerm("invoices.view");
  const [summary, setSummary] = useState<any>(null);
  const [docs, setDocs] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    const calls: Promise<any>[] = [];
    calls.push(canSeeCost ? api.costSummary() : Promise.resolve(null));
    calls.push(canSeeDocs ? api.listDocuments() : Promise.resolve(null));
    Promise.all(calls)
      .then(([s, d]) => {
        setSummary(s);
        setDocs(d);
      })
      .catch((e) => setErr(String(e)));
  }, [canSeeCost, canSeeDocs]);

  const tile = (label: string, value: string, sub?: string) => (
    <div
      className="rounded-xl p-5 border"
      style={{
        background:
          "linear-gradient(135deg, var(--color-lightprimary) 0%, var(--color-lightwarning) 100%)",
        borderColor: "var(--color-defaultBorder)",
      }}
    >
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome to Invoxa</h1>
        <p className="opacity-70">
          Upload invoice PDFs, let Gemini extract them into editable drafts.
        </p>
      </div>

      {err && (
        <div className="p-4 rounded bg-red-50 text-red-700 text-sm">
          Could not reach backend: {err}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tile(
            "Documents (last 7d)",
            String(summary.documents.last_7d),
            `${summary.documents.today} today`
          )}
          {tile(
            "Extractions (last 7d)",
            String(summary.last_7d.extractions),
            `${summary.success_rate_percent}% success`
          )}
          {canSeeCost && tile(
            "Cost (last 7d)",
            summary.fx?.available && summary.last_7d.billed_lkr != null
              ? `LKR ${Number(summary.last_7d.billed_lkr).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—",
            summary.fx?.available
              ? `1 USD = ${Number(summary.fx.usd_lkr).toFixed(2)} LKR`
              : "FX key not set"
          )}
          {tile(
            "Avg latency",
            `${summary.totals.avg_latency_ms} ms`,
            `${summary.totals.extractions} runs total`
          )}
        </div>
      )}

      {canSeeDocs && (
      <div className="rounded-xl border p-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent uploads</h2>
          {hasPerm("documents.upload") && (
          <Link
            href="/documents/upload"
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: "var(--color-primary)" }}
          >
            + Upload PDF
          </Link>
          )}
        </div>
        {docs?.results?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2">File</th>
                  <th>Status</th>
                  <th>Invoices</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {docs.results.slice(0, 8).map((d: any) => (
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
                    <td>{new Date(d.created_at).toLocaleString()}</td>
                    <td>
                      <Link
                        href={`/documents/${d.id}`}
                        className="text-sm font-medium"
                        style={{ color: "var(--color-primary)" }}
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="opacity-60 text-sm">No documents yet — upload your first PDF.</p>
        )}
      </div>
      )}
    </div>
  );
}
