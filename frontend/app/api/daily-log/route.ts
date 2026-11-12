import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';
import { syncPeriodStartFromLog } from '@/lib/sakhiTools';

// Parse boolean/string period indicator safely ("No" -> false, not Boolean("No") === true)
function resolveOnPeriod(raw: unknown, flow: string): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (v === 'yes' || v === 'true' || v === '1') return true;
    if (v === 'no' || v === 'false' || v === '0') return false;
  }
  return flow !== 'None';
}

function finiteNumber(raw: unknown, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// POST: Save (or merge into) today's Her Mode daily log
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      log_date, logDate, onPeriod, on_period, flow_intensity, flowIntensity, cramps_severity, crampsSeverity,
      symptoms, mood, sleep_hours, sleepHours, weight, waterConsumed, exercised, warningSigns, notes,
    } = body;

    const owner = await getOwner();
    const logs = await readDoc<any[]>('daily_logs', [], owner);
    const list = Array.isArray(logs) ? logs : [];

    const dateToSave = String(logDate || log_date || new Date().toISOString().split('T')[0]);
    const dayStr = dateToSave.split('T')[0];
    const existing = list.find((l: any) => String(l?.log_date || '').startsWith(dayStr)) || {};
    const flow = flowIntensity || flow_intensity || existing.flow_intensity || 'None';
    const cramps = finiteNumber(crampsSeverity ?? cramps_severity, existing.cramps_severity ?? 0);
    const sleep = finiteNumber(sleepHours ?? sleep_hours, existing.sleep_hours ?? 7.5);
    const rawOnPeriod = onPeriod !== undefined ? onPeriod : on_period;

    // Merge so fields logged earlier today (e.g. via chat) are not overwritten by defaults
    const entry = {
      ...existing,
      log_date: dateToSave,
      flow_intensity: flow,
      cramps_severity: cramps,
      symptoms: Array.isArray(symptoms) && symptoms.length > 0 ? symptoms : existing.symptoms || ['None'],
      mood: mood || existing.mood || 'Calm',
      sleep_hours: sleep,
      on_period: resolveOnPeriod(rawOnPeriod, flow),
      ...(weight !== undefined && weight !== null && weight !== '' && Number.isFinite(Number(weight))
        ? { weight: Number(weight) }
        : {}),
      ...(waterConsumed !== undefined ? { water_consumed: waterConsumed } : {}),
      ...(exercised !== undefined ? { exercised: Boolean(exercised) } : {}),
      ...(warningSigns !== undefined ? { warning_signs: warningSigns } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };

    const next = [...list.filter((l: any) => !String(l?.log_date || '').startsWith(dayStr)), entry]
      .sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
    await writeDoc('daily_logs', next, owner);
    // Real bleeding after a gap starts a new cycle, even if it came early or late
    const cycleUpdate = await syncPeriodStartFromLog(owner, next, dayStr);

    return NextResponse.json({ success: true, log: entry, cycleUpdate });
  } catch (error: any) {
    console.error('Error saving daily log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
