"use client";
import React, { useEffect, useRef, useState } from "react";
import { Microphone, SpeakerHigh, SpeakerSlash, Trash, Waveform, WifiSlash, LockSimple, ShieldCheck } from "@phosphor-icons/react";
import ChatMarkdown from "./ChatMarkdown";
import type { SakhiChat, Engine } from "@/hooks/useSakhiChat";

export interface QuickReply { label: string; text: string; send?: boolean }

const ENGINE_TAG: Partial<Record<Engine, { label: string; icon: React.ReactNode }>> = {
  offline: { label: "Simple mode", icon: <WifiSlash size={11} /> },
  local: { label: "Private AI", icon: <LockSimple size={11} /> },
  safety: { label: "Safety guidance", icon: <ShieldCheck size={11} weight="fill" /> },
};

const NOTICE: Record<string, string> = {
  "daily-limit": "You've used today's AI replies, so Sakhi is in simple mode until tomorrow. Logging still works.",
  private: "Private mode is on: your chats aren't sent to Google.",
  "no-consent": "AI processing is off in your privacy choices, so Sakhi uses simple mode.",
  unavailable: "Sakhi's AI is busy right now, so she's answering in simple mode. Logging still works.",
  "no-key": "Sakhi is in simple mode: she can log what you tell her and give basic guidance.",
  "english-only": "Sakhi is in simple mode, which replies in English for now. Your readings are still saved.",
};

interface Props {
  chat: SakhiChat;
  emptyState?: React.ReactNode;
  headerText?: string;
  headerAction?: React.ReactNode;
  quickReplies?: QuickReply[];
}

