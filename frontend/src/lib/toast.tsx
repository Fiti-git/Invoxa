"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Icon } from "@iconify/react";

type Tone = "info" | "success" | "warning" | "error";
type Toast = { id: number; tone: Tone; message: string };

type Ctx = {
  push: (message: string, tone?: Tone) => void;
  error: (message: string) => void;
  success: (message: string) => void;
};

const ToastCtx = createContext<Ctx>({
  push: () => {},
  error: () => {},
  success: () => {},
});

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Tone = "info") => {
    const id = ++counter;
    setItems((p) => [...p, { id, tone, message }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);

  const value: Ctx = {
    push,
    error: (m) => push(m, "error"),
    success: (m) => push(m, "success"),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg px-3 py-2 shadow-lg text-sm border ${
              t.tone === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : t.tone === "success"
                ? "bg-primary/10 border-primary/30 text-primary"
                : t.tone === "warning"
                ? "bg-secondary/10 border-secondary/30 text-secondary"
                : "bg-background border-border"
            }`}
          >
            <Icon
              icon={
                t.tone === "error"
                  ? "solar:danger-circle-linear"
                  : t.tone === "success"
                  ? "solar:check-circle-linear"
                  : t.tone === "warning"
                  ? "solar:bell-linear"
                  : "solar:info-circle-linear"
              }
              width={18}
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 whitespace-pre-wrap">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** Catch unhandled promise rejections that escape try/catch and surface them. */
export function GlobalErrorListener() {
  const { error } = useToast();
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason);
      error(msg);
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [error]);
  return null;
}
