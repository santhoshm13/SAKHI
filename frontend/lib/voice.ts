"use client";
/**
 * Browser voice helpers (Web Speech API), shared by every Sakhi chat.
 *  - speak(): cleans markdown/emoji, speaks sentence by sentence (Chrome cuts
 *    long utterances off), picks a natural voice for her language, and reports
 *    word boundaries so the doll's mouth moves with the words.
 *  - createRecognizer(): speech-to-text in her chosen accent (en-IN by default),
 *    with readable error messages.
 */

export const VOICE_ENABLED_KEY = 'sakhi_voice_enabled';
export const VOICE_LANG_KEY = 'sakhi_voice_lang';
export const VOICE_LANGS = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-US', label: 'English (US)' },
];

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export function getVoiceLang(): string {
  const v = read(VOICE_LANG_KEY);
  return VOICE_LANGS.some(l => l.code === v) ? (v as string) : 'en-IN';
}

export const voiceEnabled = () => read(VOICE_ENABLED_KEY) !== 'false';
export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const recognitionSupported = () =>
  typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

/** Text as it should be heard: no markdown symbols, emoji or links. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>~]+/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Sentences of at most ~180 characters. */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
  const out: string[] = [];
  for (const raw of parts) {
    let s = raw.trim();
    if (!s) continue;
    while (s.length > 180) {
      const cut = s.lastIndexOf(',', 180) > 60 ? s.lastIndexOf(',', 180) + 1 : s.lastIndexOf(' ', 180);
      out.push(s.slice(0, cut > 0 ? cut : 180).trim());
      s = s.slice(cut > 0 ? cut : 180).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

/** "girl" is a young girl's voice (the default); "woman" is the grown-up one. */
export type VoiceStyle = 'girl' | 'woman';
export const VOICE_STYLE_KEY = 'sakhi_voice_style';
export const VOICE_STYLES: { code: VoiceStyle; label: string }[] = [
  { code: 'girl', label: 'Young girl' },
  { code: 'woman', label: 'Woman' },
];
export const getVoiceStyle = (): VoiceStyle => (read(VOICE_STYLE_KEY) === 'woman' ? 'woman' : 'girl');

// Female, natural-sounding voices that ship with common browsers / OSes
const PREFERRED = /neerja|heera|veena|kalpana|swara|lekha|pallavi|shruti|google हिन्दी|google uk english female|sonia|libby|aria|jenny|samantha|tessa|victoria|zira|female/i;
// Real child voices: Microsoft Ana (US) and Maisie (UK) come with Edge's online voices
const GIRL = /\b(ana|maisie)\b/i;

const norm = (l: string) => l.replace('_', '-').toLowerCase();

/** A real girl's voice if this browser has one. */
function childVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const kids = voices.filter(v => GIRL.test(v.name) && norm(v.lang).startsWith('en'));
  return kids.find(v => norm(v.lang) === lang.toLowerCase()) || kids[0] || null;
}

export function pickVoice(lang: string, style: VoiceStyle = 'woman'): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const isEnglish = lang.toLowerCase().startsWith('en');
  // The girl voices (Ana, Maisie) only speak English
  if (style === 'girl' && isEnglish) {
    const kid = childVoice(voices, lang);
    if (kid) return kid;
  }
  const exact = voices.filter(v => norm(v.lang) === lang.toLowerCase());
  // Same language from another region (e.g. hi) before falling back to English
  const family = voices.filter(v => norm(v.lang).split('-')[0] === lang.toLowerCase().split('-')[0]);
  if (!isEnglish && (exact.length || family.length)) {
    const pool = exact.length ? exact : family;
    return pool.find(v => PREFERRED.test(v.name) && /natural|online/i.test(v.name)) || pool.find(v => PREFERRED.test(v.name)) || pool[0];
  }
  const english = voices.filter(v => norm(v.lang).startsWith('en'));
  return exact.find(v => PREFERRED.test(v.name) && /natural|online/i.test(v.name))
    || exact.find(v => PREFERRED.test(v.name))
    || english.find(v => PREFERRED.test(v.name) && /natural|online/i.test(v.name))
    || english.find(v => PREFERRED.test(v.name))
    || exact[0] || english[0] || null;
}

