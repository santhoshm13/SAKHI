"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";

/**
 * Hero — Stage 3 revealed landing content.
 * Centered angel figure placeholder, welcoming headline, concise subtext, and
 * a cream CTA with a lavender border. The full-body angel art
 * (/angel-fullbody.png) drops in later; falls back to /logo.png.
 */
export function Hero() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduce ? 0 : 0.14,
        delayChildren: reduce ? 0 : 0.1,
      },
    },
  };

  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 26, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 80, damping: 18, mass: 1 },
    },
  };

  return (
    <section
      className="relative flex min-h-[100dvh] flex-col items-center justify-center
                 px-6 pt-28 pb-16 text-center"
    >
      {/* Ambient breathing orbs (settled-petal / light-speck texture) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="breathe absolute -top-20 left-[8%] h-72 w-72 rounded-full bg-lavender-200/50 blur-3xl" />
        <div
          className="breathe absolute top-1/3 right-[6%] h-80 w-80 rounded-full bg-blush-200/40 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="breathe absolute bottom-10 left-[30%] h-64 w-64 rounded-full bg-lavender-100/60 blur-3xl"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="flex max-w-4xl flex-col items-center"
      >
        {/* Centered angel figure (Stage 3 hero graphic) */}
        <motion.div variants={item} className="relative mb-6 sm:mb-10">
          <div
            aria-hidden
            className="breathe absolute left-1/2 top-1/2 -z-10 h-44 w-44 sm:h-56 sm:w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-lavender-300/40 to-blush-300/40 blur-3xl mix-blend-multiply"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/original-logo.png?v=4"
            alt="Sakhi Logo"
            className="relative h-44 sm:h-56 md:h-64 w-auto drop-shadow-[0_8px_30px_rgba(122,74,163,0.25)] mix-blend-multiply"
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-balance text-3xl leading-[1.15] tracking-tight
                     text-plum-900 sm:text-5xl lg:text-6xl"
        >
          Your AI Companion for Every Stage of{" "}
          <span className="display-serif text-plum-800 italic">Womanhood</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={item}
          className="mt-4 sm:mt-6 max-w-[44rem] text-pretty text-sm sm:text-base md:text-lg leading-relaxed
                     text-ink-soft"
        >
          Sakhi bridges menstrual cycle rhythm, clinical AI risk prediction, and maternal care. Seamlessly switch between <strong>Her Mode</strong> (cycle intelligence & hormone screening) and <strong>Mom Mode</strong> (pregnancy tracking, kick counts & gestational risk monitoring).
        </motion.p>

        {/* Primary CTAs */}
        <motion.div variants={item} className="mt-7 sm:mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-plum-900 px-7 py-3.5 text-sm font-medium text-cream hover:bg-plum-800 active:scale-[0.98] transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2"
          >
            <span>Get started</span>
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-plum-700/25 bg-cream/85 px-7 py-3.5 text-sm font-medium text-plum-900 hover:border-plum-700/50 hover:bg-white active:scale-[0.98] transition-[background-color,border-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        </motion.div>

        {/* Updated Dual-Mode Feature Pills */}
        <motion.div variants={item} className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 border border-pink-200/90 shadow-[0_4px_16px_rgba(244,114,182,0.14)] text-[11px] sm:text-xs font-semibold text-plum-900">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>Her Mode • Cycle & PCOS/Thyroid Screening</span>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 border border-pink-200/90 shadow-[0_4px_16px_rgba(244,114,182,0.14)] text-[11px] sm:text-xs font-semibold text-plum-900">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span>Mom Mode • Trimester Care & GDM/BP AI</span>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 border border-pink-200/90 shadow-[0_4px_16px_rgba(244,114,182,0.14)] text-[11px] sm:text-xs font-semibold text-plum-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Voice Check-in & Real-time Clinical ML</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Subtle scroll cue */}
      <motion.div
        aria-hidden
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: reduce ? 0.4 : [0.2, 0.6, 0.2] }}
        transition={{ duration: 2.4, repeat: reduce ? 0 : Infinity, delay: 1.8 }}
      >
        <div className="h-10 w-6 rounded-full border border-plum-700/25 p-1">
          <motion.div
            className="h-2 w-4 rounded-full bg-plum-700/40"
            animate={reduce ? {} : { y: [0, 12, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
