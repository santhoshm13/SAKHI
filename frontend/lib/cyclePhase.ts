/**
 * Cycle phase engine. Pure functions, safe on client and server.
 *
 * Model: the luteal phase is fairly constant (~14 days), so ovulation is placed
 * ~14 days before the next expected period and the follicular phase absorbs the
 * variation. This is an estimate; confidence drops as cycles get less regular.
 */

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export type Confidence = 'high' | 'medium' | 'low';

export const PHASES: Phase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];

export const PHASE_META: Record<Phase, { label: string; short: string; color: string; soft: string; ring: string }> = {
  menstrual: { label: 'Menstrual phase', short: 'Menstrual', color: 'text-rose-600', soft: 'bg-rose-50 border-rose-200', ring: '#f43f5e' },
  follicular: { label: 'Follicular phase', short: 'Follicular', color: 'text-emerald-600', soft: 'bg-emerald-50 border-emerald-200', ring: '#10b981' },
  ovulatory: { label: 'Ovulatory phase', short: 'Ovulatory', color: 'text-amber-600', soft: 'bg-amber-50 border-amber-200', ring: '#f59e0b' },
  luteal: { label: 'Luteal phase', short: 'Luteal', color: 'text-violet-600', soft: 'bg-violet-50 border-violet-200', ring: '#8b5cf6' },
};

const DAY = 86_400_000;
const BLEEDING = new Set(['light', 'moderate', 'medium', 'heavy', 'very_heavy', 'very heavy']);

/** Whole-day number for a YYYY-MM-DD (or ISO) string, timezone independent. */
export function dayNum(value: string | Date): number {
  if (value instanceof Date) {
    return Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY);
  }
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Math.floor(Date.UTC(y, m - 1, d) / DAY);
}

export const todayNum = () => dayNum(new Date());

export function isBleedingLog(log: any): boolean {
  if (log?.on_period === true) return true;
  return BLEEDING.has(String(log?.flow_intensity || '').toLowerCase());
}

/** Period start days found in the logs: a bleeding day after 10+ days without bleeding. */
export function detectPeriodStarts(logs: any[], profileStart?: string | null): number[] {
  const bleeding = Array.from(new Set(
    (logs || []).filter(isBleedingLog).map(l => dayNum(l.log_date)).filter(n => !isNaN(n))
  )).sort((a, b) => a - b);

  const starts: number[] = [];
  let prev = -Infinity;
  for (const d of bleeding) {
    if (d - prev > 10) starts.push(d);
    prev = d;
  }
  // The saved start is what she told us (onboarding, "my period started", the
  // confirm button). A rough earlier date within 10 days of a logged start is
  // treated as the same period, but a LATER confirmed start always counts, even
  // if bleeding was logged a few days before it.
  const p = profileStart ? dayNum(profileStart) : NaN;
  if (!isNaN(p) && !starts.some(s => Math.abs(s - p) <= 2 || (s > p && s - p <= 10))) starts.push(p);
  return starts.sort((a, b) => a - b);
}