export default function SakhiChatPanel({ chat, emptyState, headerText, headerAction, quickReplies = [] }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the newest message in view without scrolling the page itself
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, chat.isLoading, chat.interim]);

  const submit = (text: string) => {
    if (!text.trim() || chat.isLoading) return;
    chat.sendMessage(text);
    setInput("");
  };

  const pick = (q: QuickReply) => {
    if (q.send) submit(q.text);
    else { setInput(q.text); inputRef.current?.focus(); }
  };

  const showChips = !chat.isLoading && !chat.listening && quickReplies.length > 0
    && (chat.messages.length === 0 || chat.messages[chat.messages.length - 1].role === "assistant");
  const notice = chat.notice ? NOTICE[chat.notice] : null;

  return (
    <div className="flex flex-col h-full">
      {(headerText || headerAction || chat.messages.length > 0) && (
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <span className="text-[11px] sm:text-xs text-plum-900/55 truncate">{headerText}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerAction}
            {chat.messages.length > 0 && (
              <button
                type="button"
                onClick={() => { if (window.confirm("Clear this conversation? Your logged data stays saved.")) chat.clearChat(); }}
                className="p-1.5 rounded-full text-plum-900/40 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <Trash size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div className="mb-2 shrink-0 rounded-xl bg-amber-50/90 border border-amber-200/70 px-3 py-1.5 text-[11px] sm:text-xs text-amber-900">{notice}</div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar mb-3 flex flex-col gap-3 sm:gap-4 pr-2" aria-live="polite">
        {chat.messages.length === 0 && emptyState}
        {chat.messages.map(m => {
          const tag = m.role === "assistant" && m.engine ? ENGINE_TAG[m.engine] : undefined;
          return (
            <div
              key={m.id}
              className={`max-w-[88%] sm:max-w-[85%] p-3 sm:p-4 rounded-2xl text-sm sm:text-base shadow-sm border ${
                m.role === "user"
                  ? "bg-pink-100/90 text-pink-900 self-end rounded-tr-sm border-white/40 whitespace-pre-wrap"
                  : m.engine === "safety"
                  ? "bg-rose-50 text-plum-900 self-start rounded-tl-sm border-rose-200"
                  : "bg-white/90 backdrop-blur-md text-plum-900 self-start rounded-tl-sm border-white/40"
              }`}
            >
              {m.role === "assistant" ? <ChatMarkdown text={m.text} /> : m.text}
              {tag && (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-plum-900/45">
                  {tag.icon} {tag.label}
                </span>
              )}
            </div>
          );
        })}
        {chat.listening && (
          <div className="max-w-[85%] self-end rounded-2xl rounded-tr-sm p-3 text-sm bg-pink-50 border border-dashed border-pink-300 text-pink-800/80 italic">
            {chat.interim || "Listening…"}
          </div>
        )}
        {chat.isLoading && (
          <div className="bg-white/90 text-plum-900 self-start rounded-2xl rounded-tl-sm p-3 sm:p-4 shadow-sm border border-white/40 flex gap-1.5 items-center" aria-label="Sakhi is typing">
            {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
          </div>
        )}
      </div>

      {showChips && (
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] mb-2 shrink-0 pb-0.5">
          {quickReplies.map(q => (
            <button
              key={q.label}
              type="button"
              onClick={() => pick(q)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/80 border border-pink-200 text-pink-700 hover:bg-pink-50 transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {chat.voiceError && (
        <div className="mb-2 shrink-0 flex items-start justify-between gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-[11px] sm:text-xs text-rose-800">
          <span>{chat.voiceError}</span>
          <button type="button" onClick={chat.clearVoiceError} className="font-semibold" aria-label="Dismiss">×</button>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); submit(input); }} className="relative shrink-0 mt-auto">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={chat.handsFree ? "Hands-free is on, just talk…" : "Type or tap the mic to talk…"}
          aria-label="Message Sakhi"
          className="w-full bg-white/60 border border-plum-900/10 rounded-2xl pl-3.5 sm:pl-5 pr-36 sm:pr-40 py-3 sm:py-4 text-plum-900 placeholder:text-plum-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70 transition-[border-color,background-color,box-shadow] text-xs sm:text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
        />
        <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={chat.isSpeaking ? chat.stopSpeaking : chat.toggleAutoPlayVoice}
            className={`p-2 sm:p-2.5 rounded-full transition-colors duration-300 ${chat.autoPlayVoice ? "bg-pink-100 text-pink-600 hover:bg-pink-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
            title={chat.isSpeaking ? "Stop speaking" : chat.autoPlayVoice ? "Voice replies on (tap to mute)" : "Voice replies off (tap to unmute)"}
            aria-label={chat.isSpeaking ? "Stop speaking" : "Toggle voice replies"}
          >
            {chat.autoPlayVoice ? <SpeakerHigh weight="fill" className="w-4 h-4 sm:w-5 sm:h-5" /> : <SpeakerSlash weight="fill" className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          {chat.micSupported && (
            <button
              type="button"
              onClick={() => chat.setHandsFree(!chat.handsFree)}
              className={`p-2 sm:p-2.5 rounded-full transition-colors duration-300 ${chat.handsFree ? "bg-pink-500 text-white" : "bg-plum-900/5 text-plum-900/70 hover:bg-pink-100 hover:text-pink-600"}`}
              title={chat.handsFree ? "Hands-free on: Sakhi listens again after she replies" : "Hands-free conversation"}
              aria-pressed={chat.handsFree}
              aria-label="Hands-free conversation"
            >
              <Waveform weight={chat.handsFree ? "bold" : "regular"} className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={chat.toggleListening}
            className={`p-2 sm:p-2.5 rounded-full transition-colors duration-300 ${chat.listening ? "bg-pink-200 text-pink-600 shadow-[0_0_15px_rgba(244,114,182,0.5)] animate-pulse" : "bg-plum-900/5 text-plum-900 hover:bg-pink-100 hover:text-pink-600"}`}
            title={chat.listening ? "Stop listening" : "Speak to Sakhi"}
            aria-label={chat.listening ? "Stop listening" : "Speak to Sakhi"}
          >
            <Microphone weight={chat.listening ? "fill" : "regular"} className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || chat.isLoading}
            aria-label="Send"
            className="p-2 sm:p-2.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:bg-plum-900/10 disabled:text-plum-900/30 shadow-md"
          >
            <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
