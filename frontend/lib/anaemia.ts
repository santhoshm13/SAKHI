/**
 * Anaemia watch for Her Mode. Low iron is very common among Indian women, and
 * heavy or long periods are the usual cause. This looks at her own check-ins
 * (heavy days, long periods, tiredness, dizziness) and her latest lab results,
 * and says whether a simple blood test is worth asking for. It never diagnoses.
 */
import { bleedingRuns, dayNum, todayNum } from './cyclePhase';
import type { LabResult } from './labs';

export type AnaemiaLevel = 'clear' | 'watch' | 'check' | 'low';

export interface AnaemiaWatch {
  level: AnaemiaLevel;
  headline: string;
  reasons: string[];
  next: string;
  lab: { hb?: LabResult; ferritin?: LabResult };
}

const symptoms = (l: any): string[] => (Array.isArray(l?.symptoms) ? l.symptoms : []).map((s: any) => String(s).toLowerCase());
const SIX_MONTHS = 183;

export const IRON_FOODS = [
  'Ragi, bajra or jowar roti',
  'Rajma, chana, moong and dal',
  'Palak, methi, drumstick leaves',
  'Jaggery, dates, til (sesame)',
  'Eggs, fish, chicken or liver',
  'Amla, guava or lemon with meals helps iron absorb',
];

export function anaemiaWatch(logs: any[], labs: LabResult[], takingIron: boolean): AnaemiaWatch {
  const today = todayNum();
  const recent = (logs || []).filter(l => dayNum(l?.log_date) >= today - 120);
  const heavy = recent.filter(l => /heavy/i.test(String(l.flow_intensity || ''))).length;
  const veryHeavy = recent.filter(l => /very\s*heavy/i.test(String(l.flow_intensity || ''))).length;
  const runs = bleedingRuns(logs || []).filter(r => r.start >= today - 180 && r.end < today - 1);
  const longRuns = runs.filter(r => r.end - r.start + 1 > 7).length;
  const tired = recent.filter(l => symptoms(l).some(s => s.includes('fatigue')) || /tired|fatigued/i.test(String(l.mood || ''))).length;
  const dizzy = recent.filter(l => symptoms(l).some(s => s.includes('dizz') || s.includes('breathless'))).length;

  const fresh = (k: string) => [...(labs || [])]
    .filter(r => r.key === k && dayNum(r.date) >= today - SIX_MONTHS)
    .sort((a, b) => a.date.localeCompare(b.date)).pop();
  const hb = fresh('hb');
  const ferritin = fresh('ferritin');
  const lab = { hb, ferritin };

  const reasons: string[] = [];
  if (heavy) reasons.push(`Heavy flow on ${heavy} day${heavy === 1 ? '' : 's'} in the last 4 months${veryHeavy ? ` (${veryHeavy} very heavy)` : ''}`);
  if (longRuns) reasons.push(`${longRuns} period${longRuns === 1 ? '' : 's'} lasted more than 7 days`);
  if (tired >= 3) reasons.push(`Tired on ${tired} days`);
  if (dizzy) reasons.push(`Dizzy or breathless on ${dizzy} day${dizzy === 1 ? '' : 's'}`);

  const bleedingSign = heavy >= 4 || veryHeavy >= 2 || longRuns >= 2;
  const bodySign = tired >= 5 || dizzy >= 2;

  // A recent lab result outranks guesses from check-ins
  if (hb && Number(hb.value) < 12) {
    const n = Number(hb.value);
    return {
      level: 'low', lab,
      headline: n < 8 ? `Your haemoglobin was ${n} g/dL: quite low.` : `Your haemoglobin was ${n} g/dL: below the healthy 12.`,
      reasons,
      next: n < 8
        ? 'Please see a doctor this week. Iron tablets alone may not be enough at this level.'
        : takingIron
          ? 'Keep taking your iron tablet every day, with lemon water and not with tea, and recheck your haemoglobin in 6 to 8 weeks.'
          : 'Ask your doctor about iron tablets (free at government health centres) and recheck in 6 to 8 weeks.',
    };
  }
  if (ferritin && Number(ferritin.value) < 30) {
    return {
      level: 'low', lab,
      headline: `Your iron stores (ferritin ${ferritin.value}) are low, even if haemoglobin looks fine.`,
      reasons,
      next: 'Iron-rich food helps, and your doctor may suggest an iron tablet for 3 months.',
    };
  }
  if (hb && (!bleedingSign || dayNum(hb.date) >= today - 90)) {
    return {
      level: 'clear', lab, reasons,
      headline: `Your last haemoglobin (${hb.value} g/dL) was in the healthy range.`,
      next: bleedingSign ? 'With heavy periods, a yearly blood count is a good habit.' : 'Nothing to do. Keep eating iron-rich food.',
    };
  }
  if (bleedingSign && bodySign) {
    return {
      level: 'check', lab, reasons,
      headline: 'Heavy periods and tiredness together can mean low iron.',
      next: 'A simple blood test (CBC with haemoglobin, and ferritin) will tell. It costs little and is free at many government health centres.',
    };
  }
  if (bleedingSign || (tired >= 8 && dizzy >= 1)) {
    return {
      level: 'watch', lab, reasons,
      headline: bleedingSign ? 'Your periods are on the heavy side.' : 'You often feel tired.',
      next: 'Keep logging. If you also feel tired, dizzy or breathless, ask for a haemoglobin test.',
    };
  }
  return {
    level: 'clear', lab, reasons,
    headline: recent.length >= 10 ? 'Nothing in your check-ins points to low iron.' : 'Not enough check-ins yet to say.',
    next: 'Log your flow during your period so Sakhi can keep an eye on this.',
  };
}
