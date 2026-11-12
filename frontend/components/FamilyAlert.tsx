"use client";

import { mapsSearch } from "@/components/NearbyHelpCard";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WarningCircle, WhatsappLogo, ChatText, MapPin, Plus, Trash, UsersThree, Phone } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useUserDoc } from "@/hooks/useUserDoc";

export interface Contact { name: string; relation: string; phone: string }
interface FamilyDoc { contacts: Contact[] }
const EMPTY: FamilyDoc = { contacts: [] };

/** What Sakhi noticed, in words a family member understands. */
const REASON: Record<string, string> = {
  "severe-bp": "very high blood pressure",
  bleeding: "bleeding",
  "reduced-movement": "the baby moving less than usual",
  membranes: "that my waters may have broken",
  "preeclampsia-signs": "vision changes and a bad headache",
  "severe-pain": "severe pain or trouble breathing",
  fainting: "fainting",
  "heavy-bleeding": "very heavy bleeding",
  "possible-ectopic": "sharp pain on one side",
  "infection-signs": "fever with pain",
  "clot-signs": "pain and swelling in one leg, or trouble breathing",
};

const digits = (p: string) => p.replace(/[^\d]/g, "");
/** wa.me needs the country code; Indian 10-digit numbers get 91. */
const waNumber = (p: string) => { const d = digits(p).replace(/^0+/, ""); return d.length === 10 ? `91${d}` : d; };
export const validPhone = (p: string) => { const d = digits(p); return d.length >= 10 && d.length <= 13; };

function myName() {
  try { return localStorage.getItem("sakhi_preferred_name") || ""; } catch { return ""; }
}

export function alertText(contact: Contact, reason: string | null, mapLink: string | null) {
  const me = myName();
  const hi = `Hi ${contact.name}${me ? `, this is ${me}` : ""}.`;
  const body = reason === "self-harm"
    ? " I'm not feeling okay right now and I need someone with me. Please call me."
    : reason && REASON[reason]
      ? ` I told my health app about ${REASON[reason]} and it says I should get medical help now. Please call me, or come if you can.`
      : " I need some help. Please call me as soon as you can.";
  return `${hi}${body}${mapLink ? ` I'm here: ${mapLink}` : ""}`;
}

