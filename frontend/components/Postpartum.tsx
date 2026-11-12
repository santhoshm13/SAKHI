"use client";

import { useState } from "react";
import { Baby, Drop, FirstAid, Syringe, Check, ArrowCounterClockwise } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { dayKey } from "@/hooks/useUserDoc";
import {
  VACCINES, babyAge, babyToday, checkRecovery, dueDate, nextVaccine,
  type PostpartumDoc, type Recovery,
} from "@/lib/postpartum";

export interface PP { doc: PostpartumDoc; save: (next: PostpartumDoc | ((p: PostpartumDoc) => PostpartumDoc)) => Promise<boolean>; loaded: boolean }

const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/12 bg-white text-plum-900 hover:bg-lavender-50"}`;
const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtSince = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim());

/** "Baby has arrived": switches Mom Mode to after-birth care. */
export function BabyArrivedCard({ pp, compact = false, className = "" }: { pp: PP; compact?: boolean; className?: string }) {
  const [open, setOpen] = useState(!compact);
  const [date, setDate] = useState(dayKey());
  const [name, setName] = useState("");
  const [delivery, setDelivery] = useState<"normal" | "csection">("normal");
  const today = dayKey();

  const submit = () => {
    if (!date || date > today) return;
    pp.save(d => ({ ...d, birth_date: date, baby_name: name.trim().slice(0, 40) || undefined, delivery, vaccines_done: d.vaccines_done || [] }));
  };

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="arrived-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Baby weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
          <h3 id="arrived-title" className="text-xl font-semibold tracking-tight text-plum-900">Has your baby arrived?</h3>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className={chip(false)}>Yes, tell Sakhi</button>
        )}
      </div>
      {open && (
        <form onSubmit={e => { e.preventDefault(); submit(); }} className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-plum-900">
            <span className="mb-1 block font-medium">Date of birth</span>
            <input type="date" required max={today} value={date} onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-plum-900/12 bg-cream/60 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500" />
          </label>
          <label className="text-sm text-plum-900">
            <span className="mb-1 block font-medium">Baby&apos;s name <span className="font-normal text-ink-faint">(optional)</span></span>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="You can add it later"
              className="w-full rounded-xl border border-plum-900/12 bg-cream/60 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500" />
          </label>
          <fieldset className="text-sm text-plum-900">
            <legend className="mb-1 font-medium">Delivery</legend>
            <div className="flex gap-2">
              {(["normal", "csection"] as const).map(k => (
                <button key={k} type="button" aria-pressed={delivery === k} onClick={() => setDelivery(k)} className={chip(delivery === k)}>
                  {k === "normal" ? "Normal" : "C-section"}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
            <button type="submit" className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-plum-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
              Switch to after-birth care
            </button>
            <p className="text-xs text-ink-soft">Sakhi will track feeds, your recovery and baby&apos;s vaccine dates. Your pregnancy records stay saved.</p>
          </div>
        </form>
      )}
    </section>
  );
}

/** Top of Today after the birth: who, how old, and an undo. */
export function BabyHeader({ pp, className = "" }: { pp: PP; className?: string }) {
  const { doc } = pp;
  if (!doc.birth_date) return null;
  const today = dayKey();
  const days = Math.round((Date.parse(today) - Date.parse(doc.birth_date)) / 86_400_000);
  const stage = days <= 42 ? `Day ${days + 1} of your 6-week recovery` : "Past the 6-week recovery window";
  const undo = () => { if (confirm("Go back to the pregnancy view? Baby's logs stay saved.")) pp.save(d => ({ ...d, birth_date: undefined })); };
  return (
    <section className={`${panelCard} ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-soft">{stage}</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-plum-900">
            {doc.baby_name || "Your baby"} is <span className="display-serif font-normal text-blush-500">{babyAge(doc.birth_date, today)}</span>.
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Born {shortDate(doc.birth_date)} · {doc.delivery === "csection" ? "C-section" : "Normal delivery"}</p>
        </div>
        <button type="button" onClick={undo} className="inline-flex items-center gap-1.5 self-start text-xs text-ink-soft hover:text-plum-900 transition-colors cursor-pointer sm:self-end">
          <ArrowCounterClockwise className="h-3.5 w-3.5" aria-hidden="true" /> Back to pregnancy view
        </button>
      </div>
    </section>
  );
}

/** One-tap feed and diaper log. */
export function NewbornCard({ pp, className = "" }: { pp: PP; className?: string }) {
  const { doc, save } = pp;
  const [, tick] = useState(0);
  const now = new Date();
  const t = babyToday(doc, now);
  const days = doc.birth_date ? Math.round((Date.parse(dayKey()) - Date.parse(doc.birth_date)) / 86_400_000) : 0;
  const addFeed = (kind: "left" | "right" | "bottle") => { save(d => ({ ...d, feeds: [...d.feeds, { at: new Date().toISOString(), kind }].slice(-400) })); tick(x => x + 1); };
  const addDiaper = (kind: "wet" | "dirty") => save(d => ({ ...d, diapers: [...d.diapers, { at: new Date().toISOString(), kind }].slice(-400) }));
  const undoLast = () => save(d => {
    const lf = d.feeds[d.feeds.length - 1]?.at || "", ld = d.diapers[d.diapers.length - 1]?.at || "";
    if (!lf && !ld) return d;
    return lf >= ld ? { ...d, feeds: d.feeds.slice(0, -1) } : { ...d, diapers: d.diapers.slice(0, -1) };
  });
  // From day 5, 6+ wet nappies a day means baby is getting enough milk
  const wetGoal = days >= 5 ? 6 : Math.max(1, days + 1);
  const longGap = t.sinceMin !== null && t.sinceMin > 180 && days < 28;

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="newborn-title">
      <div className="flex items-center gap-2 mb-1">
        <Drop weight="duotone" className="h-5 w-5 text-lavender-500" aria-hidden="true" />
        <h3 id="newborn-title" className="text-xl font-semibold tracking-tight text-plum-900">Feeds and nappies</h3>
      </div>
      <p className="text-xs text-ink-soft mb-4">Tap when a feed starts. Most newborns feed 8 to 12 times a day.</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat value={t.feeds} label="feeds today" />
        <Stat value={t.wet} label={`wet (aim ${wetGoal}+)`} warn={days >= 5 && t.wet < 6 && now.getHours() >= 20} />
        <Stat value={t.dirty} label="dirty" />
      </div>

      <p className={`mb-3 text-sm ${longGap ? "text-amber-700" : "text-ink-soft"}`} aria-live="polite">
        {t.sinceMin === null ? "No feeds logged yet." : `Last feed ${fmtSince(t.sinceMin)} ago${t.lastFeed?.kind === "bottle" ? " (bottle)" : ` (${t.lastFeed?.kind} side)`}.`}
        {t.nextSide && ` Next time, start on the ${t.nextSide}.`}
        {longGap && " Newborns shouldn't go more than 3 hours without a feed in the first weeks. Wake baby gently to feed."}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => addFeed("left")} className={chip(t.nextSide === "left")}>Fed · left</button>
        <button type="button" onClick={() => addFeed("right")} className={chip(t.nextSide === "right")}>Fed · right</button>
        <button type="button" onClick={() => addFeed("bottle")} className={chip(false)}>Bottle</button>
        <span className="mx-1 hidden w-px bg-plum-900/10 sm:block" aria-hidden="true" />
        <button type="button" onClick={() => addDiaper("wet")} className={chip(false)}>Wet nappy</button>
        <button type="button" onClick={() => addDiaper("dirty")} className={chip(false)}>Dirty nappy</button>
        {(doc.feeds.length > 0 || doc.diapers.length > 0) && (
          <button type="button" onClick={undoLast} className="ml-auto text-xs text-ink-soft hover:text-plum-900 transition-colors cursor-pointer">Undo last</button>
        )}
      </div>
      <p className="mt-4 text-xs text-ink-faint">See a doctor the same day if baby feeds poorly, is very sleepy, has a fever or feels cold, breathes fast, or the skin or eyes look yellow.</p>
    </section>
  );
}

function Stat({ value, label, warn = false }: { value: number; label: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-3 text-center ${warn ? "border-amber-300 bg-amber-50" : "border-plum-900/[0.07] bg-white/80"}`}>
      <p className="text-2xl font-semibold tabular-nums text-plum-900">{value}</p>
      <p className="text-[11px] text-ink-soft">{label}</p>
    </div>
  );
}

const SIGNS: { key: keyof Recovery; label: string }[] = [
  { key: "fever", label: "Fever or chills" },
  { key: "smell", label: "Bad-smelling discharge" },
  { key: "breast", label: "Hard, red, painful breast" },
  { key: "wound", label: "Stitches red, leaking or very painful" },
  { key: "headache", label: "Bad headache or blurred vision" },
  { key: "calf", label: "Pain or swelling in one leg" },
  { key: "breathless", label: "Chest pain or hard to breathe" },
];
const BLEEDING: { v: Recovery["bleeding"]; label: string }[] = [
  { v: "none", label: "None" }, { v: "light", label: "Light" }, { v: "moderate", label: "Like a period" },
  { v: "heavy", label: "Pad soaked in 1 hour" }, { v: "clots", label: "Big clots" },
];
const blank = (date: string): Recovery => ({ date, bleeding: "light", fever: false, pain: 2, breast: false, wound: false, headache: false, calf: false, breathless: false, smell: false });

/** Daily recovery check for the first 6 weeks, with the postnatal danger signs. */
export function RecoveryCard({ pp, className = "" }: { pp: PP; className?: string }) {
  const { doc, save } = pp;
  const today = dayKey();
  const saved = doc.recovery.find(r => r.date === today);
  const [form, setForm] = useState<Recovery>(saved || blank(today));
  const [editing, setEditing] = useState(!saved);
  const result = saved ? checkRecovery(saved, doc.delivery) : null;

  const submit = () => {
    const entry = { ...form, date: today };
    save(d => ({ ...d, recovery: [...d.recovery.filter(r => r.date !== today), entry].slice(-60) }));
    setEditing(false);
    const c = checkRecovery(entry, doc.delivery);
    if (c.level === "emergency") {
      window.dispatchEvent(new CustomEvent("sakhi-chart-update", { detail: { type: "emergency", reason: c.alertReason, level: "emergency", after_birth: true } }));
    }
  };

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="recovery-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <FirstAid weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
          <h3 id="recovery-title" className="text-xl font-semibold tracking-tight text-plum-900">How your body is healing</h3>
        </div>
        {saved && !editing && (
          <button type="button" onClick={() => { setForm(saved); setEditing(true); }} className="text-xs text-ink-soft hover:text-plum-900 transition-colors cursor-pointer">Change today&apos;s answers</button>
        )}
      </div>
      <p className="text-xs text-ink-soft mb-4">A 30-second check each day for the first 6 weeks.</p>

      {editing ? (
        <form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-plum-900">Bleeding today</legend>
            <div className="flex flex-wrap gap-2">
              {BLEEDING.map(b => (
                <button key={b.v} type="button" aria-pressed={form.bleeding === b.v} onClick={() => setForm(f => ({ ...f, bleeding: b.v }))} className={chip(form.bleeding === b.v)}>{b.label}</button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1 flex justify-between text-sm font-medium text-plum-900"><span>Pain</span><span className="tabular-nums">{form.pain}/10</span></span>
            <input type="range" min={0} max={10} value={form.pain} onChange={e => setForm(f => ({ ...f, pain: Number(e.target.value) }))} className="w-full accent-plum-900" />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-plum-900">Any of these today?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SIGNS.map(s => (
                <label key={s.key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-plum-900/10 bg-white px-3 py-2 text-sm text-plum-900 hover:bg-lavender-50 focus-within:ring-2 focus-within:ring-lavender-500">
                  <input type="checkbox" checked={Boolean(form[s.key])} onChange={e => setForm(f => ({ ...f, [s.key]: e.target.checked }))} className="h-4 w-4 accent-plum-900" />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-plum-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">Save today</button>
        </form>
      ) : result && (
        <div role={result.level === "ok" ? undefined : "alert"}
          className={`rounded-2xl p-4 text-sm ${result.level === "emergency" ? "bg-rose-50 text-rose-800" : result.level === "doctor" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
          <p className="font-semibold">
            {result.level === "emergency" ? "Go to hospital now, or call 108." : result.level === "doctor" ? "Please see your doctor or ANM today." : "Healing as expected today."}
          </p>
          {result.reasons.length > 0 && <ul className="mt-2 list-disc pl-5 space-y-0.5">{result.reasons.map(r => <li key={r}>{r}</li>)}</ul>}
          {result.level === "ok" && <p className="mt-1">Rest when baby sleeps, drink plenty of water, and keep taking your iron and calcium tablets.</p>}
        </div>
      )}
    </section>
  );
}

/** Baby's vaccines on India's Universal Immunisation Programme schedule. */
export function VaccineCard({ pp, className = "" }: { pp: PP; className?: string }) {
  const { doc, save } = pp;
  if (!doc.birth_date) return null;
  const today = dayKey();
  const next = nextVaccine(doc, today);
  const toggle = (id: string) => save(d => ({ ...d, vaccines_done: d.vaccines_done.includes(id) ? d.vaccines_done.filter(x => x !== id) : [...d.vaccines_done, id] }));

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="vaccine-title">
      <div className="flex items-center gap-2 mb-1">
        <Syringe weight="duotone" className="h-5 w-5 text-lavender-500" aria-hidden="true" />
        <h3 id="vaccine-title" className="text-xl font-semibold tracking-tight text-plum-900">Baby&apos;s vaccines</h3>
      </div>
      <p className="text-xs text-ink-soft mb-4">Free at every government health centre and Anganwadi under the Universal Immunisation Programme. Take the MCP card each time.</p>
      {next && (
        <p className={`mb-4 rounded-2xl px-4 py-3 text-sm ${next.overdue ? "bg-amber-50 text-amber-800" : "bg-lavender-50 text-plum-900"}`}>
          <span className="font-semibold">{next.overdue ? `${next.due} vaccines are due since ${shortDate(next.date)}.` : next.daysAway === 0 ? `${next.due} vaccines are due today.` : `Next: ${next.due} vaccines on ${shortDate(next.date)} (in ${next.daysAway} days).`}</span>
          {next.overdue && " It's fine to go late. Go this week and the schedule carries on from there."}
        </p>
      )}
      <ol className="space-y-2">
        {VACCINES.map(v => {
          const done = doc.vaccines_done.includes(v.id);
          return (
            <li key={v.id}>
              <button type="button" onClick={() => toggle(v.id)} aria-pressed={done}
                className="flex w-full items-start gap-3 rounded-2xl border border-plum-900/[0.07] bg-white/80 px-4 py-3 text-left transition-colors hover:bg-lavender-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-plum-900/25"}`}>
                  {done && <Check weight="bold" className="h-3 w-3" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap justify-between gap-x-3 text-sm font-semibold text-plum-900">
                    <span>{v.due}</span>
                    <span className="font-normal text-ink-soft tabular-nums">{shortDate(dueDate(doc.birth_date!, v.weeks))}</span>
                  </span>
                  <span className={`block text-xs ${done ? "text-ink-faint line-through" : "text-ink-soft"}`}>{v.items}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
