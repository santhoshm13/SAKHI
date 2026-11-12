"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * AhaChart — the "Aha" moment visualization.
 * Shows how a low-mood curve lines up with the luteal phase of the
 * cycle. The chart "draws itself" as the user scrolls: line paths use
 * pathLength tied to scroll progress, and the correlation badge +
 * annotation pins reveal after the line completes.
 *
 * Data is illustrative sample data (clearly a mock), spanning a 28-day
 * cycle. The luteal band is shaded so the eye instantly reads the overlap.
 */

const CYCLE_DAYS = 28;
// Anxiety index (0..100), sample. Spikes in luteal phase (day 15-28).
const anxietyData = [
  12, 14, 11, 16, 18, 15, 13, 12, 14, 17, 20, 19, 22, 26,
  // ---- luteal phase begins (day 15) ----
  34, 42, 51, 58, 63, 66, 69, 71, 68, 62, 55, 47, 38, 30,
];
// Hormone proxy (progesterone-ish), peaks mid-luteal.
const hormoneData = [
  8, 9, 10, 12, 15, 22, 30, 38, 44, 48, 46, 40, 32, 26,
  // luteal
  22, 28, 38, 52, 66, 78, 84, 82, 74, 62, 48, 34, 22, 14,
];

const W = 720;
const H = 320;
const PAD_X = 36;
const PAD_Y = 28;

const xFor = (i: number) =>
  PAD_X + (i / (CYCLE_DAYS - 1)) * (W - PAD_X * 2);
const yFor = (v: number) => H - PAD_Y - (v / 100) * (H - PAD_Y * 2);

const anxietyPath = anxietyData
  .map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`)
  .join(" ");

const hormonePath = hormoneData
  .map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`)
  .join(" ");

// Luteal band: days 15-28 (index 14..27)
const lutealX0 = xFor(14);
const lutealX1 = xFor(27);

export function AhaChart() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Scroll progress across the chart section.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.4"],
  });

  // When reduced motion, draw instantly.
  const lineProgress = reduce ? 1 : useTransform(scrollYProgress, [0.1, 0.6], [0, 1]);
  const fillOpacity = reduce ? 0.25 : useTransform(scrollYProgress, [0.45, 0.75], [0, 0.22]);

  return (
    <div ref={ref} className="w-full">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Sample chart: low mood rises during the luteal phase, after ovulation, alongside progesterone."
        >
          <defs>
            <linearGradient id="anxietyLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a982d6" />
              <stop offset="60%" stopColor="#8f63c2" />
              <stop offset="100%" stopColor="#d14d6d" />
            </linearGradient>
            <linearGradient id="hormoneLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ee9fb1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ee9fb1" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="lutealBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9c2ee" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#d9c2ee" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="anxietyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8f63c2" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8f63c2" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Luteal phase shaded band (days 15-28) */}
          <motion.rect
            x={lutealX0}
            y={PAD_Y}
            width={lutealX1 - lutealX0}
            height={H - PAD_Y * 2}
            fill="url(#lutealBand)"
            rx="8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />

          {/* Baseline grid (horizontal) */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={PAD_Y + t * (H - PAD_Y * 2)}
              y2={PAD_Y + t * (H - PAD_Y * 2)}
              stroke="#3a1f43"
              strokeOpacity="0.06"
              strokeWidth="1"
            />
          ))}

          {/* Day axis labels */}
          <text x={xFor(0)} y={H - 6} fontSize="9" fill="#9a82a0" fontFamily="monospace">
            day 1
          </text>
          <text x={xFor(13)} y={H - 6} fontSize="9" fill="#9a82a0" fontFamily="monospace">
            ovulation
          </text>
          <text x={xFor(20)} y={H - 6} fontSize="9" fill="#764aa3" fontFamily="monospace">
            luteal
          </text>
          <text x={W - PAD_X - 24} y={H - 6} fontSize="9" fill="#9a82a0" fontFamily="monospace">
            day 28
          </text>

          {/* Hormone (progesterone) line — softer, behind */}
          <motion.path
            d={hormonePath}
            fill="none"
            stroke="url(#hormoneLine)"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            strokeLinecap="round"
            style={{
              pathLength: reduce ? 1 : useTransform(scrollYProgress, [0.05, 0.55], [0, 1]),
            }}
          />
          {/* Hormone label */}
          <motion.text
            x={xFor(21)}
            y={yFor(84) - 8}
            fontSize="10"
            fill="#d14d6d"
            fontFamily="monospace"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.8 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            progesterone
          </motion.text>

          {/* Anxiety fill under curve */}
          <motion.path
            d={`${anxietyPath} L${xFor(CYCLE_DAYS - 1).toFixed(1)},${(H - PAD_Y).toFixed(
              1
            )} L${xFor(0).toFixed(1)},${(H - PAD_Y).toFixed(1)} Z`}
            fill="url(#anxietyFill)"
            style={{ opacity: fillOpacity as any }}
          />

          {/* Anxiety line — the hero of the chart, draws on scroll */}
          <motion.path
            d={anxietyPath}
            fill="none"
            stroke="url(#anxietyLine)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pathLength: lineProgress as any }}
          />

          {/* Peak marker dot */}
          <motion.circle
            cx={xFor(21)}
            cy={yFor(71)}
            r="5"
            fill="#d14d6d"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{
              delay: reduce ? 0 : 1.1,
              type: "spring",
              stiffness: 200,
              damping: 12,
            }}
          />
          <motion.circle
            cx={xFor(21)}
            cy={yFor(71)}
            r="10"
            fill="none"
            stroke="#d14d6d"
            strokeOpacity="0.4"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: reduce ? 0 : 1.3, duration: 0.5 }}
          />
        </svg>

        {/* Correlation badge overlay (reveals after line draws) */}
        <motion.div
          className="absolute top-2 right-2 sm:top-4 sm:right-4"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: reduce ? 0.2 : 1.4, duration: 0.5 }}
        >
          <div className="glass-strong rounded-2xl px-4 py-3">
            <p className="text-xs font-medium text-ink-soft">
              Sample cycle
            </p>
            <p className="text-sm font-semibold text-plum-900">
              Low days cluster after ovulation
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
