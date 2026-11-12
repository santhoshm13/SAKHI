"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, CheckCircle } from "@phosphor-icons/react";

interface OnboardingChatProps {
  onComplete: (data: any) => void;
}

export default function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const [step, setStep] = useState(0);
  
  const [name, setName] = useState("");
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [periodDuration, setPeriodDuration] = useState<number>(5);
  
  const handleSubmit = () => {
    setStep(3);
    setTimeout(() => {
      onComplete({ name, cycleLength, periodDuration });
    }, 1500);
  };

  const steps = [
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
            className="w-full bg-white/60 border border-white/40 rounded-xl px-4 py-2 text-sm text-plum-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 mb-3"
          />
          <button
            onClick={() => { if(name.trim()) setStep(1); }}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-full bg-plum-900 text-white text-xs font-medium self-end disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: "cycle",
      botText: `Nice to meet you, ${name}! What is your typical cycle length in days? (Usually between 21 and 35 days)`,
      renderInput: () => (
        <div className="mt-4 flex flex-col items-end w-full">
          <div className="flex items-center gap-3 w-full mb-3 bg-white/50 p-2 rounded-xl border border-white/40">
             <input
              type="range"
              min="20"
              max="45"
              value={cycleLength}
              onChange={(e) => setCycleLength(parseInt(e.target.value))}
              className="w-full accent-pink-500"
            />
            <span className="font-semibold text-plum-900 shrink-0 w-8">{cycleLength}</span>
          </div>
          <button
            onClick={() => setStep(2)}
            className="px-4 py-2 rounded-full bg-plum-900 text-white text-xs font-medium self-end"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: "duration",
      botText: "And how many days does your period typically last?",
      renderInput: () => (
        <div className="mt-4 flex flex-col items-end w-full">
          <div className="flex items-center gap-3 w-full mb-3 bg-white/50 p-2 rounded-xl border border-white/40">
             <input
              type="range"
              min="2"
              max="10"
              value={periodDuration}
              onChange={(e) => setPeriodDuration(parseInt(e.target.value))}
              className="w-full accent-pink-500"
            />
            <span className="font-semibold text-plum-900 shrink-0 w-8">{periodDuration}</span>
          </div>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-full bg-plum-900 text-white text-xs font-medium self-end flex items-center gap-2"
          >
            <CheckCircle weight="bold" /> Complete
          </button>
        </div>
      )
    },
    {
      id: "closing",
      botText: `Thank you, ${name}. I am setting up your personalized dashboard now... 🌸`,
      renderInput: () => null
    }
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <AnimatePresence mode="popLayout">
        {steps.slice(0, step + 1).map((s, index) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex flex-col w-full"
          >
            {/* Bot Message */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3 text-sm text-plum-900 shadow-sm self-start max-w-[90%] border border-white/40 mb-2 flex gap-2">
              <Sparkle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" weight="fill" />
              <span>{s.botText}</span>
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
            
            {/* User Answer Summary */}
            {index < step && s.id === "name" && (
              <div className="bg-pink-100 rounded-2xl rounded-tr-sm p-2 px-4 text-sm text-pink-900 self-end max-w-[80%] shadow-sm mb-2">
                {name}
              </div>
            )}
            {index < step && s.id === "cycle" && (
              <div className="bg-pink-100 rounded-2xl rounded-tr-sm p-2 px-4 text-sm text-pink-900 self-end max-w-[80%] shadow-sm mb-2">
                {cycleLength} days
              </div>
            )}
            {index < step && s.id === "duration" && (
              <div className="bg-pink-100 rounded-2xl rounded-tr-sm p-2 px-4 text-sm text-pink-900 self-end max-w-[80%] shadow-sm mb-2">
                {periodDuration} days
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
