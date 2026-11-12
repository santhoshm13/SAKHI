"use client";

import React, { useState, useEffect } from "react";
import ConsentGate from "@/components/ConsentGate";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Baby, Drop, Brain, WarningCircle, FilePdf, Heartbeat, ShieldCheck,
  Info, CaretDown, CaretUp, CheckCircle, Sun, CalendarCheck, Heart } from "@phosphor-icons/react";
import DashboardHeader from "@/components/DashboardHeader";
import { panelCard } from "@/components/her/HerPanels";
import { sizeFor } from "@/lib/chat/offline/knowledge";
import DashboardTabs, { useHashTab, type TabDef } from "@/components/DashboardTabs";

type MomTab = "today" | "vitals" | "plan" | "care";
const MOM_TAB_IDS = ["today", "vitals", "plan", "care"] as const;
const MOM_TABS: TabDef<MomTab>[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "vitals", label: "Vitals", icon: Heartbeat },
  { id: "plan", label: "Plan", icon: CalendarCheck },
  { id: "care", label: "Care", icon: Heart },
];
import PregnancyAvatar, { AIState } from "@/components/PregnancyAvatar";
import {
  PregnancyWeekProgress,
  BabyGrowthTimeline,
  BloodPressureChart,
  BloodSugarChart,
  BabyMovementChart,
  AppointmentTimeline,
  MoodTrackerChart,
  PregnancySleepGraph
} from "@/components/charts/PregnancyCharts";
import { usePregnancyNotifications } from "@/hooks/usePregnancyNotifications";
import PregnancyNotificationCenter from "@/components/PregnancyNotificationCenter";
import SettingsModal from "@/components/SettingsModal";
import WeightTracker from "@/components/WeightTracker";
import ContractionTimer from "@/components/ContractionTimer";
import { LabResultsCard } from "@/components/LabReport";
import TabletsCard from "@/components/TabletsCard";
import HospitalBagCard from "@/components/HospitalBagCard";
import { FamilyContactsCard, RedFlagBanner } from "@/components/FamilyAlert";
import MoodCheckCard from "@/components/MoodCheckCard";
import { BabyArrivedCard, BabyHeader, BackToHerCard, NewbornCard, RecoveryCard, VaccineCard } from "@/components/Postpartum";
import { useUserDoc, dayKey } from "@/hooks/useUserDoc";
import { sendOrQueue } from "@/lib/outbox";
import SchemesCard from "@/components/SchemesCard";
import MealsCard from "@/components/MealsCard";
import { stageFor } from "@/lib/meals";
import NearbyHelpCard from "@/components/NearbyHelpCard";
import { EMPTY_POSTPARTUM, ageDays, babyAge, stageOf, type PostpartumDoc } from "@/lib/postpartum";

interface RiskExplainFactor {
  title: string;
  detail: string;
  impact: string;
  type: "positive" | "negative" | "neutral";
  source: "Daily Check-in" | "Initial Setup" | "Health Analysis";
}

const getPreeclampsiaExplainability = (
  profile: any,
  logs: any[],
  preeclampsiaMl: any
): { summary: string; factors: RiskExplainFactor[] } => {
  const factors: RiskExplainFactor[] = [];
  const latestBpLog = [...(logs || [])].reverse().find(l => l.blood_pressure_systolic && l.blood_pressure_diastolic);
  const hasLoggedBp = Boolean(latestBpLog);
  if (!hasLoggedBp) {
    return {
      summary: "No blood pressure logged yet, so this risk isn't scored. Add a reading in your check-in, or tell Sakhi something like \"BP 118 over 76\".",
      factors: [],
    };
  }
  const systolic = Number(latestBpLog.blood_pressure_systolic);
  const diastolic = Number(latestBpLog.blood_pressure_diastolic);
  
  const conditions: string[] = profile?.maternal_conditions || [];
  const hasHypertensionHistory = conditions.some((c: string) => 
    c.toLowerCase().includes("pressure") || c.toLowerCase().includes("hypertension")
  );

  // 1. Systolic BP
  if (systolic >= 140) {
    factors.push({
      title: `High Systolic BP (${systolic} mmHg)`,
      detail: hasLoggedBp 
        ? `Recorded in daily check-in. Reading is above 140 mmHg, reflecting higher arterial pressure.`
        : `Baseline pressure. Log your blood pressure to calibrate your live score.`,
      impact: "High",
      type: "negative",
      source: "Daily Check-in"
    });
  } else if (systolic >= 130) {
    factors.push({
      title: `Elevated Systolic BP (${systolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is in the elevated range (≥130 mmHg).`
        : `Baseline pressure. Log your blood pressure to calibrate your live score.`,
      impact: "Elevated",
      type: "negative",
      source: "Daily Check-in"
    });
  } else {
    factors.push({
      title: `Optimal Systolic BP (${systolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is within the healthy normal range (<120 mmHg).`
        : `Standard healthy baseline (<120 mmHg).`,
      impact: "Normal",
      type: "positive",
      source: "Daily Check-in"
    });
  }

  // 2. Diastolic BP
  if (diastolic >= 90) {
    factors.push({
      title: `High Diastolic BP (${diastolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is at or above 90 mmHg.`
        : `Standard baseline.`,
      impact: "High",
      type: "negative",
      source: "Daily Check-in"
    });
  } else if (diastolic >= 85) {
    factors.push({
      title: `Borderline Diastolic BP (${diastolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is approaching 90 mmHg.`
        : `Standard baseline.`,
      impact: "Borderline",
      type: "negative",
      source: "Daily Check-in"
    });
  } else {
    factors.push({
      title: `Healthy Diastolic BP (${diastolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is within the safe range (<80 mmHg).`
        : `Standard healthy baseline (<80 mmHg).`,
      impact: "Normal",
      type: "positive",
      source: "Daily Check-in"
    });
  }

  // 3. Maternal Hypertension History (Setup Data)
  if (hasHypertensionHistory) {
    factors.push({
      title: "Prior Hypertension Noted",
      detail: `Recorded in initial setup. Pre-existing blood pressure variance noted.`,
      impact: "Prior History",
      type: "negative",
      source: "Initial Setup"
    });
  } else {
    factors.push({
      title: "No Prior Hypertension",
      detail: `No history of chronic high blood pressure reported in initial setup.`,
      impact: "Healthy",
      type: "positive",
      source: "Initial Setup"
    });
  }

  // 4. Model score + guideline flags
  factors.push(...modelExplainFactors(preeclampsiaMl, "Preeclampsia / hypertensive"));
  const level = preeclampsiaMl?.risk_level;

  return {
    summary: level === "High"
      ? "Blood pressure readings are elevated. Rest, minimize sodium, and discuss this reading with your doctor."
      : level === "Moderate"
      ? "Blood pressure is slightly borderline. Continue regular daily check-ins to monitor trends."
      : "Blood pressure and vascular health are balanced and within normal ranges for your trimester.",
    factors
  };
};

