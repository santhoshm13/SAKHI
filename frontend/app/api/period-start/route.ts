import { NextResponse } from 'next/server';
import { getOwner } from '@/lib/store';
import { runHerTool } from '@/lib/sakhiTools';

// POST { date?: 'YYYY-MM-DD', correction?: boolean } : "my period started" from the phase card.
// correction = she picked the date herself ("started on another day?"), so it may move
// the start of the current period; otherwise a date inside it is kept as the same period.
// Uses the same tool as the chat so cycle history stays consistent.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const today = new Date().toISOString().slice(0, 10);
  // Her local date may be a day ahead of the server's UTC date (India is UTC+5:30)
  const latest = new Date(Date.now() + 14 * 3_600_000).toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? String(body.date) : today;
  if (date > latest) return NextResponse.json({ error: 'Date cannot be in the future' }, { status: 400 });
  const owner = await getOwner();
  const result = await runHerTool('update_period_info', { last_period_date: date, is_correction: body.correction === true }, owner);
  return NextResponse.json({
    success: true,
    samePeriod: Boolean(result?.apiResult?.samePeriod),
    periodDay: result?.apiResult?.periodDay ?? null,
    chartData: result?.chartData ?? null,
  });
}
