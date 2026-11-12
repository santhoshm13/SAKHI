/**
 * Weight tracking shared by Her Mode and Mom Mode.
 *  - merges weights from the weight log and from check-ins / chat logs
 *  - trend: change over 7 and 30 days, smoothed so day-to-day water shifts don't alarm
 *  - pregnancy: the healthy total-gain range by pre-pregnancy BMI (IOM 2009 guidance),
 *    converted into an expected range for her current week
 */

export interface WeightPoint { date: string; day: number; kg: number }

const DAY = 86_400_000;
const dayOf = (d: string) => Math.floor(Date.parse(String(d).slice(0, 10) + 'T00:00:00Z') / DAY);
export const isoOfDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

/** One point per day (the manual entry wins over a check-in on the same day). */
export function weightSeries(manual: any[], logs: any[]): WeightPoint[] {
  const byDay = new Map<number, WeightPoint>();
  const add = (date: any, kg: any) => {
    const w = Number(kg);
    const day = dayOf(String(date || ''));
    if (!Number.isFinite(w) || w < 25 || w > 250 || isNaN(day)) return;
    byDay.set(day, { date: isoOfDay(day), day, kg: Math.round(w * 10) / 10 });
  };
  (logs || []).forEach(l => l && l.weight !== null && l.weight !== undefined && add(l.log_date, l.weight));
  (manual || []).forEach(m => m && add(m.date, m.kg));
  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

/** Average of the points within `days` days of `day`, to smooth water-weight noise. */
function around(series: WeightPoint[], day: number, days = 3): number | null {
  const near = series.filter(p => Math.abs(p.day - day) <= days);
  if (!near.length) return null;
  return near.reduce((a, p) => a + p.kg, 0) / near.length;
}

export interface WeightStats {
  latest: WeightPoint | null;
  first: WeightPoint | null;
  change7: number | null;
  change30: number | null;
  sinceFirst: number | null;
  /** kg per week over the last 4 weeks (least squares) */
  perWeek: number | null;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function weightStats(series: WeightPoint[]): WeightStats {
  if (!series.length) return { latest: null, first: null, change7: null, change30: null, sinceFirst: null, perWeek: null };
  const latest = series[series.length - 1];
  const first = series[0];
  const now = around(series, latest.day, 2) ?? latest.kg;
  const past = (d: number) => {
    const target = latest.day - d;
    const has = series.some(p => p.day <= target + 3 && p.day >= target - 7);
    const v = has ? around(series.filter(p => p.day <= target + 3), target, 4) : null;
    return v === null ? null : r1(now - v);
  };
  const recent = series.filter(p => p.day >= latest.day - 28);
  let perWeek: number | null = null;
  if (recent.length >= 4 && recent[recent.length - 1].day - recent[0].day >= 10) {
    const n = recent.length;
    const mx = recent.reduce((a, p) => a + p.day, 0) / n;
    const my = recent.reduce((a, p) => a + p.kg, 0) / n;
    const slope = recent.reduce((a, p) => a + (p.day - mx) * (p.kg - my), 0) / recent.reduce((a, p) => a + (p.day - mx) ** 2, 0);
    perWeek = Math.round(slope * 7 * 100) / 100;
  }
  return { latest, first, change7: past(7), change30: past(30), sinceFirst: series.length > 1 ? r1(latest.kg - first.kg) : null, perWeek };
}

export const bmi = (kg: number, heightCm: number) => (heightCm > 0 ? r1(kg / (heightCm / 100) ** 2) : null);

export interface GainGuide {
  category: 'under' | 'healthy' | 'over' | 'obese';
  label: string;
  total: [number, number];
  /** weekly rate in the 2nd and 3rd trimesters */
  weekly: [number, number];
}

/** IOM 2009 total gain ranges by pre-pregnancy BMI (singleton pregnancy). */
export function gainGuide(preKg: number, heightCm: number): GainGuide | null {
  const b = bmi(preKg, heightCm);
  if (!b) return null;
  if (b < 18.5) return { category: 'under', label: 'below the healthy range', total: [12.5, 18], weekly: [0.44, 0.58] };
  if (b < 25) return { category: 'healthy', label: 'in the healthy range', total: [11.5, 16], weekly: [0.35, 0.5] };
  if (b < 30) return { category: 'over', label: 'above the healthy range', total: [7, 11.5], weekly: [0.23, 0.33] };
  return { category: 'obese', label: 'well above the healthy range', total: [5, 9], weekly: [0.17, 0.27] };
}

/** Expected gain range (kg above pre-pregnancy weight) at a given week. */
export function expectedGainAt(week: number, g: GainGuide): [number, number] {
  const w = Math.max(0, Math.min(42, week));
  // About 0.5–2 kg in the first trimester, then a steady weekly rate
  if (w <= 13) return [r1(0.5 * (w / 13)), r1(2 * (w / 13))];
  return [r1(0.5 + (w - 13) * g.weekly[0]), r1(2 + (w - 13) * g.weekly[1])];
}

/** Pregnancy week on a given day, from today's week. */
export const weekOnDay = (day: number, weeksToday: number, today = Math.floor(Date.now() / DAY)) =>
  weeksToday - (today - day) / 7;

export type GainStatus = 'below' | 'within' | 'above';

export function gainStatus(gain: number, range: [number, number]): GainStatus {
  if (gain < range[0] - 1) return 'below';
  if (gain > range[1] + 1) return 'above';
  return 'within';
}
