/**
 * Which language Sakhi replies in: the language she picked in Settings, or the
 * script she is writing in (Devanagari, Tamil or Telugu), whichever applies.
 * Gemini and a local model follow this rule; the rule-based offline replies
 * are English only.
 */
export type ReplyLang = 'en' | 'hi' | 'ta' | 'te';

const NAMES: Record<Exclude<ReplyLang, 'en'>, { name: string; script: string }> = {
  hi: { name: 'Hindi', script: 'Devanagari' },
  ta: { name: 'Tamil', script: 'Tamil' },
  te: { name: 'Telugu', script: 'Telugu' },
};

export function replyLang(setting: unknown, message: string): ReplyLang {
  if (/[ऀ-ॿ]/.test(message)) return 'hi';
  if (/[஀-௿]/.test(message)) return 'ta';
  if (/[ఀ-౿]/.test(message)) return 'te';
  const code = String(setting || '').slice(0, 2).toLowerCase();
  return code === 'hi' || code === 'ta' || code === 'te' ? code : 'en';
}

export function languageRule(lang: ReplyLang) {
  if (lang === 'en') return '';
  const { name, script } = NAMES[lang];
  return `
LANGUAGE:
- Reply only in ${name}, written in ${script} script, with simple everyday words a village woman would use. Common English health words (BP, sugar, scan, tablet, doctor) are fine as they are.
- Keep every number as digits (120/80, 9 kg, 28 days). Phone numbers like 112 and 14416 stay as digits.
- Tool calls and saved data stay in English; only your reply to her is in ${name}.`;
}
