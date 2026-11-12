"use client";

import { motion, useReducedMotion } from "motion/react";
import { AhaChart } from "@/components/AhaChart";
import { Reveal } from "@/components/Reveal";

/**
 * AhaMoment: mood laid against the cycle, shown with sample data.
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
                <h2 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-plum-900 sm:text-4xl lg:text-[2.7rem]">
                  Feeling heavier before your period?{" "}
                  <span className="display-serif font-normal text-blush-500">Now you&rsquo;ll know why.</span>
                </h2>
              </Reveal>

              <Reveal delay={0.08}>
                <p className="mt-6 max-w-md text-pretty leading-relaxed text-ink-soft">
                  Most apps keep your cycle and your mood in separate boxes. Sakhi lays
                  them side by side, so the low days stop feeling random and start
                  feeling expected, and easier to plan around.
                </p>
              </Reveal>

              <Reveal delay={0.16}>
                <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
                  {[
                    ["Period", "Rest, warmth, iron"],
                    ["Follicular", "Energy climbs"],
                    ["Luteal", "Slower, more sensitive"],
                  ].map(([phase, hint]) => (
                    <div key={phase} className="rounded-2xl bg-white/60 px-3 py-3">
                      <dt className="text-sm font-semibold text-plum-900">{phase}</dt>
                      <dd className="mt-0.5 text-xs leading-snug text-ink-soft">{hint}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>

              <Reveal delay={0.24}>
                <p className="mt-6 text-xs text-ink-faint">
                  Sample chart. Yours fills in from your own check-ins over a couple of cycles.
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
                    low mood
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded-full bg-blush-300" style={{ borderTop: "1px dashed" }} />
                    progesterone (rises after ovulation)
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
