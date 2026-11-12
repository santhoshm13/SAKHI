/**
 * Fertility calendar built from her own logged periods.
 *
 *  - Past cycles: ovulation is dated back from the NEXT period that really came
 *    (luteal phase ≈ 14 days), which is far more accurate than a forecast.
 *  - This cycle and the next two: forecast from her median cycle length; the
 *    window widens when her cycles vary, and is marked "less certain".
 *  - A late period stops the forecast: no fertile days are promised past it,
 *    and a pregnancy test is suggested instead.
 */
import { bleedingRuns, detectPeriodStarts, type PhaseInfo } from '@/lib/cyclePhase';

export type DayKind = 'period' | 'predicted-period' | 'fertile' | 'peak' | 'predicted-fertile' | 'predicted-peak' | 'past-fertile' | null;

export interface FertilityDay { day: number; kind: DayKind; tried: boolean; today: boolean; uncertain: boolean }

export interface FertilityPlan {
  /** day numbers (days since epoch, UTC) → what that day is */
  kindOf: (day: number) => Omit<FertilityDay, 'tried' | 'today'>;
  nextWindow: { start: number; end: number; peak: number } | null;
  /** first day a home pregnancy test is reliable (expected period day) */
  testFrom: number | null;
  late: boolean;
  spread: number;
  cyclesLogged: number;
}

export function planFertility(input: {
  phase: Pick<PhaseInfo, 'lastStart' | 'cycleLength' | 'ovulationDay' | 'usualPeriodLength' | 'variability' | 'late' | 'cycleDay'>;
  profile: any;
  logs: any[];
  cycleHistory?: any[];
  today: number;
}): FertilityPlan {
  const { phase, today } = input;
  const starts = detectPeriodStarts(input.logs, input.profile?.last_period_start, (input.cycleHistory || []).map((h: any) => h?.start))
    .filter(s => s <= today);
  const bleeding = new Set<number>();
  for (const r of bleedingRuns(input.logs)) for (let d = r.start; d <= r.end; d++) bleeding.add(d);
  // A start she confirmed without logging the days still shows her usual period length
  for (const s of starts) {
    let logged = false;
    for (let d = s; d < s + phase.usualPeriodLength; d++) if (bleeding.has(d)) logged = true;
    if (!logged) for (let d = s; d < s + phase.usualPeriodLength && d <= today; d++) bleeding.add(d);
  }

  const len = phase.cycleLength;
  const spread = phase.variability ?? 0;
  // Widen the forecast by part of her cycle-to-cycle spread, up to 4 days each side
  const pad = spread > 4 ? Math.min(4, Math.ceil(spread / 3)) : 0;

  const marks = new Map<number, Omit<FertilityDay, 'tried' | 'today' | 'day'>>();
  const put = (d: number, kind: DayKind, uncertain = false) => { if (!marks.has(d)) marks.set(d, { kind, uncertain }); };

  // 1. Logged periods win over everything
  for (const d of Array.from(bleeding)) put(d, 'period');

  // 2. Past cycles, dated back from the period that followed
  for (let i = 0; i + 1 < starts.length; i++) {
    const gap = starts[i + 1] - starts[i];
    if (gap < 18 || gap > 60) continue; // a missed log, not a real cycle
    const ov = starts[i + 1] - 14;
    for (let d = ov - 5; d <= ov + 1; d++) put(d, 'past-fertile');
  }

  // 3. This cycle and the next two (forecast)
  let nextWindow: FertilityPlan['nextWindow'] = null;
  const lastStart = phase.lastStart;
  const expectedNext = lastStart + len;
  if (!phase.late) {
    for (let k = 0; k < 3; k++) {
      const s = lastStart + k * len;
      const ov = s + phase.ovulationDay - 1;
      const forecast = k > 0;
      for (let d = ov - 5 - pad; d <= ov + 1 + pad; d++) {
        if (d < today && k === 0) { put(d, Math.abs(d - ov) <= 1 ? 'peak' : 'fertile', pad > 0); continue; }
        const peak = Math.abs(d - ov) <= 1;
        put(d, forecast ? (peak ? 'predicted-peak' : 'predicted-fertile') : (peak ? 'peak' : 'fertile'), pad > 0 || forecast);
      }
      if (!nextWindow && ov + 1 + pad >= today) nextWindow = { start: ov - 5 - pad, end: ov + 1 + pad, peak: ov };
      // The period that ends this cycle
      const ps = s + len;
      for (let d = ps; d < ps + phase.usualPeriodLength; d++) if (d > today) put(d, 'predicted-period', true);
    }
  }

  return {
    kindOf: (day: number) => ({ day, ...(marks.get(day) || { kind: null, uncertain: false }) }),
    nextWindow,
    testFrom: expectedNext,
    late: phase.late,
    spread,
    cyclesLogged: Math.max(0, starts.length - 1),
  };
}
