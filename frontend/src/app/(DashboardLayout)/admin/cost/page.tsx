"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const fmtLkr = (v: any) =>
  v == null
    ? "—"
    : `LKR ${Number(v).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

export default function CostPage() {
  const [s, setS] = useState<any>(null);
  const [runs, setRuns] = useState<any>(null);

  useEffect(() => {
    Promise.all([api.costSummary(), api.recentRuns()]).then(([a, b]) => {
      setS(a);
      setRuns(b);
    });
  }, []);

  if (!s) return <div className="opacity-60">Loading…</div>;

  const tile = (label: string, value: string) => (
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
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Cost & Usage</h1>
          <p className="opacity-70 text-sm">
            All amounts shown in Sri Lankan Rupees.
          </p>
        </div>
        <div className="text-xs text-link">
          {s.fx?.available
            ? `FX rate: 1 USD = ${Number(s.fx.usd_lkr).toFixed(2)} LKR`
            : "FX rate unavailable — set the ExchangeRate-API key in Settings."}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tile("Cost (7d)", fmtLkr(s.last_7d.billed_lkr))}
        {tile("Cost (30d)", fmtLkr(s.last_30d.billed_lkr))}
        {tile("Cost (all)", fmtLkr(s.totals.billed_lkr))}
        {tile("Extractions (all)", String(s.totals.extractions))}
      </div>

      <div className="rounded-xl bg-background border p-4">
        <h2 className="font-semibold mb-3">Recent extraction runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="opacity-70 text-left">
              <tr>
                <th className="py-2">Document</th>
                <th>Provider</th>
                <th>Model</th>
                <th>Status</th>
                <th>In tok</th>
                <th>Out tok</th>
                <th className="text-right">Cost</th>
                <th>Latency</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {runs?.runs?.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.document_name}</td>
                  <td>{r.provider}</td>
                  <td>{r.model}</td>
                  <td>{r.status}</td>
                  <td>{r.input_tokens}</td>
                  <td>{r.output_tokens}</td>
                  <td className="text-right tabular-nums">{fmtLkr(r.billed_lkr)}</td>
                  <td>{r.latency_ms}ms</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {runs && !runs.runs?.length && (
                <tr>
                  <td colSpan={9} className="py-8 text-center opacity-60">
                    No runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
