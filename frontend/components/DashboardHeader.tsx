"use client";

import { useEffect, useState } from "react";
import { Bell, EyeSlash } from "@phosphor-icons/react";
import { DISCREET_CHANGED, isDiscreet, lockNow } from "@/lib/discreet";
import AccountMenu from "@/components/AccountMenu";

/**
 * Shared header for Her Mode and Mom Mode: mode and today's date on one quiet
 * line, a warm greeting, then reminders and the account menu.
 */
export default function DashboardHeader({
  mode,
  modeLabel,
  displayName,
  reminderCount,
  onOpenReminders,
  onOpenSettings,
}: {
  mode: "her" | "pregnancy";
  modeLabel: string;
  displayName: string;
  reminderCount: number;
  onOpenReminders: () => void;
  onOpenSettings: () => void;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const dot = mode === "her" ? "bg-lavender-500" : "bg-blush-500";
  const [discreet, setDiscreet] = useState(false);
  useEffect(() => {
    const sync = () => setDiscreet(isDiscreet());
    sync();
    window.addEventListener(DISCREET_CHANGED, sync);
    return () => window.removeEventListener(DISCREET_CHANGED, sync);
  }, []);

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-4 sm:pt-7 sm:pb-6 flex items-center justify-between gap-3 print:hidden">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs sm:text-sm text-ink-soft">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
          <span className="font-semibold text-plum-900">{modeLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{date}</span>
        </p>
        <h1 className="mt-1 truncate text-xl sm:text-3xl font-semibold tracking-tight text-plum-900">
          {greeting}, <span className="display-serif font-normal text-lavender-600">{displayName}</span>
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {discreet && (
          <button
            type="button"
            onClick={lockNow}
            aria-label="Hide screen now"
            title="Hide screen (or press Esc twice)"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-plum-900 flex items-center justify-center text-cream hover:bg-plum-800 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
          >
            <EyeSlash weight="bold" className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenReminders}
          aria-label={reminderCount > 0 ? `Reminders, ${reminderCount} upcoming` : "Reminders"}
          title="Reminders"
          className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/70 border border-plum-900/10 flex items-center justify-center text-plum-900/70 hover:text-plum-900 hover:bg-white transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
        >
          <Bell weight="duotone" className="w-5 h-5" aria-hidden="true" />
          {reminderCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blush-500 text-white text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
              {reminderCount}
            </span>
          )}
        </button>
        <AccountMenu mode={mode} displayName={displayName} onOpenSettings={onOpenSettings} />
      </div>
    </header>
  );
}
