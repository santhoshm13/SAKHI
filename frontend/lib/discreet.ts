"use client";
/**
 * Discreet mode, for a phone shared with family: a 4-digit PIN lock on this
 * device, a plain tab title, and reminders that don't say what they are about.
 * The PIN is stored only as a salted SHA-256 hash in this browser; signing out
 * clears it (every `sakhi*` key is removed), which is also how a forgotten PIN
 * is reset.
 */

const PIN_KEY = 'sakhi_discreet_pin';
const SALT_KEY = 'sakhi_discreet_salt';
const UNLOCKED_KEY = 'sakhi_discreet_unlocked';
export const LOCK_EVENT = 'sakhi-lock';
export const DISCREET_CHANGED = 'sakhi-discreet-changed';
export const DISCREET_TITLE = 'Notes';

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export const isDiscreet = () => typeof window !== 'undefined' && Boolean(get(PIN_KEY));

async function hash(pin: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const validPin = (pin: string) => /^\d{4}$/.test(pin);

export async function enableDiscreet(pin: string) {
  if (!validPin(pin)) throw new Error('Use exactly 4 digits.');
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(SALT_KEY, salt);
  localStorage.setItem(PIN_KEY, await hash(pin, salt));
  markUnlocked();
  window.dispatchEvent(new Event(DISCREET_CHANGED));
}

export function disableDiscreet() {
  try { localStorage.removeItem(PIN_KEY); localStorage.removeItem(SALT_KEY); sessionStorage.removeItem(UNLOCKED_KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(DISCREET_CHANGED));
}

export async function checkPin(pin: string) {
  const stored = get(PIN_KEY), salt = get(SALT_KEY);
  return Boolean(stored && salt && (await hash(pin, salt)) === stored);
}

export function markUnlocked() { try { sessionStorage.setItem(UNLOCKED_KEY, String(Date.now())); } catch { /* ignore */ } }
export function isUnlocked() { try { return Boolean(sessionStorage.getItem(UNLOCKED_KEY)); } catch { return false; } }
export function forgetUnlock() { try { sessionStorage.removeItem(UNLOCKED_KEY); } catch { /* ignore */ } }

/** Lock the screen right now (the hide button and a double Escape). */
export function lockNow() {
  forgetUnlock();
  window.dispatchEvent(new Event(LOCK_EVENT));
}

/** Reminder text that gives nothing away while discreet mode is on. */
export function discreetNotice(title: string, body: string) {
  return isDiscreet() ? { title: 'Reminder', body: 'You have a reminder.' } : { title, body };
}
