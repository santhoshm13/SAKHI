"use client";

import { useEffect, useMemo, useState } from "react";
import { BowlFood, Drop, Minus, Plus } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useUserDoc, dayKey } from "@/hooks/useUserDoc";
import {
  EMPTY_MEALS, FOODS, FOOD_BY_ID, GROUP_LABEL, NUTRIENT_LABEL, TARGETS, WATER_GLASSES,
  addItems, groupsEaten, suggestions, totals,
  type FoodGroup, type MealsDoc, type Nutrient, type Stage,
} from "@/lib/meals";

const ORDER: Nutrient[] = ["protein", "iron", "calcium", "folate", "kcal"];
const ALL_GROUPS = Object.keys(GROUP_LABEL) as FoodGroup[];
const STAGE_NOTE: Record<Stage, string> = {
  not_pregnant: "Targets for an active woman",
  trimester1: "Targets for the first trimester",
  trimester2: "Targets for the second trimester",
  trimester3: "Targets for the third trimester",
  lactating: "Targets while breastfeeding",
};

/** Food log in everyday servings, turned into the nutrients that matter now. */
export default function MealsCard({ stage, className = "" }: { stage: Stage; className?: string }) {
  const { doc, save, reload } = useUserDoc<MealsDoc>("meals", EMPTY_MEALS);
  const [showAll, setShowAll] = useState(false);
  const today = dayKey();
  const day = doc.days?.[today];
  const t = totals(day);
  const target = TARGETS[stage];
  const groups = groupsEaten(day);
  const tip = suggestions(day, stage, 3);
  const waterGoal = WATER_GLASSES[stage];
  const pregnant = stage.startsWith("trimester");

  // Food mentioned in chat appears here straight away
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent).detail?.type === "meals_update") reload(); };
    window.addEventListener("sakhi-chart-update", on);
    return () => window.removeEventListener("sakhi-chart-update", on);
  }, [reload]);

  const week = useMemo(() => {
    const out: { date: string; groups: number; logged: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayKey(new Date(Date.now() - i * 86_400_000));
      const dd = doc.days?.[d];
      out.push({ date: d, groups: groupsEaten(dd).length, logged: Boolean(dd?.items.length) });
    }
    return out;
  }, [doc]);

  const change = (id: string, qty: number) => save(d => addItems(d.days ? d : EMPTY_MEALS, today, [{ id, qty }]));
  const water = (n: number) => save(d => addItems(d.days ? d : EMPTY_MEALS, today, [], n));
  const quick = showAll ? FOODS : FOODS.filter(f => ["roti", "rice", "dal", "greens", "sabzi", "milk", "curd", "egg", "fruit", "nuts", "ragi", "chana"].includes(f.id));

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="meals-title">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <BowlFood weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
          <h3 id="meals-title" className="text-xl font-semibold tracking-tight text-plum-900">What you ate today</h3>
        </div>
        <span className="text-xs text-ink-soft">{STAGE_NOTE[stage]} (ICMR-NIN)</span>
      </div>
      <p className="text-xs text-ink-soft mb-4">Tap a food each time you eat a serving, or tell Sakhi “had 2 roti, dal and curd for lunch”.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Add a serving">
            {quick.map(f => (
              <button key={f.id} type="button" onClick={() => change(f.id, 1)} title={f.serving}
                className="inline-flex items-center gap-1 rounded-full border border-plum-900/12 bg-white px-3 py-1.5 text-sm text-plum-900 transition-colors hover:bg-lavender-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
                <Plus className="h-3.5 w-3.5 text-plum-900/50" aria-hidden="true" />{f.name}
              </button>
            ))}
            <button type="button" onClick={() => setShowAll(s => !s)} className="px-2 py-1.5 text-xs font-medium text-lavender-600 underline underline-offset-2 cursor-pointer">
              {showAll ? "Fewer foods" : "More foods"}
            </button>
          </div>

          {day?.items.length ? (
            <ul className="mt-4 divide-y divide-plum-900/[0.06] rounded-2xl border border-plum-900/[0.07] bg-white/80">
              {day.items.map(it => {
                const f = FOOD_BY_ID[it.id];
                if (!f) return null;
                return (
                  <li key={it.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 text-sm text-plum-900">{f.name}<span className="block text-[11px] text-ink-faint">{f.serving}</span></span>
                    <button type="button" aria-label={`One less ${f.name}`} onClick={() => change(it.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-lavender-50 cursor-pointer"><Minus className="h-3.5 w-3.5" aria-hidden="true" /></button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums text-plum-900">{it.qty}</span>
                    <button type="button" aria-label={`One more ${f.name}`} onClick={() => change(it.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-lavender-50 cursor-pointer"><Plus className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-plum-900/15 px-4 py-3 text-sm text-ink-soft">Nothing logged yet today.</p>
          )}

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-lavender-50/70 px-4 py-2.5">
            <Drop weight="fill" className="h-4 w-4 text-sky-500" aria-hidden="true" />
            <span className="flex-1 text-sm text-plum-900">Water <span className="text-ink-soft">· aim {waterGoal} glasses</span></span>
            <button type="button" aria-label="One glass less" onClick={() => water(-1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white cursor-pointer"><Minus className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <span className="w-6 text-center text-sm font-semibold tabular-nums text-plum-900" aria-live="polite">{day?.water || 0}</span>
            <button type="button" aria-label="One more glass" onClick={() => water(1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white cursor-pointer"><Plus className="h-3.5 w-3.5" aria-hidden="true" /></button>
          </div>
        </div>

        <div>
          <ul className="space-y-3">
            {ORDER.map(k => {
              const pct = Math.min(100, Math.round((t[k] / target[k]) * 100));
              const amount = k === "iron" ? t[k].toFixed(1) : Math.round(t[k]);
              return (
                <li key={k}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-plum-900">{NUTRIENT_LABEL[k].name}</span>
                    <span className="tabular-nums text-ink-soft">{amount} / {target[k]} {NUTRIENT_LABEL[k].unit}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-plum-900/[0.07]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${NUTRIENT_LABEL[k].name} ${pct}% of today's target`}>
                    <div className={`h-full rounded-full transition-[width] duration-500 ${pct >= 90 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-plum-900">
              Food groups today: <span className="tabular-nums">{groups.length}</span> of 10
              <span className="font-normal text-ink-soft"> · {groups.length >= 5 ? "a varied day" : "aim for 5 or more"}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_GROUPS.map(g => (
                <span key={g} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${groups.includes(g) ? "bg-emerald-100 text-emerald-800" : "bg-plum-900/[0.05] text-plum-900/45"}`}>{GROUP_LABEL[g]}</span>
              ))}
            </div>
          </div>

          {tip && day?.items.length ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Low on {NUTRIENT_LABEL[tip.nutrient].name.toLowerCase()} today. Try {tip.foods.map(f => f.name.toLowerCase()).join(", ")}.
            </p>
          ) : null}

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-ink-soft">Last 7 days: food groups per day</p>
            <div className="flex items-end gap-1.5 h-14" aria-hidden="true">
              {week.map(w => (
                <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`w-full rounded-t ${w.groups >= 5 ? "bg-emerald-400" : w.logged ? "bg-amber-300" : "bg-plum-900/[0.06]"}`} style={{ height: `${Math.max(4, w.groups * 4)}px` }} />
                  <span className="text-[10px] text-ink-faint">{new Date(w.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "narrow" })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs text-ink-faint">
        Amounts are estimates from typical Indian servings (IFCT 2017).
        {pregnant || stage === "lactating" ? " Food alone rarely gives enough iron and calcium now, so keep taking the IFA and calcium tablets your doctor gave you." : ""}
      </p>
    </section>
  );
}
