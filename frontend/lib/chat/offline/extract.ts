/**
 * Rule-based understanding of a chat message for Simple mode: what she reported
 * (pain, flow, sleep, mood, symptoms, vitals) and whether she is asking something.
 * Negation-aware ("no cramps", "didn't sleep well") and reads number words.
 */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30,
};

/** Lower-case, tidy text with number words turned into digits ("six and a half" -> "6.5"). */
export function normalize(raw: string): string {
  let t = ` ${raw.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ')} `;
  t = t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty)\s+and\s+a\s+half\b/g, (_, w) => `${NUMBER_WORDS[w]}.5`);
  t = t.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty)\b/g, w => String(NUMBER_WORDS[w]));
  t = t.replace(/\bhalf an? hour\b/g, '0.5 hours');
  return t.trim();
}

const NEG = /\b(no|not|never|without|none|zero|isn't|aren't|wasn't|don't|didn't|doesn't|haven't|hasn't|can't|couldn't|nothing)\b/;

/** True when `word` appears and is not negated in the few words before it. */
export function said(t: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const before = t.slice(Math.max(0, m.index - 28), m.index).split(/[,.;!?]|\bbut\b/).pop() || '';
    if (!NEG.test(before)) return true;
  }
  return false;
}

/** Mentioned but negated, e.g. "no cramps today". */
export function denied(t: string, pattern: RegExp): boolean {
  const m = pattern.exec(t);
  if (!m) return false;
  const before = t.slice(Math.max(0, m.index - 28), m.index).split(/[,.;!?]|\bbut\b/).pop() || '';
  return NEG.test(before);
}

export const isQuestion = (t: string) =>
  /\?\s*$/.test(t) || /^(what|why|how|when|where|which|who|is|are|am|can|could|should|shall|do|does|did|will|would|may|tell me|any tips|any advice|help me)\b/.test(t);

/** First-person, present-tense report: worth logging even inside a question. */
export const reportsNow = (t: string) =>
  /\b(i have|i've got|ive got|i'm having|im having|i am having|i feel|i'm feeling|im feeling|i am feeling|i am|i'm|im|i got|i slept|i woke|my [a-z ]{1,20} (hurts|hurt|is|are|was)|today|right now|this morning|tonight|since (yesterday|morning|last night))\b/.test(t);

const num = (t: string, re: RegExp) => {
  const m = t.match(re);
  return m ? Number(m[1]) : undefined;
};

// ------------------------------------------------------------------ shared

export function moodOf(t: string): string | undefined {
  const table: [RegExp, string][] = [
    [/\b(anxious|anxiety|worried|worrying|nervous|panick?y|stressed|stress|tense|overwhelmed)\b/, 'Anxious'],
    [/\b(sad|crying|cried|teary|depressed|feeling low|feel low|feeling down|feel down|lonely|hopeless|upset)\b/, 'Sad'],
    [/\b(irritated|irritable|angry|annoyed|cranky|frustrated|snappy|moody)\b/, 'Irritable'],
    [/\b(tired|exhausted|fatigued?|drained|sleepy|no energy|low energy|weak)\b/, 'Fatigued'],
    [/\b(energetic|energi[sz]ed|active|productive|pumped)\b/, 'Energetic'],
    [/\b(happy|great|good|wonderful|amazing|cheerful|joyful|excited|lovely)\b/, 'Happy'],
    [/\b(calm|relaxed|okay|ok|fine|peaceful|alright|normal)\b/, 'Calm'],
  ];
  // "not great", "not feeling good", "meh", "rough day" read as a low mood
  if (/\b(not|isn't|wasn't|don't feel|didn't feel)\s+(feeling\s+|so\s+|very\s+|that\s+)?(great|good|well|okay|ok|fine|happy|myself)\b|\b(meh|awful|terrible|horrible|rough (day|time)|bad day|so-so|miserable)\b/.test(t)) return 'Sad';
  for (const [re, mood] of table) {
    // "no energy" is itself the signal, so it is matched directly
    if (re.source.includes('no energy') && /\b(no|low) energy\b/.test(t)) return mood;
    if (said(t, re)) return mood;
  }
  return undefined;
}

export function sleepHours(t: string): number | undefined {
  const v = num(t, /(?:slept|sleep|sleeping|got)[^\d]{0,24}(\d{1,2}(?:\.\d)?)\s*(?:h\b|hr|hrs|hour|hours)?/)
    ?? num(t, /(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hours?)\s*(?:of\s*)?(?:sleep|rest)/);
  return v !== undefined && v >= 0 && v <= 16 ? v : undefined;
}

