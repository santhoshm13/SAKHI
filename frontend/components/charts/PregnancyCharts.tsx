"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, ReferenceLine
} from "recharts";

const chartConfig = {
  stroke: "#c084fc",
  fill: "#fbcfe8",
  grid: "rgba(244, 114, 182, 0.15)",
  text: "#2D1B36"
};

const ChartAnimationDefs = () => (
  <defs>
    <linearGradient id="weightGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#0ea5e9" />
      <stop offset="100%" stopColor="#38bdf8" />
    </linearGradient>
    <linearGradient id="bpSystolicGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#f87171" />
    </linearGradient>
    <linearGradient id="bpDiastolicGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#60a5fa" />
    </linearGradient>
    <linearGradient id="sugarGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.85}/>
      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
    </linearGradient>
    <linearGradient id="sleepPregGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.85}/>
      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
    </linearGradient>
    <linearGradient id="kicksMorningGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fde047" />
      <stop offset="100%" stopColor="#fef08a" />
    </linearGradient>
    <linearGradient id="kicksAfternoonGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fb923c" />
      <stop offset="100%" stopColor="#fdba74" />
    </linearGradient>
    <linearGradient id="kicksNightGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#6366f1" />
      <stop offset="100%" stopColor="#818cf8" />
    </linearGradient>
  </defs>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(244,114,182,0.25)] border border-pink-200/90 text-sm text-[#2D1B36] transition-[opacity,transform] transform scale-105">
        <p className="font-semibold mb-1 text-xs text-plum-900/75">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center gap-2 font-medium" style={{ color: p.color || p.fill || chartConfig.text }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color || p.fill || "#ec4899" }} />
            <span>{p.name}: <strong className="font-bold">{p.value}</strong></span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// A. Pregnancy Week Progress
export const PregnancyWeekProgress = ({ weeks }: { weeks: number }) => {
  const progressPercent = Math.min((weeks / 40) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm font-semibold text-[#2D1B36] mb-2">
        <span className="flex items-center gap-1.5 font-bold text-pink-700">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
          Week {weeks} of 40
        </span>
        <span className="text-xs text-ink-soft">{Math.round(progressPercent)}% Completed</span>
      </div>
      <div className="h-4 w-full bg-pink-50/80 rounded-full overflow-hidden border border-pink-200/70 shadow-[inset_0_2px_4px_rgba(244,114,182,0.15)] relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-purple-500 relative"
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
        </motion.div>
      </div>
    </div>
  );
};

// B. Baby Growth Timeline
export const BabyGrowthTimeline = ({ weeks }: { weeks: number }) => {
  const fruits = [
    { w: 8, fruit: "🫐 Blueberry" },
    { w: 12, fruit: "🍋 Plum" },
    { w: 16, fruit: "🥑 Avocado" },
    { w: 20, fruit: "🥭 Mango" },
    { w: 24, fruit: "🌽 Ear of Corn" },
    { w: 28, fruit: "🍆 Eggplant" },
    { w: 32, fruit: "🍈 Squash" },
    { w: 36, fruit: "🍉 Watermelon" },
    { w: 40, fruit: "🎃 Pumpkin" }
  ];

  return (
    <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 pt-2">
      {fruits.map((f, i) => {
        const isCurrent = weeks >= f.w && weeks < (fruits[i+1]?.w || 41);
        const isPast = weeks >= f.w;

        return (
          <motion.div 
            key={i} 
            whileHover={{ scale: 1.08, y: -3 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl sm:rounded-[2rem] border-2 transition-[background-color,border-color,box-shadow,transform] ${
              isCurrent 
                ? "border-pink-400 bg-pink-50/90 scale-105 shadow-[0_8px_25px_rgba(244,114,182,0.3)] ring-4 ring-pink-300/40 animate-pulse" 
                : isPast 
                  ? "border-pink-200/60 bg-white/70 shadow-sm" 
                  : "border-black/5 bg-black/5 opacity-40 grayscale"
            }`}
          >
            <span className={`text-[11px] sm:text-xs font-bold ${isCurrent ? "text-pink-700" : "text-[#2D1B36]/60"}`}>Week {f.w}</span>
            <span className="text-2xl sm:text-3xl mt-0.5 sm:mt-1 select-none">{f.fruit.split(" ")[0]}</span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#2D1B36]/50 mt-0.5 sm:mt-1 truncate max-w-[70px] sm:max-w-[80px]">{f.fruit.split(" ")[1]}</span>
          </motion.div>
        );
      })}
    </div>
  );
};

// C. Weight Gain
export const WeightGainChart = ({ data }: { data: any[] }) => {
  const validLogs = (data || []).filter(l => typeof l.weight === 'number' && !isNaN(l.weight));
  if (validLogs.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center text-center text-[#2D1B36]/50 p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80 shadow-[inset_0_2px_8px_rgba(244,114,182,0.05)]">
        <span className="text-3xl mb-1.5 opacity-80 animate-bounce">⚖️</span>
        <p className="text-sm font-medium">No weight logs recorded yet.</p>
        <p className="text-xs text-[#2D1B36]/40 mt-1">Complete your daily check-in or log weight with Sakhi.</p>
      </div>
    );
  }

  const chartData = validLogs.slice(-30).map(log => ({
    date: new Date(log.log_date).getDate().toString(),
    weight: log.weight
  }));

  const weights = chartData.map(d => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[minW, maxW]} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="weight" 
            name="Weight (kg)" 
            stroke="url(#weightGrad)" 
            strokeWidth={3.5} 
            dot={{ r: 4, fill: "#0ea5e9", stroke: "#ffffff", strokeWidth: 2 }} 
            activeDot={{ r: 8, fill: "#0284c7", stroke: "#ffffff", strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={2000}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// D. Blood Pressure
export const BloodPressureChart = ({ data }: { data: any[] }) => {
  const validLogs = (data || []).filter(l => typeof l.blood_pressure_systolic === 'number' && typeof l.blood_pressure_diastolic === 'number');
  if (validLogs.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center text-center text-[#2D1B36]/50 p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80 shadow-[inset_0_2px_8px_rgba(244,114,182,0.05)]">
        <span className="text-3xl mb-1.5 opacity-80 animate-bounce">🩺</span>
        <p className="text-sm font-medium">No blood pressure logs recorded yet.</p>
        <p className="text-xs text-[#2D1B36]/40 mt-1">Log your first BP measurement in daily check-in.</p>
      </div>
    );
  }

  const chartData = validLogs.slice(-14).map(log => ({
    date: new Date(log.log_date).getDate().toString(),
    systolic: log.blood_pressure_systolic,
    diastolic: log.blood_pressure_diastolic
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[50, 160]} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'High Threshold (140)', fill: '#ef4444', fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="systolic" 
            name="Systolic" 
            stroke="url(#bpSystolicGrad)" 
            strokeWidth={3.5} 
            dot={{ r: 5, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }}
            activeDot={{ r: 8, fill: "#dc2626", stroke: "#ffffff", strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={2100}
            animationEasing="ease-out"
          />
          <Line 
            type="monotone" 
            dataKey="diastolic" 
            name="Diastolic" 
            stroke="url(#bpDiastolicGrad)" 
            strokeWidth={3.5} 
            dot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
            activeDot={{ r: 8, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={2100}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// E. Blood Sugar
export const BloodSugarChart = ({ data }: { data: any[] }) => {
  const validLogs = (data || []).filter(l => typeof l.blood_sugar === 'number');
  if (validLogs.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center text-center text-[#2D1B36]/50 p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80 shadow-[inset_0_2px_8px_rgba(244,114,182,0.05)]">
        <span className="text-3xl mb-1.5 opacity-80 animate-bounce">🩸</span>
        <p className="text-sm font-medium">No fasting blood sugar logs yet.</p>
        <p className="text-xs text-[#2D1B36]/40 mt-1">Log your blood sugar reading to monitor trends.</p>
      </div>
    );
  }

  const chartData = validLogs.slice(-14).map(log => ({
    date: new Date(log.log_date).getDate().toString(),
    sugar: log.blood_sugar
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[60, 150]} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <ReferenceLine y={95} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'Fasting Target (95)', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="sugar" 
            name="Blood Sugar" 
            stroke="#f59e0b" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#sugarGrad)" 
            isAnimationActive={true}
            animationDuration={2200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// F. Baby Movement Count
export const BabyMovementChart = ({ data }: { data: any[] }) => {
  const validLogs = (data || []).filter(l => {
    if (!l.baby_movement) return false;
    if (typeof l.baby_movement === 'number') return l.baby_movement > 0;
    if (typeof l.baby_movement === 'string' && !isNaN(Number(l.baby_movement))) return Number(l.baby_movement) > 0;
    if (typeof l.baby_movement === 'object') {
      return Boolean(l.baby_movement.morning || l.baby_movement.afternoon || l.baby_movement.night || l.baby_movement.count);
    }
    return false;
  });

  if (validLogs.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center text-center text-[#2D1B36]/50 p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80 shadow-[inset_0_2px_8px_rgba(244,114,182,0.05)]">
        <span className="text-3xl mb-1.5 opacity-80 animate-bounce">👣</span>
        <p className="text-sm font-medium">No fetal kick counts recorded yet.</p>
        <p className="text-xs text-[#2D1B36]/40 mt-1">Record baby movement in morning check-in or chat with Sakhi.</p>
      </div>
    );
  }

  const chartData = validLogs.slice(-7).map(log => {
    let morning = 0;
    let afternoon = 0;
    let night = 0;

    if (typeof log.baby_movement === 'number' || (typeof log.baby_movement === 'string' && !isNaN(Number(log.baby_movement)))) {
      const total = Number(log.baby_movement);
      afternoon = total;
    } else if (typeof log.baby_movement === 'object' && log.baby_movement !== null) {
      morning = Number(log.baby_movement.morning) || 0;
      afternoon = Number(log.baby_movement.afternoon) || Number(log.baby_movement.count) || 0;
      night = Number(log.baby_movement.night) || 0;
    }

    return {
      date: new Date(log.log_date).getDate().toString(),
      morning,
      afternoon,
      night,
      kicks: morning + afternoon + night
    };
  });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244,114,182,0.12)' }} />
          <Bar 
            dataKey="morning" 
            name="Morning" 
            stackId="a" 
            fill="url(#kicksMorningGrad)" 
            isAnimationActive={true}
            animationDuration={1600}
            animationEasing="ease-out"
          />
          <Bar 
            dataKey="afternoon" 
            name="Afternoon / Kicks" 
            stackId="a" 
            fill="url(#kicksAfternoonGrad)" 
            isAnimationActive={true}
            animationDuration={1800}
            animationEasing="ease-out"
          />
          <Bar 
            dataKey="night" 
            name="Night" 
            stackId="a" 
            fill="url(#kicksNightGrad)" 
            radius={[8, 8, 0, 0]} 
            isAnimationActive={true}
            animationDuration={2000}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// G. Appointment Timeline
export const AppointmentTimeline = ({ 
  appointments,
  onToggleAppointment
}: { 
  appointments: any[];
  onToggleAppointment?: (index: number) => void;
}) => {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center text-[#2D1B36]/50">
        <p className="text-sm font-medium">No upcoming appointments scheduled.</p>
        <p className="text-xs text-[#2D1B36]/40 mt-1">Tell Sakhi about your next ANC visit to set a reminder.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mt-2">
      {appointments.map((apt, i) => (
        <motion.div 
          key={i} 
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          onClick={() => onToggleAppointment?.(i)}
          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-[background-color,border-color,box-shadow] cursor-pointer select-none ${
            apt.completed 
              ? "bg-emerald-50/50 border-emerald-200/60 shadow-sm" 
              : "bg-white/80 border-pink-100/90 shadow-[0_2px_12px_rgba(244,114,182,0.06)] hover:border-pink-300"
          }`}
          title={apt.completed ? "Click to mark as pending" : "Click to mark as completed"}
        >
          <div className="flex items-center gap-3">
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-[background-color,border-color] ${
                apt.completed 
                  ? "bg-emerald-500 text-white shadow-sm" 
                  : "bg-white border-2 border-pink-300 hover:border-pink-500"
              }`}
            >
              {apt.completed && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <div>
              <div className={`text-base font-medium transition-colors ${
                apt.completed 
                  ? "text-[#2D1B36]/40 line-through" 
                  : "text-[#2D1B36]"
              }`}>
                {apt.name}
              </div>
              {apt.date && apt.date !== "Upcoming" && (
                <div className="text-xs text-[#2D1B36]/50 mt-0.5">
                  {apt.date}
                </div>
              )}
            </div>
          </div>

          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
            apt.completed 
              ? "bg-emerald-100 text-emerald-700" 
              : "bg-pink-100 text-pink-700 border border-pink-200/60"
          }`}>
            {apt.completed ? "Done" : "Pending"}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

// H. Mood Tracker
export const MoodTrackerChart = ({ data }: { data: any[] }) => {
  const validLogs = (data || []).filter(l => l.mood);
  if (validLogs.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center text-center text-[#2D1B36]/50 p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80 shadow-[inset_0_2px_8px_rgba(244,114,182,0.05)]">
        <span className="text-3xl mb-1.5 opacity-80 animate-bounce">🌸</span>
        <p className="text-sm font-medium">No mood logs recorded yet.</p>
        <p className="text-xs text-[#2D1B36]/40 mt-1">Check in daily to track emotional wellness.</p>
      </div>
    );
  }

  const moodScore: any = { "Happy": 4, "Calm": 3, "Fatigued": 2, "Anxious": 1, "Irritable": 0, "Nauseous": 1 };
  const moodColors: any = { 4: "#34d399", 3: "#60a5fa", 2: "#94a3b8", 1: "#fbbf24", 0: "#ef4444" };
  
  const chartData = validLogs.slice(-14).map(log => ({
    date: new Date(log.log_date).getDate().toString(),
    moodVal: moodScore[log.mood] !== undefined ? moodScore[log.mood] : 3,
    moodName: log.mood
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 4]} ticks={[0,1,2,3,4]} stroke={chartConfig.text} opacity={0.6} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => Object.keys(moodScore).find(k => moodScore[k] === val) || ""} />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="stepAfter" 
            dataKey="moodVal" 
            name="Mood" 
            stroke="#818cf8" 
            strokeWidth={3} 
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              return <circle cx={cx} cy={cy} r={6} fill={moodColors[payload.moodVal] || "#818cf8"} stroke="#ffffff" strokeWidth={2} />;
            }}
            activeDot={{ r: 9, stroke: "#ffffff", strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={1900}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// I. Nutrition Score
export const NutritionScoreChart = ({ nutrition }: { nutrition: any }) => {
  if (!nutrition || Object.values(nutrition).every(v => !v || v === 0)) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center text-center text-[#2D1B36]/50 p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80 shadow-[inset_0_2px_8px_rgba(244,114,182,0.05)]">
        <span className="text-3xl mb-1.5 opacity-80 animate-bounce">🥗</span>
        <p className="text-sm font-medium">No nutrition logged for today.</p>
        <p className="text-xs text-[#2D1B36]/40 mt-1">Track balanced meals, water, and iron intake.</p>
      </div>
    );
  }

  const data = [
    { name: 'Protein', value: nutrition.protein || 0, fill: '#ec4899' },
    { name: 'Iron', value: nutrition.iron || 0, fill: '#ef4444' },
    { name: 'Calcium', value: nutrition.calcium || 0, fill: '#eab308' },
    { name: 'Water', value: nutrition.water || 0, fill: '#3b82f6' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie 
            data={data} 
            innerRadius={60} 
            outerRadius={85} 
            paddingAngle={5} 
            dataKey="value"
            isAnimationActive={true}
            animationDuration={1800}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// J. Sleep Graph
export const PregnancySleepGraph = ({ data }: { data: any[] }) => {
  const validLogs = (data || []).filter(l => l.sleep_hours !== null && l.sleep_hours !== undefined && !isNaN(Number(l.sleep_hours)));
  if (validLogs.length === 0) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center text-center text-[#2D1B36]/50 p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80 shadow-[inset_0_2px_8px_rgba(244,114,182,0.05)]">
        <span className="text-3xl mb-1.5 opacity-80 animate-bounce">🌙</span>
        <p className="text-sm font-medium">No sleep logs recorded yet.</p>
        <p className="text-xs text-[#2D1B36]/40 mt-1">Log your sleep hours in daily check-in or chat with Sakhi.</p>
      </div>
    );
  }

  const chartData = validLogs.slice(-14).map(log => ({
    date: new Date(log.log_date).getDate().toString(),
    sleep: Number(log.sleep_hours) || 0
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 12]} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <ReferenceLine y={8} stroke="#10b981" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="sleep" 
            name="Sleep (Hours)" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#sleepPregGrad)" 
            isAnimationActive={true}
            animationDuration={2100}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
