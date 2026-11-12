"use client";

import { useState } from "react";
import {
  Barbell, ForkKnife, Leaf, Lightning, Drop, Info, FirstAidKit, Stethoscope, Sparkle, CalendarCheck,
  CheckCircle, ChartLineUp, FileText, ShieldCheck, CaretRight,
} from "@phosphor-icons/react";
import { PHASES, PHASE_META, phaseBounds, type PhaseInfo } from "@/lib/cyclePhase";
import { PHASE_GUIDE, PHASE_TIP_NOTE, type Tip } from "@/lib/phaseTips";
import type { Pattern, PhaseStat } from "@/lib/herInsights";

export const panelCard = "bg-white/60 backdrop-blur-md rounded-3xl md:rounded-[2rem] border border-pink-200/80 shadow-[0_8px_30px_rgba(244,114,182,0.10)] p-5 sm:p-7 relative overflow-hidden min-w-0";

const CONF_LABEL = { high: "High confidence", medium: "Medium confidence", low: "Rough estimate" } as const;
const CONF_CLS = { high: "bg-emerald-50 text-emerald-700 border-emerald-200", medium: "bg-amber-50 text-amber-700 border-amber-200", low: "bg-slate-100 text-slate-600 border-slate-200" } as const;

/** Ring split into the four phases, with a marker on today. */
function PhaseRing({ info }: { info: PhaseInfo }) {
  const size = 168, stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const { ranges } = phaseBounds(info.cycleLength, info.periodLength);
  const len = info.cycleLength;
  const day = Math.min(info.cycleDay, len);
  const angle = ((day - 0.5) / len) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`Cycle day ${info.cycleDay} of about ${len}`}>
      {PHASES.map(p => {
        const [a, b] = ranges[p];
        if (b < a) return null;
        const frac = (b - a + 1) / len;
        const offset = ((a - 1) / len) * c;
        return (
          <circle key={p} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PHASE_META[p].ring}
            strokeOpacity={p === info.phase ? 1 : 0.25} strokeWidth={stroke}
            strokeDasharray={`${Math.max(0, frac * c - 3)} ${c}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="butt" />
        );
      })}
      <circle cx={size / 2 + r * Math.cos(angle)} cy={size / 2 + r * Math.sin(angle)} r={9} fill="#fff" stroke="#2D1B36" strokeWidth={3} />
      <text x="50%" y="46%" textAnchor="middle" className="fill-[#2D1B36]" style={{ fontSize: 34, fontWeight: 300 }}>{info.cycleDay}</text>
      <text x="50%" y="60%" textAnchor="middle" className="fill-[#2D1B36]/50" style={{ fontSize: 11, letterSpacing: 1 }}>DAY OF ~{len}</text>
    </svg>
  );
}

/** Plain-language line for unusual cycle situations (long period, early end, late). */
function statusNote(info: PhaseInfo): { text: string; tone: "info" | "watch" } | null {
  if (info.status === "long-period" && info.bleedingDay) {
    const d = info.bleedingDay;
    if (d >= 10) return { tone: "watch", text: `Day ${d} of bleeding. Bleeding for more than a week is worth a call to your doctor, sooner if it is heavy or you feel dizzy.` };
    if (d >= 8) return { tone: "watch", text: `Day ${d} of bleeding, longer than your usual ${info.usualPeriodLength} days. Keep logging; if it goes past 10 days or gets heavy, check in with a doctor.` };
    return { tone: "info", text: `Day ${d} of bleeding, a little longer than your usual ${info.usualPeriodLength} days. Sakhi has moved your phases back to match.` };
  }
  if (info.status === "period-ended-early") {
    return { tone: "info", text: `Your period finished earlier than usual, so your follicular phase has started.` };
  }
  if (info.status === "very-late") {
    return { tone: "watch", text: `Your period is ${info.daysLate} days later than expected. Stress, travel, illness or weight changes can delay it. If there is any chance of pregnancy, take a home test; if periods stop for 3 months, see a doctor.` };
  }
  if (info.status === "late") {
    return { tone: "info", text: info.daysLate >= 7
      ? `Cycles vary, and stress or illness can delay a period. If there is any chance you could be pregnant, a home test is a simple next step.`
      : `A few days late is common. Tap below when it starts, or tell Sakhi in chat.` };
  }
  return null;
}

const localIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function PhaseCard({ info, onPeriodStarted, saving }: { info: PhaseInfo; onPeriodStarted: (date?: string) => void; saving?: boolean }) {
  const meta = PHASE_META[info.phase];
  const guide = PHASE_GUIDE[info.phase];
  const next = PHASE_META[info.nextPhase];
  const note = statusNote(info);
  const [pickDate, setPickDate] = useState(false);
  const [date, setDate] = useState(localIso());
  const title = info.status === "very-late" ? "Waiting for your period"
    : info.late ? "Period running late"
    : info.status === "long-period" ? `Period, day ${info.bleedingDay}`
    : meta.label;
  const showStart = info.late || info.phase === "luteal" || info.bleedingMismatch;
  return (
    <section className={`${panelCard} md:col-span-7`} aria-labelledby="phase-title">
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
        <PhaseRing info={info} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#2D1B36]/55">Today</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CONF_CLS[info.confidence]}`} title={info.confidenceReason}>{CONF_LABEL[info.confidence]}</span>
            {info.learned && <span className="text-[11px] text-[#2D1B36]/50">Learned from your logs</span>}
          </div>
          <h2 id="phase-title" className={`text-3xl font-light tracking-tight mt-1 ${meta.color}`}>{title}</h2>
          <p className="text-sm text-[#2D1B36]/75 mt-2 leading-relaxed">{guide.hormones} {guide.feel}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {info.late ? (
              <span className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Expected {info.daysLate} day{info.daysLate === 1 ? "" : "s"} ago
              </span>
            ) : info.status === "long-period" ? (
              <span className="px-3 py-1.5 rounded-full bg-white/80 border border-[#2D1B36]/10 text-[#2D1B36]/75">
                Follicular phase starts when bleeding stops
              </span>
            ) : (
              <>
                <span className="px-3 py-1.5 rounded-full bg-white/80 border border-[#2D1B36]/10 text-[#2D1B36]/75">
                  {next.short} phase in ~{info.daysToNextPhase} day{info.daysToNextPhase === 1 ? "" : "s"}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                  Period in ~{info.daysUntilPeriod} day{info.daysUntilPeriod === 1 ? "" : "s"}
                </span>
              </>
            )}
          </div>
          {note && (
            <p className={`text-xs mt-3 rounded-xl px-3 py-2 ${note.tone === "watch" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-white/70 text-[#2D1B36]/70 border border-[#2D1B36]/10"}`}>{note.text}</p>
          )}
          <p className="text-xs text-[#2D1B36]/50 mt-3 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{info.confidenceReason}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {showStart && (
              <button onClick={() => onPeriodStarted()} disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-4 py-2 cursor-pointer disabled:opacity-60">
                <Drop weight="fill" className="w-4 h-4" /> {saving ? "Saving…" : info.bleedingMismatch ? "Looks like your period started. Confirm?" : "My period started today"}
              </button>
            )}
            {!pickDate ? (
              <button onClick={() => setPickDate(true)} className="text-xs font-medium text-[#2D1B36]/60 hover:text-[#2D1B36] underline underline-offset-2 cursor-pointer">
                Started on another day?
              </button>
            ) : (
              <span className="inline-flex items-center gap-2">
                <label htmlFor="period-start-date" className="sr-only">Period start date</label>
                <input id="period-start-date" type="date" value={date} max={localIso()} onChange={e => setDate(e.target.value)}
                  className="rounded-full border border-[#2D1B36]/15 bg-white px-3 py-1.5 text-xs text-[#2D1B36]" />
                <button onClick={() => { onPeriodStarted(date); setPickDate(false); }} disabled={saving || !date}
                  className="rounded-full bg-[#2D1B36] text-white text-xs font-medium px-3 py-1.5 cursor-pointer disabled:opacity-60">Save</button>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const KIND_META = {
  move: { icon: Barbell, label: "Move", cls: "bg-emerald-50 text-emerald-600" },
  nourish: { icon: ForkKnife, label: "Nourish", cls: "bg-amber-50 text-amber-600" },
  mind: { icon: Leaf, label: "Mind", cls: "bg-violet-50 text-violet-600" },
} as const;

export function TodayTipsCard({ tips, adapted }: { tips: Tip[]; adapted: boolean }) {
  return (
    <section className={`${panelCard} md:col-span-12`} aria-labelledby="tips-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-[#2D1B36]/55">For you today</p>
          <h2 id="tips-title" className="text-xl font-medium text-[#2D1B36] mt-0.5">Small things that fit this phase</h2>
        </div>
        {adapted && <span className="text-xs text-[#2D1B36]/60 flex items-center gap-1"><Lightning className="w-3.5 h-3.5" />Adjusted to how you said you feel</span>}
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tips.map(t => {
          const k = KIND_META[t.kind];
          const I = k.icon;
          return (
            <article key={t.id} className="rounded-2xl bg-white/75 border border-pink-100 p-4">
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${k.cls}`}><I weight="duotone" className="w-4 h-4" /></span>
                <span className="text-xs font-semibold text-[#2D1B36]/60">{k.label}</span>
              </div>
              <h3 className="mt-3 font-semibold text-[#2D1B36]">{t.title}</h3>
              <p className="mt-1 text-sm text-[#2D1B36]/70 leading-relaxed">{t.text}</p>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-[#2D1B36]/45">{PHASE_TIP_NOTE}</p>
    </section>
  );
}

export function PainNowCard({ onOpen, todayPain }: { onOpen: () => void; todayPain: number }) {
  return (
    <section className={`${panelCard} md:col-span-5 flex flex-col justify-between bg-gradient-to-br from-rose-50/80 to-white/60`}>
      <div>
        <span className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><FirstAidKit weight="duotone" className="w-6 h-6" /></span>
        <h2 className="mt-4 text-xl font-medium text-[#2D1B36]">Cramps or pain right now?</h2>
        <p className="mt-1 text-sm text-[#2D1B36]/65 leading-relaxed">
          {todayPain >= 5 ? `You logged pain at ${todayPain}/10 today. ` : ""}Get a few quick, different things to try, with a timer. Sakhi learns which ones help you.
        </p>
      </div>
      <button onClick={onOpen} className="mt-5 w-full rounded-full bg-[#2D1B36] hover:bg-[#2D1B36]/90 text-white font-medium py-3 cursor-pointer">
        Help me feel better
      </button>
    </section>
  );
}

export function PmsForecastCard({ forecast }: { forecast: { symptoms: string[]; inDays: number } | null }) {
  if (!forecast) return null;
  return (
    <section className={`${panelCard} md:col-span-12 flex items-start gap-4`}>
      <span className="w-10 h-10 shrink-0 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center"><CalendarCheck weight="duotone" className="w-5 h-5" /></span>
      <div>
        <h3 className="font-semibold text-[#2D1B36]">Heads-up from your past cycles</h3>
        <p className="text-sm text-[#2D1B36]/70 mt-1">
          {forecast.symptoms.join(", ")} usually show{forecast.symptoms.length === 1 ? "s" : ""} up in the 5 days before your period
          {forecast.inDays > 0 ? `, which starts in about ${forecast.inDays} day${forecast.inDays === 1 ? "" : "s"}.` : ". That window is now."}
          {" "}A little prep (extra water, magnesium-rich snacks, an easier schedule) can help.
        </p>
      </div>
    </section>
  );
}

export function PhaseInsightsCard({ stats, highlights }: { stats: PhaseStat[]; highlights: string[] }) {
  const has = stats.some(s => s.days > 0);
  return (
    <section className={`${panelCard} md:col-span-12`} aria-labelledby="insights-title">
      <div className="flex items-center gap-2"><ChartLineUp weight="duotone" className="w-5 h-5 text-violet-500" />
        <h2 id="insights-title" className="text-xl font-medium text-[#2D1B36]">How you feel across your cycle</h2></div>
      {highlights.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {highlights.map(h => <li key={h} className="text-sm text-[#2D1B36]/80 flex gap-2"><Sparkle weight="fill" className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />{h}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#2D1B36]/60">Keep checking in for a cycle or two and Sakhi will show what changes for you in each phase.</p>
      )}
      {has && (
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => {
            const m = PHASE_META[s.phase];
            return (
              <div key={s.phase} className={`rounded-2xl border p-4 ${m.soft}`}>
                <p className={`text-sm font-semibold ${m.color}`}>{m.short}</p>
                <p className="text-[11px] text-[#2D1B36]/50">{s.days} day{s.days === 1 ? "" : "s"} logged</p>
                <dl className="mt-3 space-y-1 text-xs text-[#2D1B36]/75">
                  <div className="flex justify-between gap-2"><dt>Sleep</dt><dd className="font-medium">{s.avgSleep ?? "—"}{s.avgSleep ? " h" : ""}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Pain</dt><dd className="font-medium">{s.avgPain ?? "—"}{s.avgPain !== null ? "/10" : ""}</dd></div>
                  <div className="flex justify-between gap-2"><dt>Mood</dt><dd className="font-medium truncate">{s.topMood ?? "—"}</dd></div>
                </dl>
                {s.topSymptoms.length > 0 && <p className="mt-2 text-[11px] text-[#2D1B36]/55 truncate" title={s.topSymptoms.join(", ")}>{s.topSymptoms.join(", ")}</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function PatternsCard({ patterns, logCount }: { patterns: Pattern[]; logCount: number }) {
  const [open, setOpen] = useState<string | null>(patterns[0]?.id ?? null);
  return (
    <section className={`${panelCard} md:col-span-7`} aria-labelledby="patterns-title">
      <div className="flex items-center gap-2"><Stethoscope weight="duotone" className="w-5 h-5 text-pink-500" />
        <h2 id="patterns-title" className="text-xl font-medium text-[#2D1B36]">Worth mentioning to a doctor</h2></div>
      <p className="text-xs text-[#2D1B36]/55 mt-1">Patterns from your own check-ins. Sakhi doesn&apos;t diagnose; these are things a doctor can look into with you.</p>
      {patterns.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 p-4 text-sm text-emerald-800 flex gap-2">
          <CheckCircle weight="fill" className="w-5 h-5 shrink-0" />
          {logCount < 20 ? "Nothing stands out yet. Patterns appear after a few weeks of check-ins." : "Nothing in your recent check-ins needs a special mention. Keep your routine check-ups."}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {patterns.map(p => (
            <li key={p.id} className="rounded-2xl bg-white/75 border border-pink-100">
              <button onClick={() => setOpen(o => (o === p.id ? null : p.id))} className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer" aria-expanded={open === p.id}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.tone === "watch" ? "bg-amber-400" : "bg-sky-400"}`} />
                  <span className="font-medium text-[#2D1B36] text-sm">{p.title}</span>
                </span>
                <CaretRight className={`w-4 h-4 text-[#2D1B36]/40 transition-transform ${open === p.id ? "rotate-90" : ""}`} />
              </button>
              {open === p.id && (
                <div className="px-4 pb-4 -mt-1 text-sm text-[#2D1B36]/75 space-y-1.5">
                  <p>{p.detail}</p>
                  <p className="text-xs text-[#2D1B36]/50">{p.evidence}</p>
                  <p className="text-[#2D1B36]"><span className="font-medium">You could ask: </span>{p.ask}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CareLinksCard({ onOpenRelief, onOpenSettings, favourites }: { onOpenRelief: () => void; onOpenSettings: () => void; favourites: string[] }) {
  return (
    <section className={`${panelCard} md:col-span-5 flex flex-col gap-3`}>
      <button onClick={onOpenRelief} className="flex items-center gap-4 rounded-2xl bg-rose-50/80 border border-rose-100 p-4 text-left hover:bg-rose-50 cursor-pointer">
        <FirstAidKit weight="duotone" className="w-7 h-7 text-rose-500 shrink-0" />
        <span>
          <span className="block font-medium text-[#2D1B36]">Pain relief toolkit</span>
          <span className="block text-xs text-[#2D1B36]/60">{favourites.length ? `Works for you: ${favourites.join(", ")}` : "Quick, rotating ideas for cramps"}</span>
        </span>
      </button>
      <a href="/doctor-summary?mode=her" className="flex items-center gap-4 rounded-2xl bg-white/75 border border-pink-100 p-4 hover:bg-white">
        <FileText weight="duotone" className="w-7 h-7 text-[#2D1B36] shrink-0" />
        <span>
          <span className="block font-medium text-[#2D1B36]">Doctor visit summary</span>
          <span className="block text-xs text-[#2D1B36]/60">One page with your cycles, symptoms and questions. Print or save as PDF.</span>
        </span>
      </a>
      <button onClick={onOpenSettings} className="flex items-center gap-4 rounded-2xl bg-white/75 border border-pink-100 p-4 text-left hover:bg-white cursor-pointer">
        <ShieldCheck weight="duotone" className="w-7 h-7 text-emerald-600 shrink-0" />
        <span>
          <span className="block font-medium text-[#2D1B36]">Privacy & your data</span>
          <span className="block text-xs text-[#2D1B36]/60">Edit profile, download or delete everything.</span>
        </span>
      </button>
    </section>
  );
}
