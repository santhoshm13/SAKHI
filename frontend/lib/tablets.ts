/**
 * Tablet ledger, the way Indian prescriptions are written: each tablet has
 * slots (morning, afternoon, evening, night; "1-0-1" means morning and night)
 * and a food rule (before food, after food, with food, empty stomach). Each slot
 * is a dose, due at a time worked out from her own meal times. The ledger keeps
 * when each dose was actually taken and whether that was on time, late or
 * missed. Shared by the card, the chat ("took my iron tablet") and the doctor
 * summary.
 */

export type Slot = 'morning' | 'afternoon' | 'evening' | 'night';
export type Food = 'before' | 'after' | 'with' | 'empty' | 'any';

export const SLOTS: Slot[] = ['morning', 'afternoon', 'evening', 'night'];
export const SLOT_LABEL: Record<Slot, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };
export const FOOD_LABEL: Record<Food, string> = {
  before: 'Before food', after: 'After food', with: 'With food', empty: 'Empty stomach', any: 'Any time',
};
const MEAL_OF: Record<Slot, keyof Meals> = { morning: 'breakfast', afternoon: 'lunch', evening: 'snack', night: 'dinner' };

export interface Meals { breakfast: string; lunch: string; snack: string; dinner: string }
export const DEFAULT_MEALS: Meals = { breakfast: '08:30', lunch: '13:30', snack: '17:30', dinner: '20:30' };

export interface Tablet {
  id: string;
  name: string;
  note: string;
  slots: Slot[];
  food: Food;
  since?: string;
  /** older entries had one fixed time */
  time?: string;
}
export interface Dose { id: string; at: string }
export interface TabletsDoc { list: Tablet[]; taken: Record<string, (Dose | string)[]>; meals?: Meals; seeded?: boolean }

export const EMPTY_TABLETS: TabletsDoc = { list: [], taken: {} };

/** Up to an hour after the planned time still counts as on time. */
export const ON_TIME_MIN = 60;
export const KEEP_DAYS = 90;

