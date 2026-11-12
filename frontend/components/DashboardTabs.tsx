"use client";

import { useCallback, useEffect, useState } from "react";
import type { Icon } from "@phosphor-icons/react";

export interface TabDef<T extends string> { id: T; label: string; icon: Icon }

/** Tab state synced to the URL hash (#today, #cycle…) so links and refreshes keep the panel. */
export function useHashTab<T extends string>(ids: readonly T[], fallback: T) {
  const read = useCallback((): T => {
    if (typeof window === "undefined") return fallback;
    const h = window.location.hash.replace("#", "") as T;
    return ids.includes(h) ? h : fallback;
  }, [ids, fallback]);
  const [tab, setTabState] = useState<T>(fallback);
  useEffect(() => {
    setTabState(read());
    const onHash = () => setTabState(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [read]);
  const setTab = (t: T) => {
    setTabState(t);
    try { history.replaceState(null, "", `#${t}`); } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return [tab, setTab] as const;
}

/** Segmented tabs on desktop, fixed bottom bar on phones. */
export default function DashboardTabs<T extends string>({ tabs, active, onChange, accent = "pink" }: {
  tabs: TabDef<T>[]; active: T; onChange: (t: T) => void; accent?: "pink" | "violet";
}) {
  const activeCls = accent === "violet" ? "text-violet-700" : "text-pink-700";
  return (
    <>
      <nav aria-label="Dashboard sections" className="hidden sm:flex sticky top-3 z-40 mx-auto w-fit mb-6 p-1.5 rounded-full bg-white/75 backdrop-blur-xl border border-pink-100 shadow-[0_8px_30px_rgba(244,114,182,0.12)] print:hidden">
        {tabs.map(({ id, label, icon: I }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-current={active === id ? "page" : undefined}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-[background-color,color,box-shadow] cursor-pointer ${active === id ? `bg-plum-900 text-white shadow-sm` : "text-plum-900/65 hover:text-plum-900 hover:bg-plum-900/5"}`}
          >
            <I weight={active === id ? "fill" : "regular"} className="w-4 h-4" /> {label}
          </button>
        ))}
      </nav>

      <nav aria-label="Dashboard sections" className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-t border-pink-100 pb-[env(safe-area-inset-bottom)] print:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map(({ id, label, icon: I }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={active === id ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium cursor-pointer ${active === id ? activeCls : "text-plum-900/50"}`}
            >
              <I weight={active === id ? "fill" : "regular"} className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
