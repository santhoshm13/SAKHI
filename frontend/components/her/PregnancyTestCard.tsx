"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, TestTube } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { dayToIso } from "@/lib/cyclePhase";
import { dueFromLmp, gestation, todayIso } from "@/lib/pregnancyWeeks";
import { useUserDoc } from "@/hooks/useUserDoc";
import { EMPTY_GOAL, type GoalDoc } from "@/lib/herGoal";

const chip = (on: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/12 bg-white text-plum-900 hover:bg-lavender-50"}`;
const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

/**
 * The way from Her Mode into Mom Mode. Shown when her period is late (or she's
 * trying and the window has passed). A positive test starts Mom Mode with the
 * due date worked out from her last period, so she doesn't fill in a form again.
 */
export default function PregnancyTestCard({ lastStart, daysLate, name, className = "" }: {
  lastStart: number; daysLate: number; name: string; className?: string;
}) {
  const router = useRouter();
  const { doc, save } = useUserDoc<GoalDoc>("her_goal", EMPTY_GOAL);
  const [answer, setAnswer] = useState<"positive" | "negative" | "notyet" | null>(null);
  const [lmp, setLmp] = useState(dayToIso(lastStart));
  const [firstBaby, setFirstBaby] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayIso();
  const lastNegative = (doc.tests || []).filter(t => t.result === "negative").pop();
  const due = dueFromLmp(lmp);
  const g = gestation({ expected_due_date: due }, today);
  const lmpOk = lmp <= today && lmp >= dayToIso(lastStart - 120);

  const record = (result: "positive" | "negative") =>
    save(d => ({ ...d, tests: [...(d.tests || []).filter(t => t.date !== today), { date: today, result }].slice(-20) }));

  const startMomMode = async () => {
    if (!lmpOk) return setError("Pick the first day of your last period.");
    setBusy(true);
    setError(null);
    record("positive");
    const res = await fetch("/api/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "pregnancy",
        resetData: true,
        profile: {
          preferred_name: name,
          last_period_start: lmp,
          expected_due_date: due,
          weeks_pregnant: g.weeks,
          pregnancy_experience: firstBaby === false ? "Experienced Mother" : "First-time Mother",
          maternal_conditions: ["None"],
          primary_goal: "Tracking Baby Growth & Fetal Movement",
          started_from: "her_mode",
        },
      }),
    }).catch(() => null);
    if (!res?.ok) { setBusy(false); return setError("Couldn't start Mom Mode. Check your connection and try again."); }
    try {
      localStorage.setItem("sakhi_active_mode", "pregnancy");
      document.cookie = "sakhi_active_mode=pregnancy; path=/; max-age=31536000; samesite=lax";
    } catch { /* ignore */ }
    router.push("/pregnancy-mode");
  };

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="ptest-title">
      <div className="flex items-center gap-2 mb-1">
        <TestTube weight="duotone" className="h-5 w-5 text-lavender-500" aria-hidden="true" />
        <h3 id="ptest-title" className="text-xl font-semibold tracking-tight text-plum-900">
          {daysLate > 0 ? `Your period is ${daysLate} day${daysLate === 1 ? "" : "s"} late` : "Could you be pregnant?"}
        </h3>
      </div>
      <p className="text-sm text-ink-soft mb-4">
        A home pregnancy test is reliable from the day your period was due. Use the first urine of the morning. The Nischay kit is free from your ASHA or sub-centre; chemists sell tests for about ₹50 to ₹100.
      </p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-plum-900">Did you take a test?</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={answer === "positive"} onClick={() => setAnswer("positive")} className={chip(answer === "positive")}>Yes, positive</button>
          <button type="button" aria-pressed={answer === "negative"} onClick={() => { setAnswer("negative"); record("negative"); }} className={chip(answer === "negative")}>Yes, negative</button>
          <button type="button" aria-pressed={answer === "notyet"} onClick={() => setAnswer("notyet")} className={chip(answer === "notyet")}>Not yet</button>
        </div>
      </fieldset>

      {answer === "notyet" && (
        <p className="mt-4 rounded-2xl bg-lavender-50 px-4 py-3 text-sm text-plum-900">
          Take one in the morning and come back here. Stress, illness, travel and PCOS can also delay a period.
        </p>
      )}

      {answer === "negative" && (
        <p className="mt-4 rounded-2xl bg-lavender-50 px-4 py-3 text-sm text-plum-900">
          {lastNegative && lastNegative.date < today
            ? "That's a second negative test. If your period is over 2 weeks late, see a doctor to find out why."
            : "Tests can be negative if taken too early. If your period still hasn't come in 3 days, test again. See a doctor if it's over 2 weeks late."}
        </p>
      )}

      {answer === "positive" && (
        <div className="mt-4 space-y-4 rounded-2xl bg-emerald-50/70 p-4">
          <div className="flex items-start gap-3">
            <Baby weight="duotone" className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="text-sm text-plum-900">
              <p className="font-semibold">Congratulations, {name}. Let&apos;s look after you both.</p>
              <p className="mt-1 text-ink-soft">Sakhi will switch to Mom Mode. Your period records stay saved for later.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-plum-900">
              <span className="mb-1 block font-medium">First day of your last period</span>
              <input type="date" value={lmp} max={today} onChange={e => setLmp(e.target.value)}
                className="w-full rounded-xl border border-plum-900/12 bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500" />
              {lmpOk && <span className="mt-1 block text-xs text-ink-soft">About {g.weeks} weeks{g.days ? ` ${g.days} days` : ""} pregnant · due around {fmt(due)}</span>}
            </label>
            <fieldset className="text-sm text-plum-900">
              <legend className="mb-1 font-medium">Is this your first pregnancy?</legend>
              <div className="flex gap-2">
                <button type="button" aria-pressed={firstBaby === true} onClick={() => setFirstBaby(true)} className={chip(firstBaby === true)}>Yes</button>
                <button type="button" aria-pressed={firstBaby === false} onClick={() => setFirstBaby(false)} className={chip(firstBaby === false)}>No</button>
              </div>
            </fieldset>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-plum-900">
            <li>Register the pregnancy with your ASHA or health centre before 12 weeks, and get your MCP card.</li>
            <li>Take folic acid every day until 12 weeks.</li>
            <li className="text-rose-700">Go to hospital now if you have strong pain on one side of the belly, bleeding, or feel faint.</li>
          </ul>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button type="button" onClick={startMomMode} disabled={busy} aria-busy={busy}
            className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-plum-800 transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
            {busy ? "Starting Mom Mode…" : "Start Mom Mode"}
          </button>
        </div>
      )}
    </section>
  );
}
