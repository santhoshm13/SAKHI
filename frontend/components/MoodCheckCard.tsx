"use client";

import { useState } from "react";
import { Heart, Phone } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useUserDoc, dayKey } from "@/hooks/useUserDoc";
import { ANSWERS, EMPTY_MOOD, MOOD_QUESTIONS, bandOf, moodDue, moodMessage, scoreMood, type MoodDoc } from "@/lib/mood";

const BAR: Record<string, string> = { ok: "bg-emerald-400", mild: "bg-amber-300", moderate: "bg-orange-400", severe: "bg-rose-500" };
const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Two-weekly mood check (PHQ-4 + safety question) with Tele-MANAS when it matters. */
export default function MoodCheckCard({ pregnant, className = "" }: { pregnant: boolean; className?: string }) {
  const { doc, save, loaded } = useUserDoc<MoodDoc>("mood_checks", EMPTY_MOOD);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(MOOD_QUESTIONS.map(() => null));
  const today = dayKey();
  const { last, due, daysUntil } = moodDue(doc, today);
  const result = last ? moodMessage(last, pregnant) : null;
  const history = [...doc.checks].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);

  const submit = () => {
    if (answers.some(a => a === null)) return;
    const check = scoreMood(answers as number[], today);
    save(d => ({ checks: [...d.checks.filter(c => c.date !== today), check].sort((a, b) => a.date.localeCompare(b.date)).slice(-26) }));
    setOpen(false);
    setAnswers(MOOD_QUESTIONS.map(() => null));
    if (check.harm) {
      window.dispatchEvent(new CustomEvent("sakhi-chart-update", { detail: { type: "emergency", reason: "self-harm", level: "crisis" } }));
    }
  };

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="mood-title">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Heart weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
          <h3 id="mood-title" className="text-xl font-semibold tracking-tight text-plum-900">How you&apos;ve been feeling</h3>
        </div>
        {loaded && !open && (
          <button type="button" onClick={() => setOpen(true)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${due ? "bg-plum-900 text-cream hover:bg-plum-800" : "border border-plum-900/15 bg-white text-plum-900 hover:bg-lavender-50"}`}>
            {due ? (last ? "Time for your check-in" : "Take the 1-minute check") : "Check in again"}
          </button>
        )}
      </div>

      {open ? (
        <form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-4">
          <p className="text-sm text-ink-soft">Over the last 2 weeks, how often have you been bothered by…</p>
          {MOOD_QUESTIONS.map((q, i) => (
            <fieldset key={q.id}>
              <legend className="mb-2 text-sm font-medium text-plum-900">{q.text}</legend>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {ANSWERS.map((label, v) => {
                  const on = answers[i] === v;
                  return (
                    <label key={label} className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-center text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/12 bg-white text-plum-900 hover:bg-lavender-50"}`}>
                      <input type="radio" name={q.id} value={v} checked={on} onChange={() => setAnswers(a => a.map((x, j) => (j === i ? v : x)))} className="sr-only" />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="flex gap-2">
            <button type="submit" disabled={answers.some(a => a === null)} className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-plum-800 disabled:opacity-50 disabled:pointer-events-none cursor-pointer">See how I&apos;m doing</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2.5 text-sm text-ink-soft hover:bg-white cursor-pointer">Not now</button>
          </div>
          <p className="text-[11px] text-ink-faint">Your answers stay private to you. This is a short screening, not a diagnosis.</p>
        </form>
      ) : result ? (
        <div>
          <p className="text-base font-medium text-plum-900">{result.title}</p>
          <p className="mt-1 text-sm text-ink-soft">{result.body}</p>
          {(result.urgent || last!.harm || ["moderate", "severe"].includes(bandOf(last!.total))) && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="tel:14416" className="inline-flex items-center gap-1.5 rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-cream hover:bg-plum-800"><Phone className="h-4 w-4" /> Call Tele-MANAS 14416</a>
              {last!.harm && <a href="tel:112" className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Call 112</a>}
            </div>
          )}
          {history.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-ink-soft">Your last check-ins (shorter bar is better)</p>
              <div className="flex h-16 items-end gap-2" role="list" aria-label="Mood check history">
                {history.map(c => (
                  <div key={c.date} role="listitem" aria-label={`${shortDate(c.date)}: score ${c.total} of 12`} className="flex flex-1 flex-col items-center gap-1">
                    <div className={`w-full max-w-8 rounded-t-md ${BAR[bandOf(c.total)]}`} style={{ height: `${Math.max(8, (c.total / 12) * 48)}px` }} />
                    <span className="text-[10px] text-ink-faint">{shortDate(c.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!due && <p className="mt-3 text-[11px] text-ink-faint">Next check-in in {daysUntil} {daysUntil === 1 ? "day" : "days"}.</p>}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          Five quick questions every two weeks{pregnant ? ", because mood changes in pregnancy and after birth are common and treatable" : ""}. Need to talk now? Tele-MANAS{" "}
          <a href="tel:14416" className="font-semibold text-plum-900 underline underline-offset-2">14416</a> is free and 24/7.
        </p>
      )}
    </section>
  );
}
