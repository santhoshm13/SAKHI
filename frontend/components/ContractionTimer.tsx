"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Timer, Warning, ArrowCounterClockwise, Phone } from "@phosphor-icons/react";

/**
 * Contraction timer: tap when a contraction starts and again when it ends.
 * Shows each contraction's length and the gap between starts, and checks the
 * common "5-1-1" guide (about 5 minutes apart, lasting about 1 minute, for 1 hour).
 * Works offline; the session is kept in this browser so a reload doesn't lose it.
 */

interface Contraction { start: number; end: number | null }

const KEY = "sakhi_contractions";
const HOUR = 3_600_000;

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const clock = (t: number) => new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export interface LabourCheck {
  level: "none" | "early" | "close" | "go";
  title: string;
  detail: string;
  avgGapMin: number | null;
  avgLenSec: number | null;
}

/** Pattern over the last hour of finished contractions. */
export function checkPattern(list: Contraction[], now = Date.now()): LabourCheck {
  const done = list.filter(c => c.end !== null) as { start: number; end: number }[];
  const lastHour = done.filter(c => c.start >= now - HOUR);
  const gaps: number[] = [];
  for (let i = 1; i < lastHour.length; i++) gaps.push(lastHour[i].start - lastHour[i - 1].start);
  const avgGapMin = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length / 60_000 : null;
  const avgLenSec = lastHour.length ? lastHour.reduce((a, c) => a + (c.end - c.start), 0) / lastHour.length / 1000 : null;
  const span = lastHour.length >= 2 ? (lastHour[lastHour.length - 1].end - lastHour[0].start) / 60_000 : 0;

  if (lastHour.length < 3 || avgGapMin === null || avgLenSec === null) {
    return { level: "none", title: "Keep timing", detail: "Time a few contractions in a row to see a pattern.", avgGapMin, avgLenSec };
  }
  const regular = gaps.length >= 2 && Math.max(...gaps) - Math.min(...gaps) <= 4 * 60_000;
  if (avgGapMin <= 5.5 && avgLenSec >= 45 && span >= 50 && regular) {
    return { level: "go", title: "Time to go to the hospital", detail: "Your contractions are about 5 minutes apart, lasting about a minute, for an hour. Call your maternity unit and head in, or follow the plan your doctor gave you.", avgGapMin, avgLenSec };
  }
  if (avgGapMin <= 7 && avgLenSec >= 40) {
    return { level: "close", title: "Getting closer", detail: "Contractions are getting regular. Get your bag ready, let your birth partner know, and keep timing.", avgGapMin, avgLenSec };
  }
  return { level: "early", title: "Early pattern", detail: "These may be early labour or practice (Braxton Hicks) contractions. Rest, drink water, change position, and keep timing if they continue.", avgGapMin, avgLenSec };
}

export default function ContractionTimer({ weeks }: { weeks?: number | null }) {
  const [list, setList] = useState<Contraction[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      // Drop sessions older than 12 hours
      if (Array.isArray(saved)) setList(saved.filter((c: any) => c && c.start > Date.now() - 12 * HOUR));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }, [list]);

  const active = list.length > 0 && list[list.length - 1].end === null ? list[list.length - 1] : null;
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), active ? 250 : 5000);
    return () => clearInterval(t);
  }, [active]);

  const toggle = () => {
    const t = Date.now();
    setList(prev => {
      const last = prev[prev.length - 1];
      if (last && last.end === null) return [...prev.slice(0, -1), { ...last, end: t }];
      return [...prev, { start: t, end: null }].slice(-60);
    });
  };

  const reset = () => {
    if (list.length && !window.confirm("Clear all timed contractions?")) return;
    setList([]);
  };

  const check = useMemo(() => checkPattern(list, now), [list, now]);
  const recent = list.slice(-6).reverse();
  const preterm = weeks !== undefined && weeks !== null && weeks < 37;
  const tone = check.level === "go" ? "bg-rose-50 border-rose-200 text-rose-900"
    : check.level === "close" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-white/70 border-plum-900/10 text-plum-900/80";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={Boolean(active)}
          className={`w-40 h-40 shrink-0 rounded-full flex flex-col items-center justify-center text-white shadow-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 ${active ? "bg-rose-500 hover:bg-rose-600 animate-pulse" : "bg-plum-900 hover:bg-black"}`}
        >
          <Timer weight="duotone" className="w-8 h-8 mb-1" />
          <span className="text-sm font-semibold">{active ? "Tap when it ends" : "Tap when it starts"}</span>
          <span className="text-2xl font-semibold tabular-nums mt-1" aria-live="polite">{active ? mmss(now - active.start) : list.length ? mmss(now - list[list.length - 1].start) : "0:00"}</span>
          <span className="text-[10px] opacity-70">{active ? "length so far" : list.length ? "since last one began" : "tap to start"}</span>
        </button>

        <div className="flex-1 w-full grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-plum-900/10 bg-white/80 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-plum-900/55">Avg. apart (last hour)</p>
            <p className="text-lg font-semibold tabular-nums text-plum-900">{check.avgGapMin === null ? "—" : `${check.avgGapMin.toFixed(1)} min`}</p>
          </div>
          <div className="rounded-xl border border-plum-900/10 bg-white/80 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-plum-900/55">Avg. length</p>
            <p className="text-lg font-semibold tabular-nums text-plum-900">{check.avgLenSec === null ? "—" : `${Math.round(check.avgLenSec)} sec`}</p>
          </div>
          <div className={`col-span-2 rounded-xl border px-3 py-2 ${tone}`} aria-live="polite">
            <p className="text-sm font-semibold">{check.title}</p>
            <p className="text-xs mt-0.5">{check.detail}</p>
          </div>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-plum-900/80">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-plum-900/50">
                <th className="py-1 font-medium">Started</th><th className="py-1 font-medium">Length</th><th className="py-1 font-medium">Apart</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c, i) => {
                const prev = list[list.length - 1 - i - 1];
                return (
                  <tr key={c.start} className="border-t border-plum-900/5">
                    <td className="py-1.5 tabular-nums">{clock(c.start)}</td>
                    <td className="py-1.5 tabular-nums">{c.end ? mmss(c.end - c.start) : "timing…"}</td>
                    <td className="py-1.5 tabular-nums">{prev ? mmss(c.start - prev.start) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-3 text-xs text-rose-900">
        <p className="font-semibold flex items-center gap-1.5"><Warning weight="fill" className="w-4 h-4" /> Go to hospital now, whatever the timer says, if:</p>
        <ul className="list-disc pl-5 mt-1 space-y-0.5">
          <li>your waters break, or you leak fluid</li>
          <li>you have bleeding, or constant severe pain</li>
          <li>baby is moving less than usual</li>
          {preterm && <li>you have regular contractions before 37 weeks</li>}
        </ul>
        <a href="tel:112" className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"><Phone weight="fill" className="w-3.5 h-3.5" /> Call 112</a>
      </div>

      <div className="flex items-center justify-between text-[11px] text-plum-900/50">
        <span>A general guide; follow the plan your doctor or midwife gave you.</span>
        {list.length > 0 && (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 hover:text-plum-900 cursor-pointer">
            <ArrowCounterClockwise className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}
