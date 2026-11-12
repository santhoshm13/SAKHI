import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';

/**
 * Her weight log, shared by Her Mode and Mom Mode:
 *   { entries: [{ date, kg }], heightCm?, preKg? }
 * Kept apart from daily check-ins so logging weight never counts as a check-in.
 */
interface WeightDoc { entries: { date: string; kg: number }[]; heightCm?: number; preKg?: number }

const empty = (): WeightDoc => ({ entries: [] });
const valid = (d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

async function load(owner: Awaited<ReturnType<typeof getOwner>>): Promise<WeightDoc> {
  const doc = await readDoc<WeightDoc | null>('weight_log', null, owner);
  return doc && Array.isArray(doc.entries) ? doc : empty();
}

export async function GET() {
  return NextResponse.json(await load(await getOwner()));
}

// POST { kg?, date?, heightCm?, preKg? }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const owner = await getOwner();
  const doc = await load(owner);

  if (body.kg !== undefined && body.kg !== null && body.kg !== '') {
    const kg = Number(body.kg);
    if (!Number.isFinite(kg) || kg < 25 || kg > 250) {
      return NextResponse.json({ error: 'Please enter a weight between 25 and 250 kg.' }, { status: 400 });
    }
    // Her local date, allowing for India being ahead of the server's UTC
    const latest = new Date(Date.now() + 14 * 3_600_000).toISOString().slice(0, 10);
    const date = valid(body.date) ? body.date : new Date().toISOString().slice(0, 10);
    if (date > latest) return NextResponse.json({ error: 'Date cannot be in the future.' }, { status: 400 });
    doc.entries = [...doc.entries.filter(e => e.date !== date), { date, kg: Math.round(kg * 10) / 10 }]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-400);
  }
  if (body.heightCm !== undefined) {
    const h = Number(body.heightCm);
    if (body.heightCm === null || body.heightCm === '') delete doc.heightCm;
    else if (Number.isFinite(h) && h >= 120 && h <= 220) doc.heightCm = Math.round(h);
    else return NextResponse.json({ error: 'Please enter a height between 120 and 220 cm.' }, { status: 400 });
  }
  if (body.preKg !== undefined) {
    const w = Number(body.preKg);
    if (body.preKg === null || body.preKg === '') delete doc.preKg;
    else if (Number.isFinite(w) && w >= 25 && w <= 250) doc.preKg = Math.round(w * 10) / 10;
    else return NextResponse.json({ error: 'Please enter a weight between 25 and 250 kg.' }, { status: 400 });
  }
  await writeDoc('weight_log', doc, owner);
  return NextResponse.json({ success: true, ...doc });
}

// DELETE ?date=YYYY-MM-DD removes one manual entry
export async function DELETE(req: Request) {
  const date = new URL(req.url).searchParams.get('date');
  if (!valid(date)) return NextResponse.json({ error: 'date is required' }, { status: 400 });
  const owner = await getOwner();
  const doc = await load(owner);
  doc.entries = doc.entries.filter(e => e.date !== date);
  await writeDoc('weight_log', doc, owner);
  return NextResponse.json({ success: true, ...doc });
}
