"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, Check, CaretRight, CheckCircle } from "@phosphor-icons/react";

interface AssessmentProps {
  isFirstTime: boolean;
  onComplete: (data: any) => void;
  setAiState: (state: "idle" | "thinking" | "talking") => void;
}

export default function ComprehensiveAssessment({ isFirstTime, onComplete, setAiState }: AssessmentProps) {
  const [step, setStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Form State
  const [data, setData] = useState({
    // Phase A: Initial Setup
    preferredName: "",
    lastPeriodStart: "",
    lastPeriodEnd: "",
    periodDuration: 5,
    cycleLengthAvg: 28,
    cycleRegularity: "Sometimes",
    diagnosedConditions: [] as string[],
    
    // Phase B: Daily Check-in
    onPeriod: false,
    flowIntensity: "None",
    crampsSeverity: 0,
    symptoms: [] as string[],
    mood: "Calm",
    sleepHours: 7,
    waterConsumed: "2 Liters",
    exercised: false,
    warningSigns: [] as string[],
    notes: ""
  });

  // Define steps
  const firstTimeSteps = [
    "welcome",
    "name",
    "lastPeriod",
    "cycleLength",
    "regularity",
    "diagnosed",
  ];
  const dailySteps = [
    "dailyWelcome",
    "onPeriod",
    "flowAndPain",
    "symptoms",
    "mood",
    "lifestyle",
    "warnings",
    "notes"
  ];

  const steps = isFirstTime ? [...firstTimeSteps, ...dailySteps.slice(1)] : dailySteps;

  const currentStepId = steps[step];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setAiState("thinking");
      setIsTransitioning(true);
      
      // Simulate Sakhi "thinking" or processing before next question
      await new Promise((r) => setTimeout(r, 1200));
      
      setStep(s => s + 1);
      setAiState("idle");
      setIsTransitioning(false);
    } else {
      setAiState("thinking");
      await new Promise((r) => setTimeout(r, 1500));
      setAiState("idle");
      onComplete(data);
    }
  };

  const updateData = (key: string, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'diagnosedConditions' | 'symptoms' | 'warningSigns', value: string) => {
    setData(prev => {
      const arr = prev[key];
      if (value === "None") return { ...prev, [key]: ["None"] };
      
      const withoutNone = arr.filter(i => i !== "None");
      if (withoutNone.includes(value)) {
        return { ...prev, [key]: withoutNone.filter(i => i !== value) };
      } else {
        return { ...prev, [key]: [...withoutNone, value] };
      }
    });
  };

  const renderStep = () => {
    switch (currentStepId) {
      case "welcome":
        return (
          <div className="flex flex-col items-center text-center space-y-6">
            <Sparkle weight="duotone" className="w-16 h-16 text-pink-400 opacity-80" />
            <h2 className="text-3xl font-semibold text-plum-900 tracking-tight">Welcome to Sakhi</h2>
            <p className="text-plum-900/70 text-lg max-w-md leading-relaxed">
              Before we begin our journey together, I'd like to ask a few questions to truly understand your body's unique rhythm. 
              There is no rush, take all the time you need.
            </p>
          </div>
        );
      
      case "dailyWelcome":
        return (
          <div className="flex flex-col items-center text-center space-y-6">
            <Sparkle weight="duotone" className="w-16 h-16 text-pink-400 opacity-80" />
            <h2 className="text-3xl font-semibold text-plum-900 tracking-tight">Hello again.</h2>
            <p className="text-plum-900/70 text-lg max-w-md leading-relaxed">
              How is your body feeling today? Let's do a gentle check-in.
            </p>
          </div>
        );

      case "name":
        return (
          <div className="flex flex-col items-center text-center space-y-8 w-full max-w-sm mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">What may I call you?</h2>
            <input 
              type="text" 
              value={data.preferredName}
              onChange={(e) => updateData("preferredName", e.target.value)}
              placeholder="Your gentle name..."
              className="w-full bg-white/50 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] px-6 py-4 text-center text-xl text-plum-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70 transition-[box-shadow,background-color]"
            />
          </div>
        );

      case "lastPeriod":
        return (
          <div className="flex flex-col items-center text-center space-y-8 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">When did your last period start?</h2>
            <div className="flex flex-col w-full space-y-4">
              <input 
                type="date" 
                value={data.lastPeriodStart}
                onChange={(e) => updateData("lastPeriodStart", e.target.value)}
                className="w-full bg-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] px-6 py-4 text-plum-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70"
              />
              <p className="text-plum-900/50 text-sm">And when did it end?</p>
              <input 
                type="date" 
                value={data.lastPeriodEnd}
                onChange={(e) => updateData("lastPeriodEnd", e.target.value)}
                className="w-full bg-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] px-6 py-4 text-plum-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70"
              />
            </div>
          </div>
        );
      
      case "cycleLength":
        return (
          <div className="flex flex-col items-center text-center space-y-8 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">What is your average cycle length?</h2>
            <p className="text-plum-900/60">Usually between 21 and 35 days.</p>
            <div className="flex items-center space-x-6 w-full">
              <input 
                type="range" 
                min="20" max="45" 
                value={data.cycleLengthAvg}
                onChange={(e) => updateData("cycleLengthAvg", parseInt(e.target.value))}
                className="w-full accent-pink-400"
              />
              <span className="text-3xl font-semibold text-plum-900">{data.cycleLengthAvg}</span>
            </div>
          </div>
        );

      case "regularity":
        return (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-sm mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">Are your periods usually regular?</h2>
            <div className="flex flex-col w-full space-y-3">
              {["Yes", "No", "Sometimes"].map(opt => (
                <button
                  key={opt}
                  onClick={() => updateData("cycleRegularity", opt)}
                  className={`py-4 rounded-[2rem] text-lg font-medium transition-colors ${data.cycleRegularity === opt ? 'bg-pink-100 text-pink-900 shadow-sm border border-pink-200' : 'bg-white/40 text-plum-900/70 hover:bg-white/60 border border-transparent'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );

      case "diagnosed":
        return (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">Have you been diagnosed with any of these?</h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              {["PCOS", "Thyroid disorder", "Endometriosis", "Fibroids", "None"].map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleArrayItem("diagnosedConditions", opt)}
                  className={`py-3 px-4 rounded-2xl text-sm font-medium transition-colors ${data.diagnosedConditions.includes(opt) ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm' : 'bg-white/40 text-plum-900/70 hover:bg-white/60 border border-transparent'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      
      case "onPeriod":
        return (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-sm mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">Are you currently on your period?</h2>
            <div className="flex space-x-4 w-full">
              <button
                onClick={() => updateData("onPeriod", true)}
                className={`flex-1 py-4 rounded-[2rem] text-lg font-medium transition-colors ${data.onPeriod === true ? 'bg-pink-100 text-pink-900 border border-pink-200' : 'bg-white/40 text-plum-900/70'}`}
              >
                Yes
              </button>
              <button
                onClick={() => updateData("onPeriod", false)}
                className={`flex-1 py-4 rounded-[2rem] text-lg font-medium transition-colors ${data.onPeriod === false ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' : 'bg-white/40 text-plum-900/70'}`}
              >
                No
              </button>
            </div>
          </div>
        );

      case "flowAndPain":
        if (!data.onPeriod) {
          setTimeout(handleNext, 0); // Skip if not on period
          return null;
        }
        return (
          <div className="flex flex-col items-center text-center space-y-8 w-full max-w-md mx-auto">
            <div className="space-y-4 w-full">
              <h2 className="text-2xl font-medium text-plum-900">How heavy is your flow today?</h2>
              <div className="grid grid-cols-2 gap-2">
                {["Spotting", "Light", "Moderate", "Heavy", "Very Heavy"].map(opt => (
                  <button
                    key={opt}
                    onClick={() => updateData("flowIntensity", opt)}
                    className={`py-2 px-3 rounded-xl text-sm transition-colors ${data.flowIntensity === opt ? 'bg-red-100 text-red-900 border border-red-200' : 'bg-white/40 text-plum-900/70'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4 w-full">
              <h2 className="text-xl font-medium text-plum-900">How severe are your cramps? (0-10)</h2>
              <input 
                type="range" min="0" max="10" 
                value={data.crampsSeverity}
                onChange={(e) => updateData("crampsSeverity", parseInt(e.target.value))}
                className="w-full accent-red-400"
              />
              <span className="text-2xl font-semibold text-red-900">{data.crampsSeverity}</span>
            </div>
          </div>
        );

      case "symptoms":
        return (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">Are you experiencing any of these?</h2>
            <div className="grid grid-cols-2 gap-2 w-full">
              {["Cramps", "Headache", "Bloating", "Acne", "Back pain", "Breast tenderness", "Fatigue", "Nausea", "Mood swings", "None"].map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleArrayItem("symptoms", opt)}
                  className={`py-3 px-2 rounded-2xl text-sm transition-colors ${data.symptoms.includes(opt) ? 'bg-plum-900 text-white' : 'bg-white/40 text-plum-900/70 hover:bg-white/60'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );

      case "mood":
        return (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">How are you feeling today?</h2>
            <div className="grid grid-cols-3 gap-3 w-full">
              {["Happy", "Calm", "Irritated", "Anxious", "Sad", "Stressed"].map(opt => (
                <button
                  key={opt}
                  onClick={() => updateData("mood", opt)}
                  className={`py-4 rounded-[2rem] text-sm font-medium transition-colors ${data.mood === opt ? 'bg-gradient-to-br from-pink-200 to-indigo-200 text-plum-900 shadow-sm' : 'bg-white/40 text-plum-900/70'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );

      case "lifestyle":
        return (
          <div className="flex flex-col items-center text-center space-y-8 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">Just a few lifestyle details</h2>
            <div className="w-full space-y-2 text-left">
              <label className="text-sm font-medium text-plum-900/70 ml-2">Hours of sleep last night</label>
              <input 
                type="number" value={data.sleepHours} 
                onChange={(e) => updateData("sleepHours", parseFloat(e.target.value))}
                className="w-full bg-white/50 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70"
              />
            </div>
            <div className="w-full space-y-2 text-left">
              <label className="text-sm font-medium text-plum-900/70 ml-2">Did you exercise today?</label>
              <div className="flex gap-2">
                <button onClick={() => updateData("exercised", true)} className={`flex-1 py-3 rounded-2xl ${data.exercised ? 'bg-indigo-100' : 'bg-white/40'}`}>Yes</button>
                <button onClick={() => updateData("exercised", false)} className={`flex-1 py-3 rounded-2xl ${!data.exercised ? 'bg-indigo-100' : 'bg-white/40'}`}>No</button>
              </div>
            </div>
          </div>
        );

      case "warnings":
        return (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">Emergency Screening</h2>
            <p className="text-plum-900/60">Are you experiencing any of these warning signs?</p>
            <div className="flex flex-col gap-2 w-full">
              {["Heavy bleeding", "Severe abdominal pain", "Fainting", "Fever", "Bleeding between periods", "None"].map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleArrayItem("warningSigns", opt)}
                  className={`py-3 px-4 rounded-2xl text-sm transition-colors ${data.warningSigns.includes(opt) ? 'bg-red-100 text-red-900 border border-red-200' : 'bg-white/40 text-plum-900/70'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );

      case "notes":
        return (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-medium text-plum-900">Would you like to add anything else?</h2>
            <textarea 
              value={data.notes}
              onChange={(e) => updateData("notes", e.target.value)}
              placeholder="Any gentle thoughts, feelings, or symptoms..."
              className="w-full bg-white/50 border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-3xl p-6 min-h-[150px] text-plum-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70 resize-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-cream/90 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-white/60 border border-white rounded-[3rem] p-10 md:p-16 shadow-[0_20px_60px_rgb(0,0,0,0.05)] relative overflow-hidden">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/50">
          <motion.div 
            className="h-full bg-gradient-to-r from-pink-300 to-indigo-300"
            initial={{ width: 0 }}
            animate={{ width: `${(step / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="min-h-[400px] flex flex-col justify-between">
          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isTransitioning && (
                <motion.div
                  key={currentStepId}
                  initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-full"
                >
                  {renderStep()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-between items-center mt-12">
            <button 
              onClick={() => step > 0 && setStep(s => s - 1)}
              className={`text-plum-900/50 font-medium px-4 py-2 hover:text-plum-900 transition-colors ${step === 0 ? 'invisible' : 'visible'}`}
            >
              Back
            </button>
            
            <button 
              onClick={handleNext}
              disabled={isTransitioning}
              className="flex items-center gap-2 bg-plum-900 text-white px-8 py-4 rounded-[2rem] font-medium hover:bg-plum-900/90 transition-[background-color,box-shadow] shadow-[0_8px_20px_rgb(45,27,54,0.15)] disabled:opacity-50"
            >
              {step === steps.length - 1 ? "Complete Check-in" : "Continue"}
              {step === steps.length - 1 ? <CheckCircle weight="fill" /> : <CaretRight weight="bold" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
