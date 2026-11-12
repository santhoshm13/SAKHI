/**
 * Lab report values: the tests Sakhi understands, a parser for text read off a
 * report photo, and plain-language checks against the usual ranges (pregnancy
 * ranges when she is pregnant). Shared by the browser and the API, so no
 * server-only imports here.
 */

export type LabKey =
  | 'hb' | 'fasting_sugar' | 'pp_sugar' | 'random_sugar' | 'hba1c' | 'tsh'
  | 'ferritin' | 'platelets' | 'vitamin_d' | 'b12' | 'urine_protein' | 'bp';

export interface LabTest {
  key: LabKey;
  label: string;
  unit: string;
  /** label patterns as they appear on Indian lab reports */
  match: RegExp;
  min?: number;
  max?: number;
  text?: boolean;
}

export const LAB_TESTS: LabTest[] = [
  { key: 'hb', label: 'Haemoglobin', unit: 'g/dL', match: /h(a)?emoglobin|\bhb\b|\bhgb\b/i, min: 3, max: 20 },
  { key: 'fasting_sugar', label: 'Fasting sugar', unit: 'mg/dL', match: /fasting\s*(blood|plasma)?\s*(sugar|glucose)|(sugar|glucose)[\s,(-]*fasting|\bf\.?b\.?s\b|\bfbg\b|\bfpg\b/i, min: 40, max: 500 },
  { key: 'pp_sugar', label: 'Sugar after meal / 2-hour', unit: 'mg/dL', match: /post\s*-?\s*prandial|\bp\.?p\.?b\.?s\b|\bppbs\b|2\s*-?\s*h(ou)?rs?\b.*(sugar|glucose)|(sugar|glucose).*2\s*-?\s*h(ou)?rs?\b|\bogtt\b|glucose\s*challenge/i, min: 40, max: 600 },
  { key: 'random_sugar', label: 'Random sugar', unit: 'mg/dL', match: /random\s*(blood|plasma)?\s*(sugar|glucose)|\br\.?b\.?s\b/i, min: 40, max: 600 },
  { key: 'hba1c', label: 'HbA1c', unit: '%', match: /hba1c|hb\s*a1c|glycated|glycosylated|\ba1c\b/i, min: 3, max: 20 },
  { key: 'tsh', label: 'TSH (thyroid)', unit: 'µIU/mL', match: /\btsh\b|thyroid\s*stimulating/i, min: 0.005, max: 150 },
  { key: 'ferritin', label: 'Ferritin (iron stores)', unit: 'ng/mL', match: /ferritin/i, min: 1, max: 3000 },
  { key: 'platelets', label: 'Platelets', unit: 'thousand/µL', match: /platelet|\bplt\b/i, min: 5, max: 1500 },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'ng/mL', match: /vitamin\s*d|25\s*-?\s*oh|\bvit\.?\s*d\b|cholecalciferol/i, min: 2, max: 200 },
  { key: 'b12', label: 'Vitamin B12', unit: 'pg/mL', match: /\bb\s*-?\s*12\b|cobalamin/i, min: 50, max: 3000 },
  { key: 'urine_protein', label: 'Urine protein', unit: '', match: /urine\s*(albumin|protein)|(albumin|protein)\s*\(?urine|\bu\.?\s*alb/i, text: true },
  { key: 'bp', label: 'Blood pressure', unit: 'mmHg', match: /blood\s*pressure|\bb\.?p\b/i, text: true },
];

export const labTest = (key: string) => LAB_TESTS.find(t => t.key === key);

export interface LabValue { key: LabKey; value: number | string }

const NUM = /(\d+(?:[.,]\d+)?)/g;

/** Platelets come as 2.4 lakh, 240 x10³/µL or 240000: store thousands per µL. */
export function normalisePlatelets(n: number) {
  if (n < 10) return Math.round(n * 100);
  if (n > 2000) return Math.round(n / 1000);
  return Math.round(n);
}

const URINE = /(?<![a-z])(nil|negative|absent|trace|[1-4]\s*\+|\+{1,4})/i;

/** Normalise one value as entered or read. Returns null when it can't be a real result. */
export function cleanValue(key: LabKey, raw: unknown): number | string | null {
  const t = labTest(key);
  if (!t || raw === undefined || raw === null || raw === '') return null;
  const s = String(raw).trim();
  if (key === 'bp') {
    const m = s.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (!m) return null;
    const sys = Number(m[1]), dia = Number(m[2]);
    return sys >= 70 && sys <= 250 && dia >= 40 && dia <= 160 && sys > dia ? `${sys}/${dia}` : null;
  }
  if (key === 'urine_protein') {
    const m = s.match(URINE);
    if (!m) return null;
    const v = m[1].toLowerCase().replace(/\s+/g, '');
    if (/^\++$/.test(v)) return `${v.length}+`;
    return v === 'negative' || v === 'absent' ? 'nil' : v;
  }
  let n = Number(s.replace(',', '.').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || s === '') return null;
  if (key === 'platelets') n = normalisePlatelets(n);
  if ((t.min !== undefined && n < t.min) || (t.max !== undefined && n > t.max)) return null;
  return Math.round(n * 100) / 100;
}

/** First value after a test's label on the same line that falls in a believable range. */
function valueAfter(test: LabTest, rest: string): number | string | null {
  if (test.text) return cleanValue(test.key, rest);
  for (const m of rest.matchAll(NUM)) {
    const v = cleanValue(test.key, m[1]);
    if (v !== null) return v;
  }
  return null;
}

const DATE = /(\d{1,2})[\/.-](\d{1,2}|[a-z]{3,9})[\/.-](\d{2,4})/i;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** A report date like 05/11/2026 or 5-Nov-26 (day first, as Indian labs print). */
export function parseReportDate(text: string): string | null {
  const lines = text.split(/\n/);
  const ordered = [...lines.filter(l => /date|collected|reported|sample/i.test(l)), ...lines];
  for (const line of ordered) {
    const m = line.match(DATE);
    if (!m) continue;
    const d = Number(m[1]);
    const mon = /^\d+$/.test(m[2]) ? Number(m[2]) : MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    if (d < 1 || d > 31 || mon < 1 || mon > 12 || y < 2015 || y > 2100) continue;
    const iso = `${y}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (Date.parse(iso) > Date.now() + 86_400_000) continue;
    return iso;
  }
  return null;
}

/** Pull known tests out of OCR text, one line at a time. */
export function parseLabText(text: string): { values: LabValue[]; reportDate: string | null } {
  const found = new Map<LabKey, number | string>();
  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (const line of lines) {
    // Most specific tests first, so "HbA1c" is not read as haemoglobin
    for (const test of [...LAB_TESTS].sort((a, b) => order(a.key) - order(b.key))) {
      if (found.has(test.key)) continue;
      const m = line.match(test.match);
      if (!m || m.index === undefined) continue;
      if (test.key === 'hb' && /a1c|glycat|glycos/i.test(line)) continue;
      if (test.key === 'bp' && !/\d{2,3}\s*\/\s*\d{2,3}/.test(line)) continue;
      const v = valueAfter(test, line.slice(m.index + m[0].length));
      if (v !== null) { found.set(test.key, v); break; }
    }
  }
  return { values: [...found].map(([key, value]) => ({ key, value })), reportDate: parseReportDate(text) };
}

function order(k: LabKey) {
  return ['hba1c', 'fasting_sugar', 'pp_sugar', 'random_sugar', 'ferritin', 'b12', 'vitamin_d', 'tsh', 'platelets', 'urine_protein', 'bp', 'hb'].indexOf(k);
}

export type LabStatus = 'ok' | 'mild' | 'attention' | 'urgent';
export interface LabCheck { status: LabStatus; note: string }

/**
 * Plain-language reading of one result. Ranges: WHO anaemia cut-offs, IADPSG /
 * DIPSI for pregnancy sugar (DIPSI is the Indian standard), ATA for TSH.
 */
export function checkLab(key: LabKey, value: number | string, pregnant: boolean): LabCheck {
  const n = typeof value === 'number' ? value : Number(value);
  switch (key) {
    case 'hb': {
      const low = pregnant ? 11 : 12;
      if (n < 7) return { status: 'urgent', note: 'Severe anaemia. Please see your doctor within a day or two.' };
      if (n < (pregnant ? 10 : 11)) return { status: 'attention', note: 'Moderate anaemia. Ask your doctor about iron tablets or an iron injection.' };
      if (n < low) return { status: 'mild', note: 'Mild anaemia. Iron-rich food and your iron tablets help; recheck in 4 to 6 weeks.' };
      return { status: 'ok', note: 'In the healthy range.' };
    }
    case 'fasting_sugar':
      if (pregnant) return n >= 92 ? { status: 'attention', note: 'Above the pregnancy limit (92). Show this to your doctor; you may need a glucose test.' } : { status: 'ok', note: 'In the healthy pregnancy range.' };
      if (n >= 126) return { status: 'attention', note: 'In the diabetes range. Please see your doctor to confirm.' };
      if (n >= 100) return { status: 'mild', note: 'A little high (prediabetes range). Worth rechecking with your doctor.' };
      return n < 70 ? { status: 'mild', note: 'On the low side. Eat something if you feel shaky.' } : { status: 'ok', note: 'In the healthy range.' };
    case 'pp_sugar':
      if (pregnant) return n >= 140 ? { status: 'attention', note: 'At or above 140 two hours after glucose, which means gestational diabetes by the DIPSI test used in India. Please see your doctor.' } : { status: 'ok', note: 'Below 140, the healthy pregnancy range.' };
      if (n >= 200) return { status: 'attention', note: 'In the diabetes range. Please see your doctor.' };
      return n >= 140 ? { status: 'mild', note: 'A little high after a meal. Worth discussing with your doctor.' } : { status: 'ok', note: 'In the healthy range.' };
    case 'random_sugar':
      return n >= 200 ? { status: 'attention', note: 'High. Please see your doctor for a proper sugar test.' } : n >= 140 ? { status: 'mild', note: 'A bit high for a random reading. A fasting test will tell more.' } : { status: 'ok', note: 'In the usual range.' };
    case 'hba1c':
      if (n >= 6.5) return { status: 'attention', note: 'In the diabetes range. Please see your doctor.' };
      if (n >= (pregnant ? 6 : 5.7)) return { status: 'mild', note: 'A little high. Ask your doctor whether to follow up.' };
      return { status: 'ok', note: 'In the healthy range.' };
    case 'tsh': {
      const hi = pregnant ? 4 : 4.5;
      if (n > 10) return { status: 'attention', note: 'Clearly high (underactive thyroid). Please see your doctor.' };
      if (n > hi) return { status: 'attention', note: pregnant ? 'High for pregnancy. Your doctor may start or adjust thyroid tablets.' : 'High (underactive thyroid). Show this to your doctor.' };
      if (n < 0.1) return { status: 'mild', note: 'Low (overactive thyroid possible). Show this to your doctor.' };
      return { status: 'ok', note: 'In the healthy range.' };
    }
    case 'ferritin':
      if (n < 15) return { status: 'attention', note: 'Iron stores are empty. Ask your doctor about iron treatment.' };
      if (n < 30) return { status: 'mild', note: 'Iron stores are low. Iron-rich food and tablets help.' };
      return { status: 'ok', note: 'Iron stores look fine.' };
    case 'platelets':
      if (n < 100) return { status: 'urgent', note: 'Platelets are low. Please contact your doctor soon.' };
      if (n < 150) return { status: 'mild', note: 'Slightly low. Mention it at your next visit.' };
      return n > 450 ? { status: 'mild', note: 'A little high. Mention it at your next visit.' } : { status: 'ok', note: 'In the healthy range.' };
    case 'vitamin_d':
      return n < 20 ? { status: 'attention', note: 'Deficient. Ask your doctor about a vitamin D supplement.' } : n < 30 ? { status: 'mild', note: 'A bit low. Morning sunlight and a supplement help.' } : { status: 'ok', note: 'In the healthy range.' };
    case 'b12':
      return n < 200 ? { status: 'attention', note: 'Low B12, common in vegetarian diets. Ask your doctor about a supplement.' } : n < 300 ? { status: 'mild', note: 'Borderline. Dairy, curd and eggs help.' } : { status: 'ok', note: 'In the healthy range.' };
    case 'urine_protein': {
      const v = String(value);
      if (v === 'nil') return { status: 'ok', note: 'No protein in urine.' };
      if (v === 'trace') return { status: 'mild', note: 'A trace of protein. Usually fine; mention it at your visit.' };
      return pregnant
        ? { status: 'urgent', note: 'Protein in urine during pregnancy can be a sign of preeclampsia. Please contact your doctor today.' }
        : { status: 'attention', note: 'Protein in urine. Please show this to your doctor.' };
    }
    case 'bp': {
      const [s, d] = String(value).split('/').map(Number);
      if (s >= 160 || d >= 110) return { status: 'urgent', note: 'Very high. Please contact your doctor or go to hospital now.' };
      if (s >= 140 || d >= 90) return { status: 'attention', note: 'High blood pressure. Please contact your doctor today.' };
      return s < 90 || d < 60 ? { status: 'mild', note: 'On the low side. Sit or lie down if you feel dizzy.' } : { status: 'ok', note: 'In the healthy range.' };
    }
  }
}

export const formatLab = (key: LabKey, value: number | string) => {
  const t = labTest(key);
  return `${value}${t?.unit ? ' ' + t.unit : ''}`;
};

export interface LabResult { date: string; key: LabKey; value: number | string; source: 'photo' | 'manual' }

/** Latest result for each test. */
export function latestLabs(results: LabResult[]): Partial<Record<LabKey, LabResult>> {
  const out: Partial<Record<LabKey, LabResult>> = {};
  for (const r of [...(results || [])].sort((a, b) => a.date.localeCompare(b.date))) out[r.key] = r;
  return out;
}
