"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ConsentGate from "@/components/ConsentGate";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Sparkle, Sun, Drop, ChartLineUp, Heart } from "@phosphor-icons/react";
import SakhiAvatar, { AIState } from "@/components/SakhiAvatar";
import {
  CycleLengthChart,
  PeriodDurationChart,
  SymptomFrequencyChart,
  MoodCycleChart,
  FlowIntensityChart,
  OvulationCalendar,
  PainTrendChart,
  SleepHoursChart,
} from "@/components/charts/DashboardCharts";
import SettingsModal from "@/components/SettingsModal";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardTabs, { useHashTab, type TabDef } from "@/components/DashboardTabs";
import ReliefSheet from "@/components/her/ReliefSheet";
import {
  PhaseCard, TodayTipsCard, PainNowCard, PmsForecastCard, PhaseInsightsCard, PatternsCard, CareLinksCard, panelCard,
} from "@/components/her/HerPanels";
import { useHerNotifications } from "@/hooks/useHerNotifications";
import HerNotificationCenter from "@/components/HerNotificationCenter";
import { computePhase, dayNum, todayNum } from "@/lib/cyclePhase";
import WeightTracker from "@/components/WeightTracker";
import { contextFromLog, tipsForToday } from "@/lib/phaseTips";
import { patternsWorthMentioning, phaseHighlights, phaseStats, pmsForecast } from "@/lib/herInsights";

const localTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type HerTab = "today" | "cycle" | "insights" | "care";
const TAB_IDS = ["today", "cycle", "insights", "care"] as const;
const TABS: TabDef<HerTab>[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "cycle", label: "Cycle", icon: Drop },
  { id: "insights", label: "Insights", icon: ChartLineUp },
  { id: "care", label: "Care", icon: Heart },
];

const pulse = (on: boolean, rgba: string) =>
  on ? { scale: [1, 1.015, 1], boxShadow: ["0 0 0 rgba(0,0,0,0)", `0 0 25px ${rgba}`, "0 0 0 rgba(0,0,0,0)"] } : {};

function ChartCard({ title, children, span = 6, active, glow }: { title: string; children: React.ReactNode; span?: 6 | 12; active?: boolean; glow?: string }) {
  return (
    <motion.section
      animate={pulse(Boolean(active), glow || "rgba(236,72,153,0.4)")}
      transition={{ duration: 1.5, repeat: active ? 2 : 0 }}
      className={`${panelCard} ${span === 12 ? "md:col-span-12" : "md:col-span-6"}`}
    >
      <h3 className="text-lg font-semibold tracking-tight text-plum-900 mb-4">{title}</h3>
      {children}
    </motion.section>
  );
}

