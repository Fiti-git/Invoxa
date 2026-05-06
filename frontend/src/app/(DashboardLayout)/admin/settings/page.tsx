"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { hasPerm } = useAuth();
  const canSeeBilling = hasPerm("billing.view");
  const [state, setState] = useState<any>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [fxKey, setFxKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [fxBusy, setFxBusy] = useState(false);
  const [fx, setFx] = useState<{ usd_lkr: string | null; available: boolean } | null>(null);
  const [cap, setCap] = useState<any>(null);
  const [capInput, setCapInput] = useState("");

  const loadAll = async () => {
    const s = await api.getSettings();
    setState(s);
    if (s.GEMINI_MODEL?.value) setGeminiModel(s.GEMINI_MODEL.value);
    if (canSeeBilling) {
      const [summary, c] = await Promise.all([api.costSummary(), api.getCap()]);
      setFx(summary.fx);
      setCap(c);
      setCapInput(c?.monthly_cap_lkr ?? "0");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      const body: Record<string, string> = { GEMINI_MODEL: geminiModel };
      if (geminiKey) body.GEMINI_API_KEY = geminiKey;
      if (fxKey) body.EXCHANGERATE_API_KEY = fxKey;
      await api.saveSettings(body);
      setGeminiKey("");
      setFxKey("");
      setMsg("Saved.");
      await loadAll();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  const refreshFx = async () => {
    setFxBusy(true);
    setMsg("");
    try {
      const r = await api.refreshFx();
      setFx(r);
      setMsg(
        r.available
          ? `FX refreshed: 1 USD = ${Number(r.usd_lkr).toFixed(2)} LKR`
          : "FX refresh failed — check the API key."
      );
    } catch (e: any) {
      setMsg(String(e));
    } finally {
      setFxBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="opacity-70 text-sm">
          API keys are encrypted at rest. Leave a key field blank to keep its existing value.
        </p>
      </div>

      {/* Gemini */}
      <div className="rounded-xl border bg-background p-5 space-y-3">
        <h2 className="font-semibold">Gemini (extraction)</h2>
        <div>
          <label className="text-sm font-medium">API key</label>
          <Input
            type="password"
            placeholder={
              state?.GEMINI_API_KEY?.set
                ? `Currently set (${state.GEMINI_API_KEY.preview})`
                : "Not set"
            }
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Model</label>
          <Input
            value={geminiModel}
            onChange={(e) => setGeminiModel(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* ExchangeRate-API */}
      <div className="rounded-xl border bg-background p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">ExchangeRate-API (USD → LKR)</h2>
            <p className="text-xs text-link mt-1">
              Get a free key at{" "}
              <a
                href="https://www.exchangerate-api.com/"
                target="_blank"
                rel="noreferrer"
                className="underline text-primary"
              >
                exchangerate-api.com
              </a>
              . Rate is refreshed daily and used to convert billed cost.
            </p>
          </div>
          {canSeeBilling && (
          <div className="text-right text-sm">
            <div className="text-link text-xs">Current rate</div>
            <div className="font-semibold">
              {fx?.available
                ? `1 USD = ${Number(fx.usd_lkr).toFixed(2)} LKR`
                : "—"}
            </div>
          </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">API key</label>
          <Input
            type="password"
            placeholder={
              state?.EXCHANGERATE_API_KEY?.set
                ? `Currently set (${state.EXCHANGERATE_API_KEY.preview})`
                : "Not set"
            }
            value={fxKey}
            onChange={(e) => setFxKey(e.target.value)}
            className="mt-1"
          />
        </div>

        {canSeeBilling && (
        <div>
          <Button variant="outline" onClick={refreshFx} disabled={fxBusy}>
            {fxBusy ? "Refreshing…" : "Refresh rate now"}
          </Button>
        </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
        {msg && <span className="text-sm opacity-70">{msg}</span>}
      </div>

      {/* Spend cap — only billing roles */}
      {canSeeBilling && (
      <div className="rounded-xl border bg-background p-5 space-y-3">
        <h2 className="font-semibold">Monthly spend cap</h2>
        <p className="text-xs text-link">
          Pause extraction once month-to-date cost (LKR) reaches this ceiling.
          Set to 0 for no limit.
        </p>
        {cap && (
          <div className="text-sm">
            Used this month:{" "}
            <strong>LKR {Number(cap.month_to_date_lkr).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</strong>
            {Number(cap.monthly_cap_lkr) > 0 && (
              <>
                {" "}
                / LKR{" "}
                {Number(cap.monthly_cap_lkr).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
              </>
            )}
            {cap.exceeded && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                CAP REACHED
              </span>
            )}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-xs">
            <label className="text-sm font-medium">Cap (LKR)</label>
            <Input
              type="number"
              min="0"
              step="100"
              value={capInput}
              onChange={(e) => setCapInput(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              const c = await api.saveCap(capInput || "0");
              setCap(c);
              setMsg("Cap updated.");
            }}
          >
            Save cap
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}
