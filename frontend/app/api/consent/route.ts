import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';

// Bump when the consent text changes so users are asked again
// (not exported: route files may only export handlers and route config)
const CONSENT_VERSION = 1;

export async function GET() {
  const consent = await readDoc<any>('consent', null);
  return NextResponse.json({
    consent,
    required: !consent?.accepted || consent.version !== CONSENT_VERSION,
    version: CONSENT_VERSION,
  });
}

// PATCH { privateMode?: boolean, aiProcessing?: boolean } changes a setting
// without asking for consent again. Private mode never sends chats to Gemini.
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const owner = await getOwner();
  const current = await readDoc<any>('consent', null, owner);
  if (!current?.accepted) return NextResponse.json({ error: 'Consent not given yet' }, { status: 400 });
  const next = { ...current };
  if (typeof body.privateMode === 'boolean') next.privateMode = body.privateMode;
  if (typeof body.aiProcessing === 'boolean') next.aiProcessing = body.aiProcessing;
  await writeDoc('consent', next, owner);
  return NextResponse.json({ success: true, consent: next });
}

// POST { accepted: true, aiProcessing: boolean, privateMode?: boolean }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.accepted !== true) {
      return NextResponse.json({ error: 'Consent must be explicitly accepted' }, { status: 400 });
    }
    const owner = await getOwner();
    const record = {
      accepted: true,
      version: CONSENT_VERSION,
      aiProcessing: body.aiProcessing !== false,
      privateMode: body.privateMode === true,
      at: new Date().toISOString(),
    };
    await writeDoc('consent', record, owner);
    return NextResponse.json({ success: true, consent: record });
  } catch (err: any) {
    console.error('Consent error:', err);
    return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 });
  }
}
