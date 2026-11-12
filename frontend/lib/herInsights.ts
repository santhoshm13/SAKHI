/**
 * Her Mode insights from her own logs:
 *  - patternsWorthMentioning: persistent signals to raise with a doctor
 *    (deliberately no condition names or risk scores: Sakhi does not diagnose)
 *  - phaseInsights: how sleep, pain, mood and symptoms shift across her phases
 *  - pmsForecast: symptoms that tend to show up in the days before her period
 */
import {
  PHASES, PHASE_META, bleedingRuns, dayNum, detectPeriodStarts, isBleedingLog, phaseForDay, recentCycleLengths, todayNum,
  type Phase,
} from './cyclePhase';

export interface Pattern {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  ask: string;
  tone: 'watch' | 'info';
}

const symptomsOf = (l: any): string[] =>
  (l?.symptoms || []).map((s: string) => String(s)).filter((s: string) => s && s.toLowerCase() !== 'none');

const within = (logs: any[], days: number) => {
  const from = todayNum() - days;
  return (logs || []).filter(l => dayNum(l.log_date) >= from);
};

export function patternsWorthMentioning(profile: any, logs: any[], cycleHistory: any[]): Pattern[] {
  const out: Pattern[] = [];
  const recent = within(logs, 120);
  const starts = detectPeriodStarts(logs, profile?.last_period_start);
  const lengths = recentCycleLengths(starts, cycleHistory).slice(-3);

  const long = lengths.filter(n => n > 35).length;
  const short = lengths.filter(n => n < 21).length;
  if (lengths.length >= 2 && long >= 2) {
    out.push({
      id: 'long-cycles', tone: 'watch',
      title: 'Your cycles have been on the long side',
      detail: `${long} of your last ${lengths.length} cycles were longer than 35 days.`,
      evidence: `Recent cycles: ${lengths.join(', ')} days`,
      ask: 'Ask whether hormone or ultrasound checks make sense for longer cycles.',
    });
  }
  if (lengths.length >= 2 && short >= 2) {
    out.push({
      id: 'short-cycles', tone: 'watch',
      title: 'Your cycles have been short',
      detail: `${short} of your last ${lengths.length} cycles were shorter than 21 days.`,
      evidence: `Recent cycles: ${lengths.join(', ')} days`,
      ask: 'Ask whether short cycles need any tests.',
    });
  }
  if (lengths.length >= 3) {
    const spread = Math.max(...lengths) - Math.min(...lengths);
    if (spread > 9 && long < 2 && short < 2) {
      out.push({
        id: 'variable', tone: 'info',
        title: 'Cycle length varies a lot',
        detail: `Your cycles varied by ${spread} days recently. Some variation is normal, more than 7–9 days is worth a mention.`,
        evidence: `Recent cycles: ${lengths.join(', ')} days`,
        ask: 'Mention the variation at your next routine visit.',
      });
    }
  }

  const severePain = recent.filter(l => Number(l.cramps_severity) >= 7);
  const painCycles = new Set(severePain.map(l => {
    const d = dayNum(l.log_date);
    return starts.filter(s => s <= d).pop() ?? 'x';
  }));
  if (severePain.length >= 3 && painCycles.size >= 2) {
    out.push({
      id: 'severe-pain', tone: 'watch',
      title: 'Period pain is often severe',
      detail: `You logged cramps of 7/10 or more on ${severePain.length} days across ${painCycles.size} cycles.`,
      evidence: 'Last 4 months of check-ins',
      ask: 'Painful periods that disrupt your day deserve a proper check. Ask what could be causing them and what treatment options exist.',
    });
  }

  const heavy = recent.filter(l => /heavy/i.test(String(l.flow_intensity || '')));
  const longPeriod = Number(profile?.period_duration) > 7;
  if (heavy.length >= 4 || longPeriod) {
    const tired = recent.filter(l => symptomsOf(l).some(s => /fatigue/i.test(s)) || /tired|fatigued/i.test(String(l.mood || ''))).length;
    out.push({
      id: 'heavy-flow', tone: 'watch',
      title: longPeriod ? 'Periods last longer than a week' : 'Heavy flow on several days',
      detail: (longPeriod ? `Your periods usually last ${profile.period_duration} days. ` : `You logged heavy flow on ${heavy.length} days. `)
        + (tired >= 5 ? 'You also often feel tired, which can go together with low iron.' : ''),
      evidence: 'Last 4 months of check-ins',
      ask: 'Ask whether a blood count or iron (ferritin) test would be useful.',
    });
  }

  // Periods that keep running past a week
  const runs = bleedingRuns(logs).filter(r => r.end < todayNum() - 1 && r.start >= todayNum() - 180);
  const longRuns = runs.filter(r => r.end - r.start + 1 > 7);
  if (longRuns.length >= 2 && !longPeriod) {
    out.push({
      id: 'long-periods', tone: 'watch',
      title: 'Periods often last more than a week',
      detail: `${longRuns.length} of your last ${runs.length} periods lasted ${longRuns.map(r => r.end - r.start + 1).join(', ')} days.`,
      evidence: 'Bleeding days from your check-ins',
      ask: 'Ask whether long periods need a check, and whether an iron test would help.',
    });
  }

  // Spotting away from her period
  const between = recent.filter(l => {
    if (String(l.flow_intensity || '').toLowerCase() !== 'spotting') return false;
    const d = dayNum(l.log_date);
    return !runs.concat(bleedingRuns(logs)).some(r => d >= r.start - 2 && d <= r.end + 2);
  });
  const spottingCycles = new Set(between.map(l => starts.filter(s => s <= dayNum(l.log_date)).pop() ?? 'x'));
  if (between.length >= 3 && spottingCycles.size >= 2) {
    out.push({
      id: 'spotting-between', tone: 'info',
      title: 'Spotting between periods',
      detail: `You logged spotting on ${between.length} days away from your period, across ${spottingCycles.size} cycles. Light spotting around ovulation can be normal.`,
      evidence: 'Last 4 months of check-ins',
      ask: 'Mention when the spotting happens; a doctor may suggest a routine check.',
    });
  }

  const skin = recent.filter(l => symptomsOf(l).some(s => /acne|hair growth/i.test(s))).length;
  if (skin >= 8 && (long >= 1 || ['no', 'irregular'].includes(String(profile?.cycle_regularity || '').toLowerCase()))) {
    out.push({
      id: 'skin-cycles', tone: 'info',
      title: 'Skin changes alongside irregular cycles',
      detail: `You logged acne or extra hair growth on ${skin} days, together with irregular cycles.`,
      evidence: 'Last 4 months of check-ins',
      ask: 'This combination is worth mentioning; a doctor can check whether hormones are involved.',
    });
  }

  const fatigue = recent.filter(l => symptomsOf(l).some(s => /fatigue/i.test(s))).length;
  if (fatigue >= 12 && !out.some(p => p.id === 'heavy-flow')) {
    out.push({
      id: 'fatigue', tone: 'info',
      title: 'Tiredness shows up often',
      detail: `You logged fatigue on ${fatigue} days recently, beyond your period days.`,
      evidence: 'Last 4 months of check-ins',
      ask: 'Ask whether basic blood tests (iron, thyroid, vitamin D) would help.',
    });
  }

  const lowMood = recent.filter(l => /sad|anxious|depress/i.test(String(l.mood || ''))).length;
  if (lowMood >= 14) {
    out.push({
      id: 'mood', tone: 'info',
      title: 'Low or anxious mood on many days',
      detail: `You logged feeling sad or anxious on ${lowMood} days recently.`,
      evidence: 'Last 4 months of check-ins',
      ask: 'If mood dips are strong before your period or affect daily life, it is worth talking about. Support helps.',
    });
  }

  return out;
}

