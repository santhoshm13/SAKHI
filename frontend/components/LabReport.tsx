"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, FileText, X, Plus, Trash, CircleNotch, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import {
  LAB_TESTS, checkLab, cleanValue, formatLab, labTest, latestLabs, parseLabText,
  type LabKey, type LabResult, type LabStatus, type LabValue,
} from "@/lib/labs";
import { panelCard } from "@/components/her/HerPanels";

export const STATUS_CLS: Record<LabStatus, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  mild: "bg-amber-100 text-amber-800",
  attention: "bg-rose-100 text-rose-700",
  urgent: "bg-rose-600 text-white",
};
export const STATUS_WORD: Record<LabStatus, string> = { ok: "Healthy", mild: "Keep an eye", attention: "See doctor", urgent: "Urgent" };

const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Shrink the photo (phones shoot 4000px+) so it uploads fast and OCR runs quickly. */
async function loadPhoto(file: File): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file isn't a photo we can open."));
      i.src = url;
    });
    const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { canvas, dataUrl: canvas.toDataURL("image/jpeg", 0.85) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Read on the device with OCR (used when the AI reader isn't set up or fails). */
async function readOnDevice(canvas: HTMLCanvasElement, onProgress: (p: number) => void) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: any) => { if (m?.status === "recognizing text") onProgress(m.progress || 0); },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return parseLabText(data.text || "");
  } finally {
    await worker.terminate();
  }
}

type Row = { key: LabKey; value: string };
type Step = "pick" | "reading" | "review" | "done";

