import { NextResponse } from 'next/server';
import { getOwner } from '@/lib/store';
import { runHerTool } from '@/lib/sakhiTools';

// POST { date?: 'YYYY-MM-DD' } : "my period started" from the phase card.
// Uses the same tool as the chat so cycle history stays consistent.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const today = new Date().toISOString().slice(0, 10);
  // Her local date may be a day ahead of the server's UTC date (India is UTC+5:30)
  const latest = new Date(Date.now() + 14 * 3_600_000).toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? String(body.date) : today;
  if (date > latest) return NextResponse.json({ error: 'Date cannot be in the future' }, { status: 400 });
  const owner = await getOwner();
  const result = await runHerTool('update_period_info', { last_period_date: date }, owner);
  return NextResponse.json({ success: true, chartData: result?.chartData ?? null });
}
