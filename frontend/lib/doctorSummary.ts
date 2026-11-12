/**
 * Builds the one-page doctor-visit brief from a user's stored data.
 * Everything here is descriptive statistics plus the same risk screens the
 * dashboards show, so a clinician sees the pattern without reading raw logs.
 */
import { Owner, readDoc } from '@/lib/store';
import { runPrediction } from '@/lib/ml/client';
import { checkLab, formatLab, labTest, latestLabs, type LabResult } from '@/lib/labs';
import { EMPTY_TABLETS, FOOD_LABEL, SLOT_LABEL, ledger, normalise, patternOf, type TabletsDoc } from '@/lib/tablets';
import { localNow } from '@/lib/tabletChat';
import { detectPeriodStarts } from '@/lib/cyclePhase';

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().split('T')[0];
const dayOf = (v: any) => String(v || '').split('T')[0];
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);
const fmtShort = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function countBy(values: string[]) {
  const counts: Record<string, number> = {};
  for (const v of values) if (v && v !== 'None') counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

function windowOf(logs: any[], days: number) {
  const since = Date.now() - days * DAY;
  return logs.filter(l => {
    const t = new Date(l?.log_date).getTime();
    return !isNaN(t) && t >= since;
  });
}

/** Latest result of each lab test (last 12 months), with a plain-language check. */
async function labSection(owner: Owner, pregnant: boolean) {
  const results = await readDoc<LabResult[]>('lab_results', [], owner);
  const since = iso(new Date(Date.now() - 365 * DAY));
  const latest = Object.values(latestLabs((Array.isArray(results) ? results : []).filter(r => r.date >= since))) as LabResult[];
  return latest.map(r => {
    const c = checkLab(r.key, r.value, pregnant);
    return { key: r.key, label: labTest(r.key)?.label || r.key, value: formatLab(r.key, r.value), date: r.date, status: c.status, note: c.note };
  });
}

/** Latest mood check in the last 30 days, as a flag for the doctor. */
async function moodFlag(owner: Owner): Promise<string | null> {
  const doc = await readDoc<any>('mood_checks', null, owner);
  const since = iso(new Date(Date.now() - 30 * DAY));
  const last = (Array.isArray(doc?.checks) ? doc.checks : []).filter((c: any) => c.date >= since).sort((a: any, b: any) => a.date.localeCompare(b.date)).pop();
  if (!last) return null;
  if (last.harm) return `Mood check ${fmtShort(last.date)}: reported thoughts of self-harm. Please ask about this.`;
  if (last.total >= 6) return `Mood check ${fmtShort(last.date)}: PHQ-4 score ${last.total}/12 (anxiety ${last.anx}/6, low mood ${last.dep}/6).`;
  return null;
}

/** How regularly each tablet was taken over the last 30 days. */
async function tabletSection(owner: Owner) {
  const stored = await readDoc<TabletsDoc>('tablets', EMPTY_TABLETS, owner);
  const doc: TabletsDoc = stored && Array.isArray(stored.list) ? { ...EMPTY_TABLETS, ...stored } : EMPTY_TABLETS;
  if (!doc.list.length) return null;
  const { day } = localNow();
  // Judge only finished days, so tonight's dose isn't counted as missed yet
  const book = ledger(doc, day, '00:00', 31);
  const past = book.rows.filter(r => r.day < day);
  const rows = doc.list.map(normalise).map(t => {
    let onTime = 0, late = 0, missed = 0;
    for (const r of past) for (const d of r.doses) if (d.tablet.id === t.id) {
      if (d.status === 'on_time') onTime++; else if (d.status === 'late') late++; else if (d.status === 'missed') missed++;
    }
    return {
      name: t.name,
      schedule: `${patternOf(t.slots) ?? t.slots.map(s => SLOT_LABEL[s]).join(', ')}${t.food !== 'any' ? `, ${FOOD_LABEL[t.food].toLowerCase()}` : ''}`,
      onTime, late, missed,
    };
  });
  const total = rows.reduce((n, r) => n + r.onTime + r.late + r.missed, 0);
  const taken = rows.reduce((n, r) => n + r.onTime + r.late, 0);
  return { rows, takenRate: total ? Math.round((taken / total) * 100) : null, days: 30 };
}

/** Month by month: cycles, bleeding and the signs a doctor weighs for PCOS. */
async function pcosPattern(owner: Owner, profile: any, logs: any[], history: any[]) {
  const weightDoc = await readDoc<any>('weight_log', null, owner);
  const weights: { date: string; kg: number }[] = Array.isArray(weightDoc?.entries) ? weightDoc.entries : [];
  const starts = detectPeriodStarts(logs, profile?.last_period_start, (history || []).map((h: any) => h?.start)).sort((a, b) => a - b);
  const months: { month: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) });
  }
  const sym = (l: any, re: RegExp) => (Array.isArray(l?.symptoms) ? l.symptoms : []).some((s: any) => re.test(String(s)));
  const rows = months.map(({ month, label }) => {
    const inMonth = logs.filter(l => dayOf(l.log_date).startsWith(month));
    const monthStarts = starts.filter(s => new Date(s * DAY).toISOString().startsWith(month));
    const lengths = monthStarts.map(s => { const next = starts.find(x => x > s); return next ? next - s : null; }).filter((n): n is number => n !== null);
    const kg = weights.filter(w => String(w.date).startsWith(month)).map(w => Number(w.kg)).filter(n => n > 0);
    return {
      label,
      periodStarted: monthStarts.length > 0,
      cycleLength: lengths.length ? lengths[0] : null,
      bleedDays: inMonth.filter(l => /light|moderate|medium|heavy/i.test(String(l.flow_intensity || ''))).length,
      acneDays: inMonth.filter(l => sym(l, /acne/i)).length,
      hairGrowthDays: inMonth.filter(l => sym(l, /hair growth/i)).length,
      hairLossDays: inMonth.filter(l => sym(l, /hair loss/i)).length,
      weight: kg.length ? r1(mean(kg)) : null,
      checkIns: inMonth.length,
    };
  });
  // Longest gap between periods in the last 6 months (including the current wait)
  const today = Math.floor(Date.now() / DAY);
  const recent = starts.filter(x => x >= today - 183);
  const marks = [...recent, today];
  let longestGap = 0;
  for (let i = 1; i < marks.length; i++) longestGap = Math.max(longestGap, marks[i] - marks[i - 1]);
  return { rows, longestGap: recent.length ? longestGap : null };
}

