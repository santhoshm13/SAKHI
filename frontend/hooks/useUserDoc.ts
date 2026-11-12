"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendOrQueue } from "@/lib/outbox";

// Last copy from the server, so the card still works with no signal (cleared on sign-out)
const cacheKey = (kind: string) => `sakhi_doc_${kind}`;
const readCache = (kind: string) => { try { const v = localStorage.getItem(cacheKey(kind)); return v ? JSON.parse(v) : null; } catch { return null; } };
const writeCache = (kind: string, doc: unknown) => { try { localStorage.setItem(cacheKey(kind), JSON.stringify(doc)); } catch { /* full or blocked */ } };

/**
 * Load and save one per-user document through /api/user-doc/<kind>.
 * Saves are optimistic: the screen updates at once and the write follows.
 * Offline, the last copy is shown and saves wait in the outbox. With no copy at
 * all, saves stay on screen only, so an empty form can never overwrite her data.
 */
export function useUserDoc<T>(kind: string, fallback: T) {
  const [doc, setDoc] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef<T>(fallback);
  const fallbackRef = useRef(fallback);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  // Saves wait for the stored copy, so a quick tap can't overwrite her data with the empty fallback
  const ready = useRef<Promise<void>>(Promise.resolve());
  const known = useRef(false);

  useEffect(() => {
    let alive = true;
    ready.current = fetch(`/api/user-doc/${kind}`, { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(j => {
        if (!alive) return;
        const value = j?.doc && typeof j.doc === "object" ? { ...fallbackRef.current, ...j.doc } as T : fallbackRef.current;
        known.current = true;
        writeCache(kind, value);
        latest.current = value;
        setDoc(value);
      })
      .catch(() => {
        if (!alive) return;
        const cached = readCache(kind);
        if (cached && typeof cached === "object") {
          known.current = true;
          latest.current = { ...fallbackRef.current, ...cached } as T;
          setDoc(latest.current);
        }
      })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [kind, version]);

  const save = useCallback(async (next: T | ((prev: T) => T)) => {
    await ready.current;
    const value = typeof next === "function" ? (next as (p: T) => T)(latest.current) : next;
    latest.current = value;
    setDoc(value);
    if (!known.current) return false;
    writeCache(kind, value);
    return (await sendOrQueue(`/api/user-doc/${kind}`, "PUT", { doc: value })).ok;
  }, [kind]);

  return { doc, save, loaded, reload };
}

export const dayKey = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().slice(0, 10);
};