export const toMin = (hm: string) => {
  const [h, m] = String(hm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};
const toHm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** "1-0-1" style shorthand: morning, afternoon, night. */
export const PATTERNS: { code: string; slots: Slot[] }[] = [
  { code: '1-0-0', slots: ['morning'] },
  { code: '0-1-0', slots: ['afternoon'] },
  { code: '0-0-1', slots: ['night'] },
  { code: '1-0-1', slots: ['morning', 'night'] },
  { code: '1-1-1', slots: ['morning', 'afternoon', 'night'] },
];
export const patternOf = (slots: Slot[]) =>
  slots.includes('evening') ? null : `${slots.includes('morning') ? 1 : 0}-${slots.includes('afternoon') ? 1 : 0}-${slots.includes('night') ? 1 : 0}`;

const slotForTime = (hm: string): Slot => {
  const m = toMin(hm);
  return m < 11 * 60 ? 'morning' : m < 16 * 60 ? 'afternoon' : m < 19 * 60 ? 'evening' : 'night';
};

/** Older tablets had a single `time`; read them as one slot, any time. */
export function normalise(t: Tablet): Tablet {
  if (Array.isArray(t.slots) && t.slots.length) return { ...t, food: t.food || 'any' };
  return { ...t, slots: [slotForTime(t.time || '09:00')], food: 'any' };
}

/** When a dose is due: 30 minutes before or after her meal, at the meal, or 45 minutes before breakfast. */
export function dueTime(slot: Slot, food: Food, meals: Meals = DEFAULT_MEALS, legacy?: string) {
  if (legacy && food === 'any') return legacy;
  const meal = toMin(meals[MEAL_OF[slot]] || DEFAULT_MEALS[MEAL_OF[slot]]);
  if (food === 'before') return toHm(meal - 30);
  if (food === 'after') return toHm(meal + 30);
  if (food === 'empty') return toHm(slot === 'morning' ? toMin(meals.breakfast) - 45 : meal - 60);
  return toHm(meal);
}

export interface Planned { key: string; tablet: Tablet; slot: Slot; time: string }

/** Every dose due in a day, in time order. A dose key is "<tabletId>:<slot>". */
export function plannedDoses(doc: TabletsDoc): Planned[] {
  const meals = { ...DEFAULT_MEALS, ...(doc.meals || {}) };
  return (doc.list || []).map(normalise).flatMap(t =>
    t.slots.map(slot => ({
      key: `${t.id}:${slot}`, tablet: t, slot,
      time: dueTime(slot, t.food, meals, t.slots.length === 1 ? t.time : undefined),
    })),
  ).sort((a, b) => toMin(a.time) - toMin(b.time));
}

/** Older entries were bare ids or used the tablet id as the key. */
export function dosesOn(doc: TabletsDoc, day: string): Dose[] {
  return (doc.taken?.[day] || []).map(d => (typeof d === 'string' ? { id: d, at: '' } : d)).filter(d => d && d.id);
}

export function doseOf(doc: TabletsDoc, day: string, key: string) {
  const all = dosesOn(doc, day);
  const exact = all.find(d => d.id === key);
  if (exact) return exact;
  const [id] = key.split(':');
  const t = doc.list.find(x => x.id === id);
  return t && normalise(t).slots.length === 1 ? all.find(d => d.id === id) || null : null;
}

export type DoseStatus = 'on_time' | 'late' | 'missed' | 'overdue' | 'due' | 'not_started';
export interface DoseState { status: DoseStatus; at: string; lateBy: number }

export function doseState(doc: TabletsDoc, p: Planned, day: string, today: string, nowHm: string): DoseState {
  if (p.tablet.since && day < p.tablet.since) return { status: 'not_started', at: '', lateBy: 0 };
  const dose = doseOf(doc, day, p.key);
  if (dose) {
    const diff = toMin(dose.at) - toMin(p.time);
    if (!dose.at || !Number.isFinite(diff) || diff <= ON_TIME_MIN) return { status: 'on_time', at: dose.at, lateBy: 0 };
    return { status: 'late', at: dose.at, lateBy: diff };
  }
  if (day < today) return { status: 'missed', at: '', lateBy: 0 };
  return toMin(nowHm) > toMin(p.time) + ON_TIME_MIN ? { status: 'overdue', at: '', lateBy: 0 } : { status: 'due', at: '', lateBy: 0 };
}

export const shiftDay = (day: string, by: number) => {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
};

/** Last `days` days (newest first) with each dose's state, and the on-time rate. */
export function ledger(doc: TabletsDoc, today: string, nowHm: string, days = 14) {
  const plan = plannedDoses(doc);
  const rows = Array.from({ length: days }, (_, i) => {
    const day = shiftDay(today, -i);
    return { day, doses: plan.map(p => ({ ...p, ...doseState(doc, p, day, today, nowHm) })) };
  });
  let onTime = 0, late = 0, missed = 0;
  for (const r of rows) for (const d of r.doses) {
    if (d.status === 'on_time') onTime++;
    else if (d.status === 'late') late++;
    else if (d.status === 'missed') missed++;
  }
  const counted = onTime + late + missed;
  return { rows, onTime, late, missed, rate: counted ? Math.round((onTime / counted) * 100) : null };
}

/** Days in a row (ending today, or yesterday if today isn't finished) with every dose taken. */
export function streak(doc: TabletsDoc, today: string) {
  const plan = plannedDoses(doc);
  const all = (day: string) => {
    const due = plan.filter(p => !p.tablet.since || day >= p.tablet.since);
    return due.length > 0 && due.every(p => doseOf(doc, day, p.key));
  };
  let day = all(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (all(day) && n < 365) { n++; day = shiftDay(day, -1); }
  return n;
}

/** Record (or re-time) a dose by key; `at` null removes it. Keeps the last KEEP_DAYS days. */
export function setDose(doc: TabletsDoc, day: string, key: string, at: string | null): TabletsDoc {
  const [id] = key.split(':');
  const doses = dosesOn(doc, day).filter(d => d.id !== key && d.id !== id);
  if (at !== null) doses.push({ id: key, at });
  const taken = Object.fromEntries(
    Object.entries({ ...doc.taken, [day]: doses }).filter(([, v]) => v.length > 0).sort().slice(-KEEP_DAYS),
  );
  return { ...doc, taken };
}

const ALIASES: [RegExp, RegExp][] = [
  [/\b(iron|ifa|ferrous|haem|hem)/i, /iron|ifa|ferrous/i],
  [/\bcalcium|\bcal\b/i, /calcium/i],
  [/\bfolic|\bfolate/i, /folic|ifa/i],
  [/\bthyro|\beltroxin|\bthyronorm|\blevothyrox/i, /thyro|eltroxin|levothyrox/i],
  [/\bvit(amin)?\s*d\b|\bd3\b/i, /vitamin d|vit d|d3/i],
  [/\bmetformin/i, /metformin/i],
];

/** Which of her tablets a chat message means. "my tablets" means all of them. */
export function matchTablets(doc: TabletsDoc, text: string): Tablet[] {
  const s = String(text || '');
  const list = doc.list.map(normalise);
  const byName = list.filter(t => s.toLowerCase().includes(t.name.toLowerCase().split(/[\s(]/)[0]));
  if (byName.length) return byName;
  const hits = new Set<Tablet>();
  for (const [said, name] of ALIASES) if (said.test(s)) list.filter(t => name.test(t.name)).forEach(t => hits.add(t));
  if (hits.size) return [...hits];
  if (/\b(tablets|pills|medicines|meds)\b|\b(all|both|my)\b.*\b(tablet|pill|medicine)\b/i.test(s) && list.length) return list;
  return list.length === 1 ? list : [];
}

const SLOT_WORDS: [RegExp, Slot][] = [
  [/\b(morning|breakfast|subah|savere)\b/i, 'morning'],
  [/\b(afternoon|lunch|dopahar)\b/i, 'afternoon'],
  [/\b(evening|shaam|sham)\b/i, 'evening'],
  [/\b(night|dinner|bedtime|raat|raath)\b/i, 'night'],
];

/**
 * Which dose of a tablet she means: the slot she named, else the untaken dose
 * whose time is nearest to now.
 */
export function pickDose(doc: TabletsDoc, t: Tablet, day: string, text: string, nowHm: string): Planned | null {
  const plan = plannedDoses(doc).filter(p => p.tablet.id === t.id);
  if (!plan.length) return null;
  const named = SLOT_WORDS.find(([re]) => re.test(text))?.[1];
  if (named) return plan.find(p => p.slot === named) || null;
  const open = plan.filter(p => !doseOf(doc, day, p.key));
  const pool = open.length ? open : plan;
  const now = toMin(nowHm);
  return pool.reduce((best, p) => (Math.abs(toMin(p.time) - now) < Math.abs(toMin(best.time) - now) ? p : best));
}

const TOOK = /\b(took|taken|had|swallowed|finished|done with)\b|\b(kha\s*li(ya)?|le\s*li(ya)?|li\s*hai)\b/i;
const MED = /\b(tablets?|pills?|medicines?|meds|iron|ifa|calcium|folic|thyroid|eltroxin|thyronorm|vitamin|d3|metformin|supplements?)\b/i;
const NOT = /\b(not|didn'?t|did not|forgot|forget|haven'?t|have not|missed|skip(ped)?|no)\b/i;

/** "took my iron tablet", "had calcium after lunch": a report that a dose was taken (not a question or a miss). */
export const saysTookTablet = (text: string) => {
  const t = String(text || '');
  return TOOK.test(t) && MED.test(t) && !NOT.test(t) && !/\?\s*$/.test(t.trim()) && !/^\s*(should|can|when|what|how|is|do)\b/i.test(t);
};

/** A time of day in the message: "at 8pm", "at 8:30 am", "at 20:15". */
export function timeInText(text: string): string | null {
  const m = String(text || '').match(/\bat\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = (m[3] || '').toLowerCase().replace(/\./g, '');
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!ap && !m[2]) return null; // "at 8" alone is too vague
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export const fmtHm = (hm: string) => {
  const m = toMin(hm);
  if (!Number.isFinite(m)) return '';
  return new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export const fmtLate = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''} late` : `${m} min late`;
};

/** "Night · after food" */
export const doseLabel = (p: Planned) => `${SLOT_LABEL[p.slot]}${p.tablet.food !== 'any' ? ` · ${FOOD_LABEL[p.tablet.food].toLowerCase()}` : ''}`;
