/**
 * How far along she is, worked out fresh every day from the due date, so
 * "Week 18" doesn't stay at 18. A due date is 280 days after the first day of
 * the last period (Naegele's rule).
 */
const DAY = 86_400_000;
const dayNum = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / DAY);
const isoOf = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
/** Today's date in India (or SAKHI_TZ on the server), as yyyy-mm-dd. */
export function todayIso(now = new Date()): string {
  const tz = (typeof process !== 'undefined' && process.env?.SAKHI_TZ) || 'Asia/Kolkata';
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now); } catch { return now.toISOString().slice(0, 10); }
}

export const dueFromLmp = (lmp: string) => isoOf(dayNum(lmp) + 280);
export const dueFromWeeks = (weeks: number, today = todayIso()) => isoOf(dayNum(today) + Math.round((40 - weeks) * 7));

export interface Gestation { weeks: number; days: number; due: string; daysToDue: number }

/** Weeks and days pregnant today, from the saved due date (or the saved week as a fallback). */
export function gestation(profile: any, today = todayIso()): Gestation {
  const raw = String(profile?.expected_due_date || profile?.due_date || '');
  const due = /^\d{4}-\d{2}-\d{2}/.test(raw) && !isNaN(Date.parse(raw.slice(0, 10)))
    ? raw.slice(0, 10)
    : dueFromWeeks(Number(profile?.weeks_pregnant) || 12, today);
  const daysToDue = dayNum(due) - dayNum(today);
  const ga = Math.max(0, Math.min(44 * 7, 280 - daysToDue));
  return { weeks: Math.max(1, Math.floor(ga / 7)), days: ga % 7, due, daysToDue };
}

/** A profile with weeks_pregnant brought up to today. */
export function withCurrentWeek<T extends Record<string, any> | null>(profile: T, today = todayIso()): T {
  if (!profile) return profile;
  const g = gestation(profile, today);
  return { ...profile, weeks_pregnant: g.weeks, expected_due_date: g.due };
}
