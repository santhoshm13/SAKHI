"use client";

import { Check } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useUserDoc } from "@/hooks/useUserDoc";

const GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Papers",
    items: [
      "Mother and Child Protection (MCP) card",
      "All scan and blood test reports",
      "Aadhaar or other photo ID",
      "Insurance, PM-JAY or JSY papers",
      "Hospital registration card",
      "List of family phone numbers",
    ],
  },
  {
    title: "For you",
    items: [
      "3 or 4 loose, front-opening nighties or kurtas",
      "Maternity pads (2 packs)",
      "Old cotton underwear",
      "Feeding bras",
      "Slippers and a shawl",
      "Toothbrush, comb, soap, hair ties",
      "Phone charger",
      "Water bottle and light snacks",
    ],
  },
  {
    title: "For baby",
    items: [
      "4 or 5 sets of soft cotton clothes",
      "Cloth nappies or newborn diapers",
      "2 or 3 swaddle cloths",
      "Cap, mittens and socks",
      "Soft towel and a baby blanket",
    ],
  },
];
const TOTAL = GROUPS.reduce((n, g) => n + g.items.length, 0);

interface Lists { hospital_bag: string[] }

/** Packing list that opens in the third trimester. */
export default function HospitalBagCard({ weeks, className = "" }: { weeks: number; className?: string }) {
  const { doc, save } = useUserDoc<Lists>("checklists", { hospital_bag: [] });
  const packed = doc.hospital_bag || [];
  const toggle = (item: string) => save(d => {
    const list = d.hospital_bag || [];
    return { ...d, hospital_bag: list.includes(item) ? list.filter(x => x !== item) : [...list, item] };
  });
  const pct = Math.round((packed.length / TOTAL) * 100);

  return (
    <div className={`${panelCard} ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-plum-900">Hospital bag</h3>
          <p className="text-xs text-ink-soft">
            {weeks >= 36 ? "Keep it by the door now." : `Aim to have it packed by week 36${weeks < 36 ? ` (${36 - weeks} weeks to go)` : ""}.`}
          </p>
        </div>
        <p className="text-sm font-semibold text-plum-900 tabular-nums">{packed.length} of {TOTAL} packed</p>
      </div>
      <div className="mb-5 h-2 rounded-full bg-plum-900/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Bag packed">
        <div className="h-2 rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {GROUPS.map(g => (
          <div key={g.title}>
            <p className="mb-2 text-sm font-semibold text-plum-900">{g.title}</p>
            <ul className="space-y-1.5">
              {g.items.map(item => {
                const on = packed.includes(item);
                return (
                  <li key={item}>
                    <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(item)}
                      className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-emerald-500 bg-emerald-500 text-white" : "border-plum-900/25 bg-white"}`}>
                        {on && <Check weight="bold" className="h-3.5 w-3.5" />}
                      </span>
                      <span className={on ? "text-ink-soft line-through" : "text-plum-900"}>{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
