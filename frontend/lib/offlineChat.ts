/**
 * Simple mode Sakhi: used when no AI model is available or allowed.
 *
 * Not just templates: it understands what she reports (negation-aware), saves it
 * through the same tools as Gemini, answers common questions from a small
 * knowledge base personalised with her cycle phase or pregnancy week, follows
 * up with one natural question, and understands short answers to its own
 * questions ("light", "6", "yes"). Danger signs still get urgent guidance.
 */
import { Owner, readDoc, writeDoc } from '@/lib/store';
import { pickRelief, recordShown, reliefText, type ReliefFeedback } from '@/lib/reliefTips';
import { runHerTool, runPregnancyTool } from '@/lib/sakhiTools';
import { endearment } from '@/lib/chat/tone';
import { checkSafety } from '@/lib/chat/safety';
import { computePhase, dayNum, todayNum } from '@/lib/cyclePhase';
import { pmsForecast } from '@/lib/herInsights';
import { extractHer, extractMom, isQuestion, normalize } from '@/lib/chat/offline/extract';
import { HER_TOPICS, MOM_TOPICS, findTopics, pick, sizeFor, type HerCtx, type MomCtx } from '@/lib/chat/offline/knowledge';

// Reporting one of these ("I feel bloated") also gets the matching advice
const HER_ADVICE_ON_REPORT = new Set(['bloating', 'headache', 'cravings', 'acne']);
const MOM_ADVICE_ON_REPORT = new Set(['nausea', 'heartburn', 'constipation', 'back-pain', 'swelling']);

export interface Turn { role: 'user' | 'assistant'; text: string }

