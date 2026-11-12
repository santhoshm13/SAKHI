/**
 * After the birth: baby's vaccines (India's Universal Immunisation Programme),
 * feeds and diapers, and the mother's recovery with its warning signs.
 */

export interface Feed { at: string; kind: 'left' | 'right' | 'bottle'; minutes?: number }
export interface Diaper { at: string; kind: 'wet' | 'dirty' }
export interface Recovery {
  date: string;
  bleeding: 'none' | 'light' | 'moderate' | 'heavy' | 'clots';
  fever: boolean;
  pain: number;
  breast: boolean;
  wound: boolean;
  headache: boolean;
  calf: boolean;
  breathless: boolean;
  smell: boolean;
}
export interface PostpartumDoc {
  birth_date?: string;
  baby_name?: string;
  delivery?: 'normal' | 'csection';
  feeds: Feed[];
  diapers: Diaper[];
  recovery: Recovery[];
  vaccines_done: string[];
}
export const EMPTY_POSTPARTUM: PostpartumDoc = { feeds: [], diapers: [], recovery: [], vaccines_done: [] };

/** UIP schedule (MoHFW), by age in weeks from birth. */
export const VACCINES: { id: string; due: string; weeks: number; items: string }[] = [
  { id: 'birth', due: 'At birth', weeks: 0, items: 'BCG, OPV-0, Hepatitis B birth dose' },
  { id: 'w6', due: '6 weeks', weeks: 6, items: 'OPV-1, Pentavalent-1, Rotavirus-1, fIPV-1, PCV-1' },
  { id: 'w10', due: '10 weeks', weeks: 10, items: 'OPV-2, Pentavalent-2, Rotavirus-2' },
  { id: 'w14', due: '14 weeks', weeks: 14, items: 'OPV-3, Pentavalent-3, Rotavirus-3, fIPV-2, PCV-2' },
  { id: 'm9', due: '9 months', weeks: 39, items: 'MR-1, PCV booster, JE-1 (where given), Vitamin A' },
  { id: 'm16', due: '16 to 24 months', weeks: 69, items: 'MR-2, DPT booster-1, OPV booster, JE-2 (where given)' },
];

const DAY = 86_400_000;
export const ageDays = (birth: string, today: string) => Math.max(0, Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(birth + 'T00:00:00Z')) / DAY));

export function babyAge(birth: string, today: string) {
  const d = ageDays(birth, today);
  if (d < 14) return `${d} day${d === 1 ? '' : 's'} old`;
  if (d < 90) return `${Math.floor(d / 7)} weeks old`;
  return `${Math.floor(d / 30.4)} months old`;
}

export const dueDate = (birth: string, weeks: number) => new Date(Date.parse(birth + 'T00:00:00Z') + weeks * 7 * DAY).toISOString().slice(0, 10);

/** The next vaccine visit not yet marked done, and whether it's overdue. */
export function nextVaccine(doc: PostpartumDoc, today: string) {
  if (!doc.birth_date) return null;
  const v = VACCINES.find(x => !doc.vaccines_done.includes(x.id));
  if (!v) return null;
  const date = dueDate(doc.birth_date, v.weeks);
  return { ...v, date, overdue: date < today, daysAway: Math.round((Date.parse(date) - Date.parse(today)) / DAY) };
}

/** Today's feeds and diapers, and time since the last feed. */
export function babyToday(doc: PostpartumDoc, now: Date) {
  const day = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const local = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); };
  const feeds = doc.feeds.filter(f => local(f.at) === day);
  const wet = doc.diapers.filter(d => local(d.at) === day && d.kind === 'wet').length;
  const dirty = doc.diapers.filter(d => local(d.at) === day && d.kind === 'dirty').length;
  const last = [...doc.feeds].sort((a, b) => a.at.localeCompare(b.at)).pop();
  const sinceMin = last ? Math.round((now.getTime() - new Date(last.at).getTime()) / 60_000) : null;
  const lastSide = [...doc.feeds].filter(f => f.kind !== 'bottle').sort((a, b) => a.at.localeCompare(b.at)).pop()?.kind;
  return { feeds: feeds.length, wet, dirty, sinceMin, nextSide: lastSide === 'left' ? 'right' : lastSide === 'right' ? 'left' : null, lastFeed: last || null };
}

export interface RecoveryCheck { level: 'ok' | 'doctor' | 'emergency'; reasons: string[]; alertReason: string | null }

/** Warning signs after birth (WHO / MoHFW postnatal danger signs). */
export function checkRecovery(r: Recovery, delivery?: string): RecoveryCheck {
  const urgent: string[] = [];
  const soon: string[] = [];
  if (r.bleeding === 'heavy' || r.bleeding === 'clots') urgent.push(r.bleeding === 'clots' ? 'Bleeding with large clots' : 'Heavy bleeding (a pad soaked in an hour)');
  if (r.headache) urgent.push('Severe headache or blurred vision (can be high BP after birth)');
  if (r.breathless) urgent.push('Chest pain or trouble breathing');
  if (r.calf) urgent.push('Pain or swelling in one leg (possible clot)');
  if (r.fever) soon.push('Fever');
  if (r.smell) soon.push('Bad-smelling discharge');
  if (r.breast) soon.push('A hard, red or painful area in the breast');
  if (r.wound) soon.push(delivery === 'csection' ? 'Stitches red, swollen or leaking' : 'Stitches very painful or leaking');
  if (r.pain >= 7) soon.push(`Pain ${r.pain}/10`);
  if (urgent.length) return { level: 'emergency', reasons: [...urgent, ...soon], alertReason: urgent[0].startsWith('Heavy') || urgent[0].startsWith('Bleeding') ? 'heavy-bleeding' : urgent[0].startsWith('Severe') ? 'preeclampsia-signs' : 'clot-signs' };
  if (r.fever && (r.smell || r.wound || r.breast)) return { level: 'doctor', reasons: soon, alertReason: 'infection-signs' };
  if (soon.length) return { level: 'doctor', reasons: soon, alertReason: null };
  return { level: 'ok', reasons: [], alertReason: null };
}

/**
 * How long the baby view lasts, and what it shows:
 *  - recovery (0–6 weeks): daily recovery check, feeds, vaccines
 *  - infant (6 weeks–6 months): feeds, vaccines, periods-coming-back card
 *  - older (6 months–2 years): vaccines and solids; feed log tucked away
 *  - done (after 2 years, last UIP visit): Sakhi suggests going back to Her Mode
 */
export type PostpartumStage = 'recovery' | 'infant' | 'older' | 'done';
export function stageOf(days: number): PostpartumStage {
  if (days <= 42) return 'recovery';
  if (days <= 182) return 'infant';
  if (days <= 730) return 'older';
  return 'done';
}
/** "Back to pregnancy view" is only for a mistaken tap, so it goes after 2 weeks. */
export const UNDO_DAYS = 14;