export function LabReportSheet({ open, onClose, mode, pregnant, onSaved }: {
  open: boolean;
  onClose: () => void;
  mode: "her" | "pregnancy";
  pregnant: boolean;
  onSaved?: (results: LabResult[]) => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [reader, setReader] = useState<"ai" | "device" | "manual">("manual");
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<LabResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("pick"); setPreview(null); setProgress(0); setRows([]); setDate(today()); setError(null); setSaved([]); setReader("manual");
  }, []);

  useEffect(() => { if (open) reset(); }, [open, reset]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const fill = (values: LabValue[], reportDate: string | null) => {
    setRows(values.map(v => ({ key: v.key, value: String(v.value) })));
    if (reportDate) setDate(reportDate);
    setStep("review");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setStep("reading");
    setProgress(0);
    try {
      const { canvas, dataUrl } = await loadPhoto(file);
      setPreview(dataUrl);
      // AI first (better with phone photos); the device reader is the fallback
      const res = await fetch("/api/lab-report/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok && Array.isArray(json.values) && json.values.length) {
        setReader("ai");
        return fill(json.values, json.reportDate);
      }
      if (res && res.status === 429) throw new Error(json.error);
      setReader("device");
      const out = await readOnDevice(canvas, setProgress);
      fill(out.values, out.reportDate);
      if (!out.values.length) setError("I couldn't find any test values in that photo. Try a sharper, flat photo in good light, or type the values below.");
    } catch (e: any) {
      setStep("review");
      setError(e?.message || "Couldn't read that photo. You can type the values below.");
    }
  };

  const unused = LAB_TESTS.filter(t => !rows.some(r => r.key === t.key));

  const save = async () => {
    const values: Record<string, string> = {};
    for (const r of rows) values[r.key] = r.value;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/lab-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, values, source: reader === "manual" ? "manual" : "photo", mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save.");
      setSaved(json.saved || []);
      setStep("done");
      onSaved?.(json.results || []);
    } catch (e: any) {
      setError(e?.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const invalid = rows.some(r => r.value.trim() !== "" && cleanValue(r.key, r.value) === null);
  const filled = rows.filter(r => r.value.trim() !== "");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-plum-900/40 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="lab-title"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] bg-cream shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-cream/95 backdrop-blur px-5 sm:px-7 pt-5 pb-3 border-b border-plum-900/[0.06]">
              <div>
                <h2 id="lab-title" className="text-lg font-semibold text-plum-900">Add a lab report</h2>
                <p className="text-xs text-ink-soft">Snap your report. You check every value before it&apos;s saved.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-plum-900/60 hover:bg-plum-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 sm:px-7 py-5 space-y-5">
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" data-testid="lab-file" onChange={e => { onFile(e.target.files?.[0]); e.target.value = ""; }} />

              {step === "pick" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-2 rounded-2xl bg-plum-900 px-4 py-5 text-cream hover:bg-plum-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 cursor-pointer">
                      <Camera className="h-7 w-7" weight="duotone" />
                      <span className="text-sm font-semibold">Take a photo</span>
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-2xl border border-plum-900/10 bg-white/80 px-4 py-5 text-plum-900 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 cursor-pointer">
                      <FileText className="h-7 w-7 text-lavender-500" weight="duotone" />
                      <span className="text-sm font-semibold">Choose a photo</span>
                    </button>
                  </div>
                  <button type="button" onClick={() => { setReader("manual"); setStep("review"); }} className="w-full text-sm font-medium text-lavender-600 hover:underline cursor-pointer">
                    Or type the values in
                  </button>
                  <p className="flex gap-2 rounded-2xl bg-lavender-50 p-3 text-xs leading-relaxed text-ink-soft">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-lavender-500" weight="duotone" />
                    The photo is read and then thrown away; only the values you confirm are saved. If AI reading is on, the photo is sent to Google Gemini to read it.
                  </p>
                  <p className="text-xs text-ink-faint">Reads haemoglobin, sugar (fasting, after-meal, HbA1c), thyroid TSH, ferritin, platelets, vitamin D, B12, urine protein and BP.</p>
                </>
              )}

              {step === "reading" && (
                <div className="flex flex-col items-center gap-4 py-6" aria-live="polite">
                  {preview && <img src={preview} alt="Your report" className="max-h-48 rounded-xl border border-plum-900/10 object-contain" />}
                  <CircleNotch className="h-7 w-7 animate-spin text-lavender-500" />
                  <p className="text-sm font-medium text-plum-900">Reading your report{progress > 0 ? `… ${Math.round(progress * 100)}%` : "…"}</p>
                  <p className="text-xs text-ink-soft">The first time takes a little longer.</p>
                </div>
              )}

              {step === "review" && (
                <>
                  {error && (
                    <p role="alert" className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                      <WarningCircle className="h-5 w-5 shrink-0" weight="duotone" /> {error}
                    </p>
                  )}
                  {rows.length > 0 && reader !== "manual" && (
                    <p className="text-sm text-plum-900">
                      Found {rows.length} {rows.length === 1 ? "value" : "values"}. <span className="text-ink-soft">Please check each one against your report.</span>
                    </p>
                  )}
                  <div>
                    <label htmlFor="lab-date" className="text-xs font-semibold text-plum-900/70">Report date</label>
                    <input id="lab-date" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-plum-900/10 bg-white px-3 py-2.5 text-sm text-plum-900 focus:outline-none focus:ring-2 focus:ring-lavender-400" />
                  </div>

                  <ul className="space-y-2.5">
                    {rows.map((r, i) => {
                      const t = labTest(r.key)!;
                      const v = r.value.trim() ? cleanValue(r.key, r.value) : null;
                      const check = v !== null ? checkLab(r.key, v, pregnant) : null;
                      const bad = r.value.trim() !== "" && v === null;
                      return (
                        <li key={r.key} className="rounded-2xl border border-plum-900/[0.08] bg-white/85 p-3">
                          <div className="flex items-center gap-3">
                            <label htmlFor={`lab-${r.key}`} className="min-w-0 flex-1 text-sm font-medium text-plum-900">{t.label}</label>
                            <input
                              id={`lab-${r.key}`}
                              value={r.value}
                              inputMode={t.text ? "text" : "decimal"}
                              placeholder={r.key === "bp" ? "120/80" : r.key === "urine_protein" ? "nil, trace, 1+" : ""}
                              onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                              aria-invalid={bad}
                              className={`w-24 rounded-lg border bg-cream/60 px-2.5 py-1.5 text-right text-sm tabular-nums text-plum-900 focus:outline-none focus:ring-2 focus:ring-lavender-400 ${bad ? "border-rose-400" : "border-plum-900/10"}`}
                            />
                            <span className="w-16 text-xs text-ink-soft">{t.unit}</span>
                            <button type="button" aria-label={`Remove ${t.label}`} onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} className="rounded-full p-1.5 text-plum-900/40 hover:bg-rose-50 hover:text-rose-600 cursor-pointer">
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                          {bad && <p className="mt-1.5 text-xs text-rose-600">That doesn&apos;t look like a {t.label.toLowerCase()} value. Please check it.</p>}
                          {check && (
                            <p className="mt-1.5 flex items-start gap-2 text-xs text-ink-soft">
                              <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${STATUS_CLS[check.status]}`}>{STATUS_WORD[check.status]}</span>
                              <span>{check.note}</span>
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {unused.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-lavender-500" />
                      <label htmlFor="lab-add" className="sr-only">Add a test</label>
                      <select id="lab-add" value="" onChange={e => { const k = e.target.value as LabKey; if (k) setRows(rs => [...rs, { key: k, value: "" }]); }}
                        className="flex-1 rounded-xl border border-plum-900/10 bg-white px-3 py-2 text-sm text-plum-900 focus:outline-none focus:ring-2 focus:ring-lavender-400 cursor-pointer">
                        <option value="">Add a test{rows.length ? " I missed" : ""}…</option>
                        {unused.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={reset} className="flex-1 rounded-full border border-plum-900/10 px-4 py-3 text-sm font-semibold text-plum-900 hover:bg-white cursor-pointer">Start over</button>
                    <button type="button" onClick={save} disabled={saving || invalid || filled.length === 0} aria-busy={saving}
                      className="flex-[2] rounded-full bg-plum-900 px-4 py-3 text-sm font-semibold text-cream hover:bg-plum-800 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
                      {saving ? "Saving…" : `Save ${filled.length || ""} ${filled.length === 1 ? "value" : "values"}`}
                    </button>
                  </div>
                </>
              )}

              {step === "done" && (
                <div className="space-y-4" aria-live="polite">
                  <p className="text-base font-semibold text-plum-900">Saved {saved.length} {saved.length === 1 ? "result" : "results"} from {shortDate(date)}.</p>
                  <ul className="space-y-2">
                    {saved.map(r => {
                      const c = checkLab(r.key, r.value, pregnant);
                      return (
                        <li key={r.key} className="rounded-2xl bg-white/85 p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-plum-900">{labTest(r.key)?.label}</span>
                            <span className="tabular-nums text-plum-900">{formatLab(r.key, r.value)}</span>
                          </div>
                          <p className="mt-1 flex items-start gap-2 text-xs text-ink-soft">
                            <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${STATUS_CLS[c.status]}`}>{STATUS_WORD[c.status]}</span>{c.note}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  {mode === "pregnancy" && saved.some(r => r.key === "fasting_sugar" || r.key === "bp") && (
                    <p className="text-xs text-ink-soft">Your fasting sugar and BP from this report are now in your vitals and the pregnancy risk check.</p>
                  )}
                  <p className="text-xs text-ink-faint">A guide, not a diagnosis. Your doctor reads results with your whole history.</p>
                  <button type="button" onClick={onClose} className="w-full rounded-full bg-plum-900 px-4 py-3 text-sm font-semibold text-cream hover:bg-plum-800 cursor-pointer">Done</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Latest result for each test, with a button to add a report. */
export function LabResultsCard({ mode, pregnant, className = "", onChanged }: {
  mode: "her" | "pregnancy";
  pregnant: boolean;
  className?: string;
  onChanged?: () => void;
}) {
  const [results, setResults] = useState<LabResult[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/lab-report", { cache: "no-store" });
      const json = await res.json();
      setResults(Array.isArray(json.results) ? json.results : []);
    } catch { setResults([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const latest = Object.values(latestLabs(results || [])) as LabResult[];
  const ranked = latest
    .map(r => ({ r, c: checkLab(r.key, r.value, pregnant) }))
    .sort((a, b) => ["urgent", "attention", "mild", "ok"].indexOf(a.c.status) - ["urgent", "attention", "mild", "ok"].indexOf(b.c.status));

  return (
    <div className={`${panelCard} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-plum-900">Lab results</h3>
          <p className="text-xs text-ink-soft">Snap a report and Sakhi reads the numbers for you.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-plum-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 cursor-pointer">
          <Camera className="h-4 w-4" weight="bold" /> Add a lab report
        </button>
      </div>

      {results === null ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : ranked.length === 0 ? (
        <p className="rounded-2xl bg-lavender-50 p-4 text-sm text-ink-soft">
          No lab results yet. Add your last blood test{mode === "pregnancy" ? " (haemoglobin, sugar, thyroid)" : ""} and Sakhi will explain each number in plain words.
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {ranked.map(({ r, c }) => (
            <li key={r.key} className="rounded-2xl border border-plum-900/[0.07] bg-white/80 p-3.5 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-plum-900/65">{labTest(r.key)?.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[c.status]}`}>{STATUS_WORD[c.status]}</span>
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-plum-900">{formatLab(r.key, r.value)}</p>
              <p className="text-xs leading-relaxed text-ink-soft">{c.note}</p>
              <p className="mt-1 text-[11px] text-ink-faint">{shortDate(r.date)}</p>
            </li>
          ))}
        </ul>
      )}

      <LabReportSheet open={open} onClose={() => setOpen(false)} mode={mode} pregnant={pregnant}
        onSaved={res => { setResults(res); onChanged?.(); }} />
    </div>
  );
}
