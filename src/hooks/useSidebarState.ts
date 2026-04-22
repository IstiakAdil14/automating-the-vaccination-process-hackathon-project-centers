"use client";

import { useEffect, useState } from "react";

const LS_KEY = "vcbd_sidebar_collapsed";

export function useSidebarState() {
  // Start with false (expanded) — will be corrected from localStorage on mount
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored !== null) setCollapsed(stored === "1");
    } catch {
      // localStorage unavailable (private browsing, etc.) — use default
    }
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_KEY, next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  }

  function setCollapsedPersist(value: boolean) {
    setCollapsed(value);
    try { localStorage.setItem(LS_KEY, value ? "1" : "0"); } catch { /* noop */ }
  }

  return { collapsed, toggle, setCollapsed: setCollapsedPersist, mounted };
}
