"use client";

import React, { useEffect, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import PregnancyDailyCheckIn from "./PregnancyDailyCheckIn";
import { useSakhiChat } from "@/hooks/useSakhiChat";
import SakhiDoll from "./chat/SakhiDoll";
import SakhiChatPanel, { type QuickReply } from "./chat/SakhiChatPanel";

export type AIState = "idle" | "listening" | "thinking" | "talking";

interface PregnancyAvatarProps {
  aiState?: AIState;
  onChartUpdate?: (data: any) => void;
  pregnancyContext?: any;
  checkInMode?: boolean;
  onCheckInComplete?: (data: any) => void;
  profileName?: string;
  isCheckInCompleted?: boolean;
  onToggleCheckInMode?: () => void;
}

const MOM_QUICK: QuickReply[] = [
  { label: "Log my BP", text: "My BP today is " },
  { label: "Baby's kicks", text: "I counted  kicks today" },
  { label: "What to eat this week?", text: "What should I eat this week?", send: true },
  { label: "Is this normal?", text: "Is it normal to feel " },
];

const storedName = () => { try { return localStorage.getItem("sakhi_preferred_name"); } catch { return null; } };

export default function PregnancyAvatar({
  aiState = "idle",
  onChartUpdate,
  pregnancyContext,
  checkInMode = false,
  onCheckInComplete,
  profileName,
  isCheckInCompleted = false,
  onToggleCheckInMode,
}: PregnancyAvatarProps) {
  const [name, setName] = useState(profileName || pregnancyContext?.profile?.preferred_name || "Mama");
  const [isCompletedToday, setIsCompletedToday] = useState(false);
  const chat = useSakhiChat({ mode: "pregnancy", onChartUpdate, profileName: name });

  useEffect(() => {
    setName(storedName() || profileName || pregnancyContext?.profile?.preferred_name || "Mama");
  }, [profileName, pregnancyContext?.profile?.preferred_name]);

  useEffect(() => {
    const onName = (e: any) => { if (e.detail?.name) setName(e.detail.name); };
    window.addEventListener("sakhi-name-updated", onName);
    return () => window.removeEventListener("sakhi-name-updated", onName);
  }, []);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    let stored: string | null = null;
    try { stored = localStorage.getItem("sakhi_last_checkin_mom"); } catch { /* ignore */ }
    const hasLogToday = (pregnancyContext?.logs || []).some((l: any) => (l.log_date || "").split("T")[0] === todayStr);
    if (isCheckInCompleted || stored === todayStr || hasLogToday) setIsCompletedToday(true);
  }, [isCheckInCompleted, pregnancyContext?.logs]);

  // The page can still mark Sakhi as talking without speech
  const [flap, setFlap] = useState(false);
  const pageTalking = aiState === "talking" && chat.autoPlayVoice && !chat.isSpeaking;
  useEffect(() => {
    if (!pageTalking) { setFlap(false); return; }
    const t = setInterval(() => setFlap(p => (Math.random() > 0.3 ? !p : p)), 150);
    return () => clearInterval(t);
  }, [pageTalking]);

  const talking = chat.isSpeaking || pageTalking;
  const status = chat.listening ? "Listening…" : chat.isLoading || aiState === "thinking" ? "Thinking…" : chat.isSpeaking ? "Speaking…" : undefined;

  return (
    <div className="w-full bg-white/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-pink-200/80 shadow-[0_8px_30px_rgba(244,114,182,0.14)] p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-5 sm:gap-6 md:gap-8 mb-6 sm:mb-8 overflow-hidden relative">
      {talking && <div className="absolute inset-0 bg-pink-100/30 animate-pulse pointer-events-none" />}

      <SakhiDoll mouthOpen={chat.mouthOpen || flap} talking={talking} status={status} />

      <div className="w-full md:w-2/3 flex flex-col h-[400px] sm:h-[420px] bg-white/70 rounded-2xl md:rounded-[2rem] border border-pink-100/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_12px_rgba(244,114,182,0.06)] p-3.5 sm:p-5 md:p-6 overflow-hidden min-w-0">
        {checkInMode ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 w-full flex flex-col">
            <PregnancyDailyCheckIn
              onComplete={(data: any) => {
                setIsCompletedToday(true);
                onCheckInComplete?.(data);
              }}
              profileName={profileName || pregnancyContext?.profile?.preferred_name}
            />
          </div>
        ) : (
          <SakhiChatPanel
            chat={chat}
            quickReplies={MOM_QUICK}
            headerText="Ask Sakhi anything about your baby or health"
            headerAction={!isCompletedToday && onToggleCheckInMode ? (
              <button
                type="button"
                onClick={onToggleCheckInMode}
                className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-pink-100/70 hover:bg-pink-100 text-pink-700 font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkle weight="fill" size={12} className="text-pink-500" /> Daily Check-in
              </button>
            ) : undefined}
            emptyState={
              <div className="max-w-[88%] sm:max-w-[85%] p-3 sm:p-4 rounded-2xl text-sm sm:text-base shadow-sm border border-white/40 bg-white/90 text-[#2D1B36] self-start rounded-tl-sm">
                Hi {name} 👋! I&apos;m here to support you and your baby. How are you feeling today?
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
