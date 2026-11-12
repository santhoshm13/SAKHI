"use client";

import React, { useState, useEffect } from "react";
import ConsentGate from "@/components/ConsentGate";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Bell,
  GearSix,
  Drop,
  Calendar,
  Sparkle,
  TrendUp,
  Brain,
  WarningCircle,
  FilePdf,
  Baby,
  Heartbeat,
  Stethoscope,
  Moon,
  ForkKnife,
  Ruler
} from "@phosphor-icons/react";
import SakhiAvatar, { AIState } from "@/components/SakhiAvatar";
import ComprehensiveAssessment from "@/components/ComprehensiveAssessment";
import CycleTimeline from "@/components/charts/CycleTimeline";
import SymptomRadar from "@/components/charts/SymptomRadar";
import PainFlowCorrelation from "@/components/charts/PainFlowCorrelation";

// --- KOKONUT STYLE HELPERS ---
const cardClass = "bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-pink-200/80 shadow-[0_8px_30px_rgba(244,114,182,0.12)] hover:border-pink-300 hover:shadow-[0_12px_36px_rgba(244,114,182,0.18)] transition-[border-color,box-shadow] duration-300 p-8 relative overflow-hidden";
const innerCardClass = "bg-white/70 backdrop-blur-sm rounded-[2rem] border border-pink-100/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_12px_rgba(244,114,182,0.06)] p-6 flex flex-col justify-between";
const iconWrapClass = "w-12 h-12 rounded-full bg-[#2D1B36]/5 flex items-center justify-center text-[#2D1B36] mb-4";

