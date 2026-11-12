"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, CheckCircle, Baby, Flower, CalendarBlank, Heartbeat, Target, Drop, ShieldCheck } from "@phosphor-icons/react";

export default function UnifiedOnboardingChat() {
  const router = useRouter();
  const [isSwitchMode, setIsSwitchMode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("switch") === "true";
    }
    return false;
  });

  const [mode, setMode] = useState<"her" | "mom" | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const targetMode = params.get("mode");
      if (params.get("switch") === "true" && (targetMode === "mom" || targetMode === "her")) {
        return targetMode as "her" | "mom";
      }
    }
    return null;
  });

  const [step, setStep] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("switch") === "true") {
        return 2;
      }
    }
    return 0;
  });

  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sakhi_preferred_name") || "";
    }
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isSwitch = params.get("switch") === "true";
      const targetMode = params.get("mode");
      const storedName = localStorage.getItem("sakhi_preferred_name") || "";

      if (isSwitch && (targetMode === "mom" || targetMode === "her")) {
        setIsSwitchMode(true);
        setName(storedName || "Mama");
        setMode(targetMode as "her" | "mom");
        setStep(2); // Skip asking for name and mode choice!
      } else if (storedName) {
        setName(storedName);
      }
    }
  }, []);
  
  // Her Mode fields
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultPastPeriod = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [lastPeriodDate, setLastPeriodDate] = useState<string>(defaultPastPeriod);
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [periodDuration, setPeriodDuration] = useState<number>(5);
  const [cycleRegularity, setCycleRegularity] = useState<string>("Regular");
  const [diagnosedConditions, setDiagnosedConditions] = useState<string[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState<string>("Track Period & PMS");
  
  // Mom Mode fields
  const [weeksPregnant, setWeeksPregnant] = useState<number>(12);
  const [pregnancyExperience, setPregnancyExperience] = useState<string>("First-time Mother");
  const [maternalConditions, setMaternalConditions] = useState<string[]>([]);
  const [maternalGoal, setMaternalGoal] = useState<string>("Tracking Baby Growth & Fetal Movement");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getEstimatedDueDate = (weeks: number) => {
    const remainingDays = Math.max(0, (40 - weeks) * 7);
    const d = new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getEstimatedDueDateISO = (weeks: number) => {
    const remainingDays = Math.max(0, (40 - weeks) * 7);
    const d = new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  };

  const toggleMaternalCondition = (cond: string) => {
    if (cond === "None") {
      setMaternalConditions(["None"]);
      return;
    }
    setMaternalConditions(prev => {
      const filtered = prev.filter(c => c !== "None");
      if (filtered.includes(cond)) {
        return filtered.filter(c => c !== cond);
      } else {
        return [...filtered, cond];
      }
    });
  };

  const handleHerModeSubmit = async () => {
    setIsSubmitting(true);
    setStep(99); // completion step
    const effectiveName = name || (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : '') || 'friend';
    if (typeof window !== 'undefined') {
      localStorage.setItem('sakhi_preferred_name', effectiveName);
      localStorage.setItem('sakhi_active_mode', 'her');
      document.cookie = 'sakhi_active_mode=her; path=/; max-age=31536000';

      // Clear all Her Mode checkins and logs so it starts 100% fresh
      localStorage.removeItem('sakhi_last_checkin');
      localStorage.removeItem('her_reminders');
      localStorage.removeItem('her_notif_prefs');
      localStorage.removeItem('sakhi_logs');
      localStorage.removeItem('sakhi_cycle_history');

      // Server-side data is reset by /api/update-profile (resetData: true)
    }
    try {
      await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'her',
          resetData: true,
          profile: {
            preferred_name: effectiveName,
            last_period_start: lastPeriodDate,
            cycle_length: cycleLength,
            period_duration: periodDuration,
            cycle_regularity: cycleRegularity,
            diagnosed_conditions: diagnosedConditions,
            primary_goal: primaryGoal,
            is_pregnancy_mode: false
          }
        })
      });
      setTimeout(() => {
        router.push('/her-mode');
      }, 400);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMomModeSubmit = async (selectedGoal?: string) => {
    setIsSubmitting(true);
    setStep(99);
    const effectiveName = name || (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : '') || 'Mama';
    if (typeof window !== 'undefined') {
      localStorage.setItem('sakhi_preferred_name', effectiveName);
      localStorage.setItem('sakhi_active_mode', 'pregnancy');
      document.cookie = 'sakhi_active_mode=pregnancy; path=/; max-age=31536000';

      // Clear all Mom Mode checkins and logs so it starts 100% fresh
      localStorage.removeItem('sakhi_last_checkin_mom');
      localStorage.removeItem('pregnancy_reminders');
      localStorage.removeItem('pregnancy_notif_prefs');
      localStorage.removeItem('sakhi_pregnancy_logs');
      localStorage.removeItem('sakhi_pregnancy_nutrition');
      localStorage.removeItem('sakhi_pregnancy_appointments');

      // Server-side data is reset by /api/update-profile (resetData: true)
    }
    const chosenGoal = selectedGoal || maternalGoal;
    const calculatedDueDate = getEstimatedDueDateISO(weeksPregnant);
    try {
      await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'pregnancy',
          resetData: true,
          profile: {
            preferred_name: effectiveName,
            weeks_pregnant: weeksPregnant,
            due_date: calculatedDueDate,
            expected_due_date: calculatedDueDate,
            pregnancy_experience: pregnancyExperience,
            maternal_conditions: maternalConditions.includes("None") ? [] : maternalConditions,
            primary_goal: chosenGoal,
            is_pregnancy_mode: true
          }
        })
      });
      setTimeout(() => {
        window.location.href = '/pregnancy-mode';
      }, 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const steps: any[] = [
    {
      id: "name",
      botText: "Hello! I am Sakhi, your personal health assistant. How can I call you?",
      renderInput: () => (
        <div className="mt-4 flex flex-col items-end w-full">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your name..."
            className="w-full bg-white border border-plum-900/20 rounded-xl px-4 py-3 text-sm text-plum-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400 shadow-sm mb-3"
          />
          <button
            onClick={() => { if(name.trim()) setStep(1); }}
            disabled={!name.trim()}
            className="px-6 py-2.5 rounded-full bg-plum-900 text-white text-sm font-medium self-end disabled:opacity-50 hover:bg-[#3d2547] transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: "mode",
      botText: `Nice to meet you, ${name}! Which journey would you like to set up today?`,
      renderInput: () => (
        <div className="mt-4 flex flex-col gap-3 w-full">
          <button
            onClick={() => { setMode("her"); setStep(2); }}
            className="flex items-center gap-4 w-full bg-white hover:bg-blush-50 border border-blush-200 p-4 rounded-xl shadow-sm transition-colors text-left cursor-pointer"
          >
            <div className="bg-blush-100 p-2 rounded-full"><Flower size={24} weight="fill" className="text-blush-500" /></div>
            <div>
              <h4 className="font-semibold text-plum-900">Her Mode (Menstrual & Wellness)</h4>
              <p className="text-xs text-ink-soft">Track periods, ovulation, and PCOS/Thyroid health.</p>
            </div>
          </button>
          
          <button
            onClick={() => { setMode("mom"); setStep(2); }}
            className="flex items-center gap-4 w-full bg-white hover:bg-lavender-50 border border-lavender-200 p-4 rounded-xl shadow-sm transition-colors text-left cursor-pointer"
          >
            <div className="bg-lavender-100 p-2 rounded-full"><Baby size={24} weight="fill" className="text-lavender-500" /></div>
            <div>
              <h4 className="font-semibold text-plum-900">Mom Mode (Pregnancy)</h4>
              <p className="text-xs text-ink-soft">Track baby growth, trimesters, and maternity health.</p>
            </div>
          </button>
        </div>
      )
    }
  ];

  if (mode === "her") {
    // Step 2: Last Period Start Date (CRITICAL for prediction)
    steps.push({
      id: "her-last-period",
      botText: isSwitchMode 
        ? `Welcome to Her Mode, ${name || "friend"}! 🌸 Let's set up your cycle rhythm. When did your last period start? (The first day bleeding began)`
        : "When did your last period start? 🌸 (The first day bleeding began)",
      renderInput: () => (
        <div className="mt-4 flex flex-col items-end w-full">
          <div className="bg-white p-4 rounded-xl border border-blush-200 shadow-sm w-full mb-3 flex flex-col gap-3">
            <input
              type="date"
              max={todayStr}
              value={lastPeriodDate}
              onChange={(e) => setLastPeriodDate(e.target.value)}
              className="w-full bg-white border border-plum-900/20 rounded-xl px-4 py-2.5 text-sm text-plum-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush-400 cursor-pointer"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-xs text-plum-900/60 self-center">Quick options:</span>
              <button
                type="button"
                onClick={() => setLastPeriodDate(todayStr)}
                className="px-2.5 py-1 rounded-md bg-blush-50 text-blush-700 hover:bg-blush-100 border border-blush-200 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  setLastPeriodDate(d);
                }}
                className="px-2.5 py-1 rounded-md bg-blush-50 text-blush-700 hover:bg-blush-100 border border-blush-200 cursor-pointer"
              >
                1 week ago
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  setLastPeriodDate(d);
                }}
                className="px-2.5 py-1 rounded-md bg-blush-50 text-blush-700 hover:bg-blush-100 border border-blush-200 cursor-pointer"
              >
                2 weeks ago
              </button>
            </div>
          </div>
          <button
            onClick={() => setStep(3)}
            disabled={!lastPeriodDate}
            className="px-6 py-2.5 rounded-full bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium self-end transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )
    });

    // Step 3: Cycle Length
    steps.push({
      id: "her-cycle",
      botText: "What is your typical cycle length in days? (Gap from one period start to the next, usually ~28 days)",
      renderInput: () => (
        <div className="mt-4 flex flex-col items-end w-full">
          <div className="flex items-center gap-3 w-full mb-3 bg-white p-4 rounded-xl border border-blush-200 shadow-sm">
             <input
              type="range"
              min="20"
              max="45"
              value={cycleLength}
              onChange={(e) => setCycleLength(parseInt(e.target.value))}
              className="w-full accent-blush-500 cursor-pointer"
            />
            <span className="font-bold text-plum-900 shrink-0 w-12 text-right">{cycleLength} d</span>
          </div>
          <button
            onClick={() => setStep(4)}
            className="px-6 py-2.5 rounded-full bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium self-end transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )
    });

    // Step 4: Period Duration
    steps.push({
      id: "her-duration",
      botText: "And how many days does your bleeding typically last?",
      renderInput: () => (
        <div className="mt-4 flex flex-col items-end w-full">
          <div className="flex items-center gap-3 w-full mb-3 bg-white p-4 rounded-xl border border-blush-200 shadow-sm">
             <input
              type="range"
              min="2"
              max="10"
              value={periodDuration}
              onChange={(e) => setPeriodDuration(parseInt(e.target.value))}
              className="w-full accent-blush-500 cursor-pointer"
            />
            <span className="font-bold text-plum-900 shrink-0 w-12 text-right">{periodDuration} d</span>
          </div>
          <button
            onClick={() => setStep(5)}
            className="px-6 py-2.5 rounded-full bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium self-end transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )
    });

    // Step 5: Cycle Regularity
    steps.push({
      id: "her-regularity",
      botText: "Are your monthly cycles generally regular and predictable?",
      renderInput: () => (
        <div className="mt-4 flex flex-col gap-2.5 w-full">
          <button
            type="button"
            onClick={() => {
              setCycleRegularity("Regular");
              setStep(6);
            }}
            className={`p-3.5 rounded-xl border text-left transition-[background-color,border-color,box-shadow] cursor-pointer ${
              cycleRegularity === "Regular"
                ? "bg-blush-50 border-blush-400 text-plum-900 font-semibold shadow-sm"
                : "bg-white border-blush-200 text-plum-900 hover:bg-blush-50/50"
            }`}
          >
            <div className="font-semibold text-sm">Regular & Predictable 📅</div>
            <div className="text-xs text-ink-soft">Periods arrive consistently every 24–35 days</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setCycleRegularity("Irregular");
              setStep(6);
            }}
            className={`p-3.5 rounded-xl border text-left transition-[background-color,border-color,box-shadow] cursor-pointer ${
              cycleRegularity === "Irregular"
                ? "bg-blush-50 border-blush-400 text-plum-900 font-semibold shadow-sm"
                : "bg-white border-blush-200 text-plum-900 hover:bg-blush-50/50"
            }`}
          >
            <div className="font-semibold text-sm">Irregular / Unpredictable ⏱️</div>
            <div className="text-xs text-ink-soft">Varies significantly, skips months, or unpredictable timing</div>
          </button>
        </div>
      )
    });

    // Step 6: Known Diagnosed Conditions
    steps.push({
      id: "her-conditions",
      botText: "Do you have any previously diagnosed conditions? (Select any that apply, or None)",
      renderInput: () => {
        const toggleCondition = (cond: string) => {
          if (cond === "None") {
            setDiagnosedConditions([]);
            return;
          }
          setDiagnosedConditions(prev => 
            prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev.filter(c => c !== "None"), cond]
          );
        };

        const hasPcos = diagnosedConditions.includes("PCOS");
        const hasThyroid = diagnosedConditions.includes("Thyroid disorder");
        const isNone = diagnosedConditions.length === 0;

        return (
          <div className="mt-4 flex flex-col items-end w-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full mb-3">
              <button
                type="button"
                onClick={() => toggleCondition("PCOS")}
                className={`p-3 rounded-xl border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  hasPcos ? "bg-plum-900 text-white border-plum-900 shadow-sm" : "bg-white border-blush-200 text-plum-900 hover:bg-blush-50"
                }`}
              >
                PCOS / PCOD
              </button>

              <button
                type="button"
                onClick={() => toggleCondition("Thyroid disorder")}
                className={`p-3 rounded-xl border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  hasThyroid ? "bg-plum-900 text-white border-plum-900 shadow-sm" : "bg-white border-blush-200 text-plum-900 hover:bg-blush-50"
                }`}
              >
                Thyroid Disorder
              </button>

              <button
                type="button"
                onClick={() => toggleCondition("None")}
                className={`p-3 rounded-xl border text-center text-xs font-semibold transition-colors cursor-pointer ${
                  isNone ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white border-blush-200 text-plum-900 hover:bg-blush-50"
                }`}
              >
                None / No Diagnosis
              </button>
            </div>

            <button
              onClick={handleHerModeSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-plum-900 text-white text-sm font-medium self-end flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg"
            >
              <CheckCircle weight="bold" /> Complete Setup
            </button>
          </div>
        );
      }
    });
  }

  if (mode === "mom") {
    // Step 2: Gestational Age with auto-calculated due date
    steps.push({
      id: "mom-weeks",
      botText: isSwitchMode
        ? `Welcome to Mom Mode, ${name || "Mama"}! 🍼 Let's set up your baby journey. How many weeks pregnant are you currently?`
        : "Congratulations! How many weeks pregnant are you currently?",
      renderInput: () => (
        <div className="mt-4 flex flex-col items-end w-full">
          <div className="flex flex-col gap-3 w-full mb-3 bg-white p-4 rounded-xl border border-lavender-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-soft">Gestational Age</span>
              <span className="font-bold text-plum-900 text-base">{weeksPregnant} weeks</span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              value={weeksPregnant}
              onChange={(e) => setWeeksPregnant(parseInt(e.target.value))}
              className="w-full accent-lavender-500 cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs text-lavender-800 bg-lavender-50 px-3 py-2 rounded-lg border border-lavender-200/60 font-medium">
              <span>🍼 Est. Due Date: <strong>{getEstimatedDueDate(weeksPregnant)}</strong></span>
              <span>{Math.max(0, 40 - weeksPregnant)} w left</span>
            </div>
          </div>
          <button
            onClick={() => setStep(3)}
            className="px-6 py-2.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-sm font-medium self-end transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )
    });

    // Step 3: Pregnancy Experience
    steps.push({
      id: "mom-experience",
      botText: "Is this your first pregnancy journey, or do you already have children?",
      renderInput: () => (
        <div className="mt-4 flex flex-col gap-2.5 w-full">
          {[
            { label: "First-time Mother 👶", sub: "First pregnancy journey" },
            { label: "I have other children 👧👦", sub: "Experienced mama" },
            { label: "Expecting Twins or Multiples 🍼🍼", sub: "Multiple pregnancy" }
          ].map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                setPregnancyExperience(opt.label);
                setStep(4);
              }}
              className="p-3.5 rounded-xl border bg-white hover:bg-lavender-50 border-lavender-200 text-left transition-colors cursor-pointer flex flex-col shadow-sm"
            >
              <span className="text-sm font-semibold text-plum-900">{opt.label}</span>
              <span className="text-xs text-ink-soft">{opt.sub}</span>
            </button>
          ))}
        </div>
      )
    });

    // Step 4: Medical Background & Risk Screening
    steps.push({
      id: "mom-conditions",
      botText: "Do you have any existing health conditions we should help monitor?",
      renderInput: () => {
        const hasHypertension = maternalConditions.includes("High Blood Pressure / Hypertension");
        const hasDiabetes = maternalConditions.includes("Gestational Diabetes");
        const hasThyroid = maternalConditions.includes("Thyroid Condition");
        const isNone = maternalConditions.includes("None");

        return (
          <div className="mt-4 flex flex-col items-end w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mb-3">
              <button
                type="button"
                onClick={() => toggleMaternalCondition("High Blood Pressure / Hypertension")}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                  hasHypertension ? "bg-plum-900 text-white border-plum-900 shadow-sm" : "bg-white border-lavender-200 text-plum-900 hover:bg-lavender-50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Heartbeat size={16} className={hasHypertension ? "text-pink-300" : "text-pink-500"} />
                  <span>High Blood Pressure</span>
                </div>
                <p className={`text-[10px] font-normal ${hasHypertension ? "text-white/80" : "text-ink-soft"}`}>Preeclampsia screening</p>
              </button>

              <button
                type="button"
                onClick={() => toggleMaternalCondition("Gestational Diabetes")}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                  hasDiabetes ? "bg-plum-900 text-white border-plum-900 shadow-sm" : "bg-white border-lavender-200 text-plum-900 hover:bg-lavender-50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Drop size={16} className={hasDiabetes ? "text-amber-300" : "text-amber-500"} weight="fill" />
                  <span>Gestational Diabetes</span>
                </div>
                <p className={`text-[10px] font-normal ${hasDiabetes ? "text-white/80" : "text-ink-soft"}`}>Blood sugar monitor</p>
              </button>

              <button
                type="button"
                onClick={() => toggleMaternalCondition("Thyroid Condition")}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                  hasThyroid ? "bg-plum-900 text-white border-plum-900 shadow-sm" : "bg-white border-lavender-200 text-plum-900 hover:bg-lavender-50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <ShieldCheck size={16} className={hasThyroid ? "text-teal-300" : "text-teal-600"} />
                  <span>Thyroid Condition</span>
                </div>
                <p className={`text-[10px] font-normal ${hasThyroid ? "text-white/80" : "text-ink-soft"}`}>Hormonal balance</p>
              </button>

              <button
                type="button"
                onClick={() => toggleMaternalCondition("None")}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                  isNone ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white border-lavender-200 text-plum-900 hover:bg-lavender-50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <CheckCircle size={16} className={isNone ? "text-emerald-200" : "text-emerald-600"} weight="fill" />
                  <span>None / Healthy</span>
                </div>
                <p className={`text-[10px] font-normal ${isNone ? "text-white/80" : "text-ink-soft"}`}>Standard prenatal care</p>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleMomModeSubmit()}
              disabled={maternalConditions.length === 0 || isSubmitting}
              className="px-6 py-2.5 rounded-full bg-plum-900 text-white text-sm font-medium self-end flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg transition-[background-color,box-shadow]"
            >
              <CheckCircle weight="bold" /> Complete Setup
            </button>
          </div>
        );
      }
    });
  }

  steps.push({
    id: "closing",
    botText: `Thank you, ${name}. I am preparing your customized ${mode === 'mom' ? 'Pregnancy' : 'Menstrual'} dashboard now... 🌸`,
    renderInput: () => (
       <div className="mt-4 flex justify-center w-full">
         <div className="h-6 w-6 animate-spin rounded-full border-2 border-plum-900 border-t-transparent" />
       </div>
    )
  });

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      <AnimatePresence mode="popLayout">
        {steps.slice(0, step + 1).map((s, index) => {
          if (isSwitchMode && (s.id === "name" || s.id === "mode")) {
            return null;
          }
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex flex-col w-full"
            >
            {/* Bot Message */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl rounded-tl-sm p-4 text-sm text-plum-950 shadow-sm self-start max-w-[90%] border border-plum-700/10 mb-2 flex gap-3">
              <Sparkle className="w-5 h-5 text-lavender-500 shrink-0 mt-0.5" weight="fill" />
              <span className="leading-relaxed font-medium">{s.botText}</span>
            </div>

            {/* User Input Area */}
            {index === step && (
               <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full flex justify-end"
               >
                 {s.renderInput()}
               </motion.div>
            )}
            
            {/* User Answer Summary Bubbles */}
            {index < step && s.id === "name" && (
              <div className="bg-plum-900 text-white rounded-2xl rounded-tr-sm py-2 px-4 text-sm font-medium self-end max-w-[80%] shadow-sm mb-4">
                {name}
              </div>
            )}
            {index < step && s.id === "mode" && (
              <div className="bg-plum-900 text-white rounded-2xl rounded-tr-sm py-2 px-4 text-sm font-medium self-end max-w-[80%] shadow-sm mb-4 flex items-center gap-2">
                {mode === "her" ? "Her Mode" : "Mom Mode"}
              </div>
            )}
            {index < step && s.id === "her-last-period" && (
              <div className="bg-blush-500 text-white rounded-2xl rounded-tr-sm py-2 px-4 text-sm font-medium self-end max-w-[80%] shadow-sm mb-4 flex items-center gap-1.5">
                <CalendarBlank weight="bold" size={14} /> Last period: {new Date(lastPeriodDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            )}
            {index < step && s.id === "her-cycle" && (
              <div className="bg-blush-500 text-white rounded-2xl rounded-tr-sm py-2 px-4 text-sm font-medium self-end max-w-[80%] shadow-sm mb-4">
                Cycle: {cycleLength} days
              </div>
            )}
            {index < step && s.id === "her-duration" && (
              <div className="bg-blush-500 text-white rounded-2xl rounded-tr-sm py-2 px-4 text-sm font-medium self-end max-w-[80%] shadow-sm mb-4">
                Bleeding: {periodDuration} days
              </div>
            )}
            {index < step && s.id === "mom-weeks" && (
              <div className="bg-lavender-500 text-white rounded-2xl rounded-tr-sm py-2 px-4 text-sm font-medium self-end max-w-[80%] shadow-sm mb-4">
                {weeksPregnant} weeks (Due: ~{getEstimatedDueDate(weeksPregnant)})
              </div>
            )}
            {index < step && s.id === "mom-experience" && (
              <div className="bg-lavender-500 text-white rounded-2xl rounded-tr-sm py-2 px-4 text-sm font-medium self-end max-w-[80%] shadow-sm mb-4">
                {pregnancyExperience}
              </div>
            )}
            {index < step && s.id === "mom-conditions" && (
              <div className="bg-lavender-500 text-white rounded-2xl rounded-tr-sm py-2 px-4 text-sm font-medium self-end max-w-[80%] shadow-sm mb-4">
                {maternalConditions.length > 0 ? maternalConditions.join(", ") : "None / Healthy"}
              </div>
            )}
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
}
