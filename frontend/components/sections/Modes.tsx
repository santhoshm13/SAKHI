"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarDots,
  ChatCircleText,
  FirstAidKit,
  Scales,
  FileText,
  Baby,
  Footprints,
  Heartbeat,
  Timer,
  CalendarCheck,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "@/components/Reveal";

type Feature = { icon: Icon; title: string; body: string };

const MODES = {
  her: {
    label: "Her Mode",
    note: "For your monthly cycle",
    features: [
      { icon: CalendarDots, title: "A cycle that adapts", body: "Late period, longer bleed, early stop: Sakhi notices and resets its predictions instead of pretending." },
      { icon: ChatCircleText, title: "Check-ins that fit the day", body: "Pain questions on your period, energy and mood the rest of the month. Never a long form." },
      { icon: FirstAidKit, title: "Pain relief that works for you", body: "Heat, stretches, food and rest ideas, and it remembers which ones helped last time." },
      { icon: Scales, title: "Weight, without the pressure", body: "A smoothed trend line that ignores day-to-day water weight." },
      { icon: FileText, title: "A summary for your doctor", body: "Cycles, symptoms and pain in one printable page, so the visit starts with facts." },
    ] as Feature[],
  },
  mom: {
    label: "Mom Mode",
    note: "For every week of pregnancy",
    features: [
      { icon: Baby, title: "Your baby, this week", body: "Size, milestones and what to expect next, matched to the week you're in." },
      { icon: Footprints, title: "Kick counts", body: "Log movements in a tap and see if today looks different from usual." },
      { icon: Heartbeat, title: "BP and sugar, watched", body: "Readings that need attention get a clear, calm alert and what to do next." },
      { icon: Scales, title: "Healthy weight gain", body: "Your gain against the range for your starting weight, week by week." },
      { icon: Timer, title: "Contraction timer", body: "Tap start and stop. Sakhi tells you when the pattern means it's time to go." },
      { icon: CalendarCheck, title: "Appointments and scans", body: "Every visit in one place, added just by mentioning it in chat." },
    ] as Feature[],
  },
} as const;

type ModeKey = keyof typeof MODES;
const ORDER: ModeKey[] = ["her", "mom"];

export function Modes() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<ModeKey>("her");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : ORDER.length - 1)) % ORDER.length;
    setMode(ORDER[next]);
    tabs.current[next]?.focus();
  };

  const current = MODES[mode];

  return (
    <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal>
          <h2 className="max-w-xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-plum-900 sm:text-[2.7rem]">
            One companion for two{" "}
            <span className="display-serif font-normal text-lavender-600">seasons of life.</span>
          </h2>
          <p className="mt-4 max-w-lg text-pretty leading-relaxed text-ink-soft">
            Start with your cycle. When you&rsquo;re expecting, switch to Mom Mode and
            Sakhi changes with you, keeping everything in one place.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div role="tablist" aria-label="Sakhi modes" className="inline-flex rounded-full border border-plum-700/10 bg-white/60 p-1.5 backdrop-blur">
            {ORDER.map((key, i) => {
              const selected = key === mode;
              return (
                <button
                  key={key}
                  ref={(el) => { tabs.current[i] = el; }}
                  role="tab"
                  id={`mode-tab-${key}`}
                  aria-selected={selected}
                  aria-controls={`mode-panel-${key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setMode(key)}
                  onKeyDown={(e) => onKey(e, i)}
                  className="relative cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
                >
                  {selected && (
                    <motion.span
                      layoutId="mode-pill"
                      className="absolute inset-0 rounded-full bg-plum-900"
                      transition={{ type: "spring", stiffness: 300, damping: 30, duration: reduce ? 0 : undefined }}
                    />
                  )}
                  <span className={`relative ${selected ? "text-cream" : "text-ink-soft hover:text-plum-900"}`}>
                    {MODES[key].label}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>
      </div>

      <div
        role="tabpanel"
        id={`mode-panel-${mode}`}
        aria-labelledby={`mode-tab-${mode}`}
        className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.15fr]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode + "-visual"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`relative overflow-hidden rounded-[30px] p-6 sm:p-8 ${mode === "her" ? "bg-mist" : "bg-blush-50"}`}
          >
            <p className="text-sm font-medium text-ink-soft">{current.note}</p>
            {mode === "her" ? <CycleStrip /> : <PregnancyGlance />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={mode + "-list"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: reduce ? 0 : 0.05 }}
            className="divide-y divide-plum-700/10 rounded-[30px] border border-plum-700/10 bg-white/55 px-6 backdrop-blur sm:px-8"
          >
            {current.features.map(({ icon: FeatureIcon, title, body }) => (
              <li key={title} className="flex gap-4 py-5">
                <FeatureIcon size={22} weight="duotone" className="mt-0.5 shrink-0 text-lavender-500" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-plum-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** A month at a glance, including the case most apps ignore: a late period. */
function CycleStrip() {
  const days = Array.from({ length: 33 }, (_, i) => i + 1);
  const kind = (d: number) =>
    d <= 5 ? "period" : d >= 12 && d <= 16 ? "fertile" : d > 29 ? "late" : "other";
  const style: Record<string, string> = {
    period: "bg-blush-400",
    fertile: "bg-lavender-400",
    other: "bg-lavender-100",
    late: "bg-transparent border border-dashed border-blush-400",
  };
  return (
    <div className="mt-6">
      <p className="text-2xl font-semibold leading-snug text-plum-900 sm:text-3xl">
        Period is 3 days late.
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Sakhi doesn&rsquo;t just move on to the next &ldquo;cycle&rdquo;. It waits with you,
        asks gently, and suggests a test or a doctor if it goes on.
      </p>
      <div className="mt-8 grid grid-cols-[repeat(33,minmax(0,1fr))] gap-[3px]" aria-hidden="true">
        {days.map((d) => (
          <span key={d} className={`h-10 rounded-full ${style[kind(d)]} ${d === 32 ? "ring-2 ring-plum-900 ring-offset-2 ring-offset-mist" : ""}`} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blush-400" />Period</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lavender-400" />Fertile window</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-blush-400" />Late days</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-plum-900" />Today</span>
      </div>
    </div>
  );
}

function PregnancyGlance() {
  return (
    <div className="mt-6">
      <p className="text-2xl font-semibold leading-snug text-plum-900 sm:text-3xl">
        Week 32. Baby is about the size of a coconut.
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Around 1.7 kg and practising breathing. Kicks may feel more like rolls now.
      </p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/80 p-4">
          <p className="text-xs text-ink-soft">Kicks today</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-plum-900">10 <span className="text-sm font-normal text-ink-soft">in 42 min</span></p>
        </div>
        <div className="rounded-2xl bg-white/80 p-4">
          <p className="text-xs text-ink-soft">Blood pressure</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-plum-900">118/76</p>
          <p className="text-xs font-medium text-emerald-700">In a healthy range</p>
        </div>
        <div className="col-span-2 rounded-2xl bg-white/80 p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-ink-soft">Weight gained</p>
            <p className="text-xs text-ink-soft">Healthy range 8.6 to 12.4 kg</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-plum-900">9.8 kg</p>
          <div className="relative mt-3 h-2.5 rounded-full bg-lavender-100" aria-hidden="true">
            <span className="absolute inset-y-0 left-[30%] right-[22%] rounded-full bg-emerald-200" />
            <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-plum-900 shadow" style={{ left: "calc(50% - 8px)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
