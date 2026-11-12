/**
 * Unified per-user data store for Her Mode, Mom Mode and the dashboards.
 *
 * Primary backend: PostgreSQL table `user_documents` (one JSONB document per
 * user per kind). No size limit, survives browser changes, works across devices.
 *
 * Fallback 1 (no DATABASE_URL, running locally): a JSON file under .data/
 * (override with SAKHI_DATA_DIR). Keeps full history for laptop demos.
 * Fallback 2 (serverless without a database): httpOnly cookies named
 * `sakhi_<kind>_<owner>`, the names the app used before, trimmed to fit ~4 KB.
 * Whenever a persistent backend is available, any legacy cookie found is
 * imported into it once and then deleted.
 *
 * Identity: signed-in users are keyed by email. Signed-out visitors get a random
 * `sakhi_guest_id` (httpOnly) so guests never share one bucket of data.
 */
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { authOptions } from '@/lib/auth';
import { getPool, isConnectionError, markDbUnavailable } from '@/lib/db';

export type DocKind =
  | 'her_profile'
  | 'daily_logs'
  | 'cycle_history'
  | 'preg_profile'
  | 'pregnancy_logs'
  | 'pregnancy_nutrition'
  | 'pregnancy_appointments'
  | 'appointments_month'
  | 'notifications'
  | 'consent'
  | 'relief_feedback'
  | 'chat_her'
  | 'chat_mom'
  | 'ai_usage'
  | 'weight_log'
  | 'lab_results'
  | 'tablets'
  | 'checklists'
  | 'family'
  | 'mood_checks'
  | 'postpartum'
  | 'her_goal'
  | 'meals';

export const ALL_KINDS: DocKind[] = [
  'her_profile', 'daily_logs', 'cycle_history', 'preg_profile', 'pregnancy_logs',
  'pregnancy_nutrition', 'pregnancy_appointments', 'appointments_month', 'notifications', 'consent',
  'relief_feedback', 'chat_her', 'chat_mom', 'ai_usage', 'weight_log', 'lab_results',
  'tablets', 'checklists', 'family', 'mood_checks', 'postpartum', 'her_goal', 'meals',
];

/** Kinds too large for a 4 KB cookie; without Postgres/file storage the browser keeps them. */
const NO_COOKIE: ReadonlySet<DocKind> = new Set(['chat_her', 'chat_mom']);

const YEAR = 60 * 60 * 24 * 365;
const GUEST_COOKIE = 'sakhi_guest_id';

export const secureCookie = (maxAge = YEAR) => ({
  path: '/',
  maxAge,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});

export interface Owner {
  /** database key, e.g. "user:a@b.com" or "guest:<uuid>" */
  key: string;
  /** cookie-safe id used in legacy cookie names */
  cookieId: string;
  email: string | null;
  name: string | null;
  isGuest: boolean;
}

/** Resolve who the current request belongs to (creates a guest id if needed). */
export async function getOwner(): Promise<Owner> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email || null;
  if (email) {
    return {
      key: `user:${email.toLowerCase()}`,
      cookieId: email.replace(/[^a-zA-Z0-9]/g, '_'),
      email,
      name: session?.user?.name || null,
      isGuest: false,
    };
  }
  const store = await cookies();
  let guestId = store.get(GUEST_COOKIE)?.value;
  if (!guestId || !/^[a-zA-Z0-9-]{8,64}$/.test(guestId)) {
    guestId = randomUUID();
    store.set(GUEST_COOKIE, guestId, secureCookie());
  }
  return {
    key: `guest:${guestId}`,
    cookieId: `guest_${guestId.replace(/[^a-zA-Z0-9]/g, '')}`,
    email: null,
    name: null,
    isGuest: true,
  };
}


// ------------------------------------------------------------ file backend

const DATA_DIR = process.env.SAKHI_DATA_DIR || path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'sakhi-store.json');
let fileUsable: Promise<boolean> | null = null;
let fileCache: Record<string, Record<string, any>> | null = null;
let fileWrite: Promise<void> = Promise.resolve();

function fileBackendUsable() {
  if (!fileUsable) {
    fileUsable = (async () => {
      // Serverless filesystems are read-only/ephemeral; never use a file there
      if (process.env.VERCEL || process.env.SAKHI_DISABLE_FILE_STORE === '1') return false;
      try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.access(DATA_DIR);
        return true;
      } catch {
        return false;
      }
    })();
  }
  return fileUsable;
}

async function loadFile() {
  if (fileCache) return fileCache;
  try {
    fileCache = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
  } catch {
    fileCache = {};
  }
  return fileCache!;
}

function saveFile() {
  // Serialize writes; write to a temp file then rename so a crash can't corrupt it
  fileWrite = fileWrite.then(async () => {
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(fileCache || {}), 'utf-8');
    await fs.rename(tmp, DATA_FILE);
  }).catch(err => console.error('[store] file write failed:', err?.message));
  return fileWrite;
}

const fileBackend = {
  async get(owner: Owner, kind: DocKind) {
    const db = await loadFile();
    return db[owner.key] && kind in db[owner.key] ? { found: true, value: db[owner.key][kind] } : { found: false, value: undefined };
  },
  async set(owner: Owner, kind: DocKind, value: any) {
    const db = await loadFile();
    db[owner.key] = { ...(db[owner.key] || {}), [kind]: value ?? null };
    await saveFile();
  },
  async deleteAll(owner: Owner) {
    const db = await loadFile();
    delete db[owner.key];
    await saveFile();
  },
};

let tableReady: Promise<void> | null = null;

