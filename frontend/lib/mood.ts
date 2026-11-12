/**
 * Fortnightly mood check: the PHQ-4 (two anxiety and two low-mood questions,
 * a validated short screen) plus the PHQ-9 safety question. Scores are a
 * screen, not a diagnosis.
 */

export const MOOD_QUESTIONS = [
  { id: 'nervous', text: 'Feeling nervous, anxious or on edge', group: 'anx' },
  { id: 'worry', text: "Not being able to stop or control worrying", group: 'anx' },
  { id: 'interest', text: 'Little interest or pleasure in doing things', group: 'dep' },
  { id: 'down', text: 'Feeling down, low or hopeless', group: 'dep' },
  { id: 'harm', text: 'Thoughts that you would be better off dead, or of hurting yourself', group: 'harm' },
] as const;

export const ANSWERS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

export interface MoodCheck { date: string; answers: number[]; total: number; anx: number; dep: number; harm: boolean }
export interface MoodDoc { checks: MoodCheck[] }
export const EMPTY_MOOD: MoodDoc = { checks: [] };

export const CHECK_EVERY_DAYS = 14;

export function scoreMood(answers: number[], date: string): MoodCheck {
  const a = MOOD_QUESTIONS.map((_, i) => Math.max(0, Math.min(3, Number(answers[i]) || 0)));
  const anx = a[0] + a[1];
  const dep = a[2] + a[3];
  return { date, answers: a, total: anx + dep, anx, dep, harm: a[4] > 0 };
}

export type MoodBand = 'ok' | 'mild' | 'moderate' | 'severe';
export const bandOf = (total: number): MoodBand => (total >= 9 ? 'severe' : total >= 6 ? 'moderate' : total >= 3 ? 'mild' : 'ok');

export function moodMessage(c: MoodCheck, pregnant: boolean) {
  if (c.harm) {
    return {
      title: 'Thank you for telling me. You deserve support right now.',
      body: 'Please talk to someone today. Tele-MANAS (14416) is free, 24 hours, and in your language. If you might act on these thoughts, call 112 or go to the nearest hospital.',
      urgent: true,
    };
  }
  const band = bandOf(c.total);
  const which = c.anx >= 3 && c.dep >= 3 ? 'worry and low mood' : c.anx >= 3 ? 'a lot of worry' : c.dep >= 3 ? 'low mood' : null;
  if (band === 'severe' || band === 'moderate') {
    return {
      title: `Your answers show ${which || 'a hard couple of weeks'}.`,
      body: `${pregnant ? 'Low mood and anxiety are common in pregnancy and after birth, and they get better with support. ' : ''}Please talk to your doctor, or call Tele-MANAS (14416) to talk to a counsellor for free.`,
      urgent: band === 'severe',
    };
  }
  if (band === 'mild') {
    return {
      title: which ? `A little ${which === 'low mood' ? 'low mood' : 'worry'} lately.` : 'A few harder days lately.',
      body: 'Sleep, a short walk in daylight and talking to someone you trust really help. Sakhi will check in again in two weeks.',
      urgent: false,
    };
  }
  return { title: "You've been feeling mostly okay.", body: 'Lovely. Sakhi will check in again in two weeks.', urgent: false };
}

const dayGap = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000);

export function moodDue(doc: MoodDoc, today: string) {
  const last = [...(doc.checks || [])].sort((x, y) => x.date.localeCompare(y.date)).pop();
  return { last: last || null, due: !last || dayGap(last.date, today) >= CHECK_EVERY_DAYS, daysUntil: last ? Math.max(0, CHECK_EVERY_DAYS - dayGap(last.date, today)) : 0 };
}