// Turn the ML response (model card, per-factor log-odds impacts and guideline
// flags) into explainability rows, so users see *why* the score is what it is.
const modelExplainFactors = (ml: any, label: string): RiskExplainFactor[] => {
  if (!ml) return [];
  const rows: RiskExplainFactor[] = [];
  const prob = Math.round((ml.probability || 0) * 100);
  const drivers = (ml.explanation || [])
    .filter((e: any) => e.provided && Math.abs(e.impact) >= 0.05)
    .slice(0, 3)
    .map((e: any) => `${e.label} ${e.value} ${e.unit} (${e.impact > 0 ? "raises" : "lowers"} risk)`);
  rows.push({
    title: `${label} model score (${prob}%)`,
    detail: ml.model
      ? `${ml.model.name}, trained on ${ml.model.dataset} (n=${ml.model.n}, cross-validated AUC ${ml.model.roc_auc}).` +
        (drivers.length ? ` Main drivers: ${drivers.join("; ")}.` : "")
      : `Evaluated against clinical maternal guidelines.`,
    impact: ml.risk_level || "Calibrated",
    type: ml.risk_level === "High" ? "negative" : ml.risk_level === "Moderate" ? "neutral" : "positive",
    source: "Health Analysis"
  });
  for (const flag of ml.clinical_flags || []) {
    rows.push({ title: flag, detail: "Clinical guideline threshold (ACOG / DIPSI).", impact: "Guideline", type: "negative", source: "Health Analysis" });
  }
  return rows;
};

const getGdmExplainability = (
  profile: any,
  logs: any[],
  gdmMl: any,
  weeks: number
): { summary: string; factors: RiskExplainFactor[] } => {
  const factors: RiskExplainFactor[] = [];
  const latestSugarLog = [...(logs || [])].reverse().find(l => l.blood_sugar !== null && l.blood_sugar !== undefined && Number(l.blood_sugar) > 0);
  const hasLoggedSugar = Boolean(latestSugarLog);
  if (!hasLoggedSugar) {
    return {
      summary: "No blood sugar logged yet, so this risk isn't scored. Add a fasting reading in your check-in, or tell Sakhi something like \"fasting sugar 88\".",
      factors: [],
    };
  }
  const bloodSugar = Number(latestSugarLog.blood_sugar);

  const conditions: string[] = profile?.maternal_conditions || [];
  const hasDiabetesHistory = conditions.some((c: string) => 
    c.toLowerCase().includes("diabetes") || c.toLowerCase().includes("sugar")
  );

  // 1. Fasting Blood Sugar
  if (bloodSugar >= 105) {
    factors.push({
      title: `High Fasting Blood Sugar (${bloodSugar} mg/dL)`,
      detail: hasLoggedSugar
        ? `Recorded in daily check-in. Reading is above the 95 mg/dL benchmark.`
        : `Standard baseline.`,
      impact: "High",
      type: "negative",
      source: "Daily Check-in"
    });
  } else if (bloodSugar >= 95) {
    factors.push({
      title: `Borderline Fasting Sugar (${bloodSugar} mg/dL)`,
      detail: hasLoggedSugar
        ? `Recorded in daily check-in. Reading is hovering near the 95 mg/dL threshold.`
        : `Standard baseline.`,
      impact: "Borderline",
      type: "negative",
      source: "Daily Check-in"
    });
  } else {
    factors.push({
      title: `Optimal Fasting Blood Sugar (${bloodSugar} mg/dL)`,
      detail: hasLoggedSugar
        ? `Recorded in daily check-in. Reading is safely within target range (<95 mg/dL).`
        : `Standard healthy fasting baseline (<95 mg/dL).`,
      impact: "Optimal",
      type: "positive",
      source: "Daily Check-in"
    });
  }

  // 2. Preexisting Diabetes in Setup
  if (hasDiabetesHistory) {
    factors.push({
      title: "Prior Diabetes Noted",
      detail: `Previous glucose sensitivity noted during initial setup.`,
      impact: "Prior History",
      type: "negative",
      source: "Initial Setup"
    });
  } else {
    factors.push({
      title: "No Diabetes History",
      detail: `No metabolic or diabetic conditions noted in initial setup.`,
      impact: "Healthy",
      type: "positive",
      source: "Initial Setup"
    });
  }

  // 3. Gestational Age Context
  const trimesterName = weeks <= 13 ? "First Trimester" : weeks <= 27 ? "Second Trimester" : "Third Trimester";
  factors.push({
    title: `Gestational Stage (${trimesterName}, Week ${weeks})`,
    detail: weeks < 24 
      ? `Standard early pregnancy stage; routine glucose screening typically occurs around weeks 24–28.`
      : `Placental hormones naturally elevate maternal insulin requirements in this stage.`,
    impact: weeks < 24 ? "Low Risk Stage" : "Routine Window",
    type: "neutral",
    source: "Initial Setup"
  });

  // 4. Model score + guideline flags
  factors.push(...modelExplainFactors(gdmMl, "Diabetes"));
  factors.push({
    title: "About this model",
    detail: "Trained on general diabetes data from adult women who were not pregnant, so it is a guide only. The glucose tolerance test (OGTT) your doctor offers around weeks 24 to 28 is what diagnoses gestational diabetes.",
    impact: "Guide only",
    type: "neutral",
    source: "Health Analysis"
  });
  const level = gdmMl?.risk_level;

  return {
    summary: level === "High"
      ? "Blood sugar is elevated. Discuss meal pacing and a glucose tolerance test with your doctor."
      : level === "Moderate"
      ? "Mild sugar elevation observed. Focus on balanced fiber-rich meals and regular daily activity."
      : "Blood sugar is in a healthy range. Insulin regulation looks balanced for this stage.",
    factors
  };
};

