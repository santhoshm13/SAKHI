/**
 * Optional local / self-hosted model through any OpenAI-compatible server
 * (Ollama, llama.cpp `llama-server`, LM Studio, vLLM, `cactus serve` ...).
 *
 *   LOCAL_LLM_URL      e.g. http://localhost:11434/v1
 *   LOCAL_LLM_MODEL    e.g. gemma3:1b (default "local")
 *   LOCAL_LLM_API_KEY  optional bearer token
 *
 * Small models are unreliable at function calling, so they never decide what
 * gets saved: the rule-based extractor saves the data, and the model only
 * rewrites the reply in a warmer, more contextual way.
 */
export interface LlmMessage { role: 'system' | 'user' | 'assistant'; content: string }

const TIMEOUT_MS = 15_000;
const DOWN_MS = 60_000;
let downUntil = 0;
let lastError: string | null = null;

export const localLlmConfigured = () => Boolean(process.env.LOCAL_LLM_URL);
export const localLlmModel = () => process.env.LOCAL_LLM_MODEL || 'local';
export const localLlmState = () => ({
  configured: localLlmConfigured(),
  model: localLlmConfigured() ? localLlmModel() : null,
  coolingDown: Date.now() < downUntil,
  lastError,
});

export async function localChat(messages: LlmMessage[], maxTokens = 300): Promise<string | null> {
  const base = process.env.LOCAL_LLM_URL;
  if (!base || Date.now() < downUntil) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LOCAL_LLM_API_KEY ? { Authorization: `Bearer ${process.env.LOCAL_LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({ model: localLlmModel(), messages, temperature: 0.5, max_tokens: maxTokens, stream: false }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: any = await res.json();
    const text = String(json?.choices?.[0]?.message?.content || '').trim();
    lastError = null;
    // Some reasoning models wrap their thoughts in <think> tags
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim() || null;
  } catch (err: any) {
    lastError = err?.name === 'AbortError' ? 'timeout' : String(err?.message || err).slice(0, 120);
    downUntil = Date.now() + DOWN_MS;
    console.warn('[local-llm] unavailable:', lastError);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Reachability check for the status endpoint (GET /models, 3 s). */
export async function pingLocalLlm(): Promise<boolean> {
  const base = process.env.LOCAL_LLM_URL;
  if (!base) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/models`, {
      headers: process.env.LOCAL_LLM_API_KEY ? { Authorization: `Bearer ${process.env.LOCAL_LLM_API_KEY}` } : {},
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