/**
 * How to say it. A real child voice is used as it is; otherwise a girl's voice is
 * made from a woman's by raising the pitch and speeding up a touch.
 */
function delivery(style: VoiceStyle, voice: SpeechSynthesisVoice | null) {
  if (style === 'woman') return { pitch: 1.05, rate: 0.97 };
  if (voice && GIRL.test(voice.name)) return { pitch: 1.1, rate: 1 };
  return { pitch: 1.6, rate: 1.04 };
}

let session = 0;

export function stopSpeaking() {
  session++;
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** Speak a reply. Resolves when finished or interrupted. */
export function speak(text: string, handlers: { onStart?: () => void; onEnd?: () => void; onWord?: () => void } = {}): Promise<void> {
  if (!speechSupported()) return Promise.resolve();
  stopSpeaking();
  const mine = ++session;
  const lang = getVoiceLang();
  const style = getVoiceStyle();
  const voice = pickVoice(lang, style);
  const { pitch, rate } = delivery(style, voice);
  const chunks = splitSentences(cleanForSpeech(text));
  if (!chunks.length) return Promise.resolve();

  return new Promise(resolve => {
    let started = false;
    let done = false;
    // A newer speak() takes over the handlers, so only the current session reports its end
    const finish = () => { if (done) return; done = true; if (mine === session) handlers.onEnd?.(); resolve(); };
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || lang;
      u.rate = rate;
      u.pitch = pitch;
      u.volume = 1;
      u.onstart = () => { if (!started && mine === session) { started = true; handlers.onStart?.(); } };
      u.onboundary = (e: any) => { if (mine === session && (!e.name || e.name === 'word')) handlers.onWord?.(); };
      u.onerror = () => { if (i === chunks.length - 1 || mine !== session) finish(); };
      u.onend = () => { if (i === chunks.length - 1 || mine !== session) finish(); };
      window.speechSynthesis.speak(u);
    });
    // Chrome sometimes never fires onend after a cancel; give up after a while
    const guard = setInterval(() => {
      if (mine !== session || !window.speechSynthesis.speaking) { clearInterval(guard); if (mine !== session) finish(); }
    }, 1000);
  });
}

const MIC_ERRORS: Record<string, string> = {
  'not-allowed': "Microphone access is blocked. Allow it in your browser's site settings, then tap the mic again.",
  'service-not-allowed': "Voice input is turned off in this browser. You can still type to me.",
  'no-speech': "I didn't hear anything. Tap the mic and try again.",
  'audio-capture': 'No microphone was found on this device.',
  network: 'Voice input needs an internet connection in this browser.',
};

export interface Recognizer { start: () => void; stop: () => void }

export function createRecognizer(h: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): Recognizer | null {
  if (!recognitionSupported()) return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  let rec: any = null;
  let finalText = '';
  return {
    start() {
      try { rec?.abort(); } catch { /* ignore */ }
      rec = new SR();
      rec.lang = getVoiceLang();
      rec.continuous = false;
      rec.interimResults = true;
      finalText = '';
      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        h.onInterim((finalText + interim).trim());
      };
      rec.onerror = (e: any) => { if (e.error !== 'aborted') h.onError(MIC_ERRORS[e.error] || 'Voice input stopped unexpectedly. Please try again.'); };
      rec.onend = () => {
        const text = finalText.trim();
        if (text) h.onFinal(text);
        h.onEnd();
      };
      try { rec.start(); } catch { h.onError('Voice input is busy. Please try again.'); h.onEnd(); }
    },
    stop() { try { rec?.stop(); } catch { /* ignore */ } },
  };
}
