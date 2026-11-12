/**
 * One chat pipeline for Her Mode and Mom Mode.
 *
 *   1. Safety check (rules, before any model): danger signs get fixed urgent advice.
 *   2. Gemini, when keys exist, she allowed AI processing, private mode is off
 *      and today's AI allowance isn't used up. Remembers the last turns, sees a
 *      short summary of her own data, and may call several tools per reply.
 *   3. A local / self-hosted model (LOCAL_LLM_URL), used for private mode or
 *      when Gemini is unavailable. Rules save the data; the model phrases the reply.
 *   4. Offline rules, which always work.
 */
import { Owner, readDoc, storageMode, writeDoc } from '@/lib/store';
import { logTabletsFromChat } from '@/lib/tabletChat';
import { extractHer, extractMom, normalize } from '@/lib/chat/offline/extract';
import { executeGeminiWithAutoSwitch, getGeminiKeyPool } from '@/lib/gemini';
import { onceper, runHerTool, runPregnancyTool } from '@/lib/sakhiTools';
import { offlineHerReply, offlinePregnancyReply } from '@/lib/offlineChat';
import { checkSafety } from './safety';
import { TONE_RULES } from './tone';
import { languageRule, replyLang, type ReplyLang } from './language';
import { herContext, pregContext } from './context';
import { localChat, localLlmConfigured } from './localLlm';
import * as her from './herSpec';
import * as preg from './pregSpec';

export type ChatMode = 'her' | 'pregnancy';
export type Engine = 'gemini' | 'local' | 'offline' | 'safety';
export interface ChatTurn { role: 'user' | 'assistant'; text: string; at: string; engine?: Engine }
export interface ChatResult {
  reply: string;
  chartUpdates: any[];
  engine: Engine;
  /** why a lighter engine answered: 'private' | 'no-consent' | 'daily-limit' | 'unavailable' | 'no-key' */
  notice?: string;
}

const KEEP = 40;   // turns stored
const SEND = 10;   // turns given to the model
const FALLBACK_MODEL = 'gemini-flash-lite-latest';
let activeModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

export const dailyLimit = () => Math.max(1, Number(process.env.SAKHI_AI_DAILY_LIMIT) || 50);
export const geminiModel = () => activeModel;
export const historyKind = (mode: ChatMode) => (mode === 'her' ? 'chat_her' : 'chat_mom') as 'chat_her' | 'chat_mom';

// Process-wide counters for /api/ai-status (reset on cold start)
const counters = { since: new Date().toISOString(), gemini: 0, local: 0, offline: 0, safety: 0, geminiErrors: 0 };
export const usageCounters = () => ({ ...counters });

const today = () => new Date().toISOString().slice(0, 10);

export async function usageToday(owner: Owner): Promise<number> {
  const u = await readDoc<{ date: string; count: number } | null>('ai_usage', null, owner);
  return u && u.date === today() ? Number(u.count) || 0 : 0;
}

async function bumpUsage(owner: Owner) {
  const used = await usageToday(owner);
  await writeDoc('ai_usage', { date: today(), count: used + 1 }, owner);
}

function cleanHistory(raw: any): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(t => t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string' && t.text.trim())
    .map(t => ({ role: t.role, text: String(t.text).slice(0, 2000), at: String(t.at || ''), engine: t.engine }))
    .slice(-KEEP);
}

export async function loadHistory(owner: Owner, mode: ChatMode): Promise<ChatTurn[]> {
  return cleanHistory(await readDoc<any[]>(historyKind(mode), [], owner));
}

export async function clearHistory(owner: Owner, mode: ChatMode) {
  await writeDoc(historyKind(mode), [], owner);
}

const STYLE_RULES = (date: string) => `
STYLE:
- Today is ${date}. Reply in 2-4 short sentences unless she asks for detail. Replies may be read aloud, so avoid tables and long lists; simple "- " bullets or **bold** are fine.
- Remember what she said earlier in this conversation and refer back to it naturally.
- Use the private data summary below to make answers specific to her, but never read it out as a list or mention that you have a "summary".
- Never invent readings or dates. If something is unclear, ask one short question.`;

const isModelMissing = (err: any) => /not found|404|is not supported|unknown model/i.test(String(err?.message || err));

