import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { getPool } from "@/lib/db";

const scrypt = promisify(scryptCb);

export interface StoredUserAccount {
  id: number | string;
  email: string;
  name: string | null;
  image: string | null;
  passwordHash: string | null;
  authProvider: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return String(raw || "").trim().toLowerCase();
}

export function validateRegistrationInput(input: {
  name?: string;
  email?: string;
  password?: string;
}) {
  const name = String(input.name || "").trim();
  const email = normalizeEmail(input.email || "");
  const password = String(input.password || "");

  if (name.length < 2) {
    return { ok: false as const, error: "Please enter your name (at least 2 characters)." };
  }
  if (name.length > 80) {
    return { ok: false as const, error: "Name must be 80 characters or fewer." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false as const, error: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false as const, error: "Password must be at least 8 characters long." };
  }
  if (password.length > 128) {
    return { ok: false as const, error: "Password must be 128 characters or fewer." };
  }

  return { ok: true as const, data: { name, email, password } };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith("scrypt:")) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3) return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

// ------------------------------------------------------------ local fallback store

const DATA_DIR = process.env.SAKHI_DATA_DIR || path.join(process.cwd(), ".data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "sakhi-accounts.json");

let memoryAccounts: Record<string, StoredUserAccount> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function canUseFileStore(): boolean {
  return !process.env.VERCEL && process.env.SAKHI_DISABLE_FILE_STORE !== "1";
}

async function loadAccountsFile(): Promise<Record<string, StoredUserAccount>> {
  if (memoryAccounts) return memoryAccounts;
  if (!canUseFileStore()) {
    memoryAccounts = {};
    return memoryAccounts;
  }
  try {
    const raw = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    memoryAccounts = JSON.parse(raw) || {};
  } catch {
    memoryAccounts = {};
  }
  return memoryAccounts!;
}

async function persistAccountsFile(): Promise<void> {
  if (!canUseFileStore() || !memoryAccounts) return;
  writeQueue = writeQueue
    .then(async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${ACCOUNTS_FILE}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(memoryAccounts, null, 2), "utf-8");
      await fs.rename(tmp, ACCOUNTS_FILE);
    })
    .catch((err) => {
      console.error("[userAccounts] file save failed:", err?.message);
    });
  return writeQueue;
}

// ------------------------------------------------------------ DB + fallback operations

async function ensurePasswordColumns() {
  const pool = await getPool();
  if (!pool) return null;
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'google';
  `);
  return pool;
}

export async function findAccountByEmail(rawEmail: string): Promise<StoredUserAccount | null> {
  const email = normalizeEmail(rawEmail);
  if (!email) return null;

  try {
    const pool = await ensurePasswordColumns();
    if (pool) {
      const { rows } = await pool.query(
        "SELECT id, email, name, image, password_hash, auth_provider FROM users WHERE LOWER(email) = $1 LIMIT 1",
        [email]
      );
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          email: r.email,
          name: r.name,
          image: r.image,
          passwordHash: r.password_hash || null,
          authProvider: r.auth_provider || "google",
        };
      }
      return null;
    }
  } catch (err: any) {
    console.error("[userAccounts] DB lookup failed, checking fallback:", err?.message);
  }

  const accounts = await loadAccountsFile();
  return accounts[email] || null;
}

export async function createManualAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true; user: StoredUserAccount } | { ok: false; error: string; status: number }> {
  const checked = validateRegistrationInput(input);
  if (!checked.ok) {
    return { ok: false, error: checked.error, status: 400 };
  }

  const { name, email, password } = checked.data;
  const existing = await findAccountByEmail(email);

  if (existing) {
    if (!existing.passwordHash && existing.authProvider === "google") {
      return {
        ok: false,
        error: "An account with this email already uses Google Sign-In. Please continue with Google.",
        status: 409,
      };
    }
    return {
      ok: false,
      error: "An account with this email already exists. Please sign in instead.",
      status: 409,
    };
  }

  const passwordHash = await hashPassword(password);

  try {
    const pool = await ensurePasswordColumns();
    if (pool) {
      const { rows } = await pool.query(
        `INSERT INTO users (email, name, password_hash, auth_provider)
         VALUES ($1, $2, $3, 'credentials')
         RETURNING id, email, name, image, password_hash, auth_provider`,
        [email, name, passwordHash]
      );
      const r = rows[0];
      return {
        ok: true,
        user: {
          id: r.id,
          email: r.email,
          name: r.name,
          image: r.image,
          passwordHash: r.password_hash,
          authProvider: r.auth_provider,
        },
      };
    }
  } catch (err: any) {
    if (err?.code === "23505") {
      return {
        ok: false,
        error: "An account with this email already exists. Please sign in instead.",
        status: 409,
      };
    }
    console.error("[userAccounts] DB create failed, using local fallback:", err?.message);
  }

  const accounts = await loadAccountsFile();
  const created: StoredUserAccount = {
    id: `local_${Date.now()}`,
    email,
    name,
    image: null,
    passwordHash,
    authProvider: "credentials",
  };
  accounts[email] = created;
  await persistAccountsFile();
  return { ok: true, user: created };
}

export async function verifyManualAccount(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; user: StoredUserAccount } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email || "");
  const password = String(input.password || "");

  if (!EMAIL_RE.test(email) || !password) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  const account = await findAccountByEmail(email);
  if (!account) {
    return { ok: false, error: "Invalid email or password." };
  }

  if (!account.passwordHash) {
    return {
      ok: false,
      error: "This account uses Google Sign-In. Please continue with Google.",
    };
  }

  const matches = await verifyPassword(password, account.passwordHash);
  if (!matches) {
    return { ok: false, error: "Invalid email or password." };
  }

  return { ok: true, user: account };
}