/** WhatsApp and SMS buttons for each contact, with an optional location link. She sends it herself. */
export function AlertButtons({ contacts, reason, tone = "light" }: { contacts: Contact[]; reason: string | null; tone?: "light" | "onRed" }) {
  const [map, setMap] = useState<string | null>(null);
  const [locState, setLocState] = useState<"idle" | "busy" | "denied">("idle");

  const addLocation = () => {
    if (!navigator.geolocation) return setLocState("denied");
    setLocState("busy");
    navigator.geolocation.getCurrentPosition(
      p => { setMap(`https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`); setLocState("idle"); },
      () => setLocState("denied"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const btn = tone === "onRed"
    ? "bg-white text-rose-700 hover:bg-rose-50"
    : "bg-plum-900 text-cream hover:bg-plum-800";
  const ghost = tone === "onRed"
    ? "bg-white/15 text-white hover:bg-white/25"
    : "border border-plum-900/15 bg-white text-plum-900 hover:bg-lavender-50";

  if (!contacts.length) return null;
  return (
    <div className="space-y-2">
      {contacts.map(c => {
        const text = alertText(c, reason, map);
        return (
          <div key={c.phone} className="flex flex-wrap items-center gap-2">
            <span className={`min-w-0 text-sm font-medium ${tone === "onRed" ? "text-white" : "text-plum-900"}`}>{c.name}{c.relation ? ` (${c.relation})` : ""}</span>
            <a href={`https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${btn}`}>
              <WhatsappLogo weight="fill" className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
            <a href={`sms:${digits(c.phone)}?body=${encodeURIComponent(text)}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${ghost}`}>
              <ChatText className="h-4 w-4" aria-hidden="true" /> SMS
            </a>
            <a href={`tel:${digits(c.phone)}`} aria-label={`Call ${c.name}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${ghost}`}>
              <Phone className="h-4 w-4" aria-hidden="true" /> Call
            </a>
          </div>
        );
      })}
      <button type="button" onClick={addLocation} disabled={locState === "busy" || Boolean(map)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline disabled:no-underline cursor-pointer ${tone === "onRed" ? "text-white/90" : "text-lavender-700"}`}>
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {map ? "Your location is added to the message" : locState === "busy" ? "Finding your location…" : locState === "denied" ? "Location is blocked; the message will go without it" : "Add my location to the message"}
      </button>
    </div>
  );
}

/**
 * Red-flag banner for both dashboards. Shows when the chat flags an emergency
 * (or a mental-health crisis): who to call, plus a ready message to family.
 */
export function RedFlagBanner({ mode }: { mode: "her" | "pregnancy" }) {
  const [hit, setHit] = useState<{ reason: string | null; level: string; afterBirth?: boolean } | null>(null);
  const { doc } = useUserDoc<FamilyDoc>("family", EMPTY);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.type === "emergency") setHit({ reason: d.reason || null, level: d.level || "emergency", afterBirth: Boolean(d.after_birth) });
    };
    window.addEventListener("sakhi-chart-update", on);
    return () => window.removeEventListener("sakhi-chart-update", on);
  }, []);

  const crisis = hit?.reason === "self-harm";
  return (
    <AnimatePresence>
      {hit && (
        <motion.div role="alert" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`w-full ${crisis ? "bg-plum-800" : "bg-rose-600"} text-white p-5 sm:p-6 rounded-3xl shadow-lg mb-6 no-print`}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <WarningCircle weight="fill" className="w-8 h-8 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">{crisis ? "You don't have to face this alone" : mode === "pregnancy" ? "This needs a doctor now, mama" : "This needs a doctor now"}</h3>
              <p className="mt-1 text-white/90">
                {crisis
                  ? "Talk to someone now. Tele-MANAS is free, 24 hours, in your language."
                  : mode === "pregnancy"
                    ? `What you shared can be a sign of a serious problem ${hit.afterBirth ? "after birth" : "in pregnancy"}. Please call your doctor or go to the nearest hospital now.`
                    : "What you shared should be checked by a doctor today. Go to hospital now if you feel faint or the bleeding is very heavy."}
              </p>
              {doc.contacts.length > 0 ? (
                <div className="mt-4 rounded-2xl bg-white/10 p-3">
                  <p className="mb-2 text-sm font-semibold">Let your family know</p>
                  <AlertButtons contacts={doc.contacts} reason={hit.reason} tone="onRed" />
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/80">Tip: add a family contact in the Care tab so you can alert them in one tap.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {crisis && <a href="tel:14416" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-plum-800 hover:bg-lavender-50">Call 14416</a>}
              <a href="tel:112" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors">Call 112</a>
              {!crisis && <a href={mapsSearch(mode === "pregnancy" ? "government maternity hospital near me" : "government hospital near me")} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-medium transition-colors">Nearest hospital</a>}
              <button type="button" onClick={() => setHit(null)} className="rounded-full bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-medium transition-colors cursor-pointer">Dismiss</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Care tab: who to alert, and an "I need help" button. */
export function FamilyContactsCard({ className = "" }: { className?: string }) {
  const { doc, save } = useUserDoc<FamilyDoc>("family", EMPTY);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Contact>({ name: "", relation: "", phone: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    if (!form.name.trim()) return setError("Add a name.");
    if (!validPhone(form.phone)) return setError("Enter a 10-digit mobile number.");
    if (doc.contacts.some(c => digits(c.phone) === digits(form.phone))) return setError("That number is already added.");
    save(d => ({ contacts: [...d.contacts, { name: form.name.trim().slice(0, 40), relation: form.relation.trim().slice(0, 30), phone: form.phone.trim() }].slice(0, 3) }));
    setForm({ name: "", relation: "", phone: "" });
    setAdding(false);
    setError(null);
  };
  const remove = (phone: string) => save(d => ({ contacts: d.contacts.filter(c => c.phone !== phone) }));
  const field = "mt-1 block w-full rounded-xl border border-plum-900/10 bg-white px-3 py-2 text-sm text-plum-900 focus:outline-none focus:ring-2 focus:ring-lavender-400";

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="family-title">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <UsersThree weight="duotone" className="h-5 w-5 text-lavender-500" aria-hidden="true" />
          <h3 id="family-title" className="text-xl font-semibold tracking-tight text-plum-900">Family alert</h3>
        </div>
        {doc.contacts.length > 0 && (
          <button type="button" onClick={() => setSending(s => !s)} aria-expanded={sending}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
            I need help
          </button>
        )}
      </div>
      <p className="text-xs text-ink-soft mb-3">
        If Sakhi spots a warning sign, you can message these people in one tap. Nothing is sent without you pressing send.
      </p>

      {sending && (
        <div className="mb-4 rounded-2xl bg-rose-50 p-3">
          <AlertButtons contacts={doc.contacts} reason={null} />
        </div>
      )}

      <ul className="space-y-2">
        {doc.contacts.map(c => (
          <li key={c.phone} className="flex items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2.5">
            <span className="min-w-0 text-sm text-plum-900"><span className="font-medium">{c.name}</span>{c.relation ? <span className="text-ink-soft"> · {c.relation}</span> : null}<span className="block text-xs text-ink-soft tabular-nums">{c.phone}</span></span>
            <button type="button" aria-label={`Remove ${c.name}`} onClick={() => remove(c.phone)} className="rounded-full p-2 text-plum-900/35 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="mt-3 space-y-2 rounded-2xl bg-white/70 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs font-medium text-plum-900/70">Name<input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={field} /></label>
            <label className="text-xs font-medium text-plum-900/70">Relation<input value={form.relation} placeholder="Husband, Amma…" onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} className={field} /></label>
            <label className="text-xs font-medium text-plum-900/70">Mobile<input type="tel" inputMode="tel" value={form.phone} placeholder="98765 43210" onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={field} /></label>
          </div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={add} className="rounded-xl bg-plum-900 px-4 py-2 text-sm font-semibold text-cream hover:bg-plum-800 cursor-pointer">Save contact</button>
            <button type="button" onClick={() => { setAdding(false); setError(null); }} className="rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-white cursor-pointer">Cancel</button>
          </div>
        </div>
      ) : doc.contacts.length < 3 && (
        <button type="button" onClick={() => setAdding(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-lavender-600 hover:underline cursor-pointer">
          <Plus className="h-4 w-4" /> {doc.contacts.length ? "Add another person" : "Add a family member"}
        </button>
      )}
    </section>
  );
}