// --- DASHBOARD PANELS ---
function MenstrualDashboard({ profile, logs }: { profile: any, logs: any[] }) {
  
  // Calculate next period
  const startDate = profile ? new Date(profile.last_period_start) : new Date();
  const nextPeriod = new Date(startDate);
  nextPeriod.setDate(startDate.getDate() + (profile?.cycle_length_avg || 28));
  
  const today = new Date();
  const diffTime = nextPeriod.getTime() - today.getTime();
  const daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Basic risk calculation
  const isPcosRisk = profile?.diagnosed_conditions?.includes("PCOS") || profile?.cycle_regularity === "No";

  return (
    <motion.div
      key="menstrual"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 pb-24"
    >
      {/* Primary Row */}
      <div className={`${cardClass} md:col-span-8 flex flex-col justify-between`}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            <span className="text-sm font-medium text-[#2D1B36]/60">Cycle intelligence</span>
          </div>
          <h2 className="text-4xl font-light tracking-tight text-[#2D1B36]">Your Cycle Timeline</h2>
          <p className="text-[#2D1B36]/70 mt-4 max-w-md leading-relaxed">Mapping your hormonal rhythm based on your personalized data.</p>
        </div>
        
        {profile && (
          <CycleTimeline 
            lastPeriodStart={profile.last_period_start} 
            cycleLengthAvg={profile.cycle_length_avg} 
          />
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className={innerCardClass}>
            <Calendar weight="duotone" className="w-8 h-8 text-pink-400 mb-6" />
            <div>
              <h4 className="text-2xl font-semibold text-[#2D1B36] tracking-tight">{daysUntilNext > 0 ? `${daysUntilNext} Days` : 'Due'}</h4>
              <p className="text-sm text-[#2D1B36]/60 mt-1">Next Period</p>
            </div>
          </div>
          <div className={innerCardClass}>
            <Sparkle weight="duotone" className="w-8 h-8 text-purple-400 mb-6" />
            <div>
              <h4 className="text-xl font-semibold text-[#2D1B36] tracking-tight">{profile?.cycle_length_avg || 28} Days</h4>
              <p className="text-sm text-[#2D1B36]/60 mt-1">Avg Cycle</p>
            </div>
          </div>
          <div className={innerCardClass}>
            <Heartbeat weight="duotone" className="w-8 h-8 text-rose-400 mb-6" />
            <div>
              <h4 className="text-xl font-semibold text-[#2D1B36] tracking-tight">{profile?.period_duration || 5} Days</h4>
              <p className="text-sm text-[#2D1B36]/60 mt-1">Avg Duration</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardClass} md:col-span-4 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#2D1B36]/5 to-transparent group`}>
        <div className="w-24 h-24 rounded-full bg-white/60 shadow-[0_0_40px_rgba(201,168,247,0.3)] flex items-center justify-center mb-6 cursor-pointer group-hover:scale-105 transition-transform duration-500">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#2D1B36]">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 16v-4M12 8h.01" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-[#2D1B36]">AI Triage</h3>
        <p className="text-sm text-[#2D1B36]/60 mt-2">Tap to report symptoms via voice</p>
      </div>

      {/* Secondary Data Row */}
      <div className={`${cardClass} md:col-span-6`}>
        <div className="flex items-center justify-between mb-2">
          <div className={iconWrapClass}><Drop weight="duotone" className="w-6 h-6" /></div>
          <span className="text-xs font-medium text-[#2D1B36]/55">Flow &amp; pain (last 7 days)</span>
        </div>
        <h3 className="text-xl font-medium text-[#2D1B36]">Correlation History</h3>
        <PainFlowCorrelation logs={logs} />
      </div>

      <div className={`${cardClass} md:col-span-6`}>
        <div className="flex items-center justify-between mb-2">
          <div className={iconWrapClass}><Heartbeat weight="duotone" className="w-6 h-6" /></div>
          <span className="text-xs font-medium text-[#2D1B36]/55">Symptom tracking</span>
        </div>
        <h3 className="text-xl font-medium text-[#2D1B36]">Symptom Frequency</h3>
        <SymptomRadar logs={logs} />
      </div>

      {/* Tertiary Row */}
      <div className={`${cardClass} md:col-span-4 bg-[#2D1B36] text-[#FAF8F5]`}>
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6"><Brain weight="duotone" className="w-6 h-6 text-[#FAF8F5]" /></div>
        <h3 className="text-2xl font-light tracking-tight mb-3">Pattern Detected</h3>
        <p className="text-sm text-white/70 leading-relaxed">
          Based on your real data, we noticed patterns correlating your mood and fatigue. Consider resting more during the first two days of your cycle.
        </p>
      </div>

      <div className={`${cardClass} md:col-span-4`}>
        <div className={iconWrapClass}><WarningCircle weight="duotone" className="w-6 h-6 text-orange-500" /></div>
        <h3 className="text-xl font-medium text-[#2D1B36] mb-2">PCOS Risk Indicator</h3>
        <div className="h-3 w-full bg-[#2D1B36]/5 rounded-full overflow-hidden mt-8">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: isPcosRisk ? '75%' : '20%' }} 
            transition={{ duration: 1.5, ease: "easeOut" }} 
            className={`h-full bg-gradient-to-r ${isPcosRisk ? 'from-amber-400 to-red-500' : 'from-emerald-400 to-amber-400'}`} 
          />
        </div>
        <p className="text-sm font-medium text-[#2D1B36]/60 mt-4 text-right">
          {isPcosRisk ? 'Elevated Risk (75%)' : 'Low Risk (20%)'}
        </p>
      </div>

      <div className={`${cardClass} md:col-span-4 flex flex-col justify-center items-center text-center group cursor-pointer`}>
        <div className="w-20 h-20 rounded-full bg-white/50 border border-white/40 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-md transition-[transform,box-shadow] duration-500">
          <FilePdf weight="duotone" className="w-8 h-8 text-[#2D1B36]" />
        </div>
        <h3 className="text-lg font-medium text-[#2D1B36]">Doctor Summary</h3>
        <p className="text-sm text-[#2D1B36]/60 mt-2">Generate your real data PDF report for your next visit.</p>
      </div>
    </motion.div>
  );
}

