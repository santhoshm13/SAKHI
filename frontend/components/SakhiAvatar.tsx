"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import DailyCheckInChat, { type CheckInContext } from "./DailyCheckInChat";
import { useSakhiChat } from "@/hooks/useSakhiChat";
import SakhiDoll from "./chat/SakhiDoll";
import SakhiChatPanel, { type QuickReply } from "./chat/SakhiChatPanel";

export type AIState = "idle" | "thinking" | "talking";

interface SakhiAvatarProps {
  aiState: AIState;
  checkInMode?: boolean;
  onCheckInComplete?: (data: any) => void;
  defaultOpen?: boolean;
  onChartUpdate?: (data: any) => void;
  profileName?: string;
  checkInContext?: CheckInContext;
}

/** Suggestions that fit where she is in her cycle. */
function herQuickReplies(ctx?: CheckInContext): QuickReply[] {
  const out: QuickReply[] = [];
  if (ctx?.bleedingDay) out.push({ label: "My cramps are bad", text: "My cramps are bad today", send: true });
  if (ctx?.late) out.push({ label: "My period is late", text: `My period is ${ctx.daysLate} days late. Is that okay?`, send: true });
  out.push({ label: "Log how I feel", text: "Today I'm feeling " });
  out.push({ label: "When is my next period?", text: "When is my next period?", send: true });
  if (ctx?.phase === "luteal" && !ctx.late) out.push({ label: "PMS tips", text: "Any tips for PMS this week?", send: true });
  else out.push({ label: "Why am I so tired?", text: "Why am I feeling so tired lately?", send: true });
  return out.slice(0, 4);
}

export default function SakhiAvatar({ aiState, checkInMode = false, onCheckInComplete, onChartUpdate, profileName, checkInContext }: SakhiAvatarProps) {
  const chat = useSakhiChat({ mode: "her", onChartUpdate, profileName });
  const quick = useMemo(() => herQuickReplies(checkInContext), [checkInContext]);

  // The page can still mark Sakhi as talking (e.g. during a check-in) without speech
  const [flap, setFlap] = useState(false);
  const pageTalking = aiState === "talking" && chat.autoPlayVoice && !chat.isSpeaking;
  useEffect(() => {
    if (!pageTalking) { setFlap(false); return; }
    const t = setInterval(() => setFlap(p => (Math.random() > 0.3 ? !p : p)), 150);
    return () => clearInterval(t);
  }, [pageTalking]);

  const talking = chat.isSpeaking || pageTalking;
  const status = chat.listening ? "Listening…" : chat.isLoading ? "Thinking…" : chat.isSpeaking ? "Speaking…" : undefined;

  return (
    <div className="w-full bg-white/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-pink-200/80 shadow-[0_8px_30px_rgba(244,114,182,0.14)] p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-5 sm:gap-6 md:gap-8 mb-6 sm:mb-8 overflow-hidden relative">
      {talking && <div className="absolute inset-0 bg-pink-100/30 animate-pulse pointer-events-none" />}

      <SakhiDoll mouthOpen={chat.mouthOpen || flap} talking={talking} status={status} />

      <div className="w-full md:w-2/3 flex flex-col h-[400px] sm:h-[420px] bg-white/70 rounded-2xl md:rounded-[2rem] border border-pink-100/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_12px_rgba(244,114,182,0.06)] p-3.5 sm:p-5 md:p-6 overflow-hidden min-w-0">
        {checkInMode ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 w-full">
            <DailyCheckInChat onComplete={onCheckInComplete || (() => {})} profileName={profileName} context={checkInContext} />
          </div>
        ) : (
          <SakhiChatPanel
            chat={chat}
            quickReplies={quick}
            emptyState={
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-4 text-pink-400">
                  <Sparkle weight="duotone" className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-medium text-[#2D1B36] flex items-center justify-center gap-2">
                  Hi {profileName || "there"} <span className="inline-block animate-bounce">👋</span>
                </h4>
                <p className="mt-2 text-sm text-[#2D1B36]/60 max-w-xs">Tell me how you feel, ask about your cycle, or tap the mic and talk to me.</p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