const cardClass = panelCard;
const innerCardClass = "bg-cream/70 rounded-xl sm:rounded-2xl border border-plum-900/[0.06] p-3.5 sm:p-5 md:p-6 flex flex-col justify-between min-w-0";
const iconWrapClass = "w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-plum-900/5 flex items-center justify-center text-plum-900 mb-3 sm:mb-4";

/** Today tab: the most recent reading of each vital, colour-coded against common pregnancy thresholds. */
function LatestVitalsCard({ logs, onOpenVitals }: { logs: any[]; onOpenVitals: () => void }) {
  const sorted = [...(logs || [])].sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)));
  const latest = (key: string) => sorted.find(l => l[key] !== undefined && l[key] !== null && Number(l[key]) > 0);
  const bp = latest("blood_pressure_systolic");
  const sugar = latest("blood_sugar");
  const kicks = latest("baby_movement");
  const weight = latest("weight");
  const when = (l: any) => (l ? new Date(String(l.log_date).slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const tone = (level: "ok" | "watch" | "high" | "none") =>
    level === "high" ? "bg-rose-50 border-rose-200 text-rose-700" : level === "watch" ? "bg-amber-50 border-amber-200 text-amber-700" : level === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white/70 border-pink-100 text-plum-900/60";
  const sys = Number(bp?.blood_pressure_systolic), dia = Number(bp?.blood_pressure_diastolic);
  const bpLevel = !bp ? "none" : sys >= 140 || dia >= 90 ? "high" : sys >= 130 || dia >= 80 ? "watch" : "ok";
  const bs = Number(sugar?.blood_sugar);
  const bsLevel = !sugar ? "none" : bs >= 140 ? "high" : bs >= 95 ? "watch" : "ok";
  const items = [
    { label: "Blood pressure", value: bp ? `${sys}/${dia}` : "—", unit: "mmHg", level: bpLevel, log: bp,
      note: bpLevel === "high" ? "High: contact your doctor today" : bpLevel === "watch" ? "A little raised: recheck soon" : bpLevel === "ok" ? "In a healthy range" : "Not logged yet" },
    { label: "Blood sugar", value: sugar ? `${bs}` : "—", unit: "mg/dL", level: bsLevel, log: sugar,
      note: bsLevel === "high" ? "High: mention it to your doctor" : bsLevel === "watch" ? "Above fasting target" : bsLevel === "ok" ? "Within target" : "Not logged yet" },
    { label: "Baby kicks", value: kicks ? `${kicks.baby_movement}` : "—", unit: "counted", level: "none" as const, log: kicks,
      note: "Call your doctor if movements slow down or change" },
    { label: "Weight", value: weight ? `${weight.weight}` : "—", unit: "kg", level: "none" as const, log: weight, note: weight ? "Latest check-in" : "Not logged yet" },
  ];
  return (
    <section className={`${cardClass} md:col-span-12 order-2`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-plum-900">Latest readings</h2>
        <button onClick={onOpenVitals} className="text-sm font-medium text-pink-600 hover:text-pink-700 cursor-pointer">See trends →</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map(i => (
          <div key={i.label} className={`rounded-2xl border p-4 ${tone(i.level as any)}`}>
            <p className="text-xs font-semibold opacity-75">{i.label}</p>
            <p className="mt-1 text-2xl font-semibold text-plum-900">{i.value} <span className="text-xs font-normal text-plum-900/50">{i.unit}</span></p>
            <p className="mt-1 text-xs">{i.note}</p>
            {i.log && <p className="mt-1 text-[11px] text-plum-900/45">{when(i.log)}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PregnancyModePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [nutrition, setNutrition] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [aiState, setAiState] = useState<AIState>("idle");
  const [emergency, setEmergency] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExplainability, setShowExplainability] = useState(false);
  const [explainTab, setExplainTab] = useState<"preeclampsia" | "gdm">("preeclampsia");
  const [tab, setTab] = useHashTab<MomTab>(MOM_TAB_IDS, "today");
  // After the birth, Mom Mode turns into after-birth care
  const pp = useUserDoc<PostpartumDoc>("postpartum", EMPTY_POSTPARTUM);
  const born = pp.loaded && Boolean(pp.doc.birth_date);
  // recovery (0-6 wk) → infant (to 6 mo) → older (to 2 yr) → done
  const ppStage = born ? stageOf(ageDays(pp.doc.birth_date!, dayKey())) : null;
  const [mlPredictions, setMlPredictions] = useState<{
    preeclampsia: any;
    gdm: any;
    isLoading: boolean;
    /** date of the reading each score is based on; null = nothing logged, so not scored */
    bpDate: string | null;
    sugarDate: string | null;
  }>({
    preeclampsia: null,
    gdm: null,
    isLoading: false,
    bpDate: null,
    sugarDate: null,
  });

  // Initialize notification hook
  const { 
    preferences, reminders, toggleMaster, updatePreference, 
    markCompleted, snoozeReminder, deleteReminder 
  } = usePregnancyNotifications(profile, logs, appointments);

  const runMlRiskAssessment = async (prof: any, logList: any[]) => {
    setMlPredictions(prev => ({ ...prev, isLoading: true }));
    try {
      const conditions: string[] = prof?.maternal_conditions || [];
      const hasHypertensionHistory = conditions.some((c: string) => 
        c.toLowerCase().includes("pressure") || c.toLowerCase().includes("hypertension")
      );
      const hasDiabetesHistory = conditions.some((c: string) => 
        c.toLowerCase().includes("diabetes") || c.toLowerCase().includes("sugar")
      );

      // Only score readings she actually logged: a stand-in "normal" value would
      // show a reassuring Low risk built on numbers she never entered.
      const latestBpLog = [...(logList || [])].reverse().find(l => l.blood_pressure_systolic && l.blood_pressure_diastolic);
      const latestSugarLog = [...(logList || [])].reverse().find(l => l.blood_sugar !== null && l.blood_sugar !== undefined && Number(l.blood_sugar) > 0);
      const post = (task: string, body: any) =>
        fetch(`/api/predict/${task}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
          .then(r => (r.ok ? r.json() : null)).catch(() => null);

      const [preeclampsiaData, gdmData] = await Promise.all([
        latestBpLog ? post("preeclampsia", {
          systolic: Number(latestBpLog.blood_pressure_systolic),
          diastolic: Number(latestBpLog.blood_pressure_diastolic),
          hypertension_history: hasHypertensionHistory ? 1 : 0,
          ...(latestSugarLog ? { blood_sugar: Number(latestSugarLog.blood_sugar) } : {}),
          ...(prof?.age ? { age: Number(prof.age) } : {}),
          symptoms: [...(logList || [])].slice(-3).flatMap((l: any) => l.symptoms || []),
        }) : null,
        latestSugarLog ? post("gdm", {
          blood_sugar: Number(latestSugarLog.blood_sugar),
          diabetes_history: hasDiabetesHistory ? 1 : 0,
          ...(prof?.age ? { age: Number(prof.age) } : {}),
          ...(prof?.bmi ? { bmi: Number(prof.bmi) } : {}),
        }) : null,
      ]);

      setMlPredictions({
        preeclampsia: preeclampsiaData,
        gdm: gdmData,
        isLoading: false,
        bpDate: latestBpLog ? String(latestBpLog.log_date).slice(0, 10) : null,
        sugarDate: latestSugarLog ? String(latestSugarLog.log_date).slice(0, 10) : null,
      });
    } catch (err) {
      console.warn("Failed to fetch ML risk assessments:", err);
      setMlPredictions(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    setMounted(true);
    localStorage.setItem("sakhi_active_mode", "pregnancy");
    document.cookie = "sakhi_active_mode=pregnancy; path=/; max-age=31536000";
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/pregnancy-data");
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        if (data.profile.preferred_name) {
          localStorage.setItem("sakhi_preferred_name", data.profile.preferred_name);
          document.cookie = `sakhi_preferred_name=${encodeURIComponent(data.profile.preferred_name)}; path=/; max-age=31536000`;
        }
        setLogs(data.logs || []);
        setNutrition(data.nutrition);
        setAppointments(data.appointments || []);
        runMlRiskAssessment(data.profile, data.logs || []);
        if (!data.profile.preferred_name) {
          router.push("/onboarding");
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setIsCheckingData(false);
    }
  };

  useEffect(() => {
    const handleNameUpdate = (e: any) => {
      if (e.detail?.name) {
        setProfile((prev: any) => ({ ...prev, preferred_name: e.detail.name }));
        localStorage.setItem("sakhi_preferred_name", e.detail.name);
        document.cookie = `sakhi_preferred_name=${encodeURIComponent(e.detail.name)}; path=/; max-age=31536000`;
      }
    };
    window.addEventListener('sakhi-name-updated', handleNameUpdate);
    window.addEventListener('sakhi_name_updated', handleNameUpdate);
    return () => {
      window.removeEventListener('sakhi-name-updated', handleNameUpdate);
      window.removeEventListener('sakhi_name_updated', handleNameUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isCheckingData) {
      const todayStr = new Date().toISOString().split("T")[0];
      const lastCheckIn = localStorage.getItem("sakhi_last_checkin_mom");
      const hasTodayLog = (logs || []).some((l: any) => l.source !== 'lab' && (l.log_date || '').split('T')[0] === todayStr);
      if (lastCheckIn !== todayStr && !hasTodayLog) {
        setShowCheckIn(true);
        setAiState("talking");
      }
    }
  }, [isCheckingData, logs]);

  const handleCheckInComplete = async (data: any) => {
    if (data.isEmergency) {
      setEmergency(true);
      window.dispatchEvent(new CustomEvent('sakhi-chart-update', { detail: { type: 'emergency', reason: null, level: 'emergency' } }));
    }

    const newEntry = {
      // Dated now, so a log sent later from the outbox lands on the right day
      log_date: data.log_date || dayKey(),
      weight: logs.length > 0 && logs[logs.length - 1].weight ? logs[logs.length - 1].weight : null,
      blood_pressure_systolic: data.blood_pressure_systolic,
      blood_pressure_diastolic: data.blood_pressure_diastolic,
      blood_sugar: data.blood_sugar,
      mood: data.mood,
      sleep_hours: data.sleep_hours,
      baby_movement: data.baby_movement,
      symptoms: data.symptoms
    };

    setLogs((prev: any[]) => {
      // Replace any entry for the same day (the server merges per day too),
      // instead of appending a duplicate that skews the charts.
      const dayStr = (newEntry.log_date || new Date().toISOString()).split('T')[0];
      const updated = [...prev.filter((l: any) => (l.log_date || '').split('T')[0] !== dayStr), { ...newEntry, log_date: newEntry.log_date || dayStr }];
      runMlRiskAssessment(profile, updated);
      return updated;
    });

    try {
      // With no signal it waits on the phone and is sent later
      await sendOrQueue('/api/pregnancy-log', 'POST', newEntry);
    } catch (err) {
      console.error("Failed to save pregnancy log:", err);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("sakhi_last_checkin_mom", todayStr);

    setTimeout(() => {
      setShowCheckIn(false);
      setAiState("idle");
    }, 1500);
  };

  const handleChartUpdate = (data: any) => {
    if (!data) return;

    if (data.type === 'emergency') {
      setEmergency(true);
      return;
    }

    if (data.type === 'daily_log') {
      const updatedLog = data.log;
      setLogs((prev: any[]) => {
        const todayStr = (updatedLog.log_date || new Date().toISOString()).split('T')[0];
        const filtered = prev.filter((l: any) => (l.log_date || '').split('T')[0] !== todayStr);
        const updated = [...filtered, updatedLog].sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
        // Live re-calibration of ML preeclampsia & gestational diabetes models
        runMlRiskAssessment(profile, updated);
        return updated;
      });
    } else if (data.type === 'profile_update') {
      setProfile((prev: any) => {
        const updated = { ...prev, ...data.profile };
        runMlRiskAssessment(updated, logs);
        return updated;
      });
    } else if (data.type === 'appointment_update') {
      if (data.appointments) {
        setAppointments(data.appointments);
      }
    } else if (data.type === 'nutrition_update') {
      if (data.nutrition) {
        setNutrition(data.nutrition);
      }
    }
  };

  const handleToggleAppointment = async (index: number) => {
    const updated = [...appointments];
    if (updated[index]) {
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      setAppointments(updated);

      try {
        await fetch('/api/pregnancy-appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle', index })
        });
      } catch (err) {
        console.error("Failed to toggle appointment", err);
      }
    }
  };

  const handleResetAppointmentsMonth = async () => {
    setAppointments([]);
    try {
      await fetch('/api/pregnancy-appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
    } catch (err) {
      console.error("Failed to reset appointments", err);
    }
  };

  if (!mounted || isCheckingData) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Baby weight="duotone" className="w-12 h-12 text-pink-400 animate-pulse opacity-50" />
      </div>
    );
  }

  const displayName = profile?.preferred_name || (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || session?.user?.name?.split(" ")[0] || "Mama";
  const weeks = profile?.weeks_pregnant || 18;
  const dueMs = profile?.expected_due_date ? Date.parse(String(profile.expected_due_date).slice(0, 10) + "T00:00:00") : NaN;
  const daysToGo = isNaN(dueMs) ? null : Math.max(0, Math.ceil((dueMs - Date.now()) / 86_400_000));

  const todayDateStr = new Date().toISOString().split("T")[0];
  const isTodayCheckedIn = Boolean(
    (logs || []).some((l: any) => (l.log_date || '').split('T')[0] === todayDateStr) ||
    (typeof window !== 'undefined' && localStorage.getItem('sakhi_last_checkin_mom') === todayDateStr)
  );

  const preeclampsiaExplain = getPreeclampsiaExplainability(profile, logs, mlPredictions.preeclampsia);
  const gdmExplain = getGdmExplainability(profile, logs, mlPredictions.gdm, weeks);

  return (
    <div className="min-h-[100dvh] bg-cream selection:bg-plum-900/10 font-sans relative">
      <ConsentGate />
      <DashboardHeader
        mode="pregnancy"
        modeLabel={born ? `Mom Mode · Baby ${babyAge(pp.doc.birth_date!, new Date().toISOString().slice(0, 10)).replace(" old", "")}` : `Mom Mode · Week ${weeks}`}
        displayName={displayName}
        reminderCount={(reminders || []).filter((r: any) => r.status === "upcoming").length}
        onOpenReminders={() => setIsNotificationOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <RedFlagBanner mode="pregnancy" />

        <DashboardTabs tabs={MOM_TABS} active={tab} onChange={setTab} />

        {/* VISUAL DASHBOARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pb-28 sm:pb-16 print:pb-0"
        >
          {/* Avatar Section */}
          {/* Chat stays mounted on every tab so a conversation is never lost */}
          <div className={tab === "today" ? `md:col-span-12 print:hidden no-print ${showCheckIn ? "order-first" : "order-3"}` : "hidden"}>
            <PregnancyAvatar 
              aiState={aiState} 
              onChartUpdate={handleChartUpdate} 
              pregnancyContext={{ profile, logs: logs.slice(-1) }}
              checkInMode={showCheckIn}
              onCheckInComplete={handleCheckInComplete}
              profileName={displayName}
              isCheckInCompleted={isTodayCheckedIn}
              onToggleCheckInMode={() => setShowCheckIn(prev => !prev)}
            />
          </div>

          {tab === "today" && (<>
          {/* From 28 weeks the contraction timer sits on Today, where she'll look first */}
          {born && (<>
            <BabyHeader pp={pp} className="md:col-span-12 order-1" />
            {(ppStage === "recovery" || ppStage === "infant") && <NewbornCard pp={pp} className="md:col-span-7 order-2" />}
            {ppStage === "recovery" && <RecoveryCard pp={pp} className="md:col-span-5 order-2" />}
            {ppStage !== "recovery" && <BackToHerCard pp={pp} name={displayName} className={`${ppStage === "infant" ? "md:col-span-5" : "md:col-span-12"} order-2`} />}
          </>)}
          {!born && pp.loaded && (weeks >= 36 || (daysToGo !== null && daysToGo <= 21)) && (
            <BabyArrivedCard pp={pp} compact className="md:col-span-12 order-2" />
          )}
          {!born && weeks >= 28 && (
            <div className={`${cardClass} md:col-span-12 order-4`}>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-semibold tracking-tight text-plum-900">Contraction timer</h3>
            </div>
            <p className="text-xs text-plum-900/55 mb-4">Tap when a contraction starts and again when it ends. Sakhi tracks how long and how far apart they are.</p>
            <ContractionTimer weeks={weeks} />
          </div>
          )}
          {/* Where she is this week: comes first on Today */}
          {!born && <div className={`${cardClass} md:col-span-12 order-1`}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <p className="text-sm text-ink-soft">{weeks <= 13 ? "First trimester" : weeks <= 27 ? "Second trimester" : "Third trimester"}</p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-plum-900">
                  Week {weeks}. Baby is about the size of <span className="display-serif font-normal text-blush-500">{sizeFor(weeks)}</span>.
                </h2>
              </div>
              {daysToGo !== null && (
                <p className="text-sm text-ink-soft sm:text-right shrink-0">
                  <span className="text-2xl font-semibold tabular-nums text-plum-900">{daysToGo}</span> days to your due date
                </p>
              )}
            </div>
            <PregnancyWeekProgress weeks={weeks} />
            <div className="mt-8">
              <h3 className="text-sm font-medium text-plum-900/60 mb-4">Baby growth timeline</h3>
              <BabyGrowthTimeline weeks={weeks} />
            </div>
          </div>}

          <LatestVitalsCard logs={logs} onOpenVitals={() => setTab("vitals")} />
          <TabletsCard mode="pregnancy" weeks={weeks} className="md:col-span-12 order-5" />
          </>)}

          {tab === "vitals" && (<>
          {/* Vitals Row */}
          <div className={`${cardClass} md:col-span-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Heartbeat className="text-red-400 w-5 h-5" />
              <h3 className="text-xl font-semibold tracking-tight text-plum-900">Blood Pressure</h3>
            </div>
            <p className="text-xs text-plum-900/50 mb-6">Monitoring for Preeclampsia Risk</p>
            <BloodPressureChart data={logs} />
          </div>
          
          <div className={`${cardClass} md:col-span-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Drop className="text-amber-500 w-5 h-5" weight="fill" />
              <h3 className="text-xl font-semibold tracking-tight text-plum-900">Fasting Blood Sugar</h3>
            </div>
            <p className="text-xs text-plum-900/50 mb-6">Monitoring for Gestational Diabetes</p>
            <BloodSugarChart data={logs} />
          </div>

          {/* Growth & Movement Row */}
          <div className={`${cardClass} md:col-span-12`}>
            <h3 className="text-xl font-semibold tracking-tight text-plum-900 mb-4">Weight</h3>
            <WeightTracker mode="pregnancy" logs={logs} weeks={weeks} />
          </div>

          <div className={`${cardClass} md:col-span-12`}>
            <h3 className="text-xl font-semibold tracking-tight text-plum-900 mb-4">Fetal Movement Count</h3>
            <BabyMovementChart data={logs} />
          </div>

          </>)}

          {tab === "plan" && (<>
          {/* Appointments & Nutrition Row */}
          <div className={`${cardClass} md:col-span-12`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-plum-900">Appointments</h3>
                <span className="text-[11px] text-plum-900/50">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Schedule • Resets monthly
                </span>
              </div>
              {appointments.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetAppointmentsMonth}
                  className="text-[11px] text-plum-900/60 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-black/5 cursor-pointer font-medium"
                  title="Clear appointments and start fresh for this month"
                >
                  Reset Month
                </button>
              )}
            </div>
            <AppointmentTimeline 
              appointments={appointments} 
              onToggleAppointment={handleToggleAppointment} 
            />
          </div>

          {/* Built from what she ate, not typed-in totals */}
          <MealsCard stage={stageFor(born ? null : weeks, ppStage === "recovery" || ppStage === "infant")} className="md:col-span-12" />

          {born ? <VaccineCard pp={pp} className="md:col-span-12" /> : (<>
            {weeks >= 28 && <HospitalBagCard weeks={weeks} className="md:col-span-12" />}
            {/* From 22 weeks, so an early (preterm) birth can still be recorded */}
            {pp.loaded && weeks >= 22 && <BabyArrivedCard pp={pp} compact className="md:col-span-12" />}
          </>)}
          <SchemesCard className="md:col-span-12" />


          </>)}

          {tab === "vitals" && (<>
          {/* Mood & Sleep Row */}
          <div className={`${cardClass} md:col-span-6`}>
            <h3 className="text-xl font-semibold tracking-tight text-plum-900 mb-4">Mood Tracker</h3>
            <MoodTrackerChart data={logs} />
          </div>

          <div className={`${cardClass} md:col-span-6`}>
            <h3 className="text-xl font-semibold tracking-tight text-plum-900 mb-4">Sleep Graph</h3>
            <PregnancySleepGraph data={logs} />
          </div>

          </>)}

          {tab === "care" && (<>
          <MoodCheckCard pregnant className="md:col-span-6" />
          <FamilyContactsCard className="md:col-span-6" />
          <NearbyHelpCard mode="pregnancy" className="md:col-span-12" />
          <LabResultsCard mode="pregnancy" pregnant className="md:col-span-12" onChanged={fetchDashboardData} />
          {!born && weeks < 28 && (
          <div className={`${cardClass} md:col-span-12`}>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-semibold tracking-tight text-plum-900">Contraction timer</h3>
            </div>
            <p className="text-xs text-plum-900/55 mb-4">Tap when a contraction starts and again when it ends. Sakhi tracks how long and how far apart they are.</p>
            <ContractionTimer weeks={weeks} />
          </div>
          )}
          {/* Machine Learning Maternal Risk Assessment: scores only readings she logged */}
          {(() => {
            const pe = mlPredictions.preeclampsia, gd = mlPredictions.gdm;
            const levels = [pe?.risk_level, gd?.risk_level];
            const shortDate = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
            const levelCls = (l: string) => l === "High" ? "bg-rose-100 text-rose-700" : l === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
            const RiskTile = ({ title, ml, reading, date, notes, missing }: {
              title: string; ml: any; reading: string; date: string | null;
              notes: { High: string; Moderate: string; Low: string }; missing: string;
            }) => (
              <div className="flex-1 bg-white/80 p-4 rounded-2xl border border-plum-900/[0.07] flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-plum-900/65">{title}</span>
                    {ml ? (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${levelCls(ml.risk_level)}`}>{ml.risk_level}</span>
                    ) : !mlPredictions.isLoading && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-plum-900/5 text-plum-900/55">Not scored</span>
                    )}
                  </div>
                  {ml ? (
                    <>
                      <p className="mt-1 text-2xl font-semibold text-plum-900 tabular-nums">
                        {Math.round(ml.probability * 100)}% <span className="text-xs font-normal text-plum-900/50">model estimate</span>
                      </p>
                      <p className="text-xs text-plum-900/65 mt-2 leading-relaxed">{notes[ml.risk_level as "High" | "Moderate" | "Low"] ?? notes.Low}</p>
                    </>
                  ) : (
                    <p className="text-xs text-plum-900/65 mt-2 leading-relaxed">{mlPredictions.isLoading ? "Checking…" : missing}</p>
                  )}
                </div>
                <div className="mt-3 pt-2.5 border-t border-plum-900/5 text-[11px] text-plum-900/50 flex items-center justify-between gap-2">
                  <span>Based on</span>
                  <span className="font-medium text-plum-900/75 tabular-nums">{ml ? `${reading}${date ? ` · ${shortDate(date)}` : ""}` : "No reading yet"}</span>
                </div>
              </div>
            );
            return (
          <div className={`${cardClass} md:col-span-6 ${
            levels.includes("High") ? "border-rose-200 bg-rose-50/30"
              : levels.includes("Moderate") ? "border-amber-200 bg-amber-50/20"
              : ""
          } print:hidden`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={iconWrapClass}><ShieldCheck weight="duotone" className="w-6 h-6 text-lavender-600" /></div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-plum-900">Pregnancy risk check</h3>
                <p className="text-xs text-plum-900/60 mt-0.5">
                  {mlPredictions.isLoading ? "Checking your latest readings…" : "From your own logged readings · a screening guide, not a diagnosis"}
                </p>
              </div>
            </div>

            <p className="text-xs text-plum-900/60 mb-4">
              {profile?.pregnancy_experience || "First-time mother"} · Trimester {weeks <= 13 ? "1" : weeks <= 27 ? "2" : "3"}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <RiskTile
                title="Preeclampsia (high BP)"
                ml={pe}
                reading={pe?.factors ? `${pe.factors.systolic}/${pe.factors.diastolic} mmHg` : ""}
                date={mlPredictions.bpDate}
                notes={{
                  High: "Your blood pressure reading is high. Please contact your doctor today.",
                  Moderate: "A little above the ideal range. Recheck in a day or two and keep logging.",
                  Low: "Your latest reading is in a healthy range. Keep checking at each visit.",
                }}
                missing='Log a blood pressure reading in your check-in, or tell Sakhi "BP 118 over 76", to see this.'
              />
              <RiskTile
                title="Blood sugar"
                ml={gd}
                reading={gd?.factors ? `${gd.factors.blood_sugar} mg/dL` : ""}
                date={mlPredictions.sugarDate}
                notes={{
                  High: "Your sugar reading is high. Mention it to your doctor and ask about a glucose test (OGTT).",
                  Moderate: "Slightly above the fasting target. Balanced, fibre-rich meals and a short walk after eating help.",
                  Low: "Your latest reading is within the fasting target.",
                }}
                missing='Log a fasting sugar reading, or tell Sakhi "fasting sugar 88", to see this.'
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-plum-900/50">
              The blood sugar estimate comes from a general diabetes model (trained on women who were not pregnant), so treat it as a guide.
              Gestational diabetes is diagnosed with the glucose tolerance test around weeks 24 to 28.
            </p>

            {/* Expandable Explainability Accordion */}
            <div className="mt-5 pt-3 border-t border-plum-900/10">
              <button
                type="button"
                onClick={() => setShowExplainability(!showExplainability)}
                className="w-full flex items-center justify-between text-xs sm:text-sm font-semibold text-plum-900 hover:text-plum-900/70 transition-colors py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Info weight="bold" className="w-4 h-4 text-purple-600" />
                  Why this score?
                </span>
                {showExplainability ? <CaretUp weight="bold" className="w-4 h-4" /> : <CaretDown weight="bold" className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showExplainability && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-3 space-y-3"
                  >
                    {/* Tab Switcher */}
                    <div className="flex gap-2 p-1 bg-black/5 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setExplainTab("preeclampsia")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color,box-shadow] cursor-pointer ${
                          explainTab === "preeclampsia" 
                            ? "bg-white text-plum-900 shadow-sm" 
                            : "text-plum-900/60 hover:text-plum-900"
                        }`}
                      >
                        Preeclampsia factors ({mlPredictions.preeclampsia ? `${Math.round(mlPredictions.preeclampsia.probability * 100)}%` : "not scored"})
                      </button>
                      <button
                        type="button"
                        onClick={() => setExplainTab("gdm")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color,box-shadow] cursor-pointer ${
                          explainTab === "gdm" 
                            ? "bg-white text-plum-900 shadow-sm" 
                            : "text-plum-900/60 hover:text-plum-900"
                        }`}
                      >
                        Blood sugar factors ({mlPredictions.gdm ? `${Math.round(mlPredictions.gdm.probability * 100)}%` : "not scored"})
                      </button>
                    </div>

                    {/* Summary sentence */}
                    <p className="text-xs text-plum-900/70 leading-relaxed font-medium">
                      {explainTab === "preeclampsia" ? preeclampsiaExplain.summary : gdmExplain.summary}
                    </p>

                    {/* Factor Breakdown List */}
                    <div className="space-y-2">
                      {(explainTab === "preeclampsia" ? preeclampsiaExplain.factors : gdmExplain.factors).map((f, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-xl bg-white/80 border border-black/5 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            {f.type === "positive" ? (
                              <CheckCircle weight="fill" className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : f.type === "negative" ? (
                              <WarningCircle weight="fill" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <Info weight="fill" className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-plum-900">{f.title}</span>
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/5 text-plum-900/60">
                                  {f.source}
                                </span>
                              </div>
                              <div className="text-[11px] text-plum-900/70 leading-relaxed mt-1">
                                {f.detail}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            f.type === "positive" ? "bg-emerald-100 text-emerald-700" :
                            f.type === "negative" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                          }`}>
                            {f.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
            );
          })()}

          <a
            href="/doctor-summary?mode=pregnancy"
            className={`${cardClass} md:col-span-6 flex flex-col justify-center items-center text-center group cursor-pointer no-print print:hidden`}
          >
            <div className="w-20 h-20 rounded-full bg-white/50 border border-white/40 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-md transition-[transform,box-shadow] duration-500">
              <FilePdf weight="duotone" className="w-8 h-8 text-plum-900" />
            </div>
            <h3 className="text-lg font-medium text-plum-900">Doctor Summary</h3>
            <p className="text-sm text-plum-900/60 mt-2">Generate your Pregnancy PDF report for your next ANC visit.</p>
          </a>
          </>)}
        </motion.div>
      </main>

      <PregnancyNotificationCenter
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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        mode="pregnancy"
        currentData={profile} 
      />
    </div>
  );
}
