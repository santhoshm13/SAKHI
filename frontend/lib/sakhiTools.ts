/**
 * Side-effecting tools that Sakhi (Gemini function calling or the offline
 * fallback) can invoke. They all persist through the unified store.
 */
import { dueFromWeeks } from '@/lib/pregnancyWeeks';
import { Owner, patchDoc, readDoc, writeDoc } from '@/lib/store';
import { mergePregnancyLog } from '@/lib/pregnancyLogs';
import { runPrediction } from '@/lib/ml/client';
import { SAME_PERIOD_DAYS } from '@/lib/cyclePhase';

export interface ToolOutcome {
  apiResult: any;
  chartData: any;
}

const toList = (v: any): string[] => (Array.isArray(v) ? v : v ? [v] : []).map(String);

// ------------------------------------------------------------------ Her Mode

const BLEED = /^(light|moderate|medium|heavy|very[ _]heavy)$/i;
const dayMs = 86_400_000;
const toDay = (v: string) => Math.floor(Date.parse(String(v).slice(0, 10) + 'T00:00:00Z') / dayMs);

/**
 * When a log shows real bleeding (not spotting) with no bleeding in the 10 days
 * before, and the last recorded period began 15+ days earlier, treat it as a new
 * period: early or late, it resets the cycle and records the finished one.
 */
export async function syncPeriodStartFromLog(owner: Owner, logs: any[], dayStr: string): Promise<any | null> {
  const entry = logs.find(l => String(l?.log_date || '').slice(0, 10) === dayStr);
  if (!entry || !BLEED.test(String(entry.flow_intensity || ''))) return null;
  const d = toDay(dayStr);
  const bledRecently = logs.some(l => {
    const ld = toDay(String(l?.log_date || ''));
    return ld < d && ld >= d - 10 && BLEED.test(String(l.flow_intensity || ''));
  });
  if (bledRecently) return null;
  const profile = await readDoc<any>('her_profile', null, owner);
  const last = profile?.last_period_start ? toDay(String(profile.last_period_start)) : NaN;
  if (!isNaN(last) && d - last < 15) return null;
  const outcome = await runHerTool('update_period_info', { last_period_date: dayStr }, owner);
  return outcome?.chartData ?? null;
}

