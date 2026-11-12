"use client";

import { useState } from "react";
import { Bank, CaretDown } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";

type Answer = "yes" | "no" | null;
interface Scheme { id: string; name: string; what: string; who: string; how: string[]; link?: { href: string; label: string }; fits: (a: Answers) => boolean | null }
interface Answers { first: Answer; girl2: Answer; govt: Answer; card: Answer }

/**
 * Central schemes most pregnant women in India can use. Amounts change and
 * states add their own, so every card ends with "confirm with your ASHA".
 */
const SCHEMES: Scheme[] = [
  {
    id: "pmmvy",
    name: "PM Matru Vandana Yojana (PMMVY)",
    what: "₹5,000 into your bank account for your first child, in two parts. ₹6,000 more if your second child is a girl.",
    who: "Pregnant women and new mothers, except government employees who already get paid maternity leave.",
    how: [
      "Register with your ASHA or Anganwadi worker, or on the PMMVY portal, as early as you can",
      "Part 1 (₹3,000): after registering and at least one antenatal check-up",
      "Part 2 (₹2,000): after the birth is registered and baby has the first round of vaccines",
      "Keep ready: Aadhaar, MCP card, bank or post office account linked to Aadhaar",
    ],
    link: { href: "https://pmmvy.wcd.gov.in", label: "PMMVY portal" },
    fits: a => (a.first === "yes" || a.girl2 === "yes" ? true : a.first === "no" && a.girl2 === "no" ? false : null),
  },
  {
    id: "jsy",
    name: "Janani Suraksha Yojana (JSY)",
    what: "Cash after you give birth in a government hospital (or an accredited private one). The amount depends on your state and whether you live in a village or town.",
    who: "Mainly families with a BPL card, or SC/ST families. In UP, Bihar, Jharkhand, MP, Chhattisgarh, Rajasthan, Odisha, Assam, Uttarakhand and J&K, every woman delivering in a government hospital.",
    how: ["Tell your ASHA you want JSY when you register the pregnancy", "Deliver in a government or accredited hospital", "The money comes to your bank account after the birth"],
    fits: a => (a.govt === "no" ? false : a.card === "yes" ? true : null),
  },
  {
    id: "jssk",
    name: "Janani Shishu Suraksha Karyakram (JSSK)",
    what: "Everything free in a government hospital: normal delivery or C-section, medicines, tests, blood, food during your stay, and the ambulance there and back home. Also free treatment for a sick baby up to 1 year.",
    who: "Every pregnant woman who delivers in a government hospital. No card or income limit.",
    how: ["Nothing to apply for. If anyone asks you to pay for these in a government hospital, you can refuse", "Call 102 or 108 for the free ambulance"],
    fits: a => (a.govt === "no" ? false : a.govt === "yes" ? true : null),
  },
  {
    id: "pmsma",
    name: "PM Surakshit Matritva Abhiyan (PMSMA)",
    what: "A free check-up by a doctor on the 9th of every month at government health centres, with tests and an ultrasound when needed.",
    who: "Every pregnant woman in the 4th to 9th month.",
    how: ["Go to your nearest PHC, CHC or district hospital on the 9th", "Take your MCP card and old reports"],
    link: { href: "https://pmsma.mohfw.gov.in", label: "PMSMA site" },
    fits: () => true,
  },
];

const QUESTIONS: { key: keyof Answers; q: string }[] = [
  { key: "first", q: "Is this your first baby?" },
  { key: "girl2", q: "Is it your second baby, and a girl?" },
  { key: "govt", q: "Will you deliver in a government hospital?" },
  { key: "card", q: "Does your family have a BPL ration card, or are you SC/ST?" },
];

/** Which government schemes she can claim, and what to do for each. */
export default function SchemesCard({ className = "" }: { className?: string }) {
  const [a, setA] = useState<Answers>({ first: null, girl2: null, govt: null, card: null });
  const [open, setOpen] = useState<string | null>(null);
  const shown = QUESTIONS.filter(q => !(q.key === "girl2" && a.first !== "no"));
  const ranked = [...SCHEMES].sort((x, y) => Number(y.fits(a) === true) - Number(x.fits(a) === true));

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="schemes-title">
      <div className="flex items-center gap-2 mb-1">
        <Bank weight="duotone" className="h-5 w-5 text-lavender-500" aria-hidden="true" />
        <h3 id="schemes-title" className="text-xl font-semibold tracking-tight text-plum-900">Government help you can claim</h3>
      </div>
      <p className="text-xs text-ink-soft mb-4">Answer a few questions to see which schemes fit you. Nothing here is saved or sent anywhere.</p>

      <div className="grid gap-3 sm:grid-cols-2 mb-5">
        {shown.map(({ key, q }) => (
          <fieldset key={key} className="text-sm text-plum-900">
            <legend className="mb-1.5 font-medium">{q}</legend>
            <div className="flex gap-2">
              {(["yes", "no"] as const).map(v => (
                <button key={v} type="button" aria-pressed={a[key] === v} onClick={() => setA(p => ({ ...p, [key]: p[key] === v ? null : v }))}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${a[key] === v ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/12 bg-white text-plum-900 hover:bg-lavender-50"}`}>
                  {v === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <ul className="space-y-2">
        {ranked.map(s => {
          const fit = s.fits(a);
          const isOpen = open === s.id;
          return (
            <li key={s.id} className={`rounded-2xl border ${fit === false ? "border-plum-900/[0.05] bg-white/40 opacity-70" : "border-plum-900/[0.08] bg-white/80"}`}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 rounded-2xl">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-plum-900">{s.name}</span>
                    {fit === true && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Likely for you</span>}
                    {fit === false && <span className="rounded-full bg-plum-900/5 px-2 py-0.5 text-[11px] font-semibold text-plum-900/55">May not apply</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{s.what}</span>
                </span>
                <CaretDown className={`mt-1 h-4 w-4 shrink-0 text-plum-900/50 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-plum-900">
                  <p className="text-ink-soft"><span className="font-medium text-plum-900">Who: </span>{s.who}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">{s.how.map(h => <li key={h}>{h}</li>)}</ol>
                  {s.link && <a href={s.link.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium text-lavender-600 underline underline-offset-2">{s.link.label}</a>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-ink-faint">Amounts and rules differ by state and change over time. Your ASHA, Anganwadi worker or the 104 health helpline can confirm what you&apos;ll get and help you apply.</p>
    </section>
  );
}