async function geminiReply(opts: {
  mode: ChatMode; message: string; owner: Owner; name: string; history: ChatTurn[]; context: string; lang: ReplyLang;
}): Promise<{ reply: string; chartUpdates: any[] }> {
  const { mode, message, owner, name, history, context, lang } = opts;
  const prompt = mode === 'her' ? her.SYSTEM_PROMPT(name || 'friend') : preg.SYSTEM_PROMPT(name || 'Mama');
  const systemInstruction = `${prompt}\n${TONE_RULES(mode)}\n${STYLE_RULES(today())}${languageRule(lang)}\n\nPRIVATE DATA SUMMARY (for your understanding only):\n${context}`;
  const tools = mode === 'her'
    ? [her.log_health_entry_declaration, her.update_period_info_declaration, her.analyze_cycle_declaration]
    : [preg.log_pregnancy_vital_declaration, preg.update_pregnancy_progress_declaration,
       preg.schedule_pregnancy_appointment_declaration, preg.log_pregnancy_nutrition_declaration];
  const runTool = onceper(mode === 'her' ? runHerTool : runPregnancyTool);

  // Gemini expects the history to start with a user turn
  let past = history.slice(-SEND);
  while (past.length && past[0].role !== 'user') past = past.slice(1);
  const contents = past.map(t => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.text }] }));

  const run = async (ai: any, model: string) => {
    const chat = ai.chats.create({
      model,
      history: contents,
      config: { systemInstruction, tools: [{ functionDeclarations: tools as any }], temperature: 0.6, maxOutputTokens: 500 },
    });
    const chartUpdates: any[] = [];
    let response = await chat.sendMessage({ message });
    // She may mention several things at once ("BP 120/80 and my scan is on Friday"),
    // so run every requested tool, for up to 3 rounds.
    for (let round = 0; round < 3 && response.functionCalls?.length; round++) {
      const parts: any[] = [];
      for (const call of response.functionCalls) {
        let apiResult: any;
        try {
          const outcome = await runTool(call.name || '', call.args || {}, owner);
          apiResult = outcome?.apiResult ?? { error: `Unknown tool ${call.name}` };
          if (outcome?.chartData) chartUpdates.push(outcome.chartData);
        } catch (err) {
          console.error('[chat] tool failed:', call.name, err);
          apiResult = { error: 'Could not save that right now.' };
        }
        parts.push({ functionResponse: { name: call.name, response: apiResult } });
      }
      response = await chat.sendMessage({ message: parts });
    }
    const reply = String(response.text || '').trim();
    if (!reply) throw new Error('Empty reply from Gemini');
    return { reply, chartUpdates };
  };

  return executeGeminiWithAutoSwitch(async (ai) => {
    try {
      return await run(ai, activeModel);
    } catch (err) {
      if (activeModel !== FALLBACK_MODEL && isModelMissing(err)) {
        console.warn(`[chat] model ${activeModel} unavailable, switching to ${FALLBACK_MODEL}`);
        activeModel = FALLBACK_MODEL;
        return run(ai, activeModel);
      }
      throw err;
    }
  });
}

async function localReply(opts: {
  mode: ChatMode; message: string; name: string; history: ChatTurn[]; context: string; draft: string; lang: ReplyLang;
}): Promise<string | null> {
  const { mode, message, name, history, context, draft, lang } = opts;
  const persona = mode === 'her'
    ? `You are Sakhi, a warm menstrual health companion talking with ${name || 'a friend'}.`
    : `You are Sakhi, a warm pregnancy companion talking with ${name || 'a mother'}.`;
  const system = `${persona}
You will see her message and a DRAFT reply that is already correct. Rewrite the draft so it sounds soft, soothing and natural and refers to what she said, in 2-4 short sentences. Use one gentle endearment such as "dear", "sweetheart" or "princess".
Rules: keep every number, every safety instruction and every relief step from the draft. Do not add medicines, doses or diagnoses. Do not mention the draft.
About her: ${context.replace(/\n/g, ' ')}${languageRule(lang)}`;
  const messages = [
    { role: 'system' as const, content: system },
    ...history.slice(-6).map(t => ({ role: t.role, content: t.text })),
    { role: 'user' as const, content: `${message}\n\n[DRAFT REPLY]\n${draft}` },
  ];
  return localChat(messages);
}

