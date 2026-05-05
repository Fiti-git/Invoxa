"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, tokens } from "./api";

type Me = {
  id: number;
  username: string;
  email: string;
  role: string | null;
  permissions: string[];
  is_superuser: boolean;
};

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  hasPerm: (perm: string) => boolean;
};

const Ctx = createContext<AuthCtx>({
  me: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  hasPerm: () => false,
});

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
    if (!tokens.access) {
      setLoading(false);
      if (!isPublic) router.replace("/login");
      return;
    }
    api
      .me()
      .then((d) => setMe(d))
      .catch(() => {
        tokens.clear();
        if (!isPublic) router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const login = async (username: string, password: string) => {
    const t = await api.login(username, password);
    tokens.set(t.access, t.refresh);
    const m = await api.me();
    setMe(m);
    router.replace("/");
  };

  const logout = () => {
    tokens.clear();
    setMe(null);
    router.replace("/login");
  };

  const hasPerm = (perm: string) => !!me && me.permissions.includes(perm);

  return (
    <Ctx.Provider value={{ me, loading, login, logout, hasPerm }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
