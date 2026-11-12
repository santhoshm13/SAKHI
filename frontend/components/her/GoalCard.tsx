"use client";

import { useRef, useState } from "react";
import { Target, Plant, Thermometer, Check } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useUserDoc, dayKey } from "@/hooks/useUserDoc";
import {
  EMPTY_GOAL, PERI_SIGNS, fertileWindow, monthsTrying, periRedFlags, periSummary, ttcAdvice,
  type GoalDoc, type HerGoal, type PeriDay,
} from "@/lib/herGoal";

interface CycleInfo { lastStart: number; cycleLength: number; variability: number | null; ovulationDay?: number; irregular: boolean }

const GOALS: { id: HerGoal; label: string; hint: string }[] = [
  { id: "track", label: "Just tracking", hint: "Periods, symptoms and patterns" },
  { id: "ttc", label: "Trying for a baby", hint: "Fertile days and when to see a doctor" },
  { id: "peri", label: "Nearing menopause", hint: "Hot flashes, sleep and changes in your 40s" },
];
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/12 bg-white text-plum-900 hover:bg-lavender-50"}`;
const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Her goal: just tracking, trying to conceive, or perimenopause. */
export default function GoalCard({ cycle, className = "" }: { cycle: CycleInfo; className?: string }) {
  const { doc, save, loaded } = useUserDoc<GoalDoc>("her_goal", EMPTY_GOAL);
  if (!loaded) return null;
  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="goal-title">
      <div className="flex items-center gap-2 mb-1">
        <Target weight="duotone" className="h-5 w-5 text-lavender-500" aria-hidden="true" />
        <h3 id="goal-title" className="text-xl font-semibold tracking-tight text-plum-900">Your goal right now</h3>
      </div>
      <div role="radiogroup" aria-label="Your goal" className="mt-3 grid gap-2 sm:grid-cols-3">
        {GOALS.map(g => {
          const on = doc.goal === g.id;
          return (
            <button key={g.id} type="button" role="radio" aria-checked={on} onClick={() => save(d => ({ ...d, goal: g.id }))}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/10 bg-white/80 text-plum-900 hover:bg-lavender-50"}`}>
              <span className="block text-sm font-semibold">{g.label}</span>
              <span className={`block text-xs ${on ? "text-cream/75" : "text-ink-soft"}`}>{g.hint}</span>
            </button>
          );
        })}
      </div>
      {doc.goal === "ttc" && <TtcPanel doc={doc} save={save} cycle={cycle} />}
      {doc.goal === "peri" && <PeriPanel doc={doc} save={save} cycle={cycle} />}
    </section>
  );
}

type Save = (next: GoalDoc | ((p: GoalDoc) => GoalDoc)) => Promise<boolean>;

