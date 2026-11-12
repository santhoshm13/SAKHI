import { NextResponse } from 'next/server';
import { getOwner, readDoc, storageMode } from '@/lib/store';
import { getPoolDiagnosticInfo } from '@/lib/gemini';
import { dailyLimit, geminiModel, usageCounters, usageToday } from '@/lib/chat/engine';
import { localLlmState, pingLocalLlm } from '@/lib/chat/localLlm';

/**
 * Which AI engines are available and how much of today's allowance she has used.
 * Never exposes keys: only counts.
 */
export async function GET(req: Request) {
  const owner = await getOwner();
  const pool = getPoolDiagnosticInfo();
  const local = localLlmState();
  const check = new URL(req.url).searchParams.get('ping') === '1';
  const [used, consent, storage, reachable] = await Promise.all([
    usageToday(owner),
    readDoc<any>('consent', null, owner),
    storageMode(),
    check && local.configured ? pingLocalLlm() : Promise.resolve(null),
  ]);
  return NextResponse.json({
    gemini: { configured: pool.totalKeys > 0, keys: pool.totalKeys, activeKeys: pool.activeKeys, coolingDown: pool.cooldownKeys, model: geminiModel() },
    local: { ...local, reachable },
    you: {
      usedToday: used,
      dailyLimit: dailyLimit(),
      privateMode: consent?.privateMode === true,
      aiProcessing: consent?.aiProcessing !== false,
    },
    storage,
    sinceColdStart: usageCounters(),
  });
}
