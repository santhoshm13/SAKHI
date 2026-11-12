"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  Heartbeat,
  Brain,
  Baby,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Reveal, itemVariants } from "@/components/Reveal";
import { Badge } from "@/components/kokonut";

export function FeatureBento() {
  const reduce = useReducedMotion();

  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="mb-4 text-xs font-medium text-ink-soft">
            One system, five senses
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="max-w-2xl text-balance text-3xl leading-[1.1] tracking-tight text-plum-900 sm:text-4xl lg:text-[2.7rem]">
            Everything she juggles, finally in{" "}
            <span className="display-serif text-plum-800">one place</span>.
          </h2>
        </Reveal>

        <motion.div
          className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-6 md:grid-rows-[auto_auto]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: reduce ? 0 : 0.1,
                delayChildren: 0.05,
              },
            },
          }}
        >
          <CycleCell reduce={!!reduce} />
          <MindCell reduce={!!reduce} />
          <MaternalCell />
        </motion.div>
      </div>
    </section>
  );
}

const IconProps = { weight: "bold" as const };

function CycleCell({ reduce }: { reduce: boolean }) {
  const Icon: PhosphorIcon = Heartbeat;
  return (
    <motion.article
      variants={itemVariants}
      className="md:col-span-4 md:row-span-1 group relative overflow-hidden rounded-[26px] bg-gradient-to-br from-lavender-100 via-[#f3e8f8] to-blush-100 border border-white/60 p-7 sm:p-9 shadow-[0_24px_60px_-30px_rgba(74,42,82,0.25)]"
    >
      <div className="relative z-10 flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-md">
          <Badge variant="soft" className="mb-4">
            core engine
          </Badge>
          <h3 className="text-2xl font-semibold text-plum-900 sm:text-3xl">
            Cycle Intelligence
          </h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Predictions tuned to irregular cycles, PCOS, and postpartum return.
            Not a 28-day template. Your actual rhythm.
          </p>
        </div>
        <CycleRing reduce={reduce} />
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-8 text-lavender-200/50"
      >
        <Icon size={200} {...IconProps} />
      </span>
    </motion.article>
  );
}

function MindCell({ reduce }: { reduce: boolean }) {
  const Icon: PhosphorIcon = Brain;
  return (
    <motion.article
      variants={itemVariants}
      className="md:col-span-2 group relative overflow-hidden rounded-[26px] glass p-7"
    >
      <div className="relative z-10 flex h-full flex-col">
        <Icon size={26} {...IconProps} />
        <h3 className="mt-4 text-xl font-semibold text-plum-900">
          Mental Wellness
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Mood, sleep, and anxiety tracked against your hormonal timeline, so
          patterns surface instead of hiding.
        </p>
        <Waveform reduce={reduce} />
      </div>
    </motion.article>
  );
}

function MaternalCell() {
  const Icon: PhosphorIcon = Baby;
  return (
    <motion.article
      variants={itemVariants}
      className="md:col-span-6 group relative overflow-hidden rounded-[26px] bg-gradient-to-br from-pink-50 via-rose-50/60 to-lavender-50 border border-pink-200/80 p-7 sm:p-9 shadow-[0_20px_50px_-25px_rgba(244,114,182,0.2)]"
    >
      <div className="relative z-10 flex h-full flex-col max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="plum">mom mode</Badge>
          <span className="text-xs font-semibold text-pink-700">Clinical Screening ML</span>
        </div>
        <div className="flex items-center gap-3">
          <Icon size={28} className="text-pink-600" {...IconProps} />
          <h3 className="text-2xl font-semibold text-plum-900">
            Mom Mode & Maternal Health
          </h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Continuous pregnancy care from conception through postpartum: weekly baby size & milestone tracking, fetal kick count logging, and live machine learning screening for Gestational Diabetes and Preeclampsia.
        </p>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-6 text-pink-200/40 select-none"
      >
        <Icon size={210} {...IconProps} />
      </span>
    </motion.article>
  );
}

function CycleRing({ reduce }: { reduce: boolean }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0" aria-hidden>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgba(74,42,82,0.12)"
          strokeWidth="6"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#cycleGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * 0.35 : c }}
          whileInView={{ strokeDashoffset: c * 0.35 }}
          viewport={{ once: true }}
          transition={{
            duration: reduce ? 0 : 1.6,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.3,
          }}
        />
        <defs>
          <linearGradient id="cycleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8f63c2" />
            <stop offset="100%" stopColor="#d14d6d" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold text-plum-900">day 14</span>
        <span className="text-[10px] text-ink-soft">ovulation</span>
      </div>
    </div>
  );
}

function Waveform({ reduce }: { reduce: boolean }) {
  const bars = 18;
  return (
    <div className="mt-5 flex h-10 items-end gap-1" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const base = 30 + Math.sin(i * 0.7) * 25 + ((i * 7) % 20);
        const peakRatio = Math.min(95, base + 25) / base;
        return (
          <motion.span
            key={i}
            className="flex-1 rounded-full bg-gradient-to-t from-lavender-400 to-blush-300"
            animate={
              reduce
                ? { scaleY: 1 }
                : {
                    scaleY: [1, peakRatio, 1],
                  }
            }
            transition={{
              duration: 1.2 + (i % 4) * 0.25,
              repeat: reduce ? 0 : Infinity,
              ease: "easeInOut",
              delay: i * 0.05,
            }}
            style={{ height: `${base}%`, transformOrigin: "bottom" }}
          />
        );
      })}
    </div>
  );
}