// Questions Sakhi asks; matched in her previous reply to understand short answers
const ASK = {
  flow: "How's your flow today: none, spotting, light, medium or heavy?",
  pain: 'Any cramps or pain today? A number out of 10 is perfect.',
  sleep: 'How many hours did you sleep last night?',
  mood: 'And how are you feeling in yourself today?',
  kicks: 'Have you felt baby moving today?',
  momMood: 'How are you feeling today, in body and mind?',
};
const OFFER: Record<string, string> = {
  tired: 'Would you like a few ideas for your energy?',
  stress: 'Would you like a quick calming exercise?',
  pms: 'Would you like some tips for the days before your period?',
  food: 'Want a food idea for this phase?',
  momFood: 'Want some food ideas for this stage of pregnancy?',
  momStress: 'Would you like a quick calming exercise?',
};

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|yes please|haan|han|ha|ji|of course|go ahead)\b/;
const NO = /^(no|nope|nah|not now|later|nahi|no thanks|i'?m good)\b/;
const GREETING = /^(hi+|hello|hey+|hiya|good (morning|afternoon|evening)|namaste|hola|yo)\b/;
const THANKS = /\b(thanks|thank you|thx|ty|dhanyavad|shukriya)\b/;
const BYE = /\b(bye|good ?night|see you|talk later|ttyl)\b/;
const HOW_ARE_YOU = /\bhow are (you|u)\b/;
const ABOUT = /\b(who are you|what can you do|what do you do|how do you work|what are you)\b/;

const MOOD_WORD: Record<string, string> = { Sad: 'low', Fatigued: 'tired' };
const moodWord = (m: string) => MOOD_WORD[m] || m.toLowerCase();
/** Don't ask the same question again within her last few replies. */
const askedRecently = (history: Turn[], q: string) =>
  history.filter(h => h.role === 'assistant').slice(-3).some(h => h.text.includes(q));

const lastAssistant = (history: Turn[]) => [...history].reverse().find(h => h.role === 'assistant')?.text || '';
const avoidRepeat = (reply: string, last: string, alt: () => string) => (reply === last ? alt() : reply);
const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Turn a short answer to Sakhi's own question into a full sentence. */
function expandShortAnswer(t: string, last: string): string | null {
  if (t.split(' ').length > 6) return null;
  if (last.includes(ASK.flow)) {
    if (/^(none|no|nothing|not bleeding|no bleeding)\b/.test(t)) return 'no bleeding today';
    const w = t.match(/\b(spotting|light|medium|moderate|heavy|very heavy)\b/)?.[1];
    if (w) return w === 'spotting' ? 'spotting today' : `${w} flow today`;
  }
  if (last.includes(ASK.pain)) {
    const n = t.match(/\b(\d{1,2})\b/)?.[1];
    if (n && Number(n) <= 10) return `my cramps are ${n}/10 today`;
    if (/^(none|no|nothing|not really|zero)\b/.test(t)) return 'no cramps today';
    const w = t.match(/\b(mild|little|bad|severe|terrible|strong|moderate)\b/)?.[1];
    if (w) return `I have ${w} cramps today`;
  }
  if (last.includes(ASK.sleep)) {
    const n = t.match(/\b(\d{1,2}(?:\.\d)?)\b/)?.[1];
    if (n) return `I slept ${n} hours`;
  }
  if (last.includes(ASK.mood) || last.includes(ASK.momMood)) return `I feel ${t} today`;
  if (last.includes(ASK.kicks)) {
    const n = t.match(/\b(\d{1,3})\b/)?.[1];
    if (n) return `baby kicked ${n} times today`;
  }
  return null;
}

// ------------------------------------------------------------------ Her Mode

async function herContext(owner: Owner, who: string, pet: string): Promise<HerCtx> {
  const [profile, rawLogs, history] = await Promise.all([
    readDoc<any>('her_profile', null, owner),
    readDoc<any[]>('daily_logs', [], owner),
    readDoc<any[]>('cycle_history', [], owner),
  ]);
  const logs = Array.isArray(rawLogs) ? rawLogs : [];
  const known = Boolean(profile?.last_period_start || logs.length);
  const phase = known ? computePhase({ profile, logs, cycleHistory: Array.isArray(history) ? history : [] }) : null;
  const recent = logs.filter(l => dayNum(l.log_date) >= todayNum() - 7);
  const sleeps = recent.map(l => Number(l.sleep_hours)).filter(n => n > 0);
  const avgSleep = sleeps.length >= 3 ? Math.round((sleeps.reduce((a, b) => a + b, 0) / sleeps.length) * 10) / 10 : null;
  const fatigueDays = logs.filter(l => dayNum(l.log_date) >= todayNum() - 30
    && ((l.symptoms || []).includes('Fatigue') || /fatigued|tired/i.test(String(l.mood || '')))).length;
  const forecast = phase ? pmsForecast(profile, logs, phase.daysUntilPeriod) : null;
  return { who, pet, phase, pms: forecast?.symptoms || [], avgSleep, fatigueDays };
}

async function reliefFor(owner: Owner, severity: number): Promise<string> {
  const fb = await readDoc<ReliefFeedback | null>('relief_feedback', null, owner);
  const tips = pickRelief(fb, 3, severity);
  await writeDoc('relief_feedback', recordShown(fb, tips.map(x => x.id)), owner);
  return reliefText(tips);
}

export async function offlineHerReply(message: string, owner: Owner, name: string, history: Turn[] = []) {
  const who = name || 'friend';
  const pet = endearment('her');
  const last = lastAssistant(history);
  let t = normalize(message);

  // "yes" to an offer Sakhi made
  const offered = Object.entries(OFFER).find(([, q]) => last.endsWith(q))?.[0];
  if (offered && t.split(' ').length <= 4) {
    if (NO.test(t)) return { reply: pick([`No problem, ${pet}. I'm here whenever you need me.`, `Okay ${who}. Just message me anytime.`]), chartData: null };
    if (YES.test(t)) {
      const ctx = await herContext(owner, who, pet);
      const topic = HER_TOPICS.find(x => x.id === offered);
      if (topic) return { reply: topic.answer(ctx), chartData: null };
    }
  }
  t = expandShortAnswer(t, last) ?? t;
  if ((YES.test(t) || NO.test(t)) && t.split(' ').length <= 2) {
    return { reply: pick([`I'm listening, ${pet}. Tell me a little more?`, `Okay ${who}. What's on your mind today?`]), chartData: null };
  }

  const report = extractHer(t);
  const { entry } = report;
  const ctx = await herContext(owner, who, pet);

  let chartData: any = null;
  if (Object.keys(entry).length > 0) chartData = (await runHerTool('log_health_entry', entry, owner))?.chartData ?? null;
  if (report.periodStarted) {
    chartData = (await runHerTool('update_period_info', { last_period_date: new Date().toISOString().slice(0, 10) }, owner))?.chartData ?? chartData;
  }

  // Urgent first
  const pain = Number(entry.cramps_severity ?? -1);
  if (checkSafety(t, 'her', who) || /\bunbearable\b/.test(t) || pain >= 9) {
    return {
      reply: `Oh ${who}, what you're describing can be serious, ${pet}. Please get in-person medical care now, and call 112 if you feel faint or are soaking a pad every hour.`,
      chartData,
    };
  }

  const parts: string[] = [];
  const logged = Object.keys(entry).length > 0 || report.periodStarted;

  // Small talk
  if (!logged) {
    if (GREETING.test(t) && t.split(' ').length <= 5) {
      const where = ctx.phase
        ? ctx.phase.late ? ` Your period is running a little late, so I'm keeping an eye on things with you.`
        : ctx.phase.bleedingDay ? ` You're on day ${ctx.phase.bleedingDay} of your period, so go gently today.`
        : ctx.phase.phase === 'follicular' ? ' You\'re in your follicular phase, when energy often starts to lift.'
        : ctx.phase.phase === 'ovulatory' ? ' You\'re around ovulation, when many women feel their most confident.'
        : ctx.phase.phase === 'luteal' && ctx.phase.daysUntilPeriod <= 5 ? ` Your period is due in about ${ctx.phase.daysUntilPeriod} days, so be extra kind to yourself.`
        : ' You\'re in your luteal phase, a good time to slow down a little.'
        : '';
      return { reply: `${pick(['Hi', 'Hello', 'Hey'])} ${who}, ${pet}!${where} ${ASK.mood}`, chartData };
    }
    if (HOW_ARE_YOU.test(t)) return { reply: `I'm happy you're here, ${who}, thank you for asking! More importantly, how are you feeling today, ${pet}?`, chartData };
    if (THANKS.test(t) && t.split(' ').length <= 6) return { reply: pick([`Always, ${pet}. 💗`, `You're so welcome, ${who}. I'm always here.`, `Anytime, ${pet}. Take care of yourself today.`]), chartData };
    if (BYE.test(t)) return { reply: pick([`Rest well, ${pet}. Talk soon. 🌙`, `Take care, ${who}. I'm here whenever you need me.`]), chartData };
    if (ABOUT.test(t)) {
      return { reply: `I'm Sakhi, your cycle companion, ${pet}. Tell me how you feel ("cramps 6/10, light flow, slept 5 hours") and I'll keep track and spot patterns. You can also ask me things like "when is my next period?", "tips for bloating" or "what should I eat this week?".`, chartData };
    }
  }

  // Acknowledge what was saved
  if (report.periodStarted) {
    parts.push(`I've marked today as day 1 of your period, ${who}. Go gently with yourself, ${pet}; rest, warmth and iron-rich food help.`);
  } else if (report.periodEnded && entry.flow_intensity === 'None' && ctx.phase?.phase === 'menstrual') {
    parts.push(`Glad your period has eased off, ${who}. I've noted that the bleeding has stopped.`);
  }
  const bits: string[] = [];
  if (entry.cramps_severity !== undefined) bits.push(entry.cramps_severity === 0 ? 'no cramps' : `cramps at ${entry.cramps_severity}/10`);
  if (entry.flow_intensity && !report.periodStarted && !(report.periodEnded && entry.flow_intensity === 'None')) {
    bits.push(entry.flow_intensity === 'None' ? 'no bleeding' : entry.flow_intensity === 'Spotting' ? 'spotting' : `${entry.flow_intensity.toLowerCase()} flow`);
  }
  if (entry.sleep_hours !== undefined) bits.push(`${entry.sleep_hours} hours of sleep`);
  if (entry.weight !== undefined) bits.push(`${entry.weight} kg`);
  if (entry.mood) bits.push(`feeling ${moodWord(entry.mood)}`);
  const otherSymptoms = (entry.symptoms || []).filter((s: string) => !(s === 'Cramps' && entry.cramps_severity !== undefined) && !(s === 'Fatigue' && entry.mood === 'Fatigued'));
  if (otherSymptoms.length) bits.push(otherSymptoms.join(', ').toLowerCase());
  if (bits.length) {
    const sad = ['Sad', 'Anxious', 'Irritable', 'Fatigued'].includes(entry.mood) || pain >= 5;
    const opener = sad
      ? pick([`I'm sorry today feels hard, ${who}.`, `Oh ${who}, that sounds like a tough day.`, `Thank you for telling me, ${who}; I'm right here with you.`])
      : pick([`Thank you for telling me, ${who}.`, `Got it, ${who}.`, `Lovely, thank you ${who}.`]);
    parts.push(`${opener} I've noted ${listJoin(bits)}.`);
  }
  if (entry.sleep_hours !== undefined && entry.sleep_hours < 6 && pain < 5) {
    parts.push(`That's not much sleep, ${pet}. An early night and some daylight this morning can make a real difference.`);
  } else if (report.poorSleep && entry.sleep_hours === undefined) {
    parts.push(`I'm sorry you couldn't sleep well, ${pet}.`);
  }

  // Pain relief
  const topics = findTopics(HER_TOPICS, t);
  const wantsRelief = pain >= 5 || topics.some(x => x.id === 'cramps-help');
  if (wantsRelief) {
    const sev = pain >= 0 ? pain : 5;
    parts.push(`A few gentle things that can ease it right now, ${pet}:\n${await reliefFor(owner, sev)}\nIf pain often stops your day or these rarely help, please see a doctor.`);
  }

  // Answers to her questions (skip the ones relief already covers)
  const asking = isQuestion(t) || /\b(tips?|advice|help|ideas?|suggest)\b/.test(t);
  for (const topic of topics) {
    if (topic.id === 'cramps-help') continue;
    if (asking || !logged || HER_ADVICE_ON_REPORT.has(topic.id)) parts.push(topic.answer(ctx));
  }

  // Nothing understood
  if (!parts.length) {
    const fallback = () => pick([
      `I want to understand you properly, ${pet}. In simple mode I'm best with things like "cramps 6/10 and light flow", "I slept 5 hours", or questions like "when is my next period?" or "tips for bloating".`,
      `I didn't quite catch that, ${who}. You can tell me how you feel, or ask about your period, ovulation, PMS, food or exercise for this phase.`,
    ]);
    return { reply: avoidRepeat(fallback(), last, fallback), chartData };
  }

  // One natural follow-up, or an offer, if we didn't just answer a question
  if (!asking) {
    const p = ctx.phase;
    const nearPeriod = p && (p.bleedingDay || p.late || p.phase === 'menstrual' || (p.phase === 'luteal' && p.daysUntilPeriod <= 2));
    // First useful question she wasn't just asked
    const candidates = [
      entry.mood === 'Fatigued' && OFFER.tired,
      (entry.mood === 'Anxious' || entry.mood === 'Sad') && OFFER.stress,
      entry.flow_intensity === undefined && nearPeriod && !report.periodStarted && ASK.flow,
      entry.cramps_severity === undefined && entry.flow_intensity && entry.flow_intensity !== 'None' && ASK.pain,
      entry.mood === undefined && bits.length && ASK.mood,
      entry.sleep_hours === undefined && bits.length && ASK.sleep,
      p?.phase === 'luteal' && p.daysUntilPeriod <= 6 && !p.late && OFFER.pms,
    ].filter((x): x is string => typeof x === 'string');
    const follow = candidates.find(q => !askedRecently(history, q));
    if (follow && !wantsRelief) parts.push(follow);
  }

  return { reply: parts.join('\n\n'), chartData };
}

// ------------------------------------------------------------------ Mom Mode

async function momContext(owner: Owner, who: string, pet: string): Promise<MomCtx> {
  const [profile, rawLogs] = await Promise.all([
    readDoc<any>('preg_profile', null, owner),
    readDoc<any[]>('pregnancy_logs', [], owner),
  ]);
  const logs = Array.isArray(rawLogs) ? rawLogs : [];
  const latest = (f: string) => [...logs].reverse().find(l => l?.[f] !== null && l?.[f] !== undefined);
  const bp = latest('blood_pressure_systolic');
  const sugar = latest('blood_sugar');
  return {
    who, pet,
    weeks: Number(profile?.weeks_pregnant) || null,
    lastBp: bp ? { s: Number(bp.blood_pressure_systolic), d: Number(bp.blood_pressure_diastolic) } : null,
    lastSugar: sugar ? Number(sugar.blood_sugar) : null,
  };
}

export async function offlinePregnancyReply(message: string, owner: Owner, name: string, history: Turn[] = []) {
  const who = name || 'Mama';
  const pet = endearment('pregnancy');
  const last = lastAssistant(history);
  let t = normalize(message);

  const offered = Object.entries(OFFER).find(([, q]) => last.endsWith(q))?.[0];
  if (offered && t.split(' ').length <= 4) {
    if (NO.test(t)) return { reply: `Of course, ${pet}. I'm right here whenever you need me.`, chartData: null };
    if (YES.test(t)) {
      const ctx = await momContext(owner, who, pet);
      const id = offered === 'momFood' ? 'food' : offered === 'momStress' ? 'stress' : offered;
      const topic = MOM_TOPICS.find(x => x.id === id);
      if (topic) return { reply: topic.answer(ctx), chartData: null };
    }
  }
  if (last.includes(ASK.kicks) && t.split(' ').length <= 4) {
    if (YES.test(t)) return { reply: `Lovely, ${pet}! If you counted them, tell me the number and I'll add it to your chart.`, chartData: null };
    if (NO.test(t)) return { reply: `${who}, if baby is moving less than usual today, please lie on your left side and count for 2 hours. If you feel fewer than 10 movements, call your maternity unit now; they would always rather check.`, chartData: null };
  }
  t = expandShortAnswer(t, last) ?? t;

  const { vitals, unclear, week } = extractMom(t);
  let chartData: any = null;
  if (Object.keys(vitals).length > 0) chartData = (await runPregnancyTool('log_pregnancy_vital_entry', vitals, owner))?.chartData ?? null;
  if (week !== undefined) chartData = (await runPregnancyTool('update_pregnancy_progress', { weeks_pregnant: week }, owner))?.chartData ?? chartData;
  const ctx = await momContext(owner, who, pet);

  const sys = vitals.blood_pressure_systolic ?? 0;
  const dia = vitals.blood_pressure_diastolic ?? 0;
  if (unclear.length && Object.keys(vitals).length === 0) {
    return { reply: `${who}, ${pet}, I want to get this right: ${listJoin(unclear)} doesn't look like a usual reading, so I haven't saved it. Could you check the number and tell me again?`, chartData };
  }
  if (sys >= 160 || dia >= 110 || checkSafety(t, 'pregnancy', who)) {
    return { reply: `Dear ${who}, this needs urgent attention. Please go to the hospital or call 112 now. Bleeding, severe pain, vision changes, very high blood pressure, or your baby moving less should always be checked right away.`, chartData };
  }

  const logged = Object.keys(vitals).length > 0 || week !== undefined;
  if (!logged) {
    if (GREETING.test(t) && t.split(' ').length <= 5) {
      const wk = ctx.weeks ? ` You're ${ctx.weeks} weeks along, and baby is about the size of ${sizeFor(ctx.weeks)} now!` : '';
      return { reply: `${pick(['Hi', 'Hello', 'Hey'])} ${who}, ${pet}!${wk} ${ASK.momMood}`, chartData };
    }
    if (HOW_ARE_YOU.test(t)) return { reply: `I'm so happy you're here, ${who}! Tell me, how are you and baby feeling today, ${pet}?`, chartData };
    if (THANKS.test(t) && t.split(' ').length <= 6) return { reply: pick([`Always, ${pet}. 💗`, `You're so welcome, ${who}. Take care of you both.`]), chartData };
    if (BYE.test(t)) return { reply: pick([`Rest well, ${pet}. Talk soon. 🌙`, `Take care, ${who}. Message me anytime.`]), chartData };
    if (ABOUT.test(t)) {
      return { reply: `I'm Sakhi, your pregnancy companion, ${pet}. Tell me your BP (like 118/76), sugar, baby's kicks, weight or how you feel, and I'll keep track. You can also ask me things like "what should I eat this week?", "how big is my baby?" or "when is my next scan?".`, chartData };
    }
  }

  const parts: string[] = [];
  if (sys >= 140 || dia >= 90) {
    parts.push(`${who}, ${pet}, a reading of ${sys}/${dia} is high for pregnancy. Please rest, recheck in 15 minutes, and contact your doctor today, sooner if you get a headache, swelling or blurred vision.`);
  } else if (Object.keys(vitals).length) {
    const bits: string[] = [];
    if (sys) bits.push(`blood pressure ${sys}/${dia}`);
    if (vitals.blood_sugar !== undefined) bits.push(`sugar ${vitals.blood_sugar} mg/dL`);
    if (vitals.baby_movement !== undefined) bits.push(`${vitals.baby_movement} kicks`);
    if (vitals.weight !== undefined) bits.push(`${vitals.weight} kg`);
    if (vitals.sleep_hours !== undefined) bits.push(`${vitals.sleep_hours} hours of sleep`);
    const syms = (vitals.symptoms || []).filter((s: string) => !(s === 'Fatigue' && vitals.mood === 'Fatigued'));
    if (syms.length) bits.push(syms.join(', ').toLowerCase());
    if (vitals.mood) bits.push(`feeling ${moodWord(vitals.mood)}`);
    const low = ['Sad', 'Anxious', 'Fatigued', 'Irritable'].includes(vitals.mood);
    parts.push(`${low ? pick([`I'm sorry it's a hard day, ${who}.`, `Oh ${who}, I hear you.`]) : pick([`Thank you, ${who}.`, `Got it, ${who}.`, `Lovely, ${who}.`])} I've noted ${listJoin(bits)}.`);
    if (sys && sys < 140 && dia < 90) parts.push(pick([`Your BP looks good, ${pet}.`, `That BP is in a healthy range, ${pet}.`]));
    if (vitals.blood_sugar >= 140) parts.push(`That sugar reading is on the higher side, so please mention it to your doctor; a glucose test can clarify it.`);
    if (vitals.baby_movement !== undefined && vitals.baby_movement < 10 && (ctx.weeks ?? 30) >= 28) {
      parts.push(`If you feel fewer than 10 movements in 2 hours, lie on your left side and count again, and call your doctor if it stays low.`);
    }
  }
  if (week !== undefined) parts.push(`Week ${week}, how lovely, ${pet}! Baby is about the size of ${sizeFor(week)} now.`);

  const found = findTopics(MOM_TOPICS, t, 3);
  // "Can I eat papaya?" is about what to avoid, not a general diet question
  const topics = (found.some(x => x.id === "avoid") ? found.filter(x => x.id !== "food") : found).slice(0, 2);
  const asking = isQuestion(t) || /\b(tips?|advice|help|ideas?|suggest)\b/.test(t);
  for (const topic of topics) {
    if (asking || !logged || MOM_ADVICE_ON_REPORT.has(topic.id)) parts.push(topic.answer(ctx));
  }

  if (!parts.length) {
    const fallback = () => pick([
      `I want to understand you properly, ${pet}. In simple mode I'm best with things like "BP 118/76", "baby kicked 12 times", "I weigh 62 kg", or questions like "what should I eat this week?" or "how big is my baby?".`,
      `I didn't quite catch that, ${who}. You can tell me your readings or how you feel, or ask about food, sleep, scans, kicks or common discomforts.`,
    ]);
    return { reply: avoidRepeat(fallback(), last, fallback), chartData };
  }

  if (!asking) {
    const n = Object.keys(vitals).length;
    const candidates = [
      (vitals.mood === 'Anxious' || vitals.mood === 'Sad') && OFFER.momStress,
      vitals.baby_movement === undefined && (ctx.weeks ?? 0) >= 24 && n && ASK.kicks,
      vitals.mood === undefined && n && ASK.momMood,
      week !== undefined && OFFER.momFood,
    ].filter((x): x is string => typeof x === 'string');
    const follow = candidates.find(q => !askedRecently(history, q));
    if (follow) parts.push(follow);
  }
  return { reply: parts.join('\n\n'), chartData };
}
