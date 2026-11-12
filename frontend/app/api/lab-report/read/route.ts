import { NextResponse } from 'next/server';
import { getOwner } from '@/lib/store';
import { executeGeminiWithAutoSwitch, getGeminiKeyPool } from '@/lib/gemini';
import { rateLimit, clientKey } from '@/lib/rateLimit';
import { LAB_TESTS, cleanValue, parseReportDate, type LabValue } from '@/lib/labs';

/**
 * Read a lab report photo with Gemini. The image is only passed through to the
 * model and never stored. Returns 503 { fallback: true } when no AI key is set,
 * and the browser then reads the photo on the device instead.
 */
export const maxDuration = 30;

const MAX_BYTES = 6 * 1024 * 1024;

const PROMPT = `You read Indian medical lab reports. From this photo, extract only these tests if present:
${LAB_TESTS.map(t => `- ${t.key}: ${t.label}${t.unit ? ` (${t.unit})` : ''}`).join('\n')}
Rules: copy the patient's result, never the reference range. Platelets in thousands per microlitre (2.4 lakh = 240).
urine_protein as nil, trace, 1+, 2+, 3+ or 4+. bp as "systolic/diastolic".
A 2-hour or post-meal glucose, or a 75 g OGTT 2-hour value, is pp_sugar.
report_date is the sample collection or report date as YYYY-MM-DD (dates are printed day first), or null.
If the photo is not a lab report, return an empty tests list.
Reply with JSON only: {"report_date": string|null, "tests": [{"key": string, "value": number|string}]}`;

export async function POST(req: Request) {
  if (getGeminiKeyPool().length === 0) {
    return NextResponse.json({ fallback: true, error: 'AI reading is not set up.' }, { status: 503 });
  }
  const owner = await getOwner();
  const limit = rateLimit(`labread:${clientKey(req, owner.key)}`, 8, 60_000);
  if (!limit.ok) return NextResponse.json({ error: `Too many photos at once. Try again in ${limit.retryAfter}s.` }, { status: 429 });

  const body = await req.json().catch(() => null);
  const m = String(body?.image || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return NextResponse.json({ error: 'Please send a JPEG, PNG or WebP photo.' }, { status: 400 });
  if (m[2].length * 0.75 > MAX_BYTES) return NextResponse.json({ error: 'That photo is too large.' }, { status: 413 });

  try {
    const text = await executeGeminiWithAutoSwitch(async ai => {
      const res = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: m[1], data: m[2] } }, { text: PROMPT }] }],
        config: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 800 },
      });
      return String(res.text || '');
    });
    const json = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
    const values: LabValue[] = [];
    for (const t of Array.isArray(json?.tests) ? json.tests : []) {
      const test = LAB_TESTS.find(x => x.key === t?.key);
      const v = test ? cleanValue(test.key, t.value) : null;
      if (test && v !== null && !values.some(x => x.key === test.key)) values.push({ key: test.key, value: v });
    }
    const date = typeof json?.report_date === 'string' ? parseReportDate(json.report_date.split('-').reverse().join('/')) : null;
    return NextResponse.json({ values, reportDate: date, reader: 'ai' });
  } catch (err: any) {
    console.error('[lab-report/read] failed', err?.message || err);
    return NextResponse.json({ fallback: true, error: 'The AI could not read this photo.' }, { status: 502 });
  }
}
