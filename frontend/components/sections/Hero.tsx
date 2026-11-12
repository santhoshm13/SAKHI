"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, WifiSlash, Microphone, ShieldCheck } from "@phosphor-icons/react";

/**
 * Hero: the product itself is the picture. Left, the promise; right, what a
 * normal morning in Sakhi looks like (today's cycle card and a gentle reply).
 * Headline, sub-copy and both actions fit within 1280x800 without scrolling.
 */
export function Hero() {
  const reduce = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 90, damping: 20, delay: reduce ? 0 : delay },
  });

  return (
    <div className="relative mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-12 px-5 pt-28 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-24 lg:pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="breathe absolute -top-10 right-[4%] h-96 w-96 rounded-full bg-lavender-200/45 blur-3xl" />
        <div className="breathe absolute bottom-0 left-[2%] h-80 w-80 rounded-full bg-blush-200/40 blur-3xl" style={{ animationDelay: "3s" }} />
      </div>

      {/* The promise */}
      <div className="max-w-xl">
        <motion.p {...rise(0.05)} className="text-sm font-medium text-blush-500">
          For your cycle, and for your pregnancy
        </motion.p>

        <motion.h1
          {...rise(0.12)}
          className="mt-4 text-balance text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-plum-900 sm:text-6xl lg:text-[4.2rem]"
        >
          Your body speaks.{" "}
          <span className="display-serif font-normal text-lavender-600">Sakhi listens.</span>
        </motion.h1>

        <motion.p {...rise(0.2)} className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-ink-soft sm:text-lg">
          A gentle companion that learns your real rhythm, not a 28-day template.
          Log how you feel in a sentence, ask anything like you would a friend,
          and know early when something needs a doctor.
        </motion.p>

        <motion.div {...rise(0.28)} className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-7 py-3.5 text-sm font-semibold text-cream shadow-[0_12px_30px_-12px_rgb(42_21_47/0.6)] transition-[background-color,transform] duration-150 hover:bg-plum-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            Start free
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
          <Link
            href="/login#sample"
            className="inline-flex items-center rounded-full border border-plum-700/20 bg-white/70 px-6 py-3.5 text-sm font-semibold text-plum-900 transition-[background-color,border-color,transform] duration-150 hover:border-plum-700/40 hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            Try it with sample data
          </Link>
        </motion.div>

        <motion.ul {...rise(0.36)} className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          <li className="inline-flex items-center gap-2">
            <Microphone size={16} weight="duotone" className="text-lavender-500" aria-hidden="true" />
            Talk or type
          </li>
          <li className="inline-flex items-center gap-2">
            <WifiSlash size={16} weight="duotone" className="text-lavender-500" aria-hidden="true" />
            Still answers offline
          </li>
          <li className="inline-flex items-center gap-2">
            <ShieldCheck size={16} weight="duotone" className="text-lavender-500" aria-hidden="true" />
            You control what AI sees
          </li>
        </motion.ul>
      </div>

      {/* A morning in Sakhi */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, rotate: 1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: "spring", stiffness: 60, damping: 18, delay: reduce ? 0 : 0.25 }}
        className="relative mx-auto w-full max-w-md lg:mr-0"
        aria-label="Example of Sakhi's today screen"
        role="img"
      >
        <TodayCard />
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 18, delay: reduce ? 0 : 0.7 }}
          className="relative -mt-6 ml-6 sm:ml-12"
        >
          <ChatPreview />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : 1.1 }}
          className="absolute -left-4 -top-10 hidden rounded-2xl border border-white/70 bg-white/90 px-3.5 py-2.5 text-xs shadow-[0_14px_30px_-14px_rgb(74_42_82/0.35)] backdrop-blur sm:block lg:-left-10"
        >
          <p className="font-semibold text-plum-900">Saved from chat</p>
          <p className="mt-0.5 text-ink-soft">cramps 3/10 · slept 6 h</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function TodayCard() {
  // A 28-day ring: period, follicular, ovulation, luteal. Today is day 18.
  const r = 38;
  const c = 2 * Math.PI * r;
  const seg = (from: number, to: number) => ({
    strokeDasharray: `${((to - from) / 28) * c - 2} ${c}`,
    strokeDashoffset: -((from / 28) * c),
  });
  const today = 17.5 / 28;
  const angle = today * 2 * Math.PI - Math.PI / 2;

  return (
    <div className="glass-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-plum-900">Today</p>
        <p className="text-xs text-ink-soft">Cycle day 18 of about 29</p>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-blush-400)" strokeWidth="9" {...seg(0, 5)} />
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-lavender-200)" strokeWidth="9" {...seg(5, 12)} />
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-lavender-400)" strokeWidth="9" {...seg(12, 16)} />
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-lavender-500)" strokeWidth="9" strokeOpacity="0.55" {...seg(16, 28)} />
          </svg>
          <span
            className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-plum-900 shadow"
            style={{ left: `calc(50% + ${Math.cos(angle) * 38}% - 7px)`, top: `calc(50% + ${Math.sin(angle) * 38}% - 7px)` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-plum-900">18</span>
            <span className="text-[11px] text-ink-soft">luteal</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-snug text-plum-900">Period in about 11 days</p>
          <p className="mt-1 text-sm leading-snug text-ink-soft">
            Energy often dips this week. Iron-rich food and an earlier night help.
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          ["Mood", "Calm"],
          ["Sleep", "6 h"],
          ["Pain", "3/10"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-cream/80 px-2 py-2.5">
            <p className="text-[11px] text-ink-soft">{k}</p>
            <p className="text-sm font-semibold text-plum-900">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/92 p-4 shadow-[0_24px_50px_-24px_rgb(74_42_82/0.4)] backdrop-blur">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-plum-900 px-3.5 py-2 text-sm text-cream">
        Why am I so tired this week?
      </p>
      <div className="mt-3 flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sakhi-doll.png" alt="" className="h-8 w-8 shrink-0 rounded-full bg-blush-100 object-cover" />
        <p className="rounded-2xl rounded-tl-md bg-blush-50 px-3.5 py-2 text-sm leading-relaxed text-plum-900">
          Oh dear, that makes sense. You&rsquo;re on day 18, when progesterone rises
          and many of us feel slower. You slept 6 hours too, so be gentle with yourself
          tonight.
        </p>
      </div>
    </div>
  );
}
