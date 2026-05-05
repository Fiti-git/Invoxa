"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Ctx = { collapsed: boolean; toggle: () => void; setCollapsed: (v: boolean) => void };

const SidebarCtx = createContext<Ctx>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
});

const KEY = "invoxa_sidebar_collapsed";

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(KEY);
    if (v === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const n = !c;
      localStorage.setItem(KEY, n ? "1" : "0");
      return n;
    });
  };

  const set = (v: boolean) => {
    setCollapsed(v);
    localStorage.setItem(KEY, v ? "1" : "0");
  };

  return (
    <SidebarCtx.Provider value={{ collapsed, toggle, setCollapsed: set }}>
      {children}
    </SidebarCtx.Provider>
  );
}

export const useSidebarState = () => useContext(SidebarCtx);
