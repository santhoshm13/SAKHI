"use client";

import { MapPin, Phone } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";

/** Google Maps searches near her. Maps uses the phone's own location; Sakhi never sees it. */
export const mapsSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const PLACES = [
  { q: "government hospital near me", label: "Government hospital" },
  { q: "primary health centre near me", label: "Primary health centre (PHC)" },
  { q: "Jan Aushadhi Kendra near me", label: "Jan Aushadhi (low-cost medicines)" },
  { q: "blood bank near me", label: "Blood bank" },
];
const PREGNANCY_PLACES = [{ q: "maternity hospital near me", label: "Maternity hospital" }];

const LINES = [
  { n: "108", label: "Ambulance (emergency)" },
  { n: "102", label: "Free ambulance for pregnancy and babies" },
  { n: "104", label: "Health advice helpline" },
  { n: "181", label: "Women's helpline" },
];

export default function NearbyHelpCard({ mode, className = "" }: { mode: "her" | "pregnancy"; className?: string }) {
  const places = mode === "pregnancy" ? [...PREGNANCY_PLACES, ...PLACES] : PLACES;
  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="nearby-title">
      <div className="flex items-center gap-2 mb-1">
        <MapPin weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
        <h3 id="nearby-title" className="text-xl font-semibold tracking-tight text-plum-900">Help near you</h3>
      </div>
      <p className="text-xs text-ink-soft mb-4">Opens Google Maps with places near you. Sakhi doesn&apos;t see or keep your location.</p>
      <div className="flex flex-wrap gap-2">
        {places.map(p => (
          <a key={p.q} href={mapsSearch(p.q)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-plum-900/12 bg-white px-3.5 py-2 text-sm font-medium text-plum-900 transition-colors hover:bg-lavender-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
            <MapPin className="h-4 w-4 text-blush-500" aria-hidden="true" /> {p.label}
          </a>
        ))}
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {LINES.filter(l => mode === "pregnancy" || l.n !== "102").map(l => (
          <li key={l.n}>
            <a href={`tel:${l.n}`} className="flex items-center gap-3 rounded-2xl border border-plum-900/[0.07] bg-white/80 px-3 py-2.5 transition-colors hover:bg-lavender-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
              <Phone weight="fill" className="h-4 w-4 shrink-0 text-plum-900/60" aria-hidden="true" />
              <span className="text-base font-semibold tabular-nums text-plum-900">{l.n}</span>
              <span className="text-xs text-ink-soft">{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