function PregnancyDashboard() {
  return (
    <motion.div
      key="pregnancy"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 pb-24"
    >
      <div className={`${cardClass} md:col-span-8 flex flex-col justify-between`}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm font-medium text-[#2D1B36]/60">Pregnancy journey</span>
          </div>
          <h2 className="text-4xl font-light tracking-tight text-[#2D1B36]">Week 24 <span className="text-[#2D1B36]/40">· Trimester 2</span></h2>
          <p className="text-[#2D1B36]/70 mt-4 max-w-md leading-relaxed">Your little one is the size of a cantaloupe. They are beginning to hear sounds from the outside world! 🍈</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className={innerCardClass}>
            <Baby weight="duotone" className="w-8 h-8 text-blue-400 mb-6" />
            <div>
              <h4 className="text-2xl font-semibold text-[#2D1B36] tracking-tight">30 cm</h4>
              <p className="text-sm text-[#2D1B36]/60 mt-1">Estimated Length</p>
            </div>
          </div>
          <div className={innerCardClass}>
            <Calendar weight="duotone" className="w-8 h-8 text-emerald-400 mb-6" />
            <div>
              <h4 className="text-2xl font-semibold text-[#2D1B36] tracking-tight">112 Days</h4>
              <p className="text-sm text-[#2D1B36]/60 mt-1">Until Due Date</p>
            </div>
          </div>
          <div className={innerCardClass}>
            <Heartbeat weight="duotone" className="w-8 h-8 text-rose-400 mb-6" />
            <div>
              <h4 className="text-2xl font-semibold text-[#2D1B36] tracking-tight">Normal</h4>
              <p className="text-sm text-[#2D1B36]/60 mt-1">Fetal Movement</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardClass} md:col-span-4 bg-[#2D1B36] text-[#FAF8F5] flex flex-col justify-between`}>
        <div>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6"><Stethoscope weight="duotone" className="w-6 h-6 text-white" /></div>
          <h3 className="text-2xl font-light tracking-tight">Next ANC Visit</h3>
          <p className="text-sm text-white/60 mt-3 leading-relaxed">Routine ultrasound & glucose screening. Don't forget your medical file.</p>
        </div>
        <div className="mt-8">
          <p className="text-5xl font-medium tracking-tighter">Nov 12</p>
          <p className="text-xs text-white/60 mt-2">In 8 days</p>
        </div>
      </div>

      <div className={`${cardClass} md:col-span-12 flex flex-col sm:flex-row items-center gap-6 cursor-pointer group`}>
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors duration-300">
          <WarningCircle weight="fill" className="w-8 h-8 text-orange-600" />
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-medium text-[#2D1B36]">Emergency Alerts</h3>
          <p className="text-sm text-[#2D1B36]/60 mt-2 leading-relaxed">No risk factors detected. Tap to review danger signs to watch out for.</p>
        </div>
      </div>
    </motion.div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function Dashboard() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<"menstrual" | "pregnancy">("menstrual");
  const [mounted, setMounted] = useState(false);
  
  // State for Onboarding and Data
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [aiState, setAiState] = useState<AIState>("idle");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // dashboard-data also serves a preview profile for signed-out visitors, so fetch
    // in both states; previously an unauthenticated user saw an endless spinner.
    if (status === "authenticated" || status === "unauthenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch data
      const res = await fetch("/api/dashboard-data");
      const data = await res.json();
      
      if (data.onboarded && data.profile) {
        // User exists and has a profile
        setProfile(data.profile);
        setLogs(data.logs || []);
        setShowOnboarding(false); // Can change this if we want them to do a daily check-in
        
        // Check if they've logged today
        const today = new Date().toISOString().split('T')[0];
        const hasLoggedToday = (data.logs || []).some((l: any) => {
          const d = new Date(l?.log_date);
          // An invalid date would make toISOString() throw a RangeError
          return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === today;
        });
        
        if (!hasLoggedToday) {
          // Show daily check-in only
          setIsFirstTime(false);
          setShowOnboarding(true);
        }
      } else {
        // No profile, needs complete onboarding
        setIsFirstTime(true);
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setIsCheckingData(false);
    }
  };

  const handleAssessmentComplete = async (data: any) => {
    setAiState("thinking");
    try {
      // If first time, save to onboarding profile
      if (isFirstTime) {
        await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferredName: data.preferredName,
            lastPeriodStart: data.lastPeriodStart,
            lastPeriodEnd: data.lastPeriodEnd,
            periodDuration: data.periodDuration,
            cycleLengthAvg: data.cycleLengthAvg,
            cycleRegularity: data.cycleRegularity,
            diagnosedConditions: data.diagnosedConditions
          })
        });
      }

      // Always save the daily log
      const today = new Date().toISOString().split('T')[0];
      await fetch("/api/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logDate: today,
          onPeriod: data.onPeriod,
          flowIntensity: data.flowIntensity,
          crampsSeverity: data.crampsSeverity,
          symptoms: data.symptoms,
          mood: data.mood,
          sleepHours: data.sleepHours,
          waterConsumed: data.waterConsumed,
          exercised: data.exercised,
          warningSigns: data.warningSigns,
          notes: data.notes
        })
      });

      // Refetch data to refresh dashboard
      await fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
    setAiState("idle");
    setShowOnboarding(false);
  };

  if (!mounted || isCheckingData) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Sparkle weight="duotone" className="w-12 h-12 text-pink-400 animate-pulse opacity-50" />
      </div>
    );
  }

  const displayName = profile?.preferred_name || session?.user?.name?.split(" ")[0] || "Beautiful";

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] selection:bg-[#2D1B36]/10 font-sans relative">
      <ConsentGate />
      
      {/* Sakhi Avatar Widget */}
      <SakhiAvatar aiState={aiState} />

      {/* Onboarding / Daily Check-in Overlay */}
      {showOnboarding && (
        <ComprehensiveAssessment 
          isFirstTime={isFirstTime} 
          onComplete={handleAssessmentComplete}
          setAiState={setAiState}
        />
      )}

      {/* Navbar / Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-white/50 border border-white/40 shadow-sm shrink-0">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#2D1B36]/30">
                <Baby className="w-6 h-6" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-tight text-[#2D1B36] flex items-center gap-2">
              Good morning, {displayName} 
              <span className="inline-block hover:rotate-12 hover:scale-110 cursor-pointer transition-transform duration-300">🌸</span>
            </h1>
            <p className="text-sm text-[#2D1B36]/50 mt-1">Your daily wellness summary.</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-3">
          <button className="w-12 h-12 rounded-full bg-white/50 backdrop-blur-md border border-white/40 flex items-center justify-center text-[#2D1B36]/60 hover:text-[#2D1B36] hover:bg-white/80 transition-[background-color,color,transform] hover:scale-105 active:scale-95 shadow-sm">
            <Bell weight="duotone" className="w-5 h-5" />
          </button>
          <button className="w-12 h-12 rounded-full bg-white/50 backdrop-blur-md border border-white/40 flex items-center justify-center text-[#2D1B36]/60 hover:text-[#2D1B36] hover:bg-white/80 transition-[background-color,color,transform] hover:scale-105 active:scale-95 shadow-sm">
            <GearSix weight="duotone" className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mode Switcher */}
      <div className="w-full flex justify-center py-8">
        <div className="relative flex items-center p-2 bg-white/50 backdrop-blur-md rounded-full border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <button
            onClick={() => setMode("menstrual")}
            className={`relative z-10 px-8 py-3.5 rounded-full text-sm font-semibold transition-colors duration-500 tracking-wide ${
              mode === "menstrual" ? "text-white" : "text-[#2D1B36]/60 hover:text-[#2D1B36]"
            }`}
          >
            HER MODE
          </button>
          <button
            onClick={() => setMode("pregnancy")}
            className={`relative z-10 px-8 py-3.5 rounded-full text-sm font-semibold transition-colors duration-500 tracking-wide ${
              mode === "pregnancy" ? "text-white" : "text-[#2D1B36]/60 hover:text-[#2D1B36]"
            }`}
          >
            MOM MODE
          </button>
          
          {/* Animated Pill Background */}
          <motion.div
            layoutId="mode-pill"
            className="absolute top-2 bottom-2 rounded-full bg-gradient-to-r from-[#C9A8F7] to-[#F9C5D1] shadow-sm z-0"
            initial={false}
            animate={{
              left: mode === "menstrual" ? "0.5rem" : "50%",
              width: "calc(50% - 0.5rem)"
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {mode === "menstrual" && <MenstrualDashboard key="menstrual-view" profile={profile} logs={logs} />}
          {mode === "pregnancy" && <PregnancyDashboard key="pregnancy-view" />}
        </AnimatePresence>
      </main>

    </div>
  );
}
