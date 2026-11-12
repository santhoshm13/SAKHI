"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOICE_ENABLED_KEY, createRecognizer, recognitionSupported, speak, speechSupported,
  stopSpeaking as stopVoice, voiceEnabled, type Recognizer,
} from "@/lib/voice";

export type ChatMode = "her" | "pregnancy";
export type Engine = "gemini" | "local" | "offline" | "safety";

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  engine?: Engine;
};

interface Options {
  mode: ChatMode;
  onChartUpdate?: (data: any) => void;
  profileName?: string;
}

const ENDPOINT: Record<ChatMode, string> = { her: "/api/ask-sakhi", pregnancy: "/api/ask-sakhi-pregnancy" };
const localKey = (mode: ChatMode) => `sakhi_chat_${mode}`;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * One chat for Her Mode and Mom Mode: history that survives reloads, all of the
 * server's chart updates, voice in and out with lip-sync, and hands-free mode.
 */
export function useSakhiChat({ mode, onChartUpdate, profileName }: Options) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // false when the server has no database/file storage: the browser keeps the history
  const [serverStores, setServerStores] = useState(true);

  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [handsFree, setHandsFreeState] = useState(false);
  // Checked after mount so server and client render the same markup
  const [micSupported, setMicSupported] = useState(true);
  useEffect(() => setMicSupported(recognitionSupported()), []);

  const chartRef = useRef(onChartUpdate);
  chartRef.current = onChartUpdate;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const recognizerRef = useRef<Recognizer | null>(null);
  const lastWordRef = useRef(0);
  const sendRef = useRef<(text: string, viaVoice?: boolean) => Promise<void>>(async () => {});

  // ---------------------------------------------------------------- history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chat-history?mode=${mode}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.stored) {
          setServerStores(true);
          setMessages((data.messages || []).map((m: any) => ({ id: newId(), role: m.role, text: m.text, engine: m.engine })));
        } else {
          setServerStores(false);
          const saved = JSON.parse(localStorage.getItem(localKey(mode)) || "[]");
          if (Array.isArray(saved)) setMessages(saved.filter((m: any) => m?.text && (m.role === "user" || m.role === "assistant")));
        }
      } catch { /* offline: start empty */ }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    if (serverStores) return;
    try { localStorage.setItem(localKey(mode), JSON.stringify(messages.slice(-20))); } catch { /* storage full or blocked */ }
  }, [messages, serverStores, mode]);

  // ---------------------------------------------------------------- voice output
  useEffect(() => {
    const sync = () => {
      const on = voiceEnabled();
      setAutoPlayVoice(on);
      if (!on) { stopVoice(); setIsSpeaking(false); }
    };
    sync();
    const onToggle = (e: any) => {
      if (typeof e?.detail?.enabled === "boolean") {
        setAutoPlayVoice(e.detail.enabled);
        if (!e.detail.enabled) { stopVoice(); setIsSpeaking(false); }
      } else sync();
    };
    // Voices load asynchronously in Chrome
    if (speechSupported()) window.speechSynthesis.getVoices();
    window.addEventListener("storage", sync);
    window.addEventListener("sakhi-voice-toggled", onToggle);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("sakhi-voice-toggled", onToggle);
      stopVoice();
      recognizerRef.current?.stop();
    };
  }, []);

  // Mouth follows word boundaries; voices without boundary events get a gentle flap
  useEffect(() => {
    if (!isSpeaking) { setMouthOpen(false); return; }
    const t = setInterval(() => {
      if (Date.now() - lastWordRef.current > 500) setMouthOpen(prev => (Math.random() > 0.35 ? !prev : prev));
    }, 160);
    return () => clearInterval(t);
  }, [isSpeaking]);

  const toggleAutoPlayVoice = useCallback(() => {
    const next = !voiceEnabled();
    try { localStorage.setItem(VOICE_ENABLED_KEY, String(next)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("sakhi-voice-toggled", { detail: { enabled: next } }));
  }, []);

  const stopSpeaking = useCallback(() => { stopVoice(); setIsSpeaking(false); }, []);

  const startListening = useCallback(() => {
    setVoiceError(null);
    if (!recognitionSupported()) {
      setVoiceError("Voice input isn't supported in this browser. Try Chrome or Edge, or type to me.");
      return;
    }
    if (!recognizerRef.current) {
      recognizerRef.current = createRecognizer({
        onInterim: setInterim,
        onFinal: text => { setInterim(""); sendRef.current(text, true); },
        onError: msg => { setVoiceError(msg); setHandsFreeState(false); },
        onEnd: () => { setListening(false); setInterim(""); },
      });
    }
    stopVoice();
    setIsSpeaking(false);
    setListening(true);
    recognizerRef.current?.start();
  }, []);

  const stopListening = useCallback(() => { recognizerRef.current?.stop(); setListening(false); }, []);
  const toggleListening = useCallback(() => (listening ? stopListening() : startListening()), [listening, startListening, stopListening]);

  const say = useCallback(async (text: string, viaVoice: boolean) => {
    if (!voiceEnabled() || !speechSupported()) {
      if (viaVoice && handsFreeRef.current) setTimeout(() => startListening(), 400);
      return;
    }
    await speak(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onWord: () => {
        lastWordRef.current = Date.now();
        setMouthOpen(true);
        setTimeout(() => setMouthOpen(false), 110);
      },
    });
    setIsSpeaking(false);
    // Hands-free: listen again after Sakhi finishes
    if (viaVoice && handsFreeRef.current) setTimeout(() => startListening(), 350);
  }, [startListening]);

  const setHandsFree = useCallback((on: boolean) => {
    setHandsFreeState(on);
    if (on) startListening();
    else stopListening();
  }, [startListening, stopListening]);

  // ---------------------------------------------------------------- sending
  const sendMessage = useCallback(async (raw: string, viaVoice = false) => {
    const text = raw.trim();
    if (!text) return;
    const prior = messagesRef.current;
    setMessages(prev => [...prev, { id: newId(), role: "user", text }]);
    setIsLoading(true);
    let name: string | undefined;
    try { name = localStorage.getItem("sakhi_preferred_name") || profileName; } catch { name = profileName; }

    try {
      const res = await fetch(ENDPOINT[mode], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          prompt: text,
          userName: name,
          // Only needed when the server can't store history itself
          history: serverStores ? undefined : prior.slice(-10).map(m => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply: string = data.reply || "I'm having trouble connecting right now. Please try again in a moment.";
      setMessages(prev => [...prev, { id: newId(), role: "assistant", text: reply, engine: data.engine }]);
      setNotice(data.notice || null);
      const updates: any[] = Array.isArray(data.chartUpdates) ? data.chartUpdates : data.updatedChartData ? [data.updatedChartData] : [];
      updates.forEach(u => { try { chartRef.current?.(u); } catch (e) { console.error(e); } });
      setIsLoading(false);
      say(reply, viaVoice);
    } catch {
      const reply = "I'm having trouble connecting right now. Please check your internet and try again.";
      setMessages(prev => [...prev, { id: newId(), role: "assistant", text: reply, engine: "offline" }]);
      setIsLoading(false);
      say(reply, false);
    }
  }, [mode, profileName, serverStores, say]);
  sendRef.current = sendMessage;

  const clearChat = useCallback(async () => {
    stopVoice();
    setMessages([]);
    setNotice(null);
    try { localStorage.removeItem(localKey(mode)); } catch { /* ignore */ }
    try { await fetch(`/api/chat-history?mode=${mode}`, { method: "DELETE" }); } catch { /* ignore */ }
  }, [mode]);

  return {
    messages, isLoading, sendMessage, clearChat, notice,
    autoPlayVoice, toggleAutoPlayVoice, isSpeaking, stopSpeaking, mouthOpen,
    listening, toggleListening, interim, voiceError, clearVoiceError: () => setVoiceError(null),
    handsFree, setHandsFree, micSupported,
    speakText: (text: string) => say(text, false),
  };
}

export type SakhiChat = ReturnType<typeof useSakhiChat>;