export default function HerModePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [cycleHistory, setCycleHistory] = useState<any[]>([]);
  const [aiState, setAiState] = useState<AIState>("idle");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [pulsingChart, setPulsingChart] = useState<string | null>(null);
  const [relief, setRelief] = useState<{ open: boolean; severity: number | null }>({ open: false, severity: null });
  const [favourites, setFavourites] = useState<string[]>([]);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [tab, setTab] = useHashTab<HerTab>(TAB_IDS, "today");

  const {
    preferences, reminders, toggleMaster, updatePreference,
    markCompleted, snoozeReminder, deleteReminder,
  } = useHerNotifications(profile, logs, cycleHistory);

  const loadFavourites = useCallback(() => {
    fetch("/api/relief?peek=1", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setFavourites((d?.favourites || []).map((t: any) => t.title)))
      .catch(() => {});
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard-data", { cache: "no-store" });
      const data = await res.json();
      if (data.onboarded === false) {
        router.push("/onboarding");
        return;
      }
      if (data.profile) {
        setProfile(data.profile);
        if (data.profile.preferred_name) {
          try { localStorage.setItem("sakhi_preferred_name", data.profile.preferred_name); } catch {}
        }
        setLogs(data.logs || []);
        setCycleHistory(data.cycleHistory || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setIsCheckingData(false);
    }
  }, [router]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sakhi_active_mode", "her");
      document.cookie = "sakhi_active_mode=her; path=/; max-age=31536000; samesite=lax";
    } catch {}
    if (status !== "loading") {
      fetchDashboardData();
      loadFavourites();
    }
  }, [status, fetchDashboardData, loadFavourites]);

  useEffect(() => {
    if (isCheckingData) return;
    const todayStr = localTodayStr();
    let last: string | null = null;
    try { last = localStorage.getItem("sakhi_last_checkin"); } catch {}
    const loggedToday = logs.some(l => dayNum(l.log_date) === todayNum());
    if (last !== todayStr && !loggedToday) {
      setShowCheckIn(true);
      setAiState("talking");
    }
  }, [isCheckingData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleNameUpdate = (e: any) => {
      if (e.detail?.name) setProfile((prev: any) => ({ ...prev, preferred_name: e.detail.name }));
    };
    window.addEventListener("sakhi-name-updated", handleNameUpdate);
    return () => window.removeEventListener("sakhi-name-updated", handleNameUpdate);
  }, []);

  // ---- derived state
  const phase = useMemo(() => computePhase({ profile, logs, cycleHistory }), [profile, logs, cycleHistory]);
  const todayLog = useMemo(() => logs.find(l => dayNum(l.log_date) === todayNum()), [logs]);
  const ctx = contextFromLog(todayLog);
  const tips = useMemo(() => tipsForToday(phase.phase, todayNum(), ctx), [phase.phase, ctx.lowEnergy, ctx.poorSleep, ctx.pain]); // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(() => phaseStats(profile, logs, phase.cycleLength, phase.periodLength), [profile, logs, phase.cycleLength, phase.periodLength]);
  const highlights = useMemo(() => phaseHighlights(stats), [stats]);
  const forecast = useMemo(() => pmsForecast(profile, logs, phase.daysUntilPeriod), [profile, logs, phase.daysUntilPeriod]);
  const patterns = useMemo(() => patternsWorthMentioning(profile, logs, cycleHistory), [profile, logs, cycleHistory]);

  const openRelief = (severity: number | null = null) => setRelief({ open: true, severity });
  const closeRelief = () => { setRelief({ open: false, severity: null }); loadFavourites(); };

  if (!mounted || isCheckingData) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Sparkle weight="duotone" className="w-12 h-12 text-pink-400 animate-pulse opacity-50" />
      </div>
    );
  }

  const displayName = profile?.preferred_name || session?.user?.name?.split(" ")[0] || "there";

  const handleCheckInComplete = async (data: any) => {
    setAiState("thinking");
    const todayStr = localTodayStr();
    const isPeriod =
      data.onPeriod === true ||
      String(data.onPeriod || "").toLowerCase() === "yes" ||
      (Boolean(data.flowIntensity) && data.flowIntensity !== "None");
    const newLog = {
      log_date: todayStr,
      on_period: isPeriod,
      flow_intensity: data.flowIntensity || "None",
      cramps_severity: Number(data.crampsSeverity ?? 0),
      symptoms: Array.isArray(data.symptoms) && data.symptoms.length > 0 ? data.symptoms : ["None"],
      mood: data.mood || "Calm",
      sleep_hours: data.sleepHours !== undefined && data.sleepHours !== null ? Number(data.sleepHours) : 7.5,
      ...(data.weight !== undefined && data.weight !== null ? { weight: Number(data.weight) } : {}),
    };
    setLogs(prev => [...prev.filter(l => dayNum(l.log_date) !== todayNum()), newLog]);
    try {
      const res = await fetch("/api/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved?.log) {
          setLogs(prev => [...prev.filter(l => dayNum(l.log_date) !== todayNum()), saved.log]);
        }
      }
      try { localStorage.setItem("sakhi_last_checkin", todayStr); } catch {}
      await fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
    setAiState("idle");
    setShowCheckIn(false);
    if (Number(data.crampsSeverity) >= 6) openRelief(Number(data.crampsSeverity));
  };

  const handleChartUpdate = (data: any) => {
    if (data.type === "daily_log") {
      const newLog = data.log;
      setLogs(prev => [...prev.filter(l => dayNum(l.log_date) !== dayNum(newLog.log_date || new Date().toISOString())), newLog]);
      if (newLog.cramps_severity && newLog.cramps_severity > 0) setPulsingChart("pain");
      else if (newLog.flow_intensity && newLog.flow_intensity !== "None") setPulsingChart("flow");
      else if (newLog.symptoms?.length) setPulsingChart("symptoms");
      else if (newLog.mood) setPulsingChart("mood");
      else if (newLog.sleep_hours) setPulsingChart("sleep");
      // Strong pain mentioned in chat: offer the relief toolkit straight away
      if (Number(newLog.cramps_severity) >= 7) openRelief(Number(newLog.cramps_severity));
      // Bleeding after a gap was recorded as a new period start on the server
      if (data.cycleUpdate) handleChartUpdate(data.cycleUpdate);
    } else if (data.type === "cycle_history_update") {
      if (data.cycleHistory) setCycleHistory(data.cycleHistory);
      if (data.profile) setProfile((prev: any) => ({ ...prev, ...data.profile }));
      setPulsingChart("cycle_length");
    } else if (data.type === "profile_update") {
      setProfile((prev: any) => ({ ...prev, ...data.profile }));
      setPulsingChart("calendar");
    }
    setTimeout(() => setPulsingChart(null), 3500);
  };

  const markPeriodStarted = async (date?: string) => {
    setSavingPeriod(true);
    try {
      // Always send her local date: the server runs on UTC, which is behind India until 5:30 am
      const res = await fetch("/api/period-start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: date || localTodayStr() }) });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "Couldn't save your period start. Please try again."); return; }
      if (d.chartData) handleChartUpdate(d.chartData);
      await fetchDashboardData();
    } finally {
      setSavingPeriod(false);
    }
  };

  const pendingReminders = (reminders || []).filter(r => r.status === "upcoming").length;

  return (
    <div className="min-h-[100dvh] bg-cream selection:bg-plum-900/10 font-sans relative">
      <ConsentGate />
      <DashboardHeader
        mode="her"
        modeLabel="Her Mode"
        displayName={displayName}
        reminderCount={pendingReminders}
        onOpenReminders={() => setIsNotificationOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-28 sm:pb-16">
        <DashboardTabs tabs={TABS} active={tab} onChange={setTab} />

        {/* Today: where she is in her cycle comes first, then the chat. While a
            check-in is waiting the chat leads instead. CSS order (not JSX order)
            so the chat is never remounted and a conversation is never lost. */}
        <div className={tab === "today" ? "flex flex-col gap-5 sm:gap-6 mb-5 sm:mb-6" : "hidden"}>
        {tab === "today" && (
          <div className={`grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 ${showCheckIn ? "order-2" : "order-1"}`}>
            <PhaseCard info={phase} onPeriodStarted={markPeriodStarted} saving={savingPeriod} />
            <PainNowCard onOpen={() => openRelief(ctx.pain && ctx.pain > 0 ? ctx.pain : null)} todayPain={ctx.pain || 0} />
          </div>
        )}
        <div className={showCheckIn ? "order-1" : "order-2"}>
          <SakhiAvatar
            aiState={aiState}
            checkInMode={showCheckIn}
            onCheckInComplete={handleCheckInComplete}
            defaultOpen={showCheckIn}
            onChartUpdate={handleChartUpdate}
            profileName={displayName}
            checkInContext={{
              phase: phase.phase,
              status: phase.status,
              cycleDay: phase.cycleDay,
              bleedingDay: phase.bleedingDay,
              usualPeriodLength: phase.usualPeriodLength,
              daysUntilPeriod: phase.daysUntilPeriod,
              late: phase.late,
              daysLate: phase.daysLate,
            }}
          />
        </div>
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6"
        >
          {tab === "today" && (
            <>
              <TodayTipsCard tips={tips} adapted={Boolean(ctx.lowEnergy || ctx.poorSleep || (ctx.pain ?? 0) >= 5)} />
              <PmsForecastCard forecast={forecast} />
            </>
          )}

          {tab === "cycle" && (
            <>
              <ChartCard title="Your window calendar" span={12} active={pulsingChart === "calendar"} glow="rgba(16,185,129,0.4)">
                <OvulationCalendar profile={profile} />
              </ChartCard>
              <ChartCard title="Cycle length trend" active={pulsingChart === "cycle_length"}><CycleLengthChart data={cycleHistory} /></ChartCard>
              <ChartCard title="Period duration trend" active={pulsingChart === "cycle_length"} glow="rgba(244,63,94,0.4)"><PeriodDurationChart data={cycleHistory} /></ChartCard>
              <ChartCard title="Flow intensity" span={12} active={pulsingChart === "flow"} glow="rgba(244,63,94,0.4)"><FlowIntensityChart data={logs} /></ChartCard>
            </>
          )}

          {tab === "insights" && (
            <>
              <PhaseInsightsCard stats={stats} highlights={highlights} />
              <ChartCard title="Common symptoms" active={pulsingChart === "symptoms"} glow="rgba(168,85,247,0.4)"><SymptomFrequencyChart data={logs} /></ChartCard>
              <ChartCard title="Mood across your cycle" active={pulsingChart === "mood"} glow="rgba(99,102,241,0.4)"><MoodCycleChart data={logs} /></ChartCard>
              <ChartCard title="Pain trend" active={pulsingChart === "pain"} glow="rgba(244,63,94,0.5)"><PainTrendChart data={logs} /></ChartCard>
              <ChartCard title="Sleep hours" active={pulsingChart === "sleep"} glow="rgba(139,92,246,0.4)"><SleepHoursChart data={logs} /></ChartCard>
              <ChartCard title="Weight" span={12}><WeightTracker mode="her" logs={logs} /></ChartCard>
            </>
          )}

          {tab === "care" && (
            <>
              <PatternsCard patterns={patterns} logCount={logs.length} />
              <CareLinksCard onOpenRelief={() => openRelief()} onOpenSettings={() => setIsSettingsOpen(true)} favourites={favourites} />
            </>
          )}
        </motion.div>
      </main>

      <ReliefSheet open={relief.open} initialSeverity={relief.severity} onClose={closeRelief} />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} mode="her" currentData={profile} />

      <HerNotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        preferences={preferences}
        reminders={reminders}
        onToggleMaster={toggleMaster}
        onUpdatePref={updatePreference}
        onMarkCompleted={markCompleted}
        onSnooze={snoozeReminder}
        onDelete={deleteReminder}
      />
    </div>
  );
}
