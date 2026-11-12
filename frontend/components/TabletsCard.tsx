"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pill, Plus, Trash, Fire, ClockCounterClockwise, CaretDown, SunHorizon, Sun, CloudSun, Moon, PencilSimple } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useUserDoc, dayKey } from "@/hooks/useUserDoc";
import { discreetNotice, isDiscreet } from "@/lib/discreet";
import {
  DEFAULT_MEALS, EMPTY_TABLETS, FOOD_LABEL, ON_TIME_MIN, PATTERNS, SLOTS, SLOT_LABEL,
  doseOf, doseState, fmtHm, fmtLate, ledger, normalise, patternOf, plannedDoses, setDose, streak, toMin,
  type DoseStatus, type Food, type Meals, type Slot, type Tablet, type TabletsDoc,
} from "@/lib/tablets";

/** India's routine pregnancy supplements (MoHFW): folic acid early, then IFA and calcium. */
function pregnancyDefaults(weeks: number, since: string): Tablet[] {
  if (weeks < 13) return [{ id: "folic", name: "Folic acid (400 mcg)", note: "Protects baby's brain and spine.", slots: ["morning"], food: "after", since }];
  return [
    { id: "ifa", name: "Iron + folic acid (IFA)", note: "With lemon water. Not with tea, coffee or milk.", slots: ["night"], food: "after", since },
    { id: "calcium", name: "Calcium (2 tablets)", note: "Keep it 2 hours apart from iron.", slots: ["afternoon"], food: "after", since },
  ];
}

const SUGGEST: Omit<Tablet, "id" | "since">[] = [
  { name: "Iron tablet", note: "With lemon water, not with tea or milk.", slots: ["night"], food: "after" },
  { name: "Folic acid", note: "", slots: ["morning"], food: "after" },
  { name: "Vitamin D", note: "", slots: ["afternoon"], food: "with" },
  { name: "Thyroid tablet", note: "Wait 30 to 45 minutes before tea or breakfast.", slots: ["morning"], food: "empty" },
];

const SLOT_ICON: Record<Slot, Icon> = { morning: SunHorizon, afternoon: Sun, evening: CloudSun, night: Moon };
const FOODS: Food[] = ["before", "after", "with", "empty", "any"];