export async function runSakhiChat(input: {
  mode: ChatMode; message: string; owner: Owner; name: string; clientHistory?: any; lang?: string;
}): Promise<ChatResult> {
  const { mode, message, owner, name } = input;
  const lang = replyLang(input.lang, message);
  const offline = mode === 'her' ? offlineHerReply : offlinePregnancyReply;

  // Without database/file storage, history lives in the browser and is sent along
  let history = await loadHistory(owner, mode);
  if (!history.length && input.clientHistory) history = cleanHistory(input.clientHistory);

  const result = await (async (): Promise<ChatResult> => {
    // 1. Safety first: still save whatever she reported, but answer with fixed guidance
    const hit = checkSafety(message, mode, name);
    if (hit) {
      const saved = await offline(message, owner, name).catch(() => null);
      const chartUpdates = saved?.chartData ? [saved.chartData] : [];
      if (hit.level === 'emergency' || hit.level === 'crisis') chartUpdates.push({ type: 'emergency', data: true, reason: hit.reason, level: hit.level });
      return { reply: hit.reply, chartUpdates, engine: 'safety' };
    }

    // Tablet ledger: "took my iron tablet" is saved the same way whatever answers
    const tablet = await logTabletsFromChat(owner, message).catch(() => null);
    const tabletUpdates = tablet?.chartUpdate ? [tablet.chartUpdate] : [];
    if (tablet) {
      const other = mode === 'her'
        ? (() => { const r = extractHer(normalize(message)); return Object.keys(r.entry).length > 0 || r.periodStarted; })()
        : (() => { const r = extractMom(normalize(message)); return Object.keys(r.vitals).length > 0 || r.week !== undefined; })();
      if (!other) return { reply: tablet.reply, chartUpdates: tabletUpdates, engine: 'offline' };
    }

    const consent = await readDoc<any>('consent', null, owner);
    const baseContext = mode === 'her' ? await herContext(owner) : (await pregContext(owner)).text;
    const context = tablet ? `${baseContext}
${tablet.summary} Mention this briefly in your reply.` : baseContext;

    let notice: string | undefined;
    if (consent?.aiProcessing === false) notice = 'no-consent';
    else if (consent?.privateMode === true) notice = 'private';
    else if (getGeminiKeyPool().length === 0) notice = 'no-key';
    else if ((await usageToday(owner)) >= dailyLimit()) notice = 'daily-limit';

    // 2. Gemini
    if (!notice) {
      try {
        const g = await geminiReply({ mode, message, owner, name, history, context, lang });
        await bumpUsage(owner);
        return { ...g, chartUpdates: [...tabletUpdates, ...g.chartUpdates], engine: 'gemini' };
      } catch (err: any) {
        counters.geminiErrors++;
        console.warn('[chat] Gemini unavailable:', err?.message || err);
        notice = 'unavailable';
      }
    }

    // 3 + 4. Rules save the data; a local model (if any, and if she allowed AI) phrases it
    const off = await offline(message, owner, name, history);
    if (tablet) off.reply = `${tablet.reply} ${off.reply}`;
    const chartUpdates = [...tabletUpdates, ...(off.chartData ? [off.chartData] : [])];
    const keepAsIs = /hospital|emergency|112|haven't saved/i.test(off.reply);
    if (notice !== 'no-consent' && localLlmConfigured() && !keepAsIs) {
      const text = await localReply({ mode, message, name, history, context, draft: off.reply, lang });
      if (text) return { reply: text, chartUpdates, engine: 'local', notice };
    }
    return { reply: off.reply, chartUpdates, engine: 'offline', notice: lang !== 'en' ? 'english-only' : notice };
  })();

  counters[result.engine]++;
  const at = new Date().toISOString();
  const next = [...history, { role: 'user' as const, text: message, at }, { role: 'assistant' as const, text: result.reply, at, engine: result.engine }];
  if ((await storageMode()) !== 'cookie') await writeDoc(historyKind(mode), next.slice(-KEEP), owner);
  return result;
}
