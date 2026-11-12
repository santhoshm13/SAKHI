"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, CheckCircle, Lightning, Heartbeat, Drop, Baby, Moon, ShieldWarning } from "@phosphor-icons/react";

interface PregnancyDailyCheckInProps {
  onComplete: (data: any) => void;
  profileName?: string;
  onClose?: () => void;
}

export default function PregnancyDailyCheckIn({ onComplete, profileName, onClose }: PregnancyDailyCheckInProps) {
  const [step, setStep] = useState(0);

  // Data state
  const [fetalMovement, setFetalMovement] = useState<string | null>(null);
  const [bloodPressure, setBloodPressure] = useState<string | null>(null);
  const [bloodSugar, setBloodSugar] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(8.0);
  const [symptoms, setSymptoms] = useState<string[]>([]);

  // 1-Tap Quick Log Shortcut
  const handleQuickLog = () => {
    setFetalMovement("Active & Kicking (5+ kicks)");
    setBloodPressure("Normal (< 120/80)");
    setBloodSugar("Normal (< 95 mg/dL)");
    setMood("Calm");
    setSleepHours(8.0);
    setSymptoms(["None"]);
    setStep(99); // Closing
    
    setTimeout(() => {
      onComplete({
        log_date: new Date().toISOString().split('T')[0],
        blood_pressure_systolic: 115,
        blood_pressure_diastolic: 75,
        blood_sugar: 88,
        baby_movement: { morning: 4, afternoon: 5, night: 4 },
        mood: "Calm",
        sleep_hours: 8.0,
        symptoms: ["None"],
        isEmergency: false
      });
    }, 1500);
  };

  const toggleSymptom = (sym: string) => {
    if (sym === "None") {
      setSymptoms(["None"]);
      return;
    }
    setSymptoms(prev => {
      const next = prev.filter(s => s !== "None");
      if (next.includes(sym)) return next.filter(s => s !== sym);
      return [...next, sym];
    });
  };

  const handleSubmit = () => {
    setStep(99); // Closing message

    let systolic = 118;
    let diastolic = 76;
    if (bloodPressure?.includes("Slightly High")) {
      systolic = 132;
      diastolic = 86;
    } else if (bloodPressure?.includes("High (≥ 140/90)")) {
      systolic = 146;
      diastolic = 94;
    }

    let sugar = 88;
    if (bloodSugar?.includes("Slightly Elevated")) sugar = 106;
    if (bloodSugar?.includes("High (> 125)")) sugar = 138;

    const isHighMovement = fetalMovement?.includes("Active");
    const isLowMovement = fetalMovement?.includes("Less than usual");
    const movementObj = {
      morning: isLowMovement ? 1 : isHighMovement ? 5 : 3,
      afternoon: isLowMovement ? 1 : isHighMovement ? 6 : 4,
      night: isLowMovement ? 1 : isHighMovement ? 5 : 3,
    };

    const hasEmergencySymptoms = symptoms.includes("Severe Headache ⚠️") || 
      symptoms.includes("Vision Changes ⚠️") || 
      bloodPressure?.includes("High (≥ 140/90)");

    setTimeout(() => {
      onComplete({
        log_date: new Date().toISOString().split('T')[0],
        blood_pressure_systolic: systolic,
        blood_pressure_diastolic: diastolic,
        blood_sugar: sugar,
        baby_movement: movementObj,
        mood: mood || "Calm",
        sleep_hours: sleepHours,
        symptoms: symptoms.length > 0 ? symptoms : ["None"],
        isEmergency: Boolean(hasEmergencySymptoms)
      });
    }, 1500);
  };

  const name = profileName || (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || 'Mama';

  return (
    <div className="flex flex-col gap-4 w-full">
      <AnimatePresence mode="popLayout">
        
        {/* Step 0: Baby Fetal Movement */}
        <motion.div
          key="movement-step"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col w-full"
        >
          <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3.5 text-sm text-plum-900 shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
            Hi {name} 👋! 🍼 Let&apos;s do your daily morning check-in. How active was your baby&apos;s movement today?
          </div>

          {step === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-end gap-2 w-full">
              <div className="flex flex-wrap gap-2 justify-end">
                {[
                  "Active & Kicking (5+ kicks)",
                  "Normal Movement",
                  "Gentle Flutters",
                  "Less than usual",
                  "Not felt yet / Early week"
                ].map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setFetalMovement(opt);
                      setTimeout(() => setStep(1), 300);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      fetalMovement === opt
                        ? "bg-plum-900 text-white"
                        : "bg-white/60 text-plum-900 hover:bg-white border border-white/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step > 0 && fetalMovement && (
            <div className="bg-lavender-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-lavender-900 self-end shadow-sm mb-2">
              Baby Movement: {fetalMovement}
            </div>
          )}
        </motion.div>

        {/* Step 1: Blood Pressure Check */}
        {step >= 1 && (
          <motion.div
            key="bp-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3.5 text-sm text-plum-900 shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              Did you measure your Blood Pressure today? 🩺 (Helps screen for Preeclampsia)
            </div>

            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 justify-end w-full">
                {[
                  "Normal (< 120/80 mmHg) ✅",
                  "Slightly High (120-139) ⚠️",
                  "High (≥ 140/90 mmHg) 🚨",
                  "Did not measure today ⏱️"
                ].map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setBloodPressure(opt);
                      setTimeout(() => setStep(2), 300);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      bloodPressure === opt
                        ? "bg-plum-900 text-white"
                        : "bg-white/60 text-plum-900 hover:bg-white border border-white/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}

            {step > 1 && bloodPressure && (
              <div className="bg-lavender-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-lavender-900 self-end shadow-sm mb-2">
                BP: {bloodPressure}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Blood Sugar */}
        {step >= 2 && (
          <motion.div
            key="sugar-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3.5 text-sm text-plum-900 shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              How are your Blood Sugar levels today? 🩸 (Monitors Gestational Diabetes)
            </div>

            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 justify-end w-full">
                {[
                  "Normal (< 95 mg/dL) ✅",
                  "Slightly Elevated (95-125) ⚠️",
                  "High (> 125 mg/dL) 🚨",
                  "Did not test today ⏱️"
                ].map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setBloodSugar(opt);
                      setTimeout(() => setStep(3), 300);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      bloodSugar === opt
                        ? "bg-plum-900 text-white"
                        : "bg-white/60 text-plum-900 hover:bg-white border border-white/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}

            {step > 2 && bloodSugar && (
              <div className="bg-lavender-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-lavender-900 self-end shadow-sm mb-2">
                Blood Sugar: {bloodSugar}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Mood & Energy */}
        {step >= 3 && (
          <motion.div
            key="mood-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3.5 text-sm text-plum-900 shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              How is your mood and emotional wellness today? 🌸
            </div>

            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 justify-end w-full">
                {["Happy 😊", "Calm 😌", "Tired / Fatigued 🥱", "Anxious 😟", "Nauseous 🤢"].map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setMood(opt.split(" ")[0]);
                      setTimeout(() => setStep(4), 300);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      mood === opt.split(" ")[0]
                        ? "bg-plum-900 text-white"
                        : "bg-white/60 text-plum-900 hover:bg-white border border-white/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}

            {step > 3 && mood && (
              <div className="bg-lavender-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-lavender-900 self-end shadow-sm mb-2">
                Mood: {mood}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 4: Sleep Hours */}
        {step >= 4 && (
          <motion.div
            key="sleep-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3.5 text-sm text-plum-900 shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              How many hours of restful sleep did you get last night? 🌙
            </div>

            {step === 4 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 justify-end w-full">
                {[5, 6, 7, 8, 9].map(hours => (
                  <button
                    key={hours}
                    onClick={() => {
                      setSleepHours(hours);
                      setTimeout(() => setStep(5), 300);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      sleepHours === hours
                        ? "bg-plum-900 text-white"
                        : "bg-white/60 text-plum-900 hover:bg-white border border-white/40"
                    }`}
                  >
                    {hours} {hours === 9 ? "+ hrs" : "hrs"}
                  </button>
                ))}
              </motion.div>
            )}

            {step > 4 && (
              <div className="bg-lavender-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-lavender-900 self-end shadow-sm mb-2">
                Sleep: {sleepHours} hours
              </div>
            )}
          </motion.div>
        )}

        {/* Step 5: Symptoms Checklist & Submit */}
        {step >= 5 && step !== 99 && (
          <motion.div
            key="symptoms-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3.5 text-sm text-plum-900 shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              Any symptoms to report today? (Tap all that apply)
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-end gap-3 w-full">
              <div className="flex flex-wrap gap-2 justify-end w-full">
                {[
                  "Nausea / Morning Sickness",
                  "Swelling in Feet / Hands",
                  "Lower Back Pain",
                  "Heartburn / Acidity",
                  "Severe Headache ⚠️",
                  "Vision Changes ⚠️",
                  "None"
                ].map(sym => {
                  const isSelected = symptoms.includes(sym);
                  const isWarning = sym.includes("⚠️");
                  return (
                    <button
                      key={sym}
                      onClick={() => toggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-[background-color,color,box-shadow] cursor-pointer ${
                        isSelected
                          ? isWarning 
                            ? "bg-red-500 text-white shadow-sm"
                            : "bg-plum-900 text-white shadow-sm"
                          : "bg-white/60 text-plum-900 hover:bg-white border border-white/40"
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSubmit}
                className="mt-2 px-6 py-2 rounded-full bg-plum-900 text-white text-xs font-semibold hover:bg-plum-950 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CheckCircle weight="bold" size={16} /> Complete Daily Check-in
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Closing Step */}
        {step === 99 && (
          <motion.div
            key="closing-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 mb-3 animate-bounce">
              <Sparkle weight="duotone" size={24} />
            </div>
            <p className="font-medium text-sm text-plum-900">
              Thank you, {name}! 🌸
            </p>
            <p className="text-xs text-plum-900/60 mt-1">
              Your maternal logs and vitals are updated in your dashboard.
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
