"use client";

import Link from "next/link";
import { ArrowRight, EyeSlash, HandPalm, DownloadSimple, Stethoscope } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "@/components/Reveal";

const PROMISES: { icon: Icon; title: string; body: string }[] = [
  { icon: HandPalm, title: "Asked first", body: "Before anything goes to the AI, Sakhi explains what's stored and where, and waits for your yes." },
  { icon: EyeSlash, title: "Private mode", body: "One switch keeps your chats away from the AI model. Sakhi replies from its built-in guidance instead." },
  { icon: DownloadSimple, title: "Yours to take or erase", body: "Download everything Sakhi holds about you, clear a chat, or delete it all, from Settings." },
  { icon: Stethoscope, title: "Guidance, not diagnosis", body: "Risk checks point you to a doctor early. They never replace one." },
];

/** Privacy promises, the closing invitation, and the legal line. */
export function Footer() {
  return (
    <footer className="relative px-5 pt-8 pb-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <h2 className="max-w-sm text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-plum-900 sm:text-[2.7rem]">
              Your health story,{" "}
              <span className="display-serif font-normal text-lavender-600">on your terms.</span>
            </h2>
            <p className="mt-4 max-w-sm text-pretty leading-relaxed text-ink-soft">
              The most personal data you have deserves plain answers about where it goes.
            </p>
          </Reveal>
          <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {PROMISES.map(({ icon: PromiseIcon, title, body }, i) => (
              <Reveal key={title} delay={0.05 + i * 0.05}>
                <dt className="flex items-center gap-2.5 font-semibold text-plum-900">
                  <PromiseIcon size={20} weight="duotone" className="text-lavender-500" aria-hidden="true" />
                  {title}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</dd>
              </Reveal>
            ))}
          </dl>
        </div>

        <Reveal delay={0.1}>
          <div className="relative mt-24 overflow-hidden rounded-[34px] bg-gradient-to-br from-lavender-100 via-mist to-blush-100 px-6 py-14 text-center sm:px-12 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/50 blur-3xl breathe" />
            <h2 className="relative mx-auto max-w-xl text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-plum-900 sm:text-[2.6rem]">
              Your body has been telling you things.{" "}
              <span className="display-serif font-normal text-blush-500">Start listening.</span>
            </h2>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-7 py-3.5 text-sm font-semibold text-cream transition-[background-color,transform] duration-150 hover:bg-plum-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2"
              >
                Start free
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-plum-700/20 bg-white/70 px-6 py-3.5 text-sm font-semibold text-plum-900 transition-[background-color,border-color] duration-150 hover:border-plum-700/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 flex flex-col gap-4 border-t border-plum-700/10 pt-8 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sakhi-round-logo.png" alt="" className="h-7 w-7 rounded-full" />
            <span className="text-sm font-semibold text-plum-900">Sakhi</span>
            <span>Made with care, for the women of Bharat. © {new Date().getFullYear()}</span>
          </div>
          <p className="max-w-md sm:text-right">
            Sakhi gives general guidance, not medical advice. In an emergency, call{" "}
            <a href="tel:112" className="font-semibold text-plum-900 underline underline-offset-2">112</a>.
            Feeling low? Tele-MANAS:{" "}
            <a href="tel:14416" className="font-semibold text-plum-900 underline underline-offset-2">14416</a>.
          </p>
        </div>
      </div>
    </footer>
  );
}
