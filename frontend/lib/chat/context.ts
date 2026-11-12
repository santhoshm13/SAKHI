/**
 * A compact, plain-text snapshot of her own data for the model, so Sakhi can
 * answer "why am I so tired this week?" with her cycle phase and recent logs
 * instead of generic advice. Kept short to save tokens.
 */
import { Owner, readDoc } from '@/lib/store';
import { PHASE_META, computePhase } from '@/lib/cyclePhase';

const day = (v: any) => String(v || '').slice(0, 10);
const symptoms = (l: any) => (l?.symptoms || []).filter((s: string) => s && s !== 'None').join(', ');

export async function herContext(owner: Owner): Promise<string> {
  const [profile, logs, cycleHistory, goal] = await Promise.all([
    readDoc<any>('her_profile', null, owner),
    readDoc<any[]>('daily_logs', [], owner),
    readDoc<any[]>('cycle_history', [], owner),
    readDoc<any>('her_goal', null, owner),
  ]);
  const list = Array.isArray(logs) ? logs : [];
  if (!profile && list.length === 0) return 'No cycle data yet.';

  const p = computePhase({ profile, logs: list, cycleHistory: Array.isArray(cycleHistory) ? cycleHistory : [] });
  const lines: string[] = [];
  const phase = PHASE_META[p.phase].label;
  if (p.status === 'long-period') lines.push(`Period day ${p.bleedingDay}, longer than her usual ${p.usualPeriodLength} days.`);
  else if (p.status === 'very-late' || p.status === 'late') lines.push(`Period is ${p.daysLate} day(s) late (cycle day ${p.cycleDay} of a usual ${p.cycleLength}).`);
  else if (p.bleedingDay) lines.push(`On her period, day ${p.bleedingDay} (usually ${p.usualPeriodLength} days).`);
  else lines.push(`Cycle day ${p.cycleDay} of about ${p.cycleLength}, ${phase} phase; next period in about ${p.daysUntilPeriod} days.`);
  if (p.status === 'period-ended-early') lines.push('Her period ended earlier than usual this cycle.');
  lines.push(`Prediction confidence: ${p.confidence}.`);
  if (goal?.goal === 'ttc') lines.push(`Goal: trying to conceive${goal.ttc_since ? ` since ${goal.ttc_since}` : ''}${goal.folic ? ', taking folic acid' : ''}. Fertile window is about 5 days before ovulation (cycle day ${p.ovulationDay}) and the day after.`);
  if (goal?.goal === 'peri') lines.push('Goal: managing perimenopause symptoms (hot flashes, sleep, mood, irregular periods).');

  const recent = list.slice(-3).reverse();
  for (const l of recent) {
    const bits = [
      !l.flow_intensity ? null : l.flow_intensity !== 'None' ? `flow ${l.flow_intensity}` : 'no bleeding',
      Number(l.cramps_severity) > 0 ? `pain ${l.cramps_severity}/10` : null,
      l.mood ? `mood ${l.mood}` : null,
      l.sleep_hours ? `sleep ${l.sleep_hours}h` : null,
      symptoms(l) ? `symptoms ${symptoms(l)}` : null,
    ].filter(Boolean);
    lines.push(`Log ${day(l.log_date)}: ${bits.join('; ')}.`);
  }
  return lines.join('\n');
}

export async function pregContext(owner: Owner): Promise<{ text: string; weeks: number | null }> {
  const [profile, logs, appointments, pp] = await Promise.all([
    readDoc<any>('preg_profile', null, owner),
    readDoc<any[]>('pregnancy_logs', [], owner),
    readDoc<any[]>('pregnancy_appointments', [], owner),
    readDoc<any>('postpartum', null, owner),
  ]);
  const p = profile || {};
  const list = Array.isArray(logs) ? logs : [];
  const weeks = Number(p.weeks_pregnant) || null;
  const lines: string[] = [];
  if (pp?.birth_date) {
    // After the birth: she is no longer pregnant, so answer as postnatal care
    const days = Math.max(0, Math.round((Date.now() - Date.parse(pp.birth_date + 'T00:00:00Z')) / 86_400_000));
    lines.push(`Baby born ${pp.birth_date} (${days} days ago) by ${pp.delivery === 'csection' ? 'C-section' : 'normal delivery'}${pp.baby_name ? `, named ${pp.baby_name}` : ''}. She is now in the postnatal period, NOT pregnant: answer about her recovery, breastfeeding and the newborn.`);
    const recent = Array.isArray(pp.recovery) ? pp.recovery[pp.recovery.length - 1] : null;
    if (recent) lines.push(`Recovery check ${recent.date}: bleeding ${recent.bleeding}, pain ${recent.pain}/10.`);
  } else lines.push(weeks ? `${weeks} weeks pregnant.` : 'Pregnant, week unknown.');
  if (p.expected_due_date) lines.push(`Due date ${day(p.expected_due_date)}.`);
  const conditions = Array.isArray(p.maternal_conditions) ? p.maternal_conditions.filter(Boolean) : [];
  if (conditions.length) lines.push(`Reported conditions: ${conditions.join(', ')}.`);

  const latest = (field: string) => [...list].reverse().find(l => l?.[field] !== null && l?.[field] !== undefined);
  const bp = latest('blood_pressure_systolic');
  if (bp) lines.push(`Latest BP ${bp.blood_pressure_systolic}/${bp.blood_pressure_diastolic} on ${day(bp.log_date)}.`);
  const sugar = latest('blood_sugar');
  if (sugar) lines.push(`Latest sugar ${sugar.blood_sugar} mg/dL on ${day(sugar.log_date)}.`);
  const kicks = latest('baby_movement');
  if (kicks) lines.push(`Latest kick count ${kicks.baby_movement} on ${day(kicks.log_date)}.`);
  const weight = latest('weight');
  if (weight) lines.push(`Latest weight ${weight.weight} kg on ${day(weight.log_date)}.`);
  const last = list[list.length - 1];
  if (last && symptoms(last)) lines.push(`Symptoms on ${day(last.log_date)}: ${symptoms(last)}.`);

  const next = (Array.isArray(appointments) ? appointments : []).find(a => !a?.completed);
  if (next) lines.push(`Next appointment: ${next.name} (${next.date}).`);
  return { text: lines.join('\n'), weeks };
}