export async function buildHerSummary(owner: Owner, days = 90) {
  const [profile, allLogs, history] = await Promise.all([
    readDoc<any>('her_profile', null, owner),
    readDoc<any[]>('daily_logs', [], owner),
    readDoc<any[]>('cycle_history', [], owner),
  ]);
  const logs = windowOf(Array.isArray(allLogs) ? allLogs : [], days)
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

  const cramps = logs.map(l => Number(l.cramps_severity)).filter(n => !isNaN(n) && n > 0);
  const sleep = logs.map(l => Number(l.sleep_hours)).filter(n => !isNaN(n) && n > 0);
  const flows = logs.map(l => String(l.flow_intensity || 'None'));
  const symptoms = countBy(logs.flatMap(l => (Array.isArray(l.symptoms) ? l.symptoms : [])));
  const moods = countBy(logs.map(l => String(l.mood || '')));
  const heavyDays = flows.filter(f => /heavy/i.test(f)).length;
  const severeCrampDays = cramps.filter(c => c >= 7).length;

  const cycleLengths = (Array.isArray(history) ? history : [])
    .map((h: any) => Number(h.cycleLength)).filter(n => n >= 10 && n <= 120);
  const regularity = profile?.cycle_regularity === 'No' || profile?.cycle_regularity === 'Irregular' ? 0 : 1;
  const has = (word: string) => logs.some(l => (l.symptoms || []).some((s: string) => String(s).toLowerCase().includes(word)));

  const [cycle, pcos, thyroid] = await Promise.all([
    profile?.last_period_start
      ? runPrediction('cycle', {
          last_period_date: dayOf(profile.last_period_start),
          cycle_length_avg: Number(profile.cycle_length || profile.cycle_length_avg) || 28,
          ...(cycleLengths.length ? { cycle_lengths: cycleLengths } : {}),
        }).catch(() => null)
      : null,
    runPrediction('pcos', {
      cycle_regularity: regularity,
      cycle_length: Number(profile?.cycle_length) || undefined,
      acne_severity: has('acne') ? 6 : 0,
      hair_growth: has('hair growth'),
      skin_darkening: has('skin darkening'),
      weight_gain: has('weight gain'),
    }).catch(() => null),
    runPrediction('thyroid', {
      fatigue_severity: has('fatigue') ? 7 : 2,
      heavy_or_prolonged_flow: heavyDays > 0 || Number(profile?.period_duration) > 7 ? 1 : 0,
      cycle_regularity: regularity,
      weight_gain: has('weight gain'),
      hair_loss: has('hair loss'),
    }).catch(() => null),
  ]);

  const flags: string[] = [];
  if (severeCrampDays > 0) flags.push(`${severeCrampDays} day(s) with cramps rated 7/10 or higher`);
  if (heavyDays > 0) flags.push(`${heavyDays} day(s) of heavy flow`);
  for (const f of [...(cycle?.clinical_flags || []), ...(pcos?.clinical_flags || []), ...(thyroid?.clinical_flags || [])]) {
    if (!flags.includes(f)) flags.push(f);
  }

  const [herLabs, herTablets, pattern] = await Promise.all([
    labSection(owner, false),
    tabletSection(owner),
    pcosPattern(owner, profile, Array.isArray(allLogs) ? allLogs : [], Array.isArray(history) ? history : []),
  ]);
  for (const l of herLabs) if (l.status === 'attention' || l.status === 'urgent') flags.push(`${l.label} ${l.value} (${fmtShort(l.date)}): ${l.note}`);
  const herMood = await moodFlag(owner);
  if (herMood) flags.push(herMood);
  if (pattern.longestGap && pattern.longestGap > 45) flags.push(`A gap of ${pattern.longestGap} days between periods in the last 6 months`);

  const questions: string[] = [];
  if (severeCrampDays > 0) questions.push('My cramps are often 7/10 or worse. Could this be endometriosis or another cause, and what can help?');
  if (pcos?.criteria_met >= 1) questions.push('I have signs that can be linked to PCOS. Should I have an ultrasound or hormone tests?');
  if ((thyroid?.risk_level === 'Moderate') || (thyroid?.risk_level === 'High')) questions.push('Should I get a TSH (thyroid) blood test?');
  if (heavyDays > 2) questions.push('My periods are heavy. Should I be checked for anaemia (haemoglobin / ferritin)?');
  if (cycle && cycle.is_regular === 0) questions.push('My cycles are irregular. What could be causing this?');
  if (questions.length === 0) questions.push('Is there anything in this pattern you would like me to keep tracking?');

  return {
    kind: 'her' as const,
    generatedAt: new Date().toISOString(),
    period: { days, from: logs[0] ? dayOf(logs[0].log_date) : null, to: logs.length ? dayOf(logs[logs.length - 1].log_date) : null },
    patient: {
      name: profile?.preferred_name || owner.name || 'Patient',
      diagnosedConditions: profile?.diagnosed_conditions || [],
      goal: profile?.primary_goal || null,
    },
    cycle: {
      lastPeriodStart: profile?.last_period_start ? dayOf(profile.last_period_start) : null,
      reportedCycleLength: Number(profile?.cycle_length || profile?.cycle_length_avg) || null,
      reportedPeriodDuration: Number(profile?.period_duration) || null,
      regularity: profile?.cycle_regularity || null,
      history: Array.isArray(history) ? history : [],
      prediction: cycle,
    },
    stats: {
      checkIns: logs.length,
      avgCramps: r1(mean(cramps)),
      maxCramps: cramps.length ? Math.max(...cramps) : null,
      severeCrampDays,
      heavyDays,
      avgSleep: r1(mean(sleep)),
      flow: countBy(flows),
      symptoms,
      moods,
    },
    screens: { pcos, thyroid },
    labs: herLabs,
    tablets: herTablets,
    pcosPattern: pattern,
    flags,
    questions,
    recentLogs: logs.slice(-14),
  };
}

