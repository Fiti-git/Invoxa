export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

const ACCESS_KEY = "invoxa_access";
const REFRESH_KEY = "invoxa_refresh";

export const tokens = {
  get access() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: any;
  constructor(message: string, status: number, payload?: any) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.code = payload?.code;
  }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const t = tokens.access;
  return t ? { Authorization: `Bearer ${t}`, ...extra } : { ...extra };
}

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh = tokens.refresh;
  if (!refresh) return null;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      if (data.access) {
        tokens.set(data.access, data.refresh || refresh);
        return data.access as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false
): Promise<T> {
  const headers = authHeaders(
    (init.headers as Record<string, string>) || {}
  );
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && !retried && tokens.refresh) {
    const newAccess = await tryRefresh();
    if (newAccess) return request<T>(path, init, true);
  }

  if (res.status === 401 && typeof window !== "undefined") {
    tokens.clear();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = await res.text().catch(() => "");
    }
    const detail =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
      (typeof payload === "string" ? payload : `${res.status} ${res.statusText}`);
    throw new ApiError(detail, res.status, payload);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

const json = (body: any): RequestInit => ({
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});

export const api = {
  login: (username: string, password: string) =>
    fetch(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then(async (r) => {
      if (!r.ok) {
        let p: any = null;
        try { p = await r.json(); } catch {}
        throw new ApiError(p?.detail || "Login failed", r.status, p);
      }
      return r.json() as Promise<{ access: string; refresh: string }>;
    }),
  me: () => request<any>("/auth/me/"),

  listUsers: () => request<any>("/users/"),
  createUser: (body: any) => request<any>("/users/", { method: "POST", ...json(body) }),
  updateUser: (id: number, body: any) =>
    request<any>(`/users/${id}/`, { method: "PATCH", ...json(body) }),
  deleteUser: (id: number) => request<void>(`/users/${id}/`, { method: "DELETE" }),
  listRoles: () => request<any>("/users/roles/"),

  listDocuments: () => request<any>("/documents/"),
  getDocument: (id: number | string) => request<any>(`/documents/${id}/`),
  uploadDocument: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<any>("/documents/", { method: "POST", body: fd });
  },
  reextract: (id: number | string) =>
    request<any>(`/documents/${id}/reextract/`, { method: "POST" }),
  documentLogs: (id: number | string, since: number = 0) =>
    request<any>(`/documents/${id}/logs/?since=${since}`),

  listInvoices: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/documents/invoices/${qs ? `?${qs}` : ""}`);
  },
  downloadInvoicesCsv: async (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}/documents/invoices/export.csv${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new ApiError(`Export failed: ${res.status}`, res.status);
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || "invoxa-invoices.csv";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  patchInvoice: (id: number | string, body: any) =>
    request<any>(`/documents/invoices/${id}/`, { method: "PATCH", ...json(body) }),
  mergeNextInvoice: (id: number | string) =>
    request<any>(`/documents/invoices/${id}/merge_next/`, { method: "POST" }),
  commitInvoice: (id: number | string) =>
    request<any>(`/documents/invoices/${id}/commit/`, { method: "POST" }),

  getSettings: () => request<any>("/settings/"),
  saveSettings: (body: Record<string, string>) =>
    request<any>("/settings/", { method: "POST", ...json(body) }),
  costSummary: () => request<any>("/billing/summary"),
  refreshFx: () => request<any>("/billing/fx/refresh", { method: "POST" }),
  getCap: () => request<any>("/billing/cap"),
  saveCap: (lkr: string) =>
    request<any>("/billing/cap", { method: "PUT", ...json({ monthly_cap_lkr: lkr }) }),
  recentRuns: () => request<any>("/billing/runs"),
};
