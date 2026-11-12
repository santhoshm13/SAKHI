"use client";

import { useEffect, useState } from "react";
import { CloudSlash, CloudArrowUp } from "@phosphor-icons/react";
import { OUTBOX_EVENT, flushOutbox, pendingCount } from "@/lib/outbox";

/** Sends logs saved offline once the phone is back online, and says so. */
export default function OutboxSync() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(pendingCount());
    const sync = () => { setOnline(navigator.onLine); flushOutbox().then(setPending); };
    const goOffline = () => setOnline(false);
    const onCount = (e: Event) => setPending(Number((e as CustomEvent).detail) || 0);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", goOffline);
    window.addEventListener(OUTBOX_EVENT, onCount);
    // Retry now and then in case "online" fired before the network really worked
    const timer = setInterval(() => { if (pendingCount() > 0) sync(); }, 60_000);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(OUTBOX_EVENT, onCount);
      clearInterval(timer);
    };
  }, []);

  if (online && pending === 0) return null;
  const Icon = online ? CloudArrowUp : CloudSlash;
  return (
    <div role="status" className="no-print fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-plum-900 px-4 py-2 text-xs font-medium text-cream shadow-lg">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {online
        ? `${pending} saved log${pending === 1 ? "" : "s"} waiting to send. Sakhi keeps trying.`
        : pending > 0
          ? `You're offline. ${pending} log${pending === 1 ? "" : "s"} saved on this phone, will send when you're back online.`
          : "You're offline. Logs you save will be sent later."}
    </div>
  );
}
