"use client";

import { motion, useReducedMotion } from "motion/react";
import { AhaChart } from "@/components/AhaChart";
import { Reveal } from "@/components/Reveal";

/**
 * AhaMoment — the core differentiator.
 * Visually distinct: a full-width tinted panel (lavender mist) that
 * breaks the page rhythm, holding the self-drawing correlation chart.
 *
 * The message lands first, then the chart draws to prove it.
 * Single focused message, no split-header.
 */
export function AhaMoment() {
  const reduce = useReducedMotion();

  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Tinted panel breaks the cream background */}
        <div className="relative overflow-hidden rounded-[34px] bg-mist p-7 sm:p-12 lg:p-16">
          {/* soft radial bloom behind chart */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-lavender-200/50 blur-3xl breathe"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-blush-200/40 blur-3xl breathe"
            style={{ animationDelay: "3s" }}
          />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            {/* Left: the message */}
            <div>
              <Reveal>
                <p className="mb-4 text-xs font-medium text-ink-soft">
                  The pattern Sakhi sees
                </p>
              </Reveal>

              <Reveal delay={0.08}>
                <h2 className="text-balance text-3xl leading-[1.1] tracking-tight text-plum-900 sm:text-4xl lg:text-[2.7rem]">
                  Your anxiety spikes{" "}
                  <span className="display-serif text-blush-500">correlate</span>{" "}
                  with your luteal phase.
                </h2>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="mt-6 max-w-md text-pretty leading-relaxed text-ink-soft">
                  Most apps track your cycle and your mood in two separate
                  silos. Sakhi connects them. So when your body enters its
                  luteal phase, you stop wondering why everything feels heavier.
                  You already know.
                </p>
              </Reveal>

              <Reveal delay={0.24}>
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                  <div>
                    <p className="text-3xl font-semibold text-plum-900">+0.81</p>
                    <p className="text-xs text-ink-soft">anxiety / luteal r-value</p>
                  </div>
                  <div className="h-10 w-px bg-plum-700/15" />
                  <div>
                    <p className="text-3xl font-semibold text-plum-900">14 days</p>
                    <p className="text-xs text-ink-soft">average window</p>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.32}>
                <p className="mt-6 text-[11px] text-ink-faint">
                  Illustrative sample data shown. Sakhi learns your personal
                  baseline over time.
                </p>
              </Reveal>
            </div>

            {/* Right: the self-drawing chart */}
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.1 }}
              className="glass-strong rounded-[26px] p-5 sm:p-7"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-[11px] text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-full bg-gradient-to-r from-lavender-400 to-blush-400" />
                    anxiety
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded-full bg-blush-300" style={{ borderTop: "1px dashed" }} />
                    progesterone
                  </span>
                </div>
              </div>
              <AhaChart />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
