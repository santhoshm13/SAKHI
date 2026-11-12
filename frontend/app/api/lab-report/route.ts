import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';
import { LAB_TESTS, cleanValue, type LabKey, type LabResult } from '@/lib/labs';

/**
 * Lab results she confirmed from a report photo or typed in.
 *   GET    -> { results: LabResult[] }
 *   POST   { date, values: { [key]: value }, source?, mode? } -> saves them
 *   DELETE { date, key } -> removes one result
 * In Mom Mode a fasting sugar or BP from the report also goes into her vitals,
 * so the pregnancy risk check can use it.
 */
const isDay = (d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

async function load(owner: Awaited<ReturnType<typeof getOwner>>): Promise<LabResult[]> {
  const doc = await readDoc<LabResult[]>('lab_results', [], owner);
  return Array.isArray(doc) ? doc : [];
}

export async function GET() {
  const results = await load(await getOwner());
  return NextResponse.json({ results: results.sort((a, b) => b.date.localeCompare(a.date)) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const date = String(body?.date || '');
    if (!isDay(date) || Date.parse(date) > Date.now() + 86_400_000) {
      return NextResponse.json({ error: 'Please pick the date printed on the report.' }, { status: 400 });
    }
    const source = body?.source === 'photo' ? 'photo' : 'manual';
    const incoming: LabResult[] = [];
    for (const t of LAB_TESTS) {
      const v = cleanValue(t.key, body?.values?.[t.key]);
      if (v !== null) incoming.push({ date, key: t.key as LabKey, value: v, source });
    }
    if (!incoming.length) return NextResponse.json({ error: 'No readable values to save.' }, { status: 400 });

    const owner = await getOwner();
    const results = (await load(owner)).filter(r => !(r.date === date && incoming.some(i => i.key === r.key)));
    results.push(...incoming);
    results.sort((a, b) => a.date.localeCompare(b.date));
    await writeDoc('lab_results', results.slice(-300), owner);

    if (body?.mode === 'pregnancy') {
      const sugar = incoming.find(r => r.key === 'fasting_sugar');
      const bp = incoming.find(r => r.key === 'bp');
      if (sugar || bp) {
        const logs = await readDoc<any[]>('pregnancy_logs', [], owner);
        const list = Array.isArray(logs) ? logs.slice() : [];
        const i = list.findIndex(l => String(l?.log_date || '').slice(0, 10) === date);
        const entry: any = i >= 0 ? { ...list[i] } : { log_date: date, symptoms: ['None'], source: 'lab' };
        if (sugar) entry.blood_sugar = Number(sugar.value);
        if (bp) {
          const [s, d] = String(bp.value).split('/').map(Number);
          entry.blood_pressure_systolic = s;
          entry.blood_pressure_diastolic = d;
        }
        if (i >= 0) list[i] = entry; else list.push(entry);
        list.sort((a, b) => String(a.log_date).localeCompare(String(b.log_date)));
        await writeDoc('pregnancy_logs', list, owner);
      }
    }
    return NextResponse.json({ success: true, saved: incoming, results });
  } catch (err) {
    console.error('[lab-report] save failed', err);
    return NextResponse.json({ error: 'Could not save the results. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const owner = await getOwner();
  const results = (await load(owner)).filter(r => !(r.date === body?.date && r.key === body?.key));
  await writeDoc('lab_results', results, owner);
  return NextResponse.json({ success: true, results });
}
