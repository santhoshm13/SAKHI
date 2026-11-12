import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOwner, readDoc } from '@/lib/store';
import { clientKey, rateLimit } from '@/lib/rateLimit';
import { runSakhiChat } from '@/lib/chat/engine';

/**
 * Mom Mode chat. All logic (safety check, memory, Gemini / local model / offline
 * fallback, tools) lives in lib/chat/engine.ts so both modes behave the same.
 */
export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const raw = body.message ?? body.prompt;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  const message = raw.trim().slice(0, 2000);

  try {
    const owner = await getOwner();
    // 20 messages/minute per user+IP protects the shared Gemini key pool
    const limit = rateLimit(`chat:${clientKey(req, owner.key)}`, 20, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many messages', reply: "Let's take a short breath together. Please try again in a moment." },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }
    const cookieStore = await cookies();
    const profile = (await readDoc<any>('preg_profile', null, owner)) || body.data?.profile;
    const name: string = String(
      body.userName || profile?.preferred_name || cookieStore.get('sakhi_preferred_name')?.value || owner.name?.split(' ')[0] || 'Mama'
    ).slice(0, 60);

    const result = await runSakhiChat({ mode: 'pregnancy', message, owner, name, clientHistory: body.history, lang: typeof body.lang === 'string' ? body.lang.slice(0, 8) : undefined });
    return NextResponse.json({
      reply: result.reply,
      chartUpdates: result.chartUpdates,
      // kept for older clients
      updatedChartData: result.chartUpdates[0] ?? null,
      engine: result.engine,
      notice: result.notice ?? null,
      offline: result.engine !== 'gemini',
    });
  } catch (error: any) {
    console.error('Mom Mode chat error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', reply: "I'm having a little trouble connecting right now. Please give me a moment and ask again gently." },
      { status: 500 }
    );
  }
}