/** Runs of bleeding days (a 1-day gap is allowed; spotting does not count). */
export function bleedingRuns(logs: any[]): { start: number; end: number }[] {
  const days = Array.from(new Set(
    (logs || []).filter(isBleedingLog).map(l => dayNum(l.log_date)).filter(n => !isNaN(n))
  )).sort((a, b) => a - b);
  const runs: { start: number; end: number }[] = [];
  for (const d of days) {
    const last = runs[runs.length - 1];
    if (last && d - last.end <= 2) last.end = d;
    else runs.push({ start: d, end: d });
  }
  return runs;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export interface PhaseBounds {
  periodLength: number;
  ovulationDay: number;
  /** inclusive cycle-day ranges */
  ranges: Record<Phase, [number, number]>;
}

export function phaseBounds(cycleLength: number, periodLength: number): PhaseBounds {
  const len = Math.max(18, Math.min(60, Math.round(cycleLength) || 28));
  const per = Math.max(2, Math.min(10, Math.round(periodLength) || 5));
  const ovulationDay = Math.max(per + 2, len - 14);
  const ovStart = Math.max(per + 1, ovulationDay - 1);
  const ovEnd = Math.min(len, ovulationDay + 1);
  return {
    periodLength: per,
    ovulationDay,
    ranges: {
      menstrual: [1, per],
      follicular: [per + 1, ovStart - 1],
      ovulatory: [ovStart, ovEnd],
      luteal: [ovEnd + 1, len],
    },
  };
}

export function phaseOnCycleDay(cycleDay: number, cycleLength: number, periodLength: number): Phase {
  const { ranges } = phaseBounds(cycleLength, periodLength);
  if (cycleDay <= ranges.menstrual[1]) return 'menstrual';
  if (cycleDay < ranges.ovulatory[0]) return 'follicular';
  if (cycleDay <= ranges.ovulatory[1]) return 'ovulatory';
  return 'luteal';
}

/**
 * on-track: following the usual pattern
 * long-period: still bleeding past her usual period length
 * period-ended-early: bleeding stopped before her usual length
 * late / very-late: period not started by the expected day (very-late = 2+ weeks)
 */
export type CycleStatus = 'on-track' | 'long-period' | 'period-ended-early' | 'late' | 'very-late';

export interface PhaseInfo {
  phase: Phase;
  status: CycleStatus;
  /** day of the current bleed when she is bleeding now, else null */
  bleedingDay: number | null;
  /** her typical period length, learned from logs when possible */
  usualPeriodLength: number;
  /** whether period length / cycle length were learned from her own logs */
  learned: boolean;
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  ovulationDay: number;
  nextPhase: Phase;
  daysToNextPhase: number;
  daysUntilPeriod: number;
  late: boolean;
  daysLate: number;
  confidence: Confidence;
  confidenceReason: string;
  /** spread between shortest and longest recent cycle, in days */
  variability: number | null;
  lastStart: number;
  /** today's log shows bleeding while the estimate says otherwise */
  bleedingMismatch: boolean;
}

/** Recent cycle lengths: from detected starts, then the stored cycle history. */
export function recentCycleLengths(starts: number[], cycleHistory: any[]): number[] {
  const fromStarts: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const len = starts[i] - starts[i - 1];
    if (len >= 15 && len <= 90) fromStarts.push(len);
  }
  const fromHistory = (cycleHistory || [])
    .map(h => Number(h?.cycleLength ?? h?.cycle_length))
    .filter(n => n >= 15 && n <= 90);
  const lengths = fromStarts.length >= 2 ? fromStarts : fromHistory.length ? fromHistory : fromStarts;
  return lengths.slice(-6);
}

