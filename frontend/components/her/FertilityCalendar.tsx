"use client";

import { useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { dayNum, dayToIso, type PhaseInfo } from "@/lib/cyclePhase";
import { planFertility, type DayKind } from "@/lib/fertility";

const STYLE: Record<Exclude<DayKind, null>, string> = {
  period: "bg-rose-400 text-white",
  "predicted-period": "border border-dashed border-rose-300 bg-rose-50 text-rose-700",
  peak: "bg-emerald-500 text-white",
  fertile: "bg-emerald-100 text-emerald-800",
  "predicted-peak": "border border-dashed border-emerald-500 bg-emerald-100 text-emerald-800",
  "predicted-fertile": "border border-dashed border-emerald-300 bg-emerald-50 text-emerald-700",
  "past-fertile": "bg-emerald-50 text-emerald-700/70",
};
const LABEL: Record<Exclude<DayKind, null>, string> = {
  period: "period", "predicted-period": "expected period", peak: "most fertile", fertile: "fertile",
  "predicted-peak": "likely most fertile", "predicted-fertile": "likely fertile", "past-fertile": "was fertile",
};
const fmt = (n: number, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(dayToIso(n) + "T00:00:00").toLocaleDateString("en-IN", opts);

/** Month calendar of her real periods, fertile windows and the forecast. */
export default function FertilityCalendar({ phase, profile, logs, cycleHistory, tried = [], trying = false }: {
  phase: PhaseInfo; profile: any; logs: any[]; cycleHistory: any[]; tried?: string[]; trying?: boolean;
}) {
  const today = dayNum(new Date());
  const plan = useMemo(() => planFertility({ phase, profile, logs, cycleHistory, today }), [phase, profile, logs, cycleHistory, today]);
  const triedSet = useMemo(() => new Set(tried.map(dayNum)), [tried]);
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const startNum = dayNum(first);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => startNum + i)];

  const w = plan.nextWindow;
  const summary = plan.late
    ? `Your period is ${phase.daysLate > 0 ? `${phase.daysLate} day${phase.daysLate === 1 ? "" : "s"} ` : ""}late, so Sakhi isn't forecasting fertile days.${trying ? " A home pregnancy test now gives a reliable answer." : ""}`
    : w
      ? w.start <= today
        ? `Fertile now until ${fmt(w.end)}. Most fertile around ${fmt(w.peak)}.`
        : `Next fertile days: ${fmt(w.start)} to ${fmt(w.end)}, most fertile around ${fmt(w.peak)}.`
      : "";
  const basis = plan.cyclesLogged >= 2
    ? `Based on your last ${plan.cyclesLogged} cycles${plan.spread > 4 ? `, which vary by ${plan.spread} days, so the window is wider and less certain` : ""}.`
    : "Based on the cycle length you gave. Log your next periods and the dates get more accurate.";

  return (
    <div className="w-full">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-semibold text-plum-900">{summary}</p>
        <p className="text-xs text-ink-soft">{basis}</p>
        {trying && !plan.late && plan.testFrom !== null && (
          <p className="text-xs text-ink-soft">If your period doesn&apos;t come, a home test is reliable from {fmt(plan.testFrom)}.</p>
        )}
      </div>

      <div className="mx-auto max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setOffset(o => Math.max(-6, o - 1))} disabled={offset <= -6} aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full text-plum-900 hover:bg-lavender-50 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
          <CaretLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold text-plum-900" aria-live="polite">{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
        <button type="button" onClick={() => setOffset(o => Math.min(3, o + 1))} disabled={offset >= 3} aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full text-plum-900 hover:bg-lavender-50 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
          <CaretRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Fertility calendar">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="pb-1 text-[11px] font-medium text-ink-faint" aria-hidden="true">{d}</div>)}
        {cells.map((n, i) => {
          if (n === null) return <div key={`b${i}`} aria-hidden="true" />;
          const k = plan.kindOf(n);
          const isToday = n === today;
          const didTry = triedSet.has(n);
          const label = `${fmt(n, { day: "numeric", month: "long" })}${k.kind ? `, ${LABEL[k.kind]}` : ""}${didTry ? ", tried" : ""}${isToday ? ", today" : ""}`;
          return (
            <div key={n} role="gridcell" aria-label={label} title={label}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-sm tabular-nums ${k.kind ? STYLE[k.kind] : n < today ? "text-plum-900/45" : "text-plum-900"} ${isToday ? "ring-2 ring-plum-900 ring-offset-1 font-semibold" : ""}`}>
              {new Date(dayToIso(n) + "T00:00:00").getDate()}
              {didTry && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-blush-500" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-soft">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-400" aria-hidden="true" />Period</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-rose-300 bg-rose-50" aria-hidden="true" />Expected period</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" aria-hidden="true" />Most fertile</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100" aria-hidden="true" />Fertile</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-emerald-300 bg-emerald-50" aria-hidden="true" />Forecast</li>
        {trying && <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blush-500" aria-hidden="true" />Tried</li>}
      </ul>
      <p className="mt-3 text-xs text-ink-faint">Dates are estimates. Don&apos;t rely on this calendar alone to avoid pregnancy.</p>
    </div>
  );
}