export async function runHerTool(name: string, args: any, owner: Owner): Promise<ToolOutcome | null> {
  if (name === 'log_health_entry') {
    const logs = await readDoc<any[]>('daily_logs', [], owner);
    const list = Array.isArray(logs) ? logs : [];
    const todayIso = new Date().toISOString();
    const dayStr = todayIso.split('T')[0];
    const index = list.findIndex((l: any) => String(l?.log_date || '').split('T')[0] === dayStr);
    const existing = index >= 0 ? list[index] : {};

    const merged = Array.from(new Set([
      ...(existing.symptoms || []).filter((s: string) => s && s !== 'None'),
      ...toList(args.symptoms).filter(s => s && s !== 'None'),
    ]));
    const log = {
      ...existing,
      log_date: existing.log_date || todayIso,
      // Unmentioned flow stays unknown: defaulting to "None" would end her period early
      ...((args.flow_intensity ?? existing.flow_intensity) !== undefined ? { flow_intensity: args.flow_intensity ?? existing.flow_intensity } : {}),
      cramps_severity: args.cramps_severity !== undefined ? Number(args.cramps_severity) : existing.cramps_severity ?? 0,
      symptoms: merged.length > 0 ? merged : existing.symptoms || ['None'],
      mood: args.mood || existing.mood || 'Calm',
      sleep_hours: args.sleep_hours !== undefined ? Number(args.sleep_hours) : existing.sleep_hours ?? 7.5,
      ...(args.weight !== undefined ? { weight: Number(args.weight) } : {}),
    };
    if (index >= 0) list[index] = log;
    else list.push(log);
    await writeDoc('daily_logs', list, owner);
    const cycleUpdate = await syncPeriodStartFromLog(owner, list, dayStr);
    return {
      apiResult: { success: true, message: cycleUpdate ? 'Daily log saved; a new period start was recorded.' : 'Daily health log saved.', logged: log },
      chartData: { type: 'daily_log', log, cycleUpdate },
    };
  }

  if (name === 'update_period_info') {
    const before = await readDoc<any>('her_profile', null, owner);
    const patch: Record<string, any> = {};
    // "My period started" a few days into the period she already told us about
    // (e.g. still bleeding on day 6) is the same period, not a new day 1. Only an
    // explicit correction of the date ("it actually started on the 3rd") moves it later.
    let samePeriodAs: string | null = null;
    if (args.last_period_date) {
      const prev = before?.last_period_start ? toDay(String(before.last_period_start)) : NaN;
      const next = toDay(String(args.last_period_date));
      const gap = next - prev;
      if (!isNaN(gap) && gap >= 1 && gap <= SAME_PERIOD_DAYS && args.is_correction !== true) {
        samePeriodAs = String(before.last_period_start).slice(0, 10);
      } else {
        patch.last_period_start = args.last_period_date;
      }
    }
    if (args.cycle_length_avg) patch.cycle_length = Number(args.cycle_length_avg);
    if (args.period_duration) patch.period_duration = Number(args.period_duration);
    const profile = Object.keys(patch).length ? await patchDoc('her_profile', patch, owner) : before;
    if (samePeriodAs && !Array.isArray(args.cycle_history)) {
      const periodDay = toDay(String(args.last_period_date)) - toDay(samePeriodAs) + 1;
      return {
        apiResult: {
          success: true,
          samePeriod: true,
          periodDay,
          message: `Not a new period: her current period started on ${samePeriodAs}, so today is day ${periodDay} of it. Kept that start date. If she says the start date itself was wrong, call again with is_correction true.`,
          profile,
        },
        chartData: { type: 'profile_update', profile },
      };
    }

    let cycleHistory: any[] | null = null;

    // A new period start closes the previous cycle: record its real length
    const prevStart = before?.last_period_start ? new Date(String(before.last_period_start).slice(0, 10)) : null;
    const newStart = args.last_period_date ? new Date(String(args.last_period_date).slice(0, 10)) : null;
    if (prevStart && newStart && !Array.isArray(args.cycle_history)) {
      const days = Math.round((newStart.getTime() - prevStart.getTime()) / 86_400_000);
      if (days >= 15 && days <= 90) {
        const stored = await readDoc<any[]>('cycle_history', [], owner);
        const hist = Array.isArray(stored) ? stored : [];
        const month = prevStart.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        hist.push({ month, cycleLength: days, periodDuration: Number(profile?.period_duration) || 5, start: prevStart.toISOString().slice(0, 10) });
        cycleHistory = hist.slice(-12);
        await writeDoc('cycle_history', cycleHistory, owner);
      }
    }
    if (Array.isArray(args.cycle_history) && args.cycle_history.length > 0) {
      const stored = await readDoc<any[]>('cycle_history', [], owner);
      const hist = Array.isArray(stored) ? stored : [];
      for (const c of args.cycle_history) {
        const i = hist.findIndex((h: any) => h.month === c.month);
        const row = {
          month: c.month,
          cycleLength: c.cycleLength !== undefined ? Number(c.cycleLength) : (i >= 0 ? hist[i].cycleLength : profile.cycle_length || 28),
          periodDuration: c.periodDuration !== undefined ? Number(c.periodDuration) : (i >= 0 ? hist[i].periodDuration : profile.period_duration || 5),
        };
        if (i >= 0) hist[i] = { ...hist[i], ...row };
        else hist.push(row);
      }
      await writeDoc('cycle_history', hist, owner);
      cycleHistory = hist;
    }
    return {
      apiResult: { success: true, message: 'Cycle details updated.', profile, cycleHistory },
      chartData: { type: cycleHistory ? 'cycle_history_update' : 'profile_update', profile, cycleHistory },
    };
  }

  if (name === 'analyze_cycle') {
    const data = await runPrediction('cycle', {
      last_period_date: args.last_period_date,
      cycle_length_avg: Number(args.cycle_length_avg) || 28,
    });
    return { apiResult: data, chartData: { type: 'cycle', data } };
  }

  if (name === 'analyze_pcos_risk') {
    const data = await runPrediction('pcos', {
      weight: Number(args.weight) || 60,
      cycle_regularity: Number(args.cycle_regularity ?? 1),
      acne_severity: Math.round(Number(args.acne_severity ?? 0)),
    });
    return { apiResult: data, chartData: { type: 'pcos', data } };
  }

  return null;
}