const nowHm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const dayLabel = (day: string, today: string) => {
  if (day === today) return "Today";
  const d = new Date(day + "T00:00:00");
  const y = new Date(today + "T00:00:00"); y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString() ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

const CHIP: Record<DoseStatus, string> = {
  on_time: "bg-emerald-100 text-emerald-800",
  late: "bg-amber-100 text-amber-800",
  missed: "bg-rose-100 text-rose-700",
  overdue: "bg-rose-50 text-rose-700",
  due: "bg-plum-900/5 text-ink-soft",
  not_started: "",
};

const pill = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/15 bg-white text-plum-900 hover:bg-lavender-50"}`;

export default function TabletsCard({ mode, weeks = 0, className = "" }: { mode: "her" | "pregnancy"; weeks?: number; className?: string }) {
  const { doc, save, loaded, reload } = useUserDoc<TabletsDoc>("tablets", EMPTY_TABLETS);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; slots: Slot[]; food: Food }>({ name: "", slots: ["morning"], food: "after" });
  const [editing, setEditing] = useState<string | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showMeals, setShowMeals] = useState(false);
  const [clock, setClock] = useState(nowHm());
  const today = dayKey();
  const meals: Meals = { ...DEFAULT_MEALS, ...(doc.meals || {}) };

  useEffect(() => { const id = setInterval(() => setClock(nowHm()), 60_000); return () => clearInterval(id); }, []);

  // A dose logged through the chat ("took my iron tablet") shows up here at once
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent).detail?.type === "tablets_update") reload(); };
    window.addEventListener("sakhi-chart-update", on);
    return () => window.removeEventListener("sakhi-chart-update", on);
  }, [reload]);

  // First visit in Mom Mode: start with the standard supplements for her week
  useEffect(() => {
    if (loaded && mode === "pregnancy" && !doc.seeded && doc.list.length === 0) {
      save({ ...doc, list: pregnancyDefaults(weeks, today), seeded: true });
    }
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = useMemo(() => plannedDoses(doc), [doc]);
  const run = useMemo(() => streak(doc, today), [doc, today]);
  const book = useMemo(() => ledger(doc, today, clock, 14), [doc, today, clock]);

  const take = (key: string) => save(d => setDose(d, today, key, doseOf(d, today, key) ? null : nowHm()));
  const retime = (key: string, at: string) => { if (at) save(d => setDose(d, today, key, at)); setEditing(null); };

  const add = (t: Omit<Tablet, "id" | "since">) => {
    if (!t.name.trim() || !t.slots.length) return;
    save(d => ({ ...d, seeded: true, list: [...d.list, { ...t, name: t.name.trim().slice(0, 60), id: `t${Date.now().toString(36)}`, since: today }] }));
    setAdding(false);
    setDraft({ name: "", slots: ["morning"], food: "after" });
  };
  const remove = (id: string) => save(d => ({ ...d, seeded: true, list: d.list.filter(t => t.id !== id) }));
  const setMeal = (k: keyof Meals, v: string) => { if (v) save(d => ({ ...d, meals: { ...DEFAULT_MEALS, ...(d.meals || {}), [k]: v } })); };

  // Gentle nudge once a dose is due, if she allowed notifications
  useEffect(() => {
    if (!plan.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    for (const p of plan) {
      const key = `sakhi_tab_nudged_${today}_${p.key}`;
      if (toMin(p.time) > toMin(clock) || doseOf(doc, today, p.key)) continue;
      try { if (localStorage.getItem(key)) continue; localStorage.setItem(key, "1"); } catch { continue; }
      const food = p.tablet.food !== "any" ? `, ${FOOD_LABEL[p.tablet.food].toLowerCase()}` : "";
      const shown = discreetNotice(`${SLOT_LABEL[p.slot]} tablet: ${p.tablet.name}`, `Time to take it${food}.`);
      new Notification(shown.title, { body: shown.body, icon: isDiscreet() ? undefined : "/sakhi-doll.png" });
    }
  }, [plan, doc, today, clock]);

  const todays = plan.filter(p => !p.tablet.since || today >= p.tablet.since);
  const allDone = todays.length > 0 && todays.every(p => doseOf(doc, today, p.key));
  const bySlot = SLOTS.map(slot => ({ slot, doses: todays.filter(p => p.slot === slot) })).filter(g => g.doses.length);
  const list = doc.list.map(normalise);

  return (
    <div className={`${panelCard} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-plum-900">Tablets today</h3>
          <p className="text-xs text-ink-soft">{allDone ? "All taken today. Well done." : "Tap each one as you take it. Sakhi notes the time."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {run > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">
              <Fire weight="fill" className="h-4 w-4 text-amber-500" aria-hidden="true" /> {run} {run === 1 ? "day" : "days"} in a row
            </span>
          )}
          {book.rate !== null && <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">{book.rate}% on time</span>}
        </div>
      </div>

      {list.length === 0 && !adding && (
        <p className="mb-3 rounded-2xl bg-lavender-50 p-4 text-sm text-ink-soft">
          Add the tablets on your prescription, morning, afternoon or night, before or after food. Sakhi reminds you and keeps a record of when you took each one.
        </p>
      )}

      <div className="space-y-4">
        {bySlot.map(({ slot, doses }) => {
          const SlotIcon = SLOT_ICON[slot];
          return (
            <section key={slot} aria-label={SLOT_LABEL[slot]}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-plum-900/65">
                <SlotIcon className="h-4 w-4 text-lavender-500" weight="duotone" aria-hidden="true" /> {SLOT_LABEL[slot]}
              </p>
              <ul className="space-y-2">
                {doses.map(p => {
                  const st = doseState(doc, p, today, today, clock);
                  const taken = st.status === "on_time" || st.status === "late";
                  const food = p.tablet.food !== "any" ? FOOD_LABEL[p.tablet.food] : null;
                  return (
                    <li key={p.key} className="flex items-center gap-2">
                      <button type="button" role="checkbox" aria-checked={taken} onClick={() => take(p.key)}
                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border p-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${taken ? "border-emerald-200 bg-emerald-50" : st.status === "overdue" ? "border-rose-200 bg-rose-50/60" : "border-plum-900/[0.08] bg-white/80 hover:bg-white"}`}>
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${taken ? "bg-emerald-500 text-white" : "bg-lavender-100 text-lavender-600"}`}>
                          {taken ? <Check weight="bold" className="h-4 w-4" /> : <Pill weight="duotone" className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-semibold ${taken ? "text-emerald-900" : "text-plum-900"}`}>
                            {p.tablet.name}
                            {food && <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold align-middle ${p.tablet.food === "before" || p.tablet.food === "empty" ? "bg-sky-100 text-sky-800" : "bg-orange-100 text-orange-800"}`}>{food}</span>}
                          </span>
                          <span className="block text-xs text-ink-soft">
                            {taken
                              ? <>Taken at {fmtHm(st.at) || "an unknown time"}{st.status === "late" ? ` · ${fmtLate(st.lateBy)}` : ""}</>
                              : <>Due {fmtHm(p.time)}{st.status === "overdue" ? " · overdue" : ""}{p.tablet.note ? ` · ${p.tablet.note}` : ""}</>}
                          </span>
                        </span>
                      </button>
                      {taken && (editing === p.key ? (
                        <input type="time" autoFocus defaultValue={st.at} aria-label={`Time you took ${p.tablet.name}`} max={clock}
                          onBlur={e => retime(p.key, e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") retime(p.key, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditing(null); }}
                          className="w-28 rounded-xl border border-plum-900/10 bg-white px-2 py-2 text-sm text-plum-900 focus:outline-none focus:ring-2 focus:ring-lavender-400" />
                      ) : (
                        <button type="button" onClick={() => setEditing(p.key)} aria-label={`Change the time you took ${p.tablet.name}`} title="Took it earlier? Fix the time"
                          className="rounded-full p-2 text-plum-900/40 hover:bg-white hover:text-plum-900 cursor-pointer">
                          <ClockCounterClockwise className="h-4 w-4" />
                        </button>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {list.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer list-none text-xs font-medium text-ink-soft hover:text-plum-900">
            Your tablets ({list.length}) · manage
          </summary>
          <ul className="mt-2 space-y-1.5">
            {list.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/60 px-3 py-2 text-sm">
                <span className="min-w-0 text-plum-900">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-ink-soft"> · {patternOf(t.slots) ?? t.slots.map(s => SLOT_LABEL[s]).join(", ")} · {FOOD_LABEL[t.food]}</span>
                </span>
                <button type="button" aria-label={`Remove ${t.name}`} onClick={() => remove(t.id)} className="rounded-full p-1.5 text-plum-900/35 hover:bg-rose-50 hover:text-rose-600 cursor-pointer">
                  <Trash className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {adding ? (
        <div className="mt-3 space-y-3 rounded-2xl bg-white/70 p-3.5">
          <div className="flex flex-wrap gap-2">
            {SUGGEST.filter(s => !list.some(t => t.name === s.name)).map(s => (
              <button key={s.name} type="button" onClick={() => add(s)} className="rounded-full border border-lavender-200 bg-lavender-50 px-3 py-1.5 text-xs font-medium text-lavender-700 hover:bg-lavender-100 cursor-pointer">+ {s.name}</button>
            ))}
          </div>
          <label className="block text-xs font-medium text-plum-900/70">Tablet name
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Calcium, Metformin 500"
              className="mt-1 block w-full rounded-xl border border-plum-900/10 bg-white px-3 py-2 text-sm text-plum-900 focus:outline-none focus:ring-2 focus:ring-lavender-400" />
          </label>
          <div>
            <p className="text-xs font-medium text-plum-900/70 mb-1.5">When (as on the prescription)</p>
            <div className="flex flex-wrap gap-1.5">
              {PATTERNS.map(pt => (
                <button key={pt.code} type="button" aria-pressed={patternOf(draft.slots) === pt.code} onClick={() => setDraft(d => ({ ...d, slots: pt.slots }))} className={pill(patternOf(draft.slots) === pt.code)}>{pt.code}</button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SLOTS.map(s => {
                const on = draft.slots.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on} className={pill(on)}
                    onClick={() => setDraft(d => ({ ...d, slots: on ? d.slots.filter(x => x !== s) : SLOTS.filter(x => x === s || d.slots.includes(x)) }))}>
                    {SLOT_LABEL[s]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-plum-900/70 mb-1.5">Food</p>
            <div className="flex flex-wrap gap-1.5">
              {FOODS.map(f => <button key={f} type="button" aria-pressed={draft.food === f} onClick={() => setDraft(d => ({ ...d, food: f }))} className={pill(draft.food === f)}>{FOOD_LABEL[f]}</button>)}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => add({ name: draft.name, note: "", slots: draft.slots, food: draft.food })} disabled={!draft.name.trim() || !draft.slots.length}
              className="rounded-xl bg-plum-900 px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50 disabled:pointer-events-none cursor-pointer">Add tablet</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-white cursor-pointer">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-lavender-600 hover:underline cursor-pointer">
            <Plus className="h-4 w-4" /> Add a tablet
          </button>
          <button type="button" onClick={() => setShowMeals(s => !s)} aria-expanded={showMeals} className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-plum-900 cursor-pointer">
            <PencilSimple className="h-3.5 w-3.5" /> Meal times: breakfast {fmtHm(meals.breakfast)}, lunch {fmtHm(meals.lunch)}, dinner {fmtHm(meals.dinner)}
          </button>
        </div>
      )}

      {showMeals && !adding && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/70 p-3 sm:grid-cols-4">
          {([["breakfast", "Breakfast"], ["lunch", "Lunch"], ["snack", "Evening tea"], ["dinner", "Dinner"]] as [keyof Meals, string][]).map(([k, label]) => (
            <label key={k} className="text-xs font-medium text-plum-900/70">{label}
              <input type="time" value={meals[k]} onChange={e => setMeal(k, e.target.value)}
                className="mt-1 block w-full rounded-xl border border-plum-900/10 bg-white px-2 py-1.5 text-sm text-plum-900 focus:outline-none focus:ring-2 focus:ring-lavender-400" />
            </label>
          ))}
          <p className="col-span-full text-[11px] text-ink-faint">Before food is 30 minutes before the meal, after food 30 minutes after, empty stomach 45 minutes before breakfast.</p>
        </div>
      )}

      {plan.length > 0 && (
        <div className="mt-5 border-t border-plum-900/[0.07] pt-4">
          <button type="button" onClick={() => setShowLedger(s => !s)} aria-expanded={showLedger}
            className="flex w-full items-center justify-between gap-3 rounded-lg text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
            <span>
              <span className="block text-sm font-semibold text-plum-900">Intake ledger, last 14 days</span>
              <span className="block text-xs text-ink-soft">{book.onTime} on time · {book.late} late · {book.missed} missed. On time means within {ON_TIME_MIN} minutes.</span>
            </span>
            <CaretDown className={`h-4 w-4 shrink-0 text-plum-900/50 transition-transform ${showLedger ? "rotate-180" : ""}`} />
          </button>
          {showLedger && (
            <ol className="mt-3 divide-y divide-plum-900/[0.06]" aria-label="Tablet intake ledger">
              {book.rows.map(r => {
                const shown = r.doses.filter(d => d.status !== "not_started");
                if (!shown.length) return null;
                return (
                  <li key={r.day} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                    <span className="w-28 shrink-0 text-xs font-semibold text-plum-900/70">{dayLabel(r.day, today)}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {shown.map(d => (
                        <span key={d.key} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${CHIP[d.status]}`}>
                          {d.tablet.name.split(" (")[0]} ({SLOT_LABEL[d.slot].toLowerCase()}):{" "}
                          {d.status === "on_time" ? `${fmtHm(d.at) || "taken"}, on time`
                            : d.status === "late" ? `${fmtHm(d.at)}, ${fmtLate(d.lateBy)}`
                            : d.status === "missed" ? "missed"
                            : d.status === "overdue" ? "not taken yet"
                            : `due ${fmtHm(d.time)}`}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
      <p className="mt-3 text-[11px] text-ink-faint">
        You can also tell Sakhi &ldquo;took my iron tablet after dinner&rdquo;.{mode === "pregnancy" ? " Follow your doctor if they prescribed a different dose." : ""}
      </p>
    </div>
  );
}
