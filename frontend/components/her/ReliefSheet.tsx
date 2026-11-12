"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Timer, ThumbsUp, ThumbsDown, ArrowsClockwise, WarningCircle, Heart, Play, Pause } from "@phosphor-icons/react";
import type { ReliefTip } from "@/lib/reliefTips";

interface ReliefData {
  tips: ReliefTip[];
  favourites: ReliefTip[];
  redFlags: string[];
  seeDoctor: string;
  urgent: boolean;
}

const LEVELS = [
  { label: "Mild", sub: "1–3", value: 3 },
  { label: "Moderate", sub: "4–6", value: 5 },
  { label: "Bad", sub: "7–8", value: 7 },
  { label: "Severe", sub: "9–10", value: 9 },
];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function TipTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => setLeft(l => (l <= 1 ? 0 : l - 1)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);
  useEffect(() => { if (left === 0) setRunning(false); }, [left]);

  return (
    <button
      type="button"
      onClick={() => (left === 0 ? (setLeft(seconds), setRunning(true)) : setRunning(r => !r))}
      className="inline-flex items-center gap-1.5 rounded-full bg-plum-900/5 px-3 py-1.5 text-xs font-semibold text-plum-900 hover:bg-plum-900/10 cursor-pointer"
    >
      {running ? <Pause weight="fill" className="w-3.5 h-3.5" /> : left === 0 ? <ArrowsClockwise className="w-3.5 h-3.5" /> : <Play weight="fill" className="w-3.5 h-3.5" />}
      <Timer className="w-3.5 h-3.5" /> {left === 0 ? "Done, again?" : fmt(left)}
    </button>
  );
}

/** "Pain now" sheet: asks how bad it is, then offers a rotating set of relief steps. */
export default function ReliefSheet({ open, initialSeverity, onClose }: { open: boolean; initialSeverity?: number | null; onClose: () => void }) {
  const [severity, setSeverity] = useState<number | null>(initialSeverity ?? null);
  const [data, setData] = useState<ReliefData | null>(null);
  const [loading, setLoading] = useState(false);
  const [rated, setRated] = useState<Record<string, boolean>>({});

  const load = async (sev: number) => {
    setLoading(true);
    setRated({});
    try {
      const res = await fetch(`/api/relief?severity=${sev}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const sev = initialSeverity ?? null;
    setSeverity(sev);
    setData(null);
    if (sev) load(sev);
  }, [open, initialSeverity]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const rate = async (tipId: string, helped: boolean) => {
    setRated(r => ({ ...r, [tipId]: helped }));
    fetch("/api/relief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipId, helped }) }).catch(() => {});
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-plum-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog" aria-modal="true" aria-labelledby="relief-title"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-cream p-5 sm:p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-rose-500">Pain relief</p>
                <h2 id="relief-title" className="text-xl font-semibold text-plum-900 mt-0.5">Let&apos;s ease this together</h2>
                <p className="text-sm text-plum-900/60 mt-1">These won&apos;t switch pain off instantly, but they can take the edge off.</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-black/5 text-plum-900/60 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium text-plum-900">How bad is it right now?</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {LEVELS.map(l => (
                  <button
                    key={l.value}
                    onClick={() => { setSeverity(l.value); load(l.value); }}
                    className={`rounded-2xl border px-2 py-2.5 text-center transition-colors cursor-pointer ${severity === l.value ? "border-rose-400 bg-rose-50 text-rose-700" : "border-plum-900/10 bg-white/70 text-plum-900/80 hover:border-rose-200"}`}
                  >
                    <span className="block text-sm font-semibold">{l.label}</span>
                    <span className="block text-[11px] opacity-60">{l.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {data?.urgent && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold flex items-center gap-2"><WarningCircle weight="fill" className="w-4 h-4" /> Pain this severe needs attention</p>
                <p className="mt-1">If you feel faint, have a fever, are soaking a pad every hour, or this pain feels different from usual, please get medical care now. You can still try the steps below while you arrange it.</p>
              </div>
            )}

            {loading && <p className="mt-6 text-sm text-plum-900/50">Finding what might help…</p>}

            {data && !loading && (
              <>
                {data.favourites.length > 0 && (
                  <p className="mt-5 text-xs text-plum-900/60 flex items-center gap-1.5">
                    <Heart weight="fill" className="w-3.5 h-3.5 text-rose-400" />
                    Helped you before: {data.favourites.map(f => f.title).join(", ")}
                  </p>
                )}
                <ol className="mt-4 space-y-3">
                  {data.tips.map((tip, i) => (
                    <li key={tip.id} className="rounded-2xl bg-white/80 border border-pink-100 p-4">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-rose-100 text-rose-600 text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-plum-900">{tip.title}</h3>
                          <ul className="mt-1.5 space-y-1 text-sm text-plum-900/75">
                            {tip.steps.map(s => <li key={s}>{s}</li>)}
                          </ul>
                          {tip.why && <p className="mt-1.5 text-xs text-plum-900/50">{tip.why}</p>}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {tip.seconds && <TipTimer seconds={tip.seconds} />}
                            {rated[tip.id] === undefined ? (
                              <>
                                <button onClick={() => rate(tip.id, true)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"><ThumbsUp className="w-3.5 h-3.5" /> Helped</button>
                                <button onClick={() => rate(tip.id, false)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-plum-900/60 bg-black/5 hover:bg-black/10 cursor-pointer"><ThumbsDown className="w-3.5 h-3.5" /> Not really</button>
                              </>
                            ) : (
                              <span className="text-xs text-plum-900/50">{rated[tip.id] ? "Noted, I'll suggest this first next time." : "Thanks, I'll try something else next time."}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={() => severity && load(severity)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full border border-plum-900/15 py-2.5 text-sm font-medium text-plum-900 hover:bg-white cursor-pointer"
                >
                  <ArrowsClockwise className="w-4 h-4" /> Show me other ideas
                </button>

                <details className="mt-5 rounded-2xl bg-white/60 border border-plum-900/10 p-4 text-sm" open={data.urgent}>
                  <summary className="font-semibold text-plum-900 cursor-pointer">When to get help</summary>
                  <ul className="mt-2 space-y-1.5 text-plum-900/75 list-disc pl-5">
                    {data.redFlags.map(f => <li key={f}>{f}</li>)}
                  </ul>
                  <p className="mt-3 text-plum-900/65">{data.seeDoctor}</p>
                </details>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