export function computePhase(input: {
  profile: any;
  logs: any[];
  cycleHistory?: any[];
  today?: number;
}): PhaseInfo {
  const { profile, logs } = input;
  const today = input.today ?? todayNum();
  const starts = detectPeriodStarts(logs, profile?.last_period_start || profile?.lastPeriodStart);
  const pastStarts = starts.filter(s => s <= today);
  const lastStart = pastStarts.length ? pastStarts[pastStarts.length - 1] : today - 13;

  const lengths = recentCycleLengths(pastStarts, input.cycleHistory || []);
  const profileLen = Number(profile?.cycle_length_avg || profile?.cycle_length) || 28;
  // Median, so one skipped or very long cycle does not drag every prediction
  const cycleLength = lengths.length ? median(lengths) : profileLen;

  // Learn her real period length from completed bleeding runs
  const runs = bleedingRuns(logs).filter(r => r.start <= today);
  const finished = runs.filter(r => r.end < today - 1).map(r => r.end - r.start + 1).filter(n => n >= 2 && n <= 12);
  const usualPeriodLength = finished.length >= 2 ? median(finished.slice(-4)) : Number(profile?.period_duration) || 5;
  const learned = finished.length >= 2 || lengths.length >= 2;

  const len = Math.max(18, Math.min(60, cycleLength));
  const cycleDay = today - lastStart + 1;
  // Day len+1 is the expected first day of the next period ("due today")
  const late = cycleDay > len + 1;
  const daysLate = late ? cycleDay - (len + 1) : 0;

  // Is she bleeding now, as part of the period that started at lastStart?
  const todayLog = (logs || []).find(l => dayNum(l.log_date) === today);
  const currentRun = runs.find(r => Math.abs(r.start - lastStart) <= 2);
  // Only an explicit "no bleeding" counts; a log that doesn't mention flow says nothing
  const loggedNoBleedToday = Boolean(todayLog && todayLog.flow_intensity && !isBleedingLog(todayLog)
    && String(todayLog.flow_intensity).toLowerCase() !== 'spotting');
  const bleedingNow = Boolean(currentRun && currentRun.end >= today - 1 && !loggedNoBleedToday);

  let status: CycleStatus = 'on-track';
  let periodLength = usualPeriodLength;
  let phase: Phase;
  if (late) {
    phase = 'luteal';
    status = daysLate > 14 ? 'very-late' : 'late';
  } else if (bleedingNow && cycleDay > usualPeriodLength) {
    // Extra bleeding days: stay in the menstrual phase and push the rest back
    phase = 'menstrual';
    status = 'long-period';
    periodLength = cycleDay;
  } else if (currentRun && !bleedingNow && cycleDay <= usualPeriodLength && cycleDay > 1
    && (loggedNoBleedToday || currentRun.end <= today - 2)) {
    // Bleeding stopped early: the follicular phase has begun
    periodLength = Math.max(1, currentRun.end - currentRun.start + 1);
    phase = 'follicular';
    status = 'period-ended-early';
  } else {
    phase = phaseOnCycleDay(cycleDay, len, usualPeriodLength);
  }
  const bounds = phaseBounds(len, periodLength);

  const order: Phase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
  let nextPhase: Phase = order[(order.indexOf(phase) + 1) % 4];
  // Very short cycles can leave the follicular window empty
  if (nextPhase === 'follicular' && bounds.ranges.follicular[1] < bounds.ranges.follicular[0]) nextPhase = 'ovulatory';
  const daysToNextPhase = late || status === 'long-period' ? 0 : Math.max(1, bounds.ranges[phase][1] - cycleDay + 1);
  const daysUntilPeriod = late ? 0 : len - cycleDay + 1;

  const variability = lengths.length >= 2 ? Math.max(...lengths) - Math.min(...lengths) : null;
  let confidence: Confidence;
  let confidenceReason: string;
  if (variability === null) {
    const irregular = ['no', 'irregular'].includes(String(profile?.cycle_regularity || '').toLowerCase());
    confidence = irregular ? 'low' : 'medium';
    confidenceReason = irregular
      ? 'Based on your setup answers. Log a few periods so Sakhi can learn your rhythm.'
      : 'Based on your average cycle. It gets sharper as you log more periods.';
  } else if (variability <= 4) {
    confidence = 'high';
    confidenceReason = `Your recent cycles vary by only ${variability} day${variability === 1 ? '' : 's'}.`;
  } else if (variability <= 8) {
    confidence = 'medium';
    confidenceReason = `Your recent cycles vary by ${variability} days, so phase dates may shift a little.`;
  } else {
    confidence = 'low';
    confidenceReason = `Your recent cycles vary by ${variability} days, so ovulation and luteal dates are rough guesses. Go by how you feel.`;
  }
  if (late) {
    confidence = 'low';
    confidenceReason = 'Your period is later than expected, so the current phase is uncertain.';
  }

  const bleedingMismatch = Boolean(todayLog && isBleedingLog(todayLog) && phase !== 'menstrual');

  return {
    phase,
    status,
    bleedingDay: bleedingNow ? cycleDay : null,
    usualPeriodLength,
    learned,
    cycleDay,
    cycleLength: len,
    periodLength: bounds.periodLength,
    ovulationDay: bounds.ovulationDay,
    nextPhase,
    daysToNextPhase,
    daysUntilPeriod,
    late,
    daysLate,
    confidence,
    confidenceReason,
    variability,
    lastStart,
    bleedingMismatch,
  };
}

/** Phase for any past day, using the period starts around it. */
export function phaseForDay(day: number, starts: number[], fallbackLength: number, periodLength: number): Phase | null {
  let idx = -1;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= day) idx = i;
  if (idx === -1) return null;
  const start = starts[idx];
  const len = idx + 1 < starts.length ? starts[idx + 1] - start : fallbackLength;
  const cd = day - start + 1;
  if (cd > len + 7) return null; // too far past the expected period to say
  return phaseOnCycleDay(Math.min(cd, len), len, periodLength);
}

export const dayToIso = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