export interface PhaseStat {
  phase: Phase;
  days: number;
  avgSleep: number | null;
  avgPain: number | null;
  topMood: string | null;
  topSymptoms: string[];
}

export function phaseStats(profile: any, logs: any[], cycleLength: number, periodLength: number): PhaseStat[] {
  const starts = detectPeriodStarts(logs, profile?.last_period_start);
  const buckets: Record<Phase, any[]> = { menstrual: [], follicular: [], ovulatory: [], luteal: [] };
  for (const l of logs || []) {
    const p = phaseForDay(dayNum(l.log_date), starts, cycleLength, periodLength);
    if (p) buckets[p].push(l);
  }
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const top = (xs: string[], n: number) => {
    const c: Record<string, number> = {};
    xs.forEach(x => (c[x] = (c[x] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  };
  return PHASES.map(phase => {
    const ls = buckets[phase];
    return {
      phase,
      days: ls.length,
      avgSleep: avg(ls.map(l => Number(l.sleep_hours)).filter(n => n > 0)),
      avgPain: avg(ls.map(l => Number(l.cramps_severity) || 0)),
      topMood: top(ls.map(l => l.mood).filter(Boolean), 1)[0] || null,
      topSymptoms: top(ls.flatMap(symptomsOf), 3),
    };
  });
}

/** Plain-language highlights comparing her phases. Only when there is enough data. */
export function phaseHighlights(stats: PhaseStat[]): string[] {
  const enough = stats.filter(s => s.days >= 3);
  if (enough.length < 3) return [];
  const out: string[] = [];
  const sleepers = enough.filter(s => s.avgSleep !== null);
  if (sleepers.length >= 3) {
    const lo = sleepers.reduce((a, b) => (a.avgSleep! < b.avgSleep! ? a : b));
    const hi = sleepers.reduce((a, b) => (a.avgSleep! > b.avgSleep! ? a : b));
    if (hi.avgSleep! - lo.avgSleep! >= 0.5) {
      out.push(`You sleep about ${(hi.avgSleep! - lo.avgSleep!).toFixed(1)} hours less in your ${PHASE_META[lo.phase].short.toLowerCase()} phase than in your ${PHASE_META[hi.phase].short.toLowerCase()} phase.`);
    }
  }
  const men = stats.find(s => s.phase === 'menstrual');
  const rest = enough.filter(s => s.phase !== 'menstrual' && s.avgPain !== null);
  if (men && men.days >= 3 && men.avgPain !== null && rest.length) {
    const other = Math.max(...rest.map(s => s.avgPain!));
    if (men.avgPain - other >= 1.5) out.push(`Cramps average ${men.avgPain}/10 on your period days, and stay under ${Math.ceil(other)}/10 the rest of the month.`);
  }
  const lut = stats.find(s => s.phase === 'luteal');
  if (lut && lut.days >= 3 && lut.topMood) out.push(`In your luteal phase you most often feel ${lut.topMood.toLowerCase()}.`);
  const fol = stats.find(s => s.phase === 'follicular');
  if (fol && fol.days >= 3 && fol.topMood) out.push(`In your follicular phase you most often feel ${fol.topMood.toLowerCase()}.`);
  return out;
}

/** Symptoms that showed up in the 5 days before at least two past periods. */
export function pmsForecast(profile: any, logs: any[], daysUntilPeriod: number): { symptoms: string[]; inDays: number } | null {
  const starts = detectPeriodStarts(logs, profile?.last_period_start);
  if (starts.length < 3) return null;
  const byDay = new Map<number, any>();
  (logs || []).forEach(l => byDay.set(dayNum(l.log_date), l));
  const counts: Record<string, number> = {};
  let cycles = 0;
  for (const s of starts.slice(1)) {
    const seen = new Set<string>();
    let logged = false;
    for (let d = s - 5; d < s; d++) {
      const l = byDay.get(d);
      if (!l || isBleedingLog(l)) continue;
      logged = true;
      symptomsOf(l).forEach(x => seen.add(x));
    }
    if (logged) cycles++;
    seen.forEach(x => (counts[x] = (counts[x] || 0) + 1));
  }
  if (cycles < 2) return null;
  const symptoms = Object.entries(counts).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  if (!symptoms.length) return null;
  return { symptoms, inDays: Math.max(0, daysUntilPeriod - 5) };
}