// ------------------------------------------------------------------ Mom Mode

export async function runPregnancyTool(name: string, args: any, owner: Owner): Promise<ToolOutcome | null> {
  if (name === 'log_pregnancy_vital_entry') {
    const existing = await readDoc<any[]>('pregnancy_logs', [], owner);
    const { entry, logs } = mergePregnancyLog(existing, args);
    await writeDoc('pregnancy_logs', logs, owner);
    return {
      apiResult: { success: true, message: 'Maternal vitals saved.', log: entry },
      chartData: { type: 'daily_log', log: entry, logs },
    };
  }

  if (name === 'update_pregnancy_progress') {
    const patch: Record<string, any> = {};
    // The due date drives the week from now on, so keep the two in step
    if (args.expected_due_date) patch.expected_due_date = String(args.expected_due_date).slice(0, 10);
    else if (args.weeks_pregnant) patch.expected_due_date = dueFromWeeks(Number(args.weeks_pregnant));
    if (args.weeks_pregnant) patch.weeks_pregnant = Number(args.weeks_pregnant);
    const profile = await patchDoc('preg_profile', patch, owner);
    return {
      apiResult: { success: true, message: 'Pregnancy progress updated.', profile },
      chartData: { type: 'profile_update', profile },
    };
  }

  if (name === 'schedule_pregnancy_appointment') {
    const stored = await readDoc<any[]>('pregnancy_appointments', [], owner);
    const appointments = Array.isArray(stored) ? stored : [];
    appointments.push({ name: String(args.name), date: String(args.date || 'Upcoming'), completed: Boolean(args.completed) });
    await writeDoc('pregnancy_appointments', appointments, owner);
    return {
      apiResult: { success: true, message: 'Appointment saved.', appointments },
      chartData: { type: 'appointment_update', appointments },
    };
  }

  if (name === 'log_pregnancy_nutrition') {
    const current = (await readDoc<any>('pregnancy_nutrition', null, owner)) || {};
    const pick = (k: string) => (args[k] !== undefined ? Number(args[k]) : Number(current[k]) || 0);
    const nutrition = { protein: pick('protein'), iron: pick('iron'), calcium: pick('calcium'), water: pick('water') };
    await writeDoc('pregnancy_nutrition', nutrition, owner);
    return {
      apiResult: { success: true, message: 'Nutrition logged.', nutrition },
      chartData: { type: 'nutrition_update', nutrition },
    };
  }

  return null;
}

/**
 * Wrap a tool runner so a given call (same name + args) executes at most once per
 * request. executeGeminiWithAutoSwitch retries the whole conversation on another
 * API key, and without this a retry would save an appointment or log twice.
 */
export function onceper<TArgs extends any[]>(
  runner: (name: string, args: any, ...rest: TArgs) => Promise<ToolOutcome | null>
) {
  const cache = new Map<string, Promise<ToolOutcome | null>>();
  return (name: string, args: any, ...rest: TArgs) => {
    const key = `${name}:${JSON.stringify(args ?? {})}`;
    if (!cache.has(key)) cache.set(key, runner(name, args, ...rest));
    return cache.get(key)!;
  };
}