async function ensureTable() {
  const pool = await getPool();
  if (!pool) return null;
  if (!tableReady) {
    tableReady = pool
      .query(`
        CREATE TABLE IF NOT EXISTS user_documents (
          owner_key TEXT NOT NULL,
          kind VARCHAR(64) NOT NULL,
          data JSONB,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (owner_key, kind)
        );
        ALTER TABLE IF EXISTS public.user_documents ENABLE ROW LEVEL SECURITY;
      `)
      .then(() => undefined)
      .catch((err) => {
        tableReady = null;
        markDbUnavailable(err);
        throw err;
      });
  }
  await tableReady;
  return pool;
}

const cookieName = (kind: DocKind, owner: Owner) => `sakhi_${kind}_${owner.cookieId}`;

function parse<T>(raw: string | undefined, fallback: T): T {
  if (raw === undefined) return fallback;
  try {
    const v = JSON.parse(raw);
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

/** Where data is stored for this request. */
export async function storageMode(): Promise<'postgres' | 'file' | 'cookie'> {
  try {
    if (await ensureTable()) return 'postgres';
  } catch { /* fall through */ }
  return (await fileBackendUsable()) ? 'file' : 'cookie';
}

export async function readDoc<T>(kind: DocKind, fallback: T, owner?: Owner): Promise<T> {
  const who = owner || (await getOwner());
  const store = await cookies();
  const legacy = store.get(cookieName(kind, who))?.value;

  let pool = null;
  try {
    pool = await ensureTable();
  } catch (err: any) {
    console.error('[store] Postgres unavailable, using cookie fallback:', err?.message);
  }
  if (!pool) {
    if (await fileBackendUsable()) {
      const hit = await fileBackend.get(who, kind);
      if (hit.found) return (hit.value ?? fallback) as T;
      if (legacy !== undefined) {
        const value = parse<T>(legacy, fallback);
        await fileBackend.set(who, kind, value);
        try { store.delete(cookieName(kind, who)); } catch { /* read-only context */ }
        return value;
      }
      return fallback;
    }
    return parse(legacy, fallback);
  }

  try {
    const { rows } = await pool.query(
      'SELECT data FROM user_documents WHERE owner_key = $1 AND kind = $2',
      [who.key, kind]
    );
    if (rows.length > 0) return (rows[0].data ?? fallback) as T;

    // One-time migration of data saved in the old cookie format
    if (legacy !== undefined) {
      const value = parse<T>(legacy, fallback);
      await writeDoc(kind, value, who);
      try { store.delete(cookieName(kind, who)); } catch { /* read-only context */ }
      return value;
    }
    return fallback;
  } catch (err: any) {
    if (isConnectionError(err)) markDbUnavailable(err);
    console.error(`[store] read ${kind} failed:`, err?.message);
    return parse(legacy, fallback);
  }
}

export async function writeDoc<T>(kind: DocKind, value: T, owner?: Owner): Promise<void> {
  const who = owner || (await getOwner());
  let pool = null;
  try {
    pool = await ensureTable();
  } catch (err: any) {
    console.error('[store] Postgres unavailable, using cookie fallback:', err?.message);
  }
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO user_documents (owner_key, kind, data, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (owner_key, kind) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [who.key, kind, JSON.stringify(value ?? null)]
      );
      return;
    } catch (err: any) {
      if (isConnectionError(err)) markDbUnavailable(err);
      console.error(`[store] write ${kind} failed, using fallback:`, err?.message);
      pool = null;
    }
  }
  if (!pool && (await fileBackendUsable())) {
    await fileBackend.set(who, kind, value);
    return;
  }
  if (NO_COOKIE.has(kind)) return;
  const store = await cookies();
  const serialized = JSON.stringify(value ?? null);
  if (serialized.length > 3800) {
    // Browsers drop cookies over ~4 KB. Keep the newest entries of list data.
    if (Array.isArray(value)) {
      let trimmed = value.slice();
      while (trimmed.length > 1 && JSON.stringify(trimmed).length > 3800) trimmed = trimmed.slice(1);
      console.warn(`[store] ${kind} trimmed to ${trimmed.length} entries to fit a cookie. Set DATABASE_URL for full history.`);
      store.set(cookieName(kind, who), JSON.stringify(trimmed), secureCookie());
      return;
    }
    console.warn(`[store] ${kind} exceeds cookie size; set DATABASE_URL to persist it.`);
  }
  store.set(cookieName(kind, who), serialized, secureCookie());
}

/** Merge fields into an object document. */
export async function patchDoc(kind: DocKind, patch: Record<string, any>, owner?: Owner) {
  const who = owner || (await getOwner());
  const current = await readDoc<Record<string, any>>(kind, {}, who);
  const next = { ...(current && typeof current === 'object' ? current : {}), ...patch };
  await writeDoc(kind, next, who);
  return next;
}

/** Read every document for export. */
export async function readAllDocs(owner?: Owner) {
  const who = owner || (await getOwner());
  const out: Record<string, any> = {};
  for (const kind of ALL_KINDS) out[kind] = await readDoc(kind, null, who);
  return out;
}

/** Delete every document (and legacy cookie) for this owner. */
export async function deleteAllDocs(owner?: Owner) {
  const who = owner || (await getOwner());
  const store = await cookies();
  for (const kind of ALL_KINDS) store.delete(cookieName(kind, who));
  try {
    const pool = await ensureTable();
    if (pool) await pool.query('DELETE FROM user_documents WHERE owner_key = $1', [who.key]);
  } catch (err: any) {
    console.error('[store] delete failed:', err?.message);
  }
  if (await fileBackendUsable()) await fileBackend.deleteAll(who);
}
