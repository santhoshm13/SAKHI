/**
 * Deterministic red-flag check that runs BEFORE any AI model. Whatever model is
 * in use (Gemini, a small local model, or none), danger signs always get the
 * same clear, urgent guidance. Patterns are deliberately simple and explicit.
 */

export type SafetyLevel = 'crisis' | 'emergency' | 'urgent';
export interface SafetyHit { level: SafetyLevel; reason: string; reply: string }

const has = (t: string, re: RegExp) => re.test(t);
const NEGATED = /\b(no|not|never|without|don'?t have|didn'?t)\s+(any\s+)?$/i;

/** True when a phrase appears and is not directly negated ("no bleeding"). */
function mentions(t: string, re: RegExp): boolean {
  const m = re.exec(t);
  if (!m) return false;
  const before = t.slice(Math.max(0, m.index - 20), m.index);
  return !NEGATED.test(before);
}

const CRISIS = /\b(suicid\w*|kill (?:myself|me)|end (?:my|it all)|want to die|self[- ]?harm|hurt myself|no reason to live)\b/i;

export function checkSafety(message: string, mode: 'her' | 'pregnancy', name: string): SafetyHit | null {
  const t = message.toLowerCase();
  // Gentle opening, but the action always comes right after it
  const who = `Dear ${name || (mode === 'pregnancy' ? 'mama' : 'friend')}`;

  if (has(t, CRISIS)) {
    return {
      level: 'crisis',
      reason: 'self-harm',
      reply: `${who}, I'm really glad you told me, and I'm sorry you're carrying this. You deserve support right now. Please call Tele-MANAS on 14416 (free, 24/7) or emergency services on 112, or reach out to someone you trust and stay with them. Would you like to tell me what's been happening?`,
    };
  }

  if (mode === 'pregnancy') {
    const bp = t.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    const sys = bp ? Number(bp[1]) : 0;
    const dia = bp ? Number(bp[2]) : 0;
    // Only a plausible reading counts; a mistyped one (80/120) is queried by the extractor instead
    const plausible = sys >= 70 && sys <= 250 && dia >= 40 && dia <= 160 && sys > dia;
    if (plausible && (sys >= 160 || dia >= 110)) {
      return { level: 'emergency', reason: 'severe-bp', reply: `${who}, ${sys}/${dia} is dangerously high in pregnancy. Please go to the hospital or call 112 now, especially if you have a headache, blurred vision or upper belly pain.` };
    }
    if (mentions(t, /\b(bleeding|blood clots?|spotting heavily)\b/)) {
      return { level: 'emergency', reason: 'bleeding', reply: `${who}, bleeding in pregnancy needs to be checked right away. Please contact your doctor or go to the hospital now, and call 112 if it's heavy or you feel faint.` };
    }
    if (mentions(t, /\b(baby (?:is )?not moving|no (?:baby )?movements?|stopped moving|hasn'?t moved|fewer (?:kicks|movements)|less movement|reduced movement)\b/)) {
      return { level: 'emergency', reason: 'reduced-movement', reply: `${who}, a change in your baby's movements should be checked today, not tomorrow. Please call your maternity unit or go to the hospital now; they would always rather see you.` };
    }
    if (mentions(t, /\b(water broke|waters? (?:have )?broken|leaking fluid|gush of fluid)\b/)) {
      return { level: 'emergency', reason: 'membranes', reply: `${who}, if your waters may have broken, please contact your maternity unit or go to the hospital now so they can check you and your baby.` };
    }
    if (mentions(t, /\b(seizure|convulsions?|(?:had|having) a fit)\b/) || mentions(t, /\b(blurr?y vision|blurr?ed vision|seeing spots|flashing lights|vision (?:changes?|problems?))\b/)) {
      return { level: 'emergency', reason: 'preeclampsia-signs', reply: `${who}, sudden vision changes, especially with a headache, or any fit can be a sign of a serious pregnancy condition. Please call 112 or go to the hospital immediately.` };
    }
    if (mentions(t, /\b(severe (?:belly|abdominal|stomach) pain|chest pain|can'?t breathe|struggling to breathe)\b/)) {
      return { level: 'emergency', reason: 'severe-pain', reply: `${who}, severe pain or trouble breathing needs urgent care. Please call 112 or go to the hospital now.` };
    }
    return null;
  }

  // Her Mode
  if (mentions(t, /\b(fainted|passed out|blacked out|unconscious)\b/)) {
    return { level: 'emergency', reason: 'fainting', reply: `${who}, fainting needs medical attention. Please get in-person care now, and call 112 if you feel faint again or are bleeding heavily.` };
  }
  if (mentions(t, /\b(soak(?:ing|ed)? (?:through )?(?:a |my )?(?:pad|tampon)s? (?:every|each) (?:hour|hr)|soaking through|bleeding (?:very )?heavily for hours)\b/)) {
    return { level: 'urgent', reason: 'heavy-bleeding', reply: `${who}, soaking a pad every hour is heavier than a normal period. Please contact a doctor today, and go to hospital now if you feel dizzy, faint or short of breath.` };
  }
  if (/\b(positive (?:pregnancy )?test|might be pregnant|could be pregnant|missed (?:my )?period)\b/.test(t)
    && mentions(t, /\b(severe|sharp|one[- ]sided|stabbing) (?:pain|cramps?)\b/)) {
    return { level: 'emergency', reason: 'possible-ectopic', reply: `${who}, sharp or one-sided pain when you might be pregnant needs to be checked urgently. Please go to the hospital or call 112 now.` };
  }
  if (mentions(t, /\b(fever|chills)\b/) && mentions(t, /\b(pelvic pain|lower (?:belly|abdominal) pain|unusual discharge|smelly discharge)\b/)) {
    return { level: 'urgent', reason: 'infection-signs', reply: `${who}, fever with pelvic pain or unusual discharge can be an infection that needs treatment. Please see a doctor today.` };
  }
  return null;
}
