import { NextResponse } from 'next/server';
import { getOwner, storageMode } from '@/lib/store';
import { clearHistory, loadHistory, type ChatMode } from '@/lib/chat/engine';

const modeOf = (req: Request): ChatMode | null => {
  const m = new URL(req.url).searchParams.get('mode');
  return m === 'her' || m === 'pregnancy' ? m : null;
};

// GET ?mode=her|pregnancy  -> { messages, stored }  (stored=false: the browser keeps history)
export async function GET(req: Request) {
  const mode = modeOf(req);
  if (!mode) return NextResponse.json({ error: 'mode must be her or pregnancy' }, { status: 400 });
  const owner = await getOwner();
  const stored = (await storageMode()) !== 'cookie';
  const messages = stored ? await loadHistory(owner, mode) : [];
  return NextResponse.json({ messages, stored });
}

export async function DELETE(req: Request) {
  const mode = modeOf(req);
  if (!mode) return NextResponse.json({ error: 'mode must be her or pregnancy' }, { status: 400 });
  await clearHistory(await getOwner(), mode);
  return NextResponse.json({ success: true });
}
