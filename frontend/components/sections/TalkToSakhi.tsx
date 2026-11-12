"use client";

import { motion, useReducedMotion } from "motion/react";
import { Microphone, ClockCounterClockwise, WifiSlash, Siren } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "@/components/Reveal";

const POINTS: { icon: Icon; title: string; body: string }[] = [
  { icon: Microphone, title: "Talk or type", body: "Speak in English with an Indian accent. Sakhi can read its replies aloud, and hands-free mode keeps listening." },
  { icon: ClockCounterClockwise, title: "Remembers the conversation", body: "Mention cramps on Monday and it asks how you are on Tuesday. What you say is saved to your log for you." },
  { icon: WifiSlash, title: "Still there offline", body: "No signal, or AI switched off? Sakhi answers from its built-in guidance and keeps logging." },
  { icon: Siren, title: "Knows when it's urgent", body: "Warning signs get a clear answer to call your doctor or 112 now. For hard days, Tele-MANAS is one tap away at 14416." },
];

type Bubble = { from: "me" | "sakhi"; text: string; alert?: boolean };

const CHAT: Bubble[] = [
  { from: "me", text: "Kicks feel less today, and I have a bad headache with blurry vision" },
  { from: "sakhi", alert: true, text: "Dear mama, please don't wait on this. A strong headache with blurry vision can be a sign of high blood pressure in pregnancy. Call your doctor or 112 now. Less movement is a reason to be checked today too." },
  { from: "me", text: "ok calling now. thank you" },
  { from: "sakhi", text: "You're doing exactly the right thing. I'm here when you're back, sweet mama." },
];

export function TalkToSakhi() {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
      <div className="relative overflow-hidden rounded-[34px] bg-plum-900 px-6 py-12 text-cream sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lavender-500/25 blur-3xl breathe" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-80 w-80 rounded-full bg-blush-400/15 blur-3xl breathe" style={{ animationDelay: "3s" }} />

        <div className="relative grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <Reveal>
              <h2 className="max-w-md text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.7rem]">
                Ask her anything.{" "}
                <span className="display-serif font-normal text-lavender-200">She answers like a friend.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-5 max-w-md text-pretty leading-relaxed text-cream/75">
                Warm, plain-spoken and never preachy. Sakhi reads your own logs before
                it replies, so the answer is about you, not women in general.
              </p>
            </Reveal>

            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {POINTS.map(({ icon: PointIcon, title, body }, i) => (
                <Reveal key={title} delay={0.1 + i * 0.06}>
                  <li className="list-none">
                    <PointIcon size={22} weight="duotone" className="text-lavender-300" aria-hidden="true" />
                    <h3 className="mt-3 font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-cream/70">{body}</p>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] bg-cream p-4 text-plum-900 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] sm:p-6" aria-label="Example conversation in Mom Mode" role="group">
            <div className="flex items-center gap-3 border-b border-plum-700/10 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sakhi-doll.png" alt="" className="h-10 w-10 rounded-full bg-blush-100 object-cover" />
              <div>
                <p className="text-sm font-semibold">Sakhi</p>
                <p className="text-xs text-ink-soft">Mom Mode · week 33</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              {CHAT.map((b, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.35, delay: reduce ? 0 : 0.25 + i * 0.45 }}
                  className={b.from === "me" ? "ml-auto max-w-[82%]" : "max-w-[90%]"}
                >
                  <p
                    className={
                      b.from === "me"
                        ? "rounded-2xl rounded-br-md bg-plum-900 px-4 py-2.5 text-sm text-cream"
                        : b.alert
                          ? "rounded-2xl rounded-tl-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm leading-relaxed text-rose-950"
                          : "rounded-2xl rounded-tl-md bg-blush-50 px-4 py-2.5 text-sm leading-relaxed"
                    }
                  >
                    {b.text}
                  </p>
                  {b.alert && (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
                      <Siren size={13} weight="fill" aria-hidden="true" /> Call 112
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
