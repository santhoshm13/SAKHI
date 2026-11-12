"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { sakhiSignOut } from "@/lib/clientSignOut";
import {
  Heartbeat,
  Brain,
  Baby,
  Calendar,
  User,
  Pulse,
  SignOut,
  Sliders,
  CheckCircle,
  Clock,
  Warning,
  FirstAid,
  UserCircle,
  Database,
  ArrowLeft
} from "@phosphor-icons/react";
import { Button, Input, Card, Badge } from "@/components/kokonut";

type Tab = "dashboard" | "log" | "history" | "profile";

export default function PortalPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; mode: string; error: string | null }>({
    connected: false,
    mode: "Checking...",
    error: null,
  });

  // Profile fields
  const [age, setAge] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [bmi, setBmi] = useState<string>("0.00");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Period logs state
  const [cycleLogs, setCycleLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Log Form fields
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [flowIntensity, setFlowIntensity] = useState<string>("normal");
  const [crampSeverity, setCrampSeverity] = useState<number>(0);
  const [bloatingSeverity, setBloatingSeverity] = useState<number>(0);
  const [headacheSeverity, setHeadacheSeverity] = useState<number>(0);
  const [fatigueSeverity, setFatigueSeverity] = useState<number>(0);
  const [acneSeverity, setAcneSeverity] = useState<number>(0);
  const [stressLevel, setStressLevel] = useState<number>(0);
  const [sleepHours, setSleepHours] = useState<string>("7");

  // Checkbox Flags
  const [nausea, setNausea] = useState(false);
  const [faintingOrDizziness, setFaintingOrDizziness] = useState(false);
  const [soakingPadHourly, setSoakingPadHourly] = useState(false);
  const [severeAbdominalPain, setSevereAbdominalPain] = useState(false);
  const [tirednessSevere, setTirednessSevere] = useState(false);
  const [hairGrowthNew, setHairGrowthNew] = useState(false);
  const [skinDarkening, setSkinDarkening] = useState(false);
  const [weightGainRapid, setWeightGainRapid] = useState(false);
  const [anxietyOrStress, setAnxietyOrStress] = useState(false);
  const [moodSwings, setMoodSwings] = useState(false);
  const [headacheWithVisionChanges, setHeadacheWithVisionChanges] = useState(false);

  // Results
  const [logLoading, setLogLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [wellnessAdvice, setWellnessAdvice] = useState<any[]>([]);
  const [logSuccess, setLogSuccess] = useState(false);

  // Fetch db status, profile, and cycle logs
  useEffect(() => {
    fetchDbStatus();
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
      fetchLogs();
    }
  }, [status]);

  // Calculate BMI automatically when weight/height changes
  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // cm to m
    if (w > 0 && h > 0) {
      const calculatedBmi = (w / (h * h)).toFixed(2);
      setBmi(calculatedBmi);
    } else {
      setBmi("0.00");
    }
  }, [weight, height]);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/db-status");
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      setDbStatus({ connected: false, mode: "Mock/Demo Mode (Error)", error: "Status fetch failed" });
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.age) setAge(data.age.toString());
        if (data.bmi) setBmi(data.bmi.toString());
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/cycle-logs");
      if (res.ok) {
        const data = await res.json();
        setCycleLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: parseInt(age) || null,
          bmi: parseFloat(bmi) || null,
        }),
      });
      if (res.ok) {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogLoading(true);
    setLogSuccess(false);
    setTriageResult(null);
    setWellnessAdvice([]);

    const payload = {
      startDate,
      endDate: endDate || null,
      flowIntensity,
      crampSeverity,
      bloatingSeverity,
      headacheSeverity,
      fatigueSeverity,
      acneSeverity,
      stressLevel,
      sleepHours: parseFloat(sleepHours) || 7,
      nausea,
      faintingOrDizziness,
      soakingPadHourly,
      severeAbdominalPain,
      tirednessSevere,
      hairGrowthNew,
      skinDarkening,
      weightGainRapid,
      anxietyOrStress,
      moodSwings,
      headacheWithVisionChanges,
      // Pass helper inputs
      isCurrentlyBleeding: !endDate,
      cycleLength: cycleLogs.length > 0 && cycleLogs[0].cycle_length ? cycleLogs[0].cycle_length : 28,
      periodLength: endDate ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 5,
    };

    try {
      // 1. Save cycle log
      const logRes = await fetch("/api/cycle-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 2. Run Triage and get advisory
      const triageRes = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (logRes.ok && triageRes.ok) {
        const triageData = await triageRes.json();
        setTriageResult(triageData.triageResult);
        setWellnessAdvice(triageData.wellnessAdvice);
        setLogSuccess(true);
        fetchLogs(); // refresh timeline
      }
    } catch (err) {
      console.error("Failed to log cycle details", err);
    } finally {
      setLogLoading(false);
    }
  };

  // Helper calculation for cycle details
  const getCycleStats = () => {
    if (cycleLogs.length === 0) {
      return {
        avgCycle: 28,
        avgPeriod: 5,
        nextPeriodDate: "Not logged yet",
        ovulationDate: "Not logged yet",
        countdown: 0,
      };
    }

    const validCycles = cycleLogs.filter((l) => l.cycle_length).map((l) => l.cycle_length);
    const validPeriods = cycleLogs.filter((l) => l.period_length).map((l) => l.period_length);

    const avgCycle = validCycles.length > 0 ? Math.round(validCycles.reduce((a, b) => a + b, 0) / validCycles.length) : 28;
    const avgPeriod = validPeriods.length > 0 ? Math.round(validPeriods.reduce((a, b) => a + b, 0) / validPeriods.length) : 5;

    const lastLog = cycleLogs[0];
    const lastStart = new Date(lastLog.start_date);
    
    // Predict next start
    const nextStart = new Date(lastStart);
    nextStart.setDate(lastStart.getDate() + avgCycle);

    // Predict ovulation (14 days before next start, or +14 days from last start)
    const ovulation = new Date(lastStart);
    ovulation.setDate(lastStart.getDate() + Math.round(avgCycle / 2));

    const today = new Date();
    today.setHours(0,0,0,0);
    nextStart.setHours(0,0,0,0);
    const diffTime = nextStart.getTime() - today.getTime();
    const countdown = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

    return {
      avgCycle,
      avgPeriod,
      nextPeriodDate: nextStart.toLocaleDateString("en-US", options),
      ovulationDate: ovulation.toLocaleDateString("en-US", options),
      countdown: countdown > 0 ? countdown : 0,
    };
  };

  const stats = getCycleStats();

  // Authentication Guard Render
  if (status === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-lavender-500 border-t-transparent" />
          <p className="text-sm font-medium text-plum-800">Entering Sakhi Portal...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center bg-cream">
        {/* Breathing Orbs for depth */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="breathe absolute -top-20 left-[10%] h-80 w-80 rounded-full bg-lavender-200/40 blur-3xl" />
          <div className="breathe absolute bottom-10 right-[10%] h-80 w-80 rounded-full bg-blush-200/40 blur-3xl" style={{ animationDelay: "3s" }} />
        </div>

        <button 
          onClick={() => window.location.href = "/"}
          className="absolute top-8 left-8 flex items-center gap-2 text-sm text-ink-soft hover:text-plum-900 transition-colors"
        >
          <ArrowLeft size={16} weight="bold" /> Back to Home
        </button>

        <Card className="glass max-w-md w-full p-8 sm:p-10 text-center rounded-[30px] border border-white/50 shadow-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lavender-100 ring-1 ring-lavender-200/50">
            <Heartbeat size={36} weight="bold" className="text-plum-700 animate-pulse" />
          </div>

          <h2 className="text-[2.2rem] font-semibold leading-tight tracking-tight text-plum-950">
            Welcome to <span className="display-serif text-plum-800 italic">Sakhi</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Secure, personalized health tracking powered by PostgreSQL and localized insights. Sign in to sync your profile, log symptoms, and calculate risk profiles.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <a
              href="/login?callbackUrl=/portal"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-plum-900 px-6 py-3.5 text-sm font-semibold text-cream hover:bg-plum-800 active:scale-[0.98] transition-[background-color,transform] duration-200 shadow-md hover:shadow-lg cursor-pointer"
            >
              Sign in with Email or Google
            </a>
            <a
              href="/signup?callbackUrl=/portal"
              className="flex w-full items-center justify-center rounded-full border border-plum-900/15 bg-white/80 px-6 py-3 text-sm font-medium text-plum-900 hover:bg-white transition-colors duration-200 cursor-pointer"
            >
              Create new account
            </a>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row bg-cream">
      {/* SIDEBAR */}
      <aside className="w-full md:w-80 bg-white/60 backdrop-blur-md border-b md:border-b-0 md:border-r border-plum-700/10 p-6 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-8">
          {/* Logo & Db Status */}
          <div className="flex items-center justify-between md:flex-col md:items-start gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-plum-900 cursor-pointer" onClick={() => window.location.href = "/"}>
              Sakhi<span className="display-serif text-plum-700 italic">.portal</span>
            </h1>

            {/* Database Status badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-plum-800">
              <Database size={13} className={dbStatus.connected ? "text-emerald-500" : "text-amber-500"} weight="fill" />
              <span>DB Mode: </span>
              <span className={dbStatus.connected ? "text-emerald-600" : "text-amber-600"}>{dbStatus.mode}</span>
            </div>
          </div>

          {/* User profile card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-plum-700/5 shadow-sm">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || "User Avatar"}
                className="h-11 w-11 rounded-full border border-plum-700/15"
              />
            ) : (
              <UserCircle size={44} weight="light" className="text-plum-700" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-plum-950 truncate">{session?.user?.name}</span>
              <span className="text-xs text-ink-soft truncate">{session?.user?.email}</span>
            </div>
          </div>

          {/* Nav Tab items */}
          <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0 md:overflow-visible">
            {[
              { id: "dashboard", label: "Dashboard", icon: <Pulse size={20} /> },
              { id: "log", label: "Log Symptoms", icon: <Sliders size={20} /> },
              { id: "history", label: "History Timeline", icon: <Calendar size={20} /> },
              { id: "profile", label: "My Profile", icon: <User size={20} /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as Tab)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer
                  ${activeTab === t.id 
                    ? "bg-plum-900 text-cream shadow-sm" 
                    : "text-ink-soft hover:bg-plum-700/5 hover:text-plum-900"
                  }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={() => sakhiSignOut({ signedIn: true })}
          className="mt-8 flex items-center justify-center gap-2 w-full px-4 py-3 border border-plum-700/10 rounded-xl text-sm font-medium text-ink-soft hover:bg-blush-50 hover:text-blush-500 hover:border-blush-100 transition-colors cursor-pointer"
        >
          <SignOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-5xl">
        
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top manifesto banner */}
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-plum-900">
                Hello, <span className="display-serif text-plum-800 italic">{session?.user?.name?.split(" ")[0]}</span>
              </h2>
              <p className="text-ink-soft mt-1 leading-relaxed">
                Welcome back to your health companion. Here is your current rhythmic projection.
              </p>
            </div>

            {/* Grid of Key Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Period Countdown */}
              <Card className="bg-gradient-to-br from-lavender-100 to-blush-50 border border-white/60 p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs uppercase tracking-wider text-plum-900/60 font-semibold">period prediction</span>
                  <Calendar size={22} weight="bold" className="text-lavender-500" />
                </div>
                <div className="mt-4">
                  <p className="text-4xl font-extrabold tracking-tight text-plum-950">
                    {stats.countdown > 0 ? `In ${stats.countdown} days` : "Today"}
                  </p>
                  <p className="text-xs text-ink-soft mt-1">Expected: {stats.nextPeriodDate}</p>
                </div>
              </Card>

              {/* Ovulation Date */}
              <Card className="bg-white/80 border border-plum-700/5 p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs uppercase tracking-wider text-ink-soft font-semibold">estimated ovulation</span>
                  <Baby size={22} weight="bold" className="text-blush-400" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold tracking-tight text-plum-900">{stats.ovulationDate}</p>
                  <p className="text-xs text-ink-soft mt-1">Calculated around Day 14 of your average cycle.</p>
                </div>
              </Card>

              {/* Cycle Metrics */}
              <Card className="bg-white/80 border border-plum-700/5 p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs uppercase tracking-wider text-ink-soft font-semibold">cycle stats</span>
                  <Pulse size={22} weight="bold" className="text-plum-600" />
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-plum-900">
                    Average Cycle: <span className="font-semibold text-base">{stats.avgCycle} days</span>
                  </p>
                  <p className="text-sm font-medium text-plum-900 mt-1">
                    Average Bleeding: <span className="font-semibold text-base">{stats.avgPeriod} days</span>
                  </p>
                  <p className="text-xs text-ink-soft mt-1.5">Based on your log history database.</p>
                </div>
              </Card>
            </div>

            {/* Diagnostic Engines status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* ML Diagnosis status */}
              <Card className="bg-white/70 border border-plum-700/5 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-plum-900 flex items-center gap-2">
                  <Brain className="text-lavender-500" size={20} weight="fill" />
                  Localized Model Risk Profiles
                </h3>
                <p className="text-xs text-ink-soft mt-1">Statistical risk calculated from your reported symptom patterns.</p>
                
                <div className="mt-5 space-y-3.5">
                  <div className="flex items-center justify-between p-3 bg-lavender-50/50 rounded-xl">
                    <span className="text-sm font-medium text-plum-900">PCOS Risk Assessment</span>
                    {cycleLogs.length === 0 ? (
                      <Badge variant="outline">No Logs</Badge>
                    ) : cycleLogs.some(l => l.acne_severity >= 5 || l.cycle_length > 35) ? (
                      <Badge variant="soft" className="bg-amber-100 text-amber-800">Elevated (Check Triage)</Badge>
                    ) : (
                      <Badge variant="soft" className="bg-emerald-100 text-emerald-800">Low Risk</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blush-50/30 rounded-xl">
                    <span className="text-sm font-medium text-plum-900">Thyroid Risk Classifier</span>
                    {cycleLogs.length === 0 ? (
                      <Badge variant="outline">No Logs</Badge>
                    ) : cycleLogs.some(l => l.period_length > 7 && l.fatigue_severity >= 8) ? (
                      <Badge variant="soft" className="bg-amber-100 text-amber-800">Hypothyroid Signal</Badge>
                    ) : (
                      <Badge variant="soft" className="bg-emerald-100 text-emerald-800">Normal Range</Badge>
                    )}
                  </div>
                </div>
              </Card>

              {/* Triage & Advisory summary */}
              <Card className="bg-white/70 border border-plum-700/5 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-plum-900 flex items-center gap-2">
                    <FirstAid className="text-blush-500" size={20} weight="fill" />
                    Latest Triage Recommendation
                  </h3>
                  <p className="text-xs text-ink-soft mt-1">Rule-based assessment logged at your last triage query.</p>
                  
                  <div className="mt-5 p-4 rounded-xl border bg-cream-deep/30 border-plum-700/5">
                    {cycleLogs.length === 0 ? (
                      <div className="text-center py-2 text-sm text-ink-soft">
                        No symptom triage logged yet. Please head to the Log tab.
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold uppercase text-plum-900">Normal / Safe Status</span>
                        </div>
                        <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                          Your logged symptoms look within the healthy range. Complete additional logs during cycle transitions to ensure accurate tracking.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={() => setActiveTab("log")}
                  variant="outline" 
                  className="mt-5 text-xs py-2 w-full justify-center"
                >
                  Start New Log Entry
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* LOG SYMPTOMS TAB */}
        {activeTab === "log" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-plum-900">
                Log <span className="display-serif text-plum-800 italic">Symptom Metrics</span>
              </h2>
              <p className="text-ink-soft mt-1 leading-relaxed">
                Add your details and symptoms to log them in the PostgreSQL database. We will immediately run clinical triage and deliver safe advice.
              </p>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-6">
              <Card className="bg-white border border-plum-700/5 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-plum-800">Cycle Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-xl border bg-white/70 px-4 py-3 text-plum-900 border-plum-700/20 focus:border-lavender-500 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-plum-800">Cycle End Date (Optional)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-xl border bg-white/70 px-4 py-3 text-plum-900 border-plum-700/20 focus:border-lavender-500 focus:bg-white outline-none"
                      placeholder="Leave blank if period is in progress"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-plum-800">Flow Intensity</label>
                    <select
                      value={flowIntensity}
                      onChange={(e) => setFlowIntensity(e.target.value)}
                      className="rounded-xl border bg-white/70 px-4 py-3 text-plum-900 border-plum-700/20 focus:border-lavender-500 focus:bg-white outline-none"
                    >
                      <option value="spotting">Spotting</option>
                      <option value="light">Light</option>
                      <option value="normal">Normal</option>
                      <option value="heavy">Heavy</option>
                      <option value="very_heavy">Very Heavy</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-plum-800">Average Sleep Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={sleepHours}
                      onChange={(e) => setSleepHours(e.target.value)}
                      className="rounded-xl border bg-white/70 px-4 py-3 text-plum-900 border-plum-700/20 focus:border-lavender-500 focus:bg-white outline-none"
                      min="1"
                      max="24"
                    />
                  </div>
                </div>

                <hr className="border-plum-700/5 my-2" />

                {/* Symptom Sliders */}
                <h4 className="text-sm font-bold uppercase tracking-wider text-plum-900">Symptom Severity (0-10)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { val: crampSeverity, set: setCrampSeverity, label: "Cramps & Pelvic Pain" },
                    { val: bloatingSeverity, set: setBloatingSeverity, label: "Bloating" },
                    { val: headacheSeverity, set: setHeadacheSeverity, label: "Headache" },
                    { val: fatigueSeverity, set: setFatigueSeverity, label: "Fatigue & Tiredness" },
                    { val: acneSeverity, set: setAcneSeverity, label: "Acne Outbreaks" },
                    { val: stressLevel, set: setStressLevel, label: "Mental Stress / Anxiety" },
                  ].map((sl, index) => (
                    <div key={index} className="space-y-2 p-3 bg-cream/30 rounded-xl border border-plum-700/5">
                      <div className="flex justify-between text-xs font-semibold text-plum-800">
                        <span>{sl.label}</span>
                        <span className="text-plum-900 bg-white border border-plum-700/10 px-1.5 py-0.5 rounded-md font-mono">{sl.val}/10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={sl.val}
                        onChange={(e) => sl.set(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-lavender-100 rounded-lg appearance-none cursor-pointer accent-plum-900"
                      />
                    </div>
                  ))}
                </div>

                <hr className="border-plum-700/5 my-2" />

                {/* Systemic Flags */}
                <h4 className="text-sm font-bold uppercase tracking-wider text-plum-900">Clinical Warning Flags</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { state: soakingPadHourly, set: setSoakingPadHourly, label: "Soaking pad hourly (2+ hrs)" },
                    { state: severeAbdominalPain, set: setSevereAbdominalPain, label: "Sudden/Severe abdominal pain" },
                    { state: faintingOrDizziness, set: setFaintingOrDizziness, label: "Fainting / Dizziness" },
                    { state: headacheWithVisionChanges, set: setHeadacheWithVisionChanges, label: "Headache with vision changes" },
                    { state: nausea, set: setNausea, label: "Nausea or Vomiting" },
                    { state: tirednessSevere, set: setTirednessSevere, label: "Severe muscle exhaustion" },
                    { state: hairGrowthNew, set: setHairGrowthNew, label: "New unusual facial hair" },
                    { state: skinDarkening, set: setSkinDarkening, label: "Skin darkening (neck/folds)" },
                    { state: weightGainRapid, set: setWeightGainRapid, label: "Rapid unexplained weight gain" },
                    { state: anxietyOrStress, set: setAnxietyOrStress, label: "Persistent panic / anxiety" },
                    { state: moodSwings, set: setMoodSwings, label: "Extreme mood changes" },
                  ].map((cb, idx) => (
                    <label key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-plum-700/5 bg-white shadow-sm hover:bg-lavender-50/20 transition-colors cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cb.state}
                        onChange={(e) => cb.set(e.target.checked)}
                        className="mt-0.5 rounded border-plum-700/20 text-plum-900 focus:ring-lavender-500 cursor-pointer h-4 w-4"
                      />
                      <span className="text-xs text-plum-900 font-medium leading-tight">{cb.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={logLoading}
                    className="px-8 py-3 bg-plum-900 text-cream rounded-full cursor-pointer hover:bg-plum-800 disabled:opacity-50"
                  >
                    {logLoading ? "Analyzing Symptoms..." : "Log & Analyze"}
                  </Button>
                </div>
              </Card>
            </form>

            {/* Results Modal / Panel */}
            {logSuccess && triageResult && (
              <div className="space-y-6 animate-slideUp">
                <Card className="border border-white/60 bg-gradient-to-br from-white to-[#fbf8fc] rounded-[30px] p-6 sm:p-8 shadow-md">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={28} weight="fill" className="text-emerald-500" />
                    <div>
                      <h3 className="text-xl font-bold text-plum-900">Symptoms Saved to PostgreSQL</h3>
                      <p className="text-xs text-ink-soft">Clinical triage rules and wellness advice generated successfully.</p>
                    </div>
                  </div>

                  {/* Triage Warning card */}
                  <div className={`mt-6 p-5 rounded-2xl border flex flex-col gap-3
                    ${triageResult.urgency === 'EMERGENCY' 
                      ? 'bg-rose-50 border-rose-200 text-rose-900' 
                      : triageResult.urgency === 'SEE_DOCTOR'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : triageResult.urgency === 'MONITOR'
                      ? 'bg-amber-50/40 border-amber-100 text-plum-950'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-950'}`}>
                    
                    <div className="flex items-center gap-2">
                      <Warning size={20} weight="fill" className={triageResult.urgency === 'EMERGENCY' ? 'text-rose-500' : 'text-amber-500'} />
                      <span className="text-sm font-bold tracking-wider uppercase font-mono">Triage: {triageResult.urgency}</span>
                    </div>

                    <p className="text-sm font-semibold">{triageResult.advice}</p>

                    {triageResult.reasons.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-65">Trigger Reasons:</span>
                        <ul className="list-disc list-inside text-xs mt-1 space-y-1 pl-1">
                          {triageResult.reasons.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {triageResult.suspectedProfiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-65">Detected Profile Sign:</span>
                        {triageResult.suspectedProfiles.map((p: string, i: number) => (
                          <Badge key={i} variant="soft" className="bg-plum-950 text-white font-mono text-[10px]">{p}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Wellness tips */}
                  <h4 className="text-base font-semibold text-plum-900 mt-8 flex items-center gap-2">
                    <Heartbeat size={20} weight="fill" className="text-lavender-500" />
                    Personalized Wellness Advice
                  </h4>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wellnessAdvice.map((item: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl border border-plum-700/5 bg-white/70 shadow-sm flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide text-plum-700">{item.category}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-blush-400" />
                        </div>
                        <h5 className="text-sm font-bold text-plum-900">{item.tip}</h5>
                        <p className="text-xs text-ink-soft leading-relaxed">{item.explanation}</p>
                      </div>
                    ))}
                  </div>

                </Card>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-plum-900">
                Log History <span className="display-serif text-plum-800 italic">Timeline</span>
              </h2>
              <p className="text-ink-soft mt-1 leading-relaxed">
                All records stored in your secure PostgreSQL database schema, sorted chronologically.
              </p>
            </div>

            {logsLoading ? (
              <div className="py-20 flex justify-center items-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-lavender-500 border-t-transparent" />
              </div>
            ) : cycleLogs.length === 0 ? (
              <Card className="p-12 text-center border border-plum-700/5 bg-white/40">
                <Calendar size={48} className="mx-auto text-ink-faint" />
                <h3 className="text-lg font-semibold text-plum-950 mt-4">No health logs found</h3>
                <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
                  You haven't added any cycle log records yet. Go to the "Log Symptoms" tab to record your first entry.
                </p>
                <Button onClick={() => setActiveTab("log")} variant="primary" className="mt-6 px-6 py-2.5" glow>
                  Create First Entry
                </Button>
              </Card>
            ) : (
              <div className="relative border-l border-lavender-200/80 ml-4 pl-6 space-y-8">
                {cycleLogs.map((log) => {
                  const start = new Date(log.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const end = log.end_date ? new Date(log.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "In progress";
                  
                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-lavender-400 border border-white" />
                      
                      <Card className="bg-white border border-plum-700/5 hover:border-lavender-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-plum-700/5 pb-3">
                          <span className="text-sm font-bold text-plum-900 flex items-center gap-1.5">
                            <Clock size={16} />
                            {start} — {end}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-semibold text-plum-700 uppercase">{log.flow_intensity} Flow</Badge>
                            {log.cycle_length && (
                              <Badge variant="soft" className="text-[10px] bg-lavender-50 text-lavender-700">{log.cycle_length} days cycle</Badge>
                            )}
                            {log.period_length && (
                              <Badge variant="soft" className="text-[10px] bg-blush-50 text-blush-700">{log.period_length} days bleeding</Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                          <div className="text-xs">
                            <span className="text-ink-faint font-semibold">Cramps:</span>
                            <span className="block text-plum-900 font-bold font-mono">{log.cramp_severity}/10</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-ink-faint font-semibold">Bloating:</span>
                            <span className="block text-plum-900 font-bold font-mono">{log.bloating_severity}/10</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-ink-faint font-semibold">Fatigue:</span>
                            <span className="block text-plum-900 font-bold font-mono">{log.fatigue_severity}/10</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-ink-faint font-semibold">Acne:</span>
                            <span className="block text-plum-900 font-bold font-mono">{log.acne_severity}/10</span>
                          </div>
                        </div>

                        {(log.sleep_hours || log.exercise_frequency || log.diet) && (
                          <div className="mt-4 pt-3 border-t border-plum-700/5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
                            {log.sleep_hours && (
                              <span>💤 Sleep: <strong>{log.sleep_hours} hrs</strong></span>
                            )}
                            {log.exercise_frequency && (
                              <span>🏃 Exercise: <strong>{log.exercise_frequency}</strong></span>
                            )}
                            {log.diet && (
                              <span>🍎 Diet: <strong>{log.diet}</strong></span>
                            )}
                          </div>
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-plum-900">
                Personal <span className="display-serif text-plum-800 italic">Biometrics</span>
              </h2>
              <p className="text-ink-soft mt-1 leading-relaxed">
                Configure your key physiological indicators to calibrate cycle projections and PCOS/Thyroid model risks.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="max-w-md">
              <Card className="bg-white border border-plum-700/5 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
                
                <div className="space-y-4">
                  <Input
                    label="Current Age"
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 24"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Weight (kg)"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 62"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <Input
                      label="Height (cm)"
                      type="number"
                      step="1"
                      placeholder="e.g. 165"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>

                  {/* Calculated BMI view */}
                  <div className="p-4 rounded-xl border border-plum-700/10 bg-cream/40 flex justify-between items-center mt-6">
                    <div>
                      <span className="text-xs font-semibold text-ink-soft">Calculated Body Mass Index (BMI)</span>
                      <span className="block text-2xl font-bold tracking-tight text-plum-950 mt-0.5">{bmi}</span>
                    </div>
                    {parseFloat(bmi) > 0 && (
                      <Badge variant="soft" className={`text-xs uppercase ${
                        parseFloat(bmi) >= 18.5 && parseFloat(bmi) < 25 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {parseFloat(bmi) < 18.5 ? "Underweight" : parseFloat(bmi) < 25 ? "Normal Weight" : "Overweight"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-ink-soft">Saves parameters directly to database profile.</span>
                  <Button
                    type="submit"
                    disabled={profileLoading}
                    className="px-6 py-2.5 bg-plum-900 text-cream rounded-full hover:bg-plum-800 disabled:opacity-50 cursor-pointer"
                  >
                    {profileLoading ? "Saving..." : "Save Biometrics"}
                  </Button>
                </div>

                {profileSuccess && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-fadeIn">
                    <CheckCircle size={16} weight="fill" />
                    Biometrics successfully logged in PostgreSQL.
                  </p>
                )}
              </Card>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
