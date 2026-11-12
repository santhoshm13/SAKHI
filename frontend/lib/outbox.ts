"use client";
/**
 * Offline outbox. A log saved with no signal (common on village networks) is
 * kept on this phone and sent when the connection comes back, in the order it
 * was made. Later saves of the same document replace earlier queued ones.
 */
const KEY = "sakhi_outbox";
export const OUTBOX_EVENT = "sakhi-outbox";

interface Item { url: string; method: string; body: string; at: number }

const load = (): Item[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const store = (items: Item[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(-200))); } catch { /* storage full or blocked */ }
  try { window.dispatchEvent(new CustomEvent(OUTBOX_EVENT, { detail: items.length })); } catch { /* ignore */ }
};

export const pendingCount = () => load().length;

function enqueue(item: Item) {
  // A whole-document PUT supersedes any earlier queued PUT to the same place
  const items = item.method === "PUT" ? load().filter(i => !(i.method === "PUT" && i.url === item.url)) : load();
  store([...items, item]);
}

export interface SendResult { ok: boolean; queued: boolean; res?: Response }

/** Send now, or keep it for later if there's no connection. */
export async function sendOrQueue(url: string, method: "POST" | "PUT", body: unknown): Promise<SendResult> {
  const text = JSON.stringify(body);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!offline) {
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: text });
      return { ok: res.ok, queued: false, res };
    } catch { /* network failure: fall through and queue */ }
  }
  enqueue({ url, method, body: text, at: Date.now() });
  return { ok: true, queued: true };
}

let flushing = false;

/** Send everything waiting. Stops at the first network failure and tries again later. */
export async function flushOutbox(): Promise<number> {
  if (flushing || (typeof navigator !== "undefined" && navigator.onLine === false)) return pendingCount();
  flushing = true;
  try {
    let items = load();
    while (items.length) {
      const [first] = items;
      let res: Response;
      try {
        res = await fetch(first.url, { method: first.method, headers: { "Content-Type": "application/json" }, body: first.body });
      } catch { break; }
      // Signed out: keep it until she signs back in. Other errors would never succeed, so drop them.
      if (res.status === 401) break;
      items = load().filter(i => !(i.at === first.at && i.url === first.url));
      store(items);
    }
    return items.length;
  } finally {
    flushing = false;
  }
}