export async function buildPregnancySummary(owner: Owner, days = 90) {
  const [profile, allLogs, appointments, nutrition] = await Promise.all([
    readDoc<any>('preg_profile', null, owner),
    readDoc<any[]>('pregnancy_logs', [], owner),
    readDoc<any[]>('pregnancy_appointments', [], owner),
    readDoc<any>('pregnancy_nutrition', null, owner),
  ]);
  const logs = windowOf(Array.isArray(allLogs) ? allLogs : [], days)
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

  const bp = logs
    .filter(l => l.blood_pressure_systolic && l.blood_pressure_diastolic)
    .map(l => ({ date: dayOf(l.log_date), systolic: Number(l.blood_pressure_systolic), diastolic: Number(l.blood_pressure_diastolic) }));
  const sugar = logs.filter(l => Number(l.blood_sugar) > 0).map(l => ({ date: dayOf(l.log_date), value: Number(l.blood_sugar) }));
  const kicks = logs.map(l => Number(l.baby_movement)).filter(n => !isNaN(n) && n > 0);
  const weights = logs.filter(l => Number(l.weight) > 0).map(l => ({ date: dayOf(l.log_date), value: Number(l.weight) }));
  const symptoms = countBy(logs.flatMap(l => (Array.isArray(l.symptoms) ? l.symptoms : [])));

  const conditions: string[] = profile?.maternal_conditions || [];
  const hypertensionHistory = conditions.some(c => /pressure|hypertension/i.test(c));
  const diabetesHistory = conditions.some(c => /diabetes|sugar/i.test(c));
  const latestBp = bp[bp.length - 1];
  const latestSugar = sugar[sugar.length - 1];

  // Only score readings she logged; with none, the report says "not scored"
  // rather than printing a risk level built on stand-in normal values.
  const notScored = (reason: string) => ({ not_scored: true, reason });
  const [preeclampsia, gdm] = await Promise.all([
    latestBp
      ? runPrediction('preeclampsia', {
          systolic: latestBp.systolic,
          diastolic: latestBp.diastolic,
          hypertension_history: hypertensionHistory ? 1 : 0,
          ...(latestSugar ? { blood_sugar: latestSugar.value } : {}),
          symptoms: logs.slice(-3).flatMap(l => l.symptoms || []),
        }).catch(() => null)
      : notScored('No blood pressure readings logged in this period.'),
    latestSugar
      ? runPrediction('gdm', {
          blood_sugar: latestSugar.value,
          diabetes_history: diabetesHistory ? 1 : 0,
        }).catch(() => null)
      : notScored('No blood sugar readings logged in this period.'),
  ]) as any[];

  const highBp = bp.filter(b => b.systolic >= 140 || b.diastolic >= 90);
  const highSugar = sugar.filter(s => s.value >= 140);
  const flags: string[] = [];
  if (highBp.length) flags.push(`${highBp.length} BP reading(s) at or above 140/90 (highest ${Math.max(...highBp.map(b => b.systolic))}/${Math.max(...highBp.map(b => b.diastolic))})`);
  if (highSugar.length) flags.push(`${highSugar.length} glucose reading(s) at or above 140 mg/dL`);
  if (kicks.length && Math.min(...kicks) < 10 && Number(profile?.weeks_pregnant) >= 28) flags.push('Some days with fewer than 10 recorded movements');
  for (const s of ['Swelling', 'Headache', 'Blurred Vision', 'Dizziness']) {
    const hit = symptoms.find(x => x.label === s);
    if (hit) flags.push(`${s} reported on ${hit.count} day(s)`);
  }
  for (const f of [...(preeclampsia?.clinical_flags || []), ...(gdm?.clinical_flags || [])]) if (!flags.includes(f)) flags.push(f);

  const questions: string[] = [];
  if (highBp.length || (preeclampsia?.risk_level && preeclampsia.risk_level !== 'Low')) questions.push('Do my blood pressure readings need closer monitoring or a urine protein test?');
  if (highSugar.length || (gdm?.risk_level && gdm.risk_level !== 'Low')) questions.push('When should I do my glucose tolerance test (OGTT)?');
  if (flags.some(f => /movements/.test(f))) questions.push("What should I do if my baby's movements feel reduced?");
  questions.push('Which scans and blood tests are due before my next visit?');
  const [momLabs, momTablets, momMood] = await Promise.all([labSection(owner, true), tabletSection(owner), moodFlag(owner)]);
  if (momMood) flags.push(momMood);
  for (const l of momLabs) if (l.status === 'attention' || l.status === 'urgent') flags.push(`${l.label} ${l.value} (${fmtShort(l.date)}): ${l.note}`);
  if (momTablets && momTablets.takenRate !== null && momTablets.takenRate < 80) questions.push('I sometimes miss my tablets. Is there an easier schedule, or anything to help with side effects?');

  return {
    kind: 'pregnancy' as const,
    generatedAt: new Date().toISOString(),
    period: { days, from: logs[0] ? dayOf(logs[0].log_date) : null, to: logs.length ? dayOf(logs[logs.length - 1].log_date) : null },
    patient: {
      name: profile?.preferred_name || owner.name || 'Patient',
      weeksPregnant: Number(profile?.weeks_pregnant) || null,
      dueDate: profile?.expected_due_date ? dayOf(profile.expected_due_date) : null,
      experience: profile?.pregnancy_experience || null,
      conditions,
    },
    vitals: {
      bp,
      sugar,
      weights,
      weightChange: weights.length >= 2 ? r1(weights[weights.length - 1].value - weights[0].value) : null,
      avgKicks: r1(mean(kicks)),
      minKicks: kicks.length ? Math.min(...kicks) : null,
    },
    stats: { checkIns: logs.length, symptoms },
    screens: { preeclampsia, gdm },
    labs: momLabs,
    tablets: momTablets,
    nutrition,
    appointments: Array.isArray(appointments) ? appointments : [],
    flags,
    questions,
  };
}

export const todayIso = () => iso(new Date());
