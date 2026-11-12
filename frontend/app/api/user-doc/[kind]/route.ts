import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc, type DocKind } from '@/lib/store';

/**
 * Small per-user documents for the newer features (tablets, checklists, family
 * contacts, mood check-ins, postpartum logs, Her Mode goal). The browser owns
 * their shape; the server only checks the kind and the size.
 *   GET  /api/user-doc/tablets      -> { doc }
 *   PUT  /api/user-doc/tablets {doc} -> { doc }
 */
const KINDS: ReadonlySet<string> = new Set(['tablets', 'checklists', 'family', 'mood_checks', 'postpartum', 'her_goal', 'meals']);
const MAX_CHARS = 60_000;

type Ctx = { params: Promise<{ kind: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { kind } = await params;
  if (!KINDS.has(kind)) return NextResponse.json({ error: 'Unknown document.' }, { status: 404 });
  const doc = await readDoc<any>(kind as DocKind, null, await getOwner());
  return NextResponse.json({ doc });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { kind } = await params;
  if (!KINDS.has(kind)) return NextResponse.json({ error: 'Unknown document.' }, { status: 404 });
  const body = await req.json().catch(() => null);
  const doc = body?.doc;
  if (doc === undefined || typeof doc !== 'object') return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 });
  if (JSON.stringify(doc).length > MAX_CHARS) return NextResponse.json({ error: 'That is too much to save at once.' }, { status: 413 });
  await writeDoc(kind as DocKind, doc, await getOwner());
  return NextResponse.json({ doc });
}
