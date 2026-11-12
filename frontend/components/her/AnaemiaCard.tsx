"use client";

import { useEffect, useMemo, useState } from "react";
import { Drop } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { anaemiaWatch, IRON_FOODS, type AnaemiaLevel } from "@/lib/anaemia";
import type { LabResult } from "@/lib/labs";
import { useUserDoc } from "@/hooks/useUserDoc";
import { EMPTY_TABLETS, type TabletsDoc } from "@/lib/tablets";

const BADGE: Record<AnaemiaLevel, { text: string; cls: string }> = {
  clear: { text: "Looks fine", cls: "bg-emerald-100 text-emerald-800" },
  watch: { text: "Keep an eye", cls: "bg-amber-100 text-amber-800" },
  check: { text: "Worth a blood test", cls: "bg-rose-100 text-rose-700" },
  low: { text: "Low iron", cls: "bg-rose-600 text-white" },
};

/** Iron check from her flow, tiredness and lab results. */
export default function AnaemiaCard({ logs, className = "" }: { logs: any[]; className?: string }) {
  const [labs, setLabs] = useState<LabResult[]>([]);
  const { doc: tablets } = useUserDoc<TabletsDoc>("tablets", EMPTY_TABLETS);

  useEffect(() => {
    const load = () => fetch("/api/lab-report", { cache: "no-store" }).then(r => r.json()).then(j => setLabs(j.results || [])).catch(() => {});
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const takingIron = tablets.list.some(t => /iron|ifa|ferrous/i.test(t.name));
  const w = useMemo(() => anaemiaWatch(logs, labs, takingIron), [logs, labs, takingIron]);
  const badge = BADGE[w.level];

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="iron-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Drop weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
          <h3 id="iron-title" className="text-xl font-semibold tracking-tight text-plum-900">Iron check</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
      </div>
      <p className="mt-3 text-base font-medium text-plum-900">{w.headline}</p>
      {w.reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {w.reasons.map(r => <li key={r} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blush-400" />{r}</li>)}
        </ul>
      )}
      <p className="mt-3 rounded-2xl bg-lavender-50 p-3 text-sm text-plum-900">{w.next}</p>
      {w.level !== "clear" && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-plum-900/65 mb-2">Iron-rich food to add</p>
          <div className="flex flex-wrap gap-1.5">
            {IRON_FOODS.map(f => <span key={f} className="rounded-full bg-white/80 border border-plum-900/[0.07] px-2.5 py-1 text-xs text-plum-900">{f}</span>)}
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">Skip tea or coffee for an hour around meals: it blocks iron.</p>
        </div>
      )}
      <p className="mt-3 text-[11px] text-ink-faint">Based on your check-ins and lab results. Sakhi can&apos;t diagnose anaemia; a blood test can.</p>
    </section>
  );
}
