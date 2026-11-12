"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Backspace, LockSimple } from "@phosphor-icons/react";
import {
  DISCREET_CHANGED, DISCREET_TITLE, LOCK_EVENT, checkPin, forgetUnlock, isDiscreet, isUnlocked, markUnlocked,
} from "@/lib/discreet";
import { sakhiSignOut } from "@/lib/clientSignOut";

const PRIVATE = /^\/(her-mode|pregnancy-mode|doctor-summary|onboarding)(\/|$)/;
const AWAY_MS = 60_000;
const MAX_TRIES = 5;

/**
 * When discreet mode is on: a plain tab title, and a PIN screen when the app is
 * opened, after a minute away, on the hide button, or on a double Escape.
 */
export default function DiscreetGuard() {
  const pathname = usePathname() || "/";
  const onPrivatePage = PRIVATE.test(pathname);
  const [on, setOn] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [forgot, setForgot] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const lastEsc = useRef(0);

  useEffect(() => {
    const sync = () => {
      const d = isDiscreet();
      setOn(d);
      if (!d) setLocked(false);
      else if (onPrivatePage && !isUnlocked()) setLocked(true);
    };
    sync();
    window.addEventListener(DISCREET_CHANGED, sync);
    return () => window.removeEventListener(DISCREET_CHANGED, sync);
  }, [onPrivatePage]);

  // Plain tab title on Sakhi's own pages
  useEffect(() => {
    if (!on || !onPrivatePage) return;
    const keep = () => { if (document.title !== DISCREET_TITLE) document.title = DISCREET_TITLE; };
    keep();
    const obs = new MutationObserver(keep);
    const t = document.querySelector("title");
    if (t) obs.observe(t, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, [on, onPrivatePage, pathname]);

  const lock = useCallback(() => {
    if (!isDiscreet()) return;
    forgetUnlock();
    setPin("");
    setError(null);
    setLocked(true);
  }, []);

  useEffect(() => {
    if (!on) return;
    const onLock = () => lock();
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > AWAY_MS) lock();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      if (now - lastEsc.current < 500) lock();
      lastEsc.current = now;
    };
    window.addEventListener(LOCK_EVENT, onLock);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(LOCK_EVENT, onLock);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
    };
  }, [on, lock]);

  const submit = useCallback(async (value: string) => {
    const ok = await checkPin(value);
    typed.current = "";
    if (ok) {
      markUnlocked();
      setLocked(false);
      setPin("");
      setTries(0);
      setError(null);
      return;
    }
    const n = tries + 1;
    setTries(n);
    setPin("");
    if (n >= MAX_TRIES) {
      setWaitUntil(Date.now() + 30_000);
      setTries(0);
      setError("Too many tries. Wait 30 seconds.");
    } else {
      setError("Wrong PIN. Try again.");
    }
  }, [tries]);

  // A ref, so quick taps never read a stale PIN
  const typed = useRef("");
  useEffect(() => { typed.current = pin; }, [pin]);
  const press = (d: string) => {
    if (Date.now() < waitUntil || typed.current.length >= 4) return;
    setError(null);
    const next = typed.current + d;
    typed.current = next;
    setPin(next);
    if (next.length === 4) submit(next);
  };

  // Typing digits on a keyboard works too
  useEffect(() => {
    if (!locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin(p => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!on || !locked || !onPrivatePage) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Enter PIN" className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-cream px-6">
      <LockSimple className="h-8 w-8 text-plum-900/50" weight="duotone" aria-hidden="true" />
      <p className="mt-4 text-lg font-semibold text-plum-900">Enter PIN</p>
      <div className="mt-5 flex gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 border-plum-900/40 ${i < pin.length ? "bg-plum-900 border-plum-900" : ""}`} />
        ))}
      </div>
      <p role="status" className="mt-3 h-5 text-sm text-rose-600">{error}</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => (
          <button key={d} type="button" onClick={() => press(d)} className="h-16 w-16 rounded-full bg-white text-2xl font-medium text-plum-900 shadow-sm hover:bg-lavender-50 active:scale-95 transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 cursor-pointer">
            {d}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => press("0")} className="h-16 w-16 rounded-full bg-white text-2xl font-medium text-plum-900 shadow-sm hover:bg-lavender-50 active:scale-95 transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 cursor-pointer">0</button>
        <button type="button" aria-label="Delete" onClick={() => setPin(p => p.slice(0, -1))} className="flex h-16 w-16 items-center justify-center rounded-full text-plum-900/60 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 cursor-pointer">
          <Backspace className="h-6 w-6" />
        </button>
      </div>

      {forgot ? (
        <div className="mt-8 max-w-xs text-center text-sm text-ink-soft">
          <p>To reset the PIN you need to sign out on this device. Signed-in data stays in your account; a guest&apos;s data can&apos;t be recovered.</p>
          <div className="mt-3 flex justify-center gap-3">
            <button type="button" onClick={() => setForgot(false)} className="rounded-full px-4 py-2 font-medium text-plum-900 hover:bg-white cursor-pointer">Cancel</button>
            <button type="button" onClick={() => sakhiSignOut({ signedIn: true })} className="rounded-full bg-plum-900 px-4 py-2 font-semibold text-cream cursor-pointer">Sign out</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setForgot(true)} className="mt-8 text-sm text-ink-soft hover:text-plum-900 cursor-pointer">Forgot PIN?</button>
      )}
    </div>
  );
}