export const poorSleep = (t: string) =>
  /\b(couldn'?t sleep|could not sleep|didn'?t sleep well|did not sleep well|barely slept|no sleep|insomnia|slept badly|slept poorly|kept waking|woke up (a lot|many times))\b/.test(t);

function symptomsFrom(t: string, table: [RegExp, string][]): { has: string[]; denied: string[] } {
  const has: string[] = [];
  const no: string[] = [];
  for (const [re, label] of table) {
    if (said(t, re)) has.push(label);
    else if (denied(t, re)) no.push(label);
  }
  return { has, denied: no };
}

// ------------------------------------------------------------------ Her Mode

const HER_SYMPTOMS: [RegExp, string][] = [
  [/\b(acne|pimples?|breakouts?|zits?)\b/, 'Acne'],
  [/\b(cramps?|cramping)\b/, 'Cramps'],
  [/\b(headaches?|migraines?)\b/, 'Headache'],
  [/\b(bloat(ed|ing)?|gassy)\b/, 'Bloating'],
  [/\b(fatigue|exhausted|tired|drained)\b/, 'Fatigue'],
  [/\b(nausea|nauseous|queasy|vomit(ing)?)\b/, 'Nausea'],
  [/\b(back ?pain|backache|lower back)\b/, 'Back Pain'],
  [/\b(pelvic pain)\b/, 'Pelvic Pain'],
  [/\b(hair growth|facial hair|chin hair)\b/, 'Hair Growth'],
  [/\b(hair (loss|fall|thinning)|losing hair)\b/, 'Hair Loss'],
  [/\b(weight gain|gained weight)\b/, 'Weight Gain'],
  [/\b(breast (tender(ness)?|pain|sore(ness)?)|sore breasts?|tender breasts?)\b/, 'Breast Tenderness'],
  [/\b(cravings?|craving)\b/, 'Cravings'],
  [/\b(mood swings?)\b/, 'Mood Swings'],
  [/\b(diarrh?oea|diarrhea|loose motions?)\b/, 'Diarrhoea'],
  [/\b(constipat(ed|ion))\b/, 'Constipation'],
];

export interface HerReport {
  entry: Record<string, any>;
  /** she said her period started today */
  periodStarted: boolean;
  /** she said her period ended / no bleeding */
  periodEnded: boolean;
  poorSleep: boolean;
  deniedSymptoms: string[];
}