function TtcPanel({ doc, save, cycle }: { doc: GoalDoc; save: Save; cycle: CycleInfo }) {
  const today = dayKey();
  const w = fertileWindow(cycle, today);
  const advice = ttcAdvice(doc, today, cycle.irregular);
  const months = monthsTrying(doc.ttc_since, today);
  const marked = doc.intimacy.includes(today);
  const inWindow = doc.intimacy.filter(d => d >= w.start && d <= w.end).length;

  const headline = w.today === "peak" ? "Today is one of your most fertile days."
    : w.today === "fertile" ? "You're in your fertile window now."
    : w.today === "before" ? `Your fertile window starts in ${w.daysToStart} day${w.daysToStart === 1 ? "" : "s"}.`
    : "Your fertile window for this cycle has passed.";

  return (
    <div className="mt-5 space-y-4">
      <div className={`rounded-2xl p-4 ${w.today === "peak" || w.today === "fertile" ? "bg-emerald-50" : "bg-lavender-50"}`}>
        <div className="flex items-start gap-3">
          <Plant weight="duotone" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="text-sm text-plum-900">
            <p className="font-semibold">{headline}</p>
            <p className="mt-1 text-ink-soft">
              Fertile days {shortDate(w.start)} to {shortDate(w.end)}, likely ovulation around {shortDate(w.ovulation)}. Sex every 1 to 2 days in this window gives the best chance.
            </p>
            {!w.reliable && <p className="mt-1 text-amber-700">Your cycles vary a lot, so these dates are rough. Ovulation test strips from a chemist can pin it down.</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={marked} onClick={() => save(d => ({ ...d, intimacy: marked ? d.intimacy.filter(x => x !== today) : [...d.intimacy, today].slice(-120) }))} className={chip(marked)}>
          {marked ? <><Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Noted for today</> : "We tried today"}
        </button>
        <span className="text-xs text-ink-soft">{inWindow > 0 ? `${inWindow} day${inWindow === 1 ? "" : "s"} noted in this window. Private, only you see this.` : "Optional and private."}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-plum-900">
          <span className="mb-1 block font-medium">Trying since</span>
          <input type="month" max={today.slice(0, 7)} value={doc.ttc_since || ""} onChange={e => save(d => ({ ...d, ttc_since: e.target.value || undefined }))}
            className="w-full rounded-xl border border-plum-900/12 bg-cream/60 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500" />
          {months !== null && <span className="mt-1 block text-xs text-ink-soft">{months} month{months === 1 ? "" : "s"}</span>}
        </label>
        <fieldset className="text-sm text-plum-900">
          <legend className="mb-1 font-medium">About you</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={Boolean(doc.over35)} onClick={() => save(d => ({ ...d, over35: !d.over35 }))} className={chip(Boolean(doc.over35))}>I&apos;m 35 or older</button>
            <button type="button" aria-pressed={Boolean(doc.folic)} onClick={() => save(d => ({ ...d, folic: !d.folic }))} className={chip(Boolean(doc.folic))}>Taking folic acid</button>
          </div>
        </fieldset>
      </div>

      <ul className="space-y-1.5 text-sm text-plum-900">
        {!doc.folic && <li><span className="font-semibold">Start folic acid 400 mcg daily now.</span> <span className="text-ink-soft">It protects the baby&apos;s spine in the first weeks, before most women know they are pregnant. Free at government health centres.</span></li>}
        <li className={advice.seeDoctor ? "rounded-xl bg-amber-50 px-3 py-2 text-amber-800" : "text-ink-soft"}>{advice.text}</li>
        <li className="text-ink-soft">Stop smoking and alcohol for both partners, and get your sugar, thyroid and Hb checked before pregnancy.</li>
      </ul>
    </div>
  );
}

function PeriPanel({ doc, save, cycle }: { doc: GoalDoc; save: Save; cycle: CycleInfo }) {
  const today = dayKey();
  const saved = doc.peri.find(d => d.date === today);
  const [day, setDay] = useState<PeriDay>(saved || { date: today, flashes: 0, sweats: false, sleep: false, mood: false, dryness: false, joints: false });
  // Quick taps build on the latest answers, not the last render's
  const latest = useRef(day);
  const store = (change: (p: PeriDay) => Partial<PeriDay>) => {
    const next = { ...latest.current, ...change(latest.current) };
    latest.current = next;
    setDay(next);
    save(d => ({ ...d, peri: [...d.peri.filter(x => x.date !== today), next].slice(-120) }));
  };
  const sum = periSummary(doc.peri, today);
  const daysSince = Math.floor(Date.now() / 86_400_000) - cycle.lastStart;
  const flag = periRedFlags(daysSince);

  return (
    <div className="mt-5 space-y-4">
      {flag && <p role="alert" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{flag}</p>}
      <div>
        <p className="mb-2 text-sm font-medium text-plum-900">Today</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-plum-900/12 bg-white px-2 py-1">
            <Thermometer className="h-4 w-4 text-blush-500" aria-hidden="true" />
            <span className="text-sm text-plum-900">Hot flashes</span>
            <button type="button" aria-label="One fewer hot flash" onClick={() => store(p => ({ flashes: Math.max(0, p.flashes - 1) }))} className="h-7 w-7 rounded-full text-plum-900 hover:bg-lavender-50 cursor-pointer">−</button>
            <span className="w-5 text-center text-sm font-semibold tabular-nums text-plum-900" aria-live="polite">{day.flashes}</span>
            <button type="button" aria-label="One more hot flash" onClick={() => store(p => ({ flashes: Math.min(30, p.flashes + 1) }))} className="h-7 w-7 rounded-full text-plum-900 hover:bg-lavender-50 cursor-pointer">+</button>
          </div>
          {PERI_SIGNS.map(s => (
            <button key={s.key} type="button" aria-pressed={day[s.key]} onClick={() => store(p => ({ [s.key]: !p[s.key] }))} className={chip(day[s.key])}>{s.label}</button>
          ))}
        </div>
      </div>

      {sum.logged > 0 && (
        <p className="text-sm text-ink-soft">
          Last 30 days ({sum.logged} logged): about <span className="font-semibold text-plum-900">{sum.flashesPerDay}</span> hot flashes a day
          {sum.counts.filter(c => c.days > 0).map(c => `, ${c.label.toLowerCase()} on ${c.days} day${c.days === 1 ? "" : "s"}`).join("")}.
        </p>
      )}

      <ul className="space-y-1.5 text-sm text-ink-soft">
        <li><span className="font-semibold text-plum-900">Periods that come closer, further apart or heavier are common in your 40s.</span> See a doctor if bleeding soaks a pad every hour, lasts over 7 days, or comes between periods.</li>
        <li>Layers, a fan, cool water and less tea, coffee and spicy food help hot flashes. If they disturb sleep or work, ask your doctor; there are safe treatments.</li>
        <li>Bones thin faster now: aim for calcium (milk, curd, ragi, sesame), 20 minutes of sun, and walking or strength exercise.</li>
      </ul>
    </div>
  );
}
