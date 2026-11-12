/**
 * Her Mode goals beyond period tracking: trying to conceive (fertile window,
 * folic acid, when to see a doctor) and perimenopause (symptom log and the
 * signs that need a check-up).
 */
export type HerGoal = 'track' | 'ttc' | 'peri';

export interface PeriDay { date: string; flashes: number; sweats: boolean; sleep: boolean; mood: boolean; dryness: boolean; joints: boolean }
export interface GoalDoc {
  goal: HerGoal;
  ttc_since?: string;         // month she started trying, yyyy-mm
  over35?: boolean;
  folic?: boolean;            // taking folic acid
  intimacy: string[];         // days, optional
  peri: PeriDay[];
  tests?: { date: string; result: 'positive' | 'negative' }[];
}
export const EMPTY_GOAL: GoalDoc = { goal: 'track', intimacy: [], peri: [] };

const DAY = 86_400_000;
const num = (d: string) => Math.floor(Date.parse(d + 'T00:00:00Z') / DAY);

/** Months she has been trying, from "yyyy-mm". */
export function monthsTrying(since: string | undefined, today: string): number | null {
  if (!since || !/^\d{4}-\d{2}$/.test(since)) return null;
  const [y, m] = since.split('-').map(Number);
  const [ty, tm] = today.split('-').map(Number);
  return Math.max(0, (ty - y) * 12 + (tm - m));
}

/** When to see a doctor (NICE / FOGSI): 12 months, 6 if 35+, at once with irregular cycles or PCOS. */
export function ttcAdvice(doc: GoalDoc, today: string, irregular: boolean): { seeDoctor: boolean; text: string } {
  const months = monthsTrying(doc.ttc_since, today);
  if (irregular) return { seeDoctor: true, text: 'With irregular cycles or PCOS, see a gynaecologist now rather than waiting a year. Ovulation may need checking.' };
  const limit = doc.over35 ? 6 : 12;
  if (months !== null && months >= limit) return { seeDoctor: true, text: `You've been trying for ${months} months. It's a good time for both of you to see a doctor. It's common and very often treatable.` };
  if (months !== null) return { seeDoctor: false, text: `Most couples conceive within a year. If it hasn't happened by ${limit} months${doc.over35 ? ' (35 and over)' : ''}, see a doctor together.` };
  return { seeDoctor: false, text: `Most couples conceive within a year of trying. See a doctor after 12 months, or after 6 months if you are 35 or older.` };
}

export const PERI_SIGNS: { key: keyof Omit<PeriDay, 'date' | 'flashes'>; label: string }[] = [
  { key: 'sweats', label: 'Night sweats' },
  { key: 'sleep', label: 'Poor sleep' },
  { key: 'mood', label: 'Low mood or irritable' },
  { key: 'dryness', label: 'Vaginal dryness' },
  { key: 'joints', label: 'Joint aches' },
];

/** Last 30 days: average hot flashes and how often each sign came up. */
export function periSummary(days: PeriDay[], today: string) {
  const from = num(today) - 29;
  const recent = days.filter(d => num(d.date) >= from);
  const flashes = recent.length ? recent.reduce((s, d) => s + (d.flashes || 0), 0) / recent.length : 0;
  const counts = PERI_SIGNS.map(s => ({ ...s, days: recent.filter(d => d[s.key]).length }));
  return { logged: recent.length, flashesPerDay: Math.round(flashes * 10) / 10, counts };
}

/** Bleeding after a year without periods always needs a doctor. */
export function periRedFlags(daysSincePeriod: number | null): string | null {
  if (daysSincePeriod !== null && daysSincePeriod >= 365) return "Your last logged period was over a year ago. If that's right, any bleeding from now on, even spotting, needs a doctor's check.";
  return null;
}