export function extractHer(raw: string): HerReport {
  const t = normalize(raw);
  const entry: Record<string, any> = {};
  const question = isQuestion(t);
  const logIt = !question || reportsNow(t);

  const score = num(t, /(\d{1,2})\s*(?:\/|out of|on 10|of 10)\s*10?/);
  const painWord = /\b(cramps?|cramping|pain|hurts?|aching|ache)\b/;
  if (score !== undefined && score <= 10 && (painWord.test(t) || /\/\s*10|out of 10/.test(t))) entry.cramps_severity = score;
  else if (denied(t, /\b(cramps?|cramping|pain)\b/) && !said(t, painWord)) entry.cramps_severity = 0;
  else if (said(t, painWord) && !/\b(back ?pain|headache|breast)\b/.test(t.replace(/\b(cramps?|cramping)\b/g, ''))) {
    entry.cramps_severity = /\b(unbearable|terrible|severe|worst|excruciating|killing me|can'?t move)\b/.test(t) ? 8
      : /\b(bad|strong|painful|intense|really hurts?|a lot)\b/.test(t) ? 6
      : /\b(mild|slight|little|bit|light)\b/.test(t) ? 3 : 5;
  }

  if (said(t, /\b(very heavy|soaking|flooding|super heavy)\b/)) entry.flow_intensity = 'Very Heavy';
  else if (said(t, /\b(heavy (flow|bleeding|period|day)|bleeding heavily|flow is heavy|heavy)\b/) && /\b(flow|bleed|period|pad)\b/.test(t)) entry.flow_intensity = 'Heavy';
  else if (said(t, /\bspotting\b/)) entry.flow_intensity = 'Spotting';
  else if (said(t, /\b(light (flow|bleeding|period|day)|flow is light|bleeding lightly)\b/)) entry.flow_intensity = 'Light';
  else if (said(t, /\b(moderate|medium|normal) (flow|bleeding)\b/)) entry.flow_intensity = 'Moderate';

  const periodStarted = /\b(period (started|came|has started|began|arrived)|got my period|started (my period|bleeding)|on my period today|day 1 of my period)\b/.test(t) && !denied(t, /\b(period|bleeding)\b/);
  const periodEnded = /\b(period (ended|stopped|finished|is over)|no (more )?bleeding|stopped bleeding|not bleeding)\b/.test(t);
  if (periodEnded && !entry.flow_intensity) entry.flow_intensity = 'None';
  if (periodStarted && !entry.flow_intensity) entry.flow_intensity = 'Moderate';

  const sleep = sleepHours(t);
  if (sleep !== undefined) entry.sleep_hours = sleep;
  const kg = num(t, /(\d{2,3}(?:\.\d)?)\s*(?:kg|kgs|kilos?)\b/);
  if (kg !== undefined && kg >= 25 && kg <= 250) entry.weight = kg;
  const mood = moodOf(t);
  if (mood) entry.mood = mood;
  const sym = symptomsFrom(t, HER_SYMPTOMS);
  if (sym.has.length) entry.symptoms = sym.has;

  return {
    entry: logIt ? entry : {},
    periodStarted: logIt && periodStarted,
    periodEnded: logIt && periodEnded,
    poorSleep: poorSleep(t),
    deniedSymptoms: sym.denied,
  };
}

// ------------------------------------------------------------------ Mom Mode

const MOM_SYMPTOMS: [RegExp, string][] = [
  [/\b(swell(ing)?|swollen|puffy)\b/, 'Swelling'],
  [/\b(headaches?)\b/, 'Headache'],
  [/\b(heartburn|acidity|acid reflux)\b/, 'Heartburn'],
  [/\b(back ?pain|backache|lower back)\b/, 'Back Pain'],
  [/\b(nausea|nauseous|vomit(ing)?|morning sickness|throwing up)\b/, 'Nausea'],
  [/\b(braxton|tightening)\b/, 'Braxton Hicks'],
  [/\b(fatigue|exhausted|tired|drained)\b/, 'Fatigue'],
  [/\b(dizzy|dizziness|lightheaded|light headed)\b/, 'Dizziness'],
  [/\b(constipat(ed|ion))\b/, 'Constipation'],
  [/\b(leg cramps?|calf cramps?)\b/, 'Leg Cramps'],
  [/\b(insomnia|can'?t sleep|couldn'?t sleep)\b/, 'Poor Sleep'],
];

export interface MomReport {
  vitals: Record<string, any>;
  unclear: string[];
  week?: number;
  deniedSymptoms: string[];
}

export function extractMom(raw: string): MomReport {
  const t = normalize(raw);
  const vitals: Record<string, any> = {};
  const unclear: string[] = [];
  const logIt = !isQuestion(t) || reportsNow(t) || /\d{2,3}\s*\/\s*\d{2,3}/.test(t);

  const bp = t.match(/(\d{2,4})\s*(?:\/|over)\s*(\d{2,4})/);
  if (bp) {
    const [s, d] = [Number(bp[1]), Number(bp[2])];
    if (s >= 70 && s <= 250 && d >= 40 && d <= 160 && s > d) {
      vitals.blood_pressure_systolic = s;
      vitals.blood_pressure_diastolic = d;
    } else unclear.push(`a blood pressure of ${s}/${d}`);
  }
  const sugar = num(t, /(?:sugar|glucose|fasting|ppbs|fbs)[^\d]{0,20}(\d{2,4})/);
  if (sugar !== undefined && sugar >= 40 && sugar <= 500) vitals.blood_sugar = sugar;
  else if (sugar !== undefined) unclear.push(`a sugar reading of ${sugar}`);
  const kicks = num(t, /(\d{1,3})\s*(?:kicks|movements|moves|times)/) ?? num(t, /(?:kicked|moved|kicks?)[^\d]{0,15}(\d{1,3})/);
  if (kicks !== undefined && kicks <= 200) vitals.baby_movement = kicks;
  const weight = num(t, /(\d{2,3}(?:\.\d)?)\s*(?:kg|kgs|kilos?)\b/);
  if (weight !== undefined && weight >= 30 && weight <= 200) vitals.weight = weight;
  const sleep = sleepHours(t);
  if (sleep !== undefined) vitals.sleep_hours = sleep;
  const mood = moodOf(t);
  if (mood) vitals.mood = mood;
  const sym = symptomsFrom(t, MOM_SYMPTOMS);
  if (sym.has.length) vitals.symptoms = sym.has;

  // "week 20", "20 weeks pregnant/along", "I'm 20 weeks" (not "2 weeks ago")
  const week = num(t, /\bweek\s*(\d{1,2})\b(?!\s*ago)/) ?? num(t, /(\d{1,2})\s*weeks?\s*(?:pregnant|along|now|today)/)
    ?? num(t, /\bi'?m\s*(\d{1,2})\s*weeks?\b/);

  return {
    vitals: logIt ? vitals : {},
    unclear: logIt ? unclear : [],
    week: logIt && week !== undefined && week >= 1 && week <= 42 ? week : undefined,
    deniedSymptoms: sym.denied,
  };
}
