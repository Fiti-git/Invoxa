"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Row = {
  id: number;
  document: number;
  document_file_name: string;
  index_in_document: number;
  invoice_number: string;
  invoice_date: string | null;
  customer_name: string;
  customer_code: string;
  sales_rep: string;
  route: string;
  net_total: string;
  currency: string;
  status: "DRAFT" | "EDITED" | "COMMITTED";
  line_count: number;
  created_at: string;
};

type SortKey =
  | "id"
  | "invoice_number"
  | "customer_name"
  | "invoice_date"
  | "net_total"
  | "line_count"
  | "status"
  | "document_file_name";

const STATUS_BADGE: Record<Row["status"], string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  EDITED: "bg-secondary/20 text-secondary",
  COMMITTED: "bg-primary/15 text-primary",
};

export default function InvoicesGridPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (search.trim()) params.q = search.trim();
      const data = await api.listInvoices(params);
      setRows(data.results || data);
      setPage(1);
    } catch (e: any) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a as any)[sortBy] ?? "";
      const bv = (b as any)[sortBy] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const an = parseFloat(String(av));
      const bn = parseFloat(String(bv));
      if (!isNaN(an) && !isNaN(bn) && String(av).match(/^-?\d/)) {
        return sortDir === "asc" ? an - bn : bn - an;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(k);
      setSortDir("asc");
    }
  };

  const Header = ({ k, children, align }: { k: SortKey; children: any; align?: string }) => (
    <th
      className={`px-3 py-2 text-${align || "left"} font-semibold cursor-pointer select-none whitespace-nowrap`}
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === k && (
          <Icon
            icon={sortDir === "asc" ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
            width={12}
          />
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-link">
            All extracted invoices across uploaded documents.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            const params: Record<string, string> = {};
            if (statusFilter !== "ALL") params.status = statusFilter;
            if (search.trim()) params.q = search.trim();
            try {
              await api.downloadInvoicesCsv(params);
            } catch (e: any) {
              setErr(e?.message || String(e));
            }
          }}
        >
          <Icon icon="solar:download-minimalistic-linear" width={16} className="mr-1" />
          Download CSV
        </Button>
      </div>

      {err && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{err}</div>}

      <div className="rounded-xl bg-background border">
        <div className="p-3 flex flex-wrap items-center gap-2 border-b">
          <div className="flex-1 min-w-[220px] relative">
            <Icon
              icon="solar:magnifer-linear"
              width={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
            />
            <Input
              className="pl-9"
              placeholder="Search invoice #, customer, code, file name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <Button onClick={load} variant="outline">
            Search
          </Button>
          <div className="flex items-center gap-1 ml-2">
            {["ALL", "DRAFT", "EDITED", "COMMITTED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-full border ${
                  statusFilter === s
                    ? "bg-primary text-white border-primary"
                    : "border-border text-link hover:bg-lightprimary/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-lightgray text-link">
              <tr>
                <Header k="id">ID</Header>
                <Header k="document_file_name">Document</Header>
                <Header k="invoice_number">Invoice #</Header>
                <Header k="customer_name">Customer</Header>
                <Header k="invoice_date">Date</Header>
                <Header k="line_count" align="right">Lines</Header>
                <Header k="net_total" align="right">Net</Header>
                <Header k="status">Status</Header>
                <th className="px-3 py-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-link">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                pageRows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-lightprimary/20">
                    <td className="px-3 py-2 text-link">{r.id}</td>
                    <td className="px-3 py-2 truncate max-w-[200px]" title={r.document_file_name}>
                      {r.document_file_name}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {r.invoice_number || "—"}
                    </td>
                    <td className="px-3 py-2 truncate max-w-[220px]" title={r.customer_name}>
                      {r.customer_name || "—"}
                    </td>
                    <td className="px-3 py-2">{r.invoice_date || "—"}</td>
                    <td className="px-3 py-2 text-right">{r.line_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.currency} {Number(r.net_total).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded ${STATUS_BADGE[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/documents/${r.document}?invoice=${r.index_in_document}`}
                      >
                        <Button size="sm" variant="outline">
                          <Icon
                            icon="solar:eye-linear"
                            width={14}
                            className="mr-1"
                          />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              {!loading && !pageRows.length && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-link">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-3 flex items-center justify-between border-t text-sm">
            <div className="text-link">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of{" "}
              {sorted.length}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Icon icon="solar:alt-arrow-left-linear" width={14} />
              </Button>
              <span className="px-2">
                Page {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <Icon icon="solar:alt-arrow-right-linear" width={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
