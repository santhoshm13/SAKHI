"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Scales, Info, X } from "@phosphor-icons/react";
import {
  bmi, expectedGainAt, gainGuide, gainStatus, weekOnDay, weightSeries, weightStats,
} from "@/lib/weight";

interface WeightDoc { entries: { date: string; kg: number }[]; heightCm?: number; preKg?: number }

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)} kg`;

function Chip({ label, value, tone = "plain" }: { label: string; value: string; tone?: "plain" | "good" | "watch" }) {
  const cls = tone === "good" ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : tone === "watch" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-white/80 border-[#2D1B36]/10 text-[#2D1B36]/80";
  return (
    <div className={`rounded-xl border px-3 py-2 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function WeightTracker({ mode, logs, weeks }: { mode: "her" | "pregnancy"; logs: any[]; weeks?: number | null }) {
  const [doc, setDoc] = useState<WeightDoc>({ entries: [] });
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(localToday());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [height, setHeight] = useState("");
  const [preKg, setPreKg] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await fetch("/api/weight", { cache: "no-store" }).then(r => r.json());
      if (d && Array.isArray(d.entries)) {
        setDoc(d);
        setHeight(d.heightCm ? String(d.heightCm) : "");
        setPreKg(d.preKg ? String(d.preKg) : "");
      }
    } catch { /* offline: show check-in weights only */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (body: Record<string, any>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/weight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't save. Please try again.");
      setDoc(d);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kg.trim()) return;
    if (await save({ kg, date })) { setKg(""); setDate(localToday()); }
  };

  const remove = async (d: string) => {
    const res = await fetch(`/api/weight?date=${d}`, { method: "DELETE" }).then(r => r.json()).catch(() => null);
    if (res?.entries) setDoc(res);
  };

  const series = useMemo(() => weightSeries(doc.entries, logs), [doc.entries, logs]);
  const stats = useMemo(() => weightStats(series), [series]);
  const guide = mode === "pregnancy" && doc.preKg && doc.heightCm ? gainGuide(doc.preKg, doc.heightCm) : null;

  const chart = useMemo(() => series.slice(-60).map(p => {
    const row: any = { date: fmtDate(p.date), kg: p.kg };
    if (guide && doc.preKg && weeks) {
      const [lo, hi] = expectedGainAt(weekOnDay(p.day, weeks), guide);
      row.band = [Math.round((doc.preKg + lo) * 10) / 10, Math.round((doc.preKg + hi) * 10) / 10];
    }
    return row;
  }), [series, guide, doc.preKg, weeks]);

  const gained = mode === "pregnancy" && doc.preKg && stats.latest ? Math.round((stats.latest.kg - doc.preKg) * 10) / 10 : null;
  const range = guide && weeks ? expectedGainAt(weeks, guide) : null;
  const status = gained !== null && range ? gainStatus(gained, range) : null;

  const yValues = chart.flatMap((r: any) => [r.kg, ...(r.band || [])]);
  const yMin = yValues.length ? Math.floor(Math.min(...yValues) - 1) : 0;
  const yMax = yValues.length ? Math.ceil(Math.max(...yValues) + 1) : 1;
  const inputCls = "rounded-xl border border-[#2D1B36]/15 bg-white px-3 py-2 text-sm text-[#2D1B36] focus:outline-none focus:ring-2 focus:ring-pink-300";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center"><Scales weight="duotone" className="w-5 h-5" /></span>
          <div>
            <p className="text-2xl font-semibold text-[#2D1B36] tabular-nums">{stats.latest ? `${stats.latest.kg} kg` : "—"}</p>
            <p className="text-xs text-[#2D1B36]/55">{stats.latest ? `Last logged ${fmtDate(stats.latest.date)}` : "No weight logged yet"}</p>
          </div>
        </div>
        <form onSubmit={addWeight} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`w-kg-${mode}`}>Weight in kg</label>
          <input id={`w-kg-${mode}`} type="number" inputMode="decimal" step="0.1" min="25" max="250" placeholder="kg" value={kg}
            onChange={e => setKg(e.target.value)} className={`${inputCls} w-24`} />
          <label className="sr-only" htmlFor={`w-date-${mode}`}>Date</label>
          <input id={`w-date-${mode}`} type="date" max={localToday()} value={date} onChange={e => setDate(e.target.value)} className={`${inputCls} w-[9.5rem]`} />
          <button type="submit" disabled={saving || !kg.trim()}
            className="rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 cursor-pointer">
            {saving ? "Saving…" : "Log weight"}
          </button>
        </form>
      </div>
      {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2" role="alert">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Chip label="Last 7 days" value={stats.change7 === null ? "—" : signed(stats.change7)} />
        <Chip label="Last 30 days" value={stats.change30 === null ? "—" : signed(stats.change30)} />
        {mode === "pregnancy" ? (
          <>
            <Chip label="Gained so far" value={gained === null ? "—" : signed(gained)}
              tone={status === "within" ? "good" : status ? "watch" : "plain"} />
            <Chip label={weeks ? `Healthy by week ${weeks}` : "Healthy range"} value={range ? `${range[0]}–${range[1]} kg` : "Set up below"} />
          </>
        ) : (
          <>
            <Chip label="Trend" value={stats.perWeek === null ? "—" : `${stats.perWeek > 0 ? "+" : ""}${stats.perWeek.toFixed(2)} kg/wk`} />
            <Chip label="Since first log" value={stats.sinceFirst === null ? "—" : signed(stats.sinceFirst)} />
          </>
        )}
      </div>

      {chart.length >= 2 ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,27,54,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(45,27,54,0.5)" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: "rgba(45,27,54,0.5)" }} tickLine={false} axisLine={false} width={44} unit=" kg" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(244,114,182,0.3)", fontSize: 12 }}
                formatter={(v: any, name: any) => (name === "band" && Array.isArray(v) ? [`${v[0]}–${v[1]} kg`, "Healthy range"] : [`${v} kg`, "Weight"])}
              />
              {guide && <Area type="monotone" dataKey="band" stroke="none" fill="rgba(16,185,129,0.14)" isAnimationActive={false} />}
              <Line type="monotone" dataKey="kg" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 2.5, fill: "#ec4899" }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-28 rounded-2xl border border-dashed border-pink-200 flex items-center justify-center text-sm text-[#2D1B36]/55 text-center px-4">
          Log your weight a couple of times to see your trend{mode === "her" ? "." : ", or tell Sakhi \"I weigh 62 kg\"."}
        </div>
      )}

      {mode === "pregnancy" && (
        <div className="rounded-2xl bg-pink-50/60 border border-pink-100 p-3">
          {status && gained !== null && range ? (
            <p className="text-xs text-[#2D1B36]/75">
              {status === "within"
                ? `You've gained ${gained} kg, right in the healthy range for week ${weeks} (${range[0]}–${range[1]} kg). Lovely and steady.`
                : status === "below"
                ? `You've gained ${gained} kg, a little under the usual ${range[0]}–${range[1]} kg for week ${weeks}. Mention it at your next check-up; your doctor may suggest small extra meals.`
                : `You've gained ${gained} kg, a little over the usual ${range[0]}–${range[1]} kg for week ${weeks}. Every body is different; mention it at your next check-up, and call sooner if you gain suddenly with swelling.`}
              {guide ? ` Your pre-pregnancy BMI of ${bmi(doc.preKg!, doc.heightCm!)} is ${guide.label}, so the total range is ${guide.total[0]}–${guide.total[1]} kg.` : ""}
            </p>
          ) : (
            <p className="text-xs text-[#2D1B36]/70 flex gap-1.5"><Info className="w-4 h-4 shrink-0" /> Add your height and your weight before pregnancy to see your personal healthy gain range on the chart.</p>
          )}
          <button type="button" onClick={() => setSetup(s => !s)} className="mt-2 text-xs font-medium text-pink-700 underline underline-offset-2 cursor-pointer">
            {setup ? "Close" : doc.preKg && doc.heightCm ? "Edit height and starting weight" : "Set up healthy gain range"}
          </button>
          {setup && (
            <form
              className="mt-2 flex flex-wrap items-center gap-2"
              onSubmit={async e => { e.preventDefault(); if (await save({ heightCm: height, preKg })) setSetup(false); }}
            >
              <input type="number" inputMode="numeric" placeholder="Height (cm)" value={height} onChange={e => setHeight(e.target.value)} className={`${inputCls} w-32`} aria-label="Height in cm" />
              <input type="number" inputMode="decimal" step="0.1" placeholder="Before pregnancy (kg)" value={preKg} onChange={e => setPreKg(e.target.value)} className={`${inputCls} w-44`} aria-label="Weight before pregnancy in kg" />
              <button type="submit" disabled={saving} className="rounded-xl bg-[#2D1B36] text-white text-xs font-medium px-3 py-2 cursor-pointer">Save</button>
            </form>
          )}
        </div>
      )}

      {mode === "her" && (
        <p className="text-xs text-[#2D1B36]/55 flex gap-1.5">
          <Info className="w-4 h-4 shrink-0" />
          Weight naturally shifts 0.5–2 kg across your cycle, mostly water in the days before your period. The monthly trend matters more than any single day.
        </p>
      )}

      {doc.entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doc.entries.slice(-5).reverse().map(e => (
            <span key={e.date} className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-[#2D1B36]/10 pl-2.5 pr-1 py-0.5 text-[11px] text-[#2D1B36]/70">
              {fmtDate(e.date)} · {e.kg} kg
              <button type="button" onClick={() => remove(e.date)} aria-label={`Delete weight for ${fmtDate(e.date)}`} className="p-0.5 rounded-full hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><X size={10} weight="bold" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
