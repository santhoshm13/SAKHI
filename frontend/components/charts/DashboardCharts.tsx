"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, ReferenceLine
} from "recharts";

const chartConfig = {
  stroke: "#c084fc", // purple-400
  fill: "#fbcfe8",   // pink-200
  grid: "rgba(244, 114, 182, 0.15)",
  text: "#2D1B36"
};

const ChartAnimationDefs = () => (
  <defs>
    <linearGradient id="pinkLineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#ec4899" />
      <stop offset="50%" stopColor="#f43f5e" />
      <stop offset="100%" stopColor="#fb7185" />
    </linearGradient>
    <linearGradient id="stepLineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#f43f5e" />
      <stop offset="100%" stopColor="#fb7185" />
    </linearGradient>
    <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#c084fc" stopOpacity={0.85} />
      <stop offset="100%" stopColor="#c084fc" stopOpacity={0.05} />
    </linearGradient>
    <linearGradient id="pinkAreaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#f472b6" stopOpacity={0.85} />
      <stop offset="100%" stopColor="#f472b6" stopOpacity={0.05} />
    </linearGradient>
    <linearGradient id="cyanLineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#06b6d4" />
      <stop offset="100%" stopColor="#3b82f6" />
    </linearGradient>
    <linearGradient id="barPinkGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#f43f5e" />
      <stop offset="100%" stopColor="#fda4af" />
    </linearGradient>
    <linearGradient id="barPurpleGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8b5cf6" />
      <stop offset="100%" stopColor="#c4b5fd" />
    </linearGradient>
    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.08} />
    </linearGradient>
    <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.08} />
    </linearGradient>
    <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(244,114,182,0.25)] border border-pink-200/90 text-sm text-[#2D1B36] transition-[opacity,transform] transform scale-105">
        <p className="font-semibold mb-1 text-xs text-plum-900/75">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center gap-2 font-medium" style={{ color: p.color || chartConfig.text }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color || "#ec4899" }} />
            <span>{p.name}: <strong className="font-bold">{p.value}</strong></span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const EmptyChartState = ({ message }: { message?: string }) => (
  <div className="h-[230px] flex flex-col items-center justify-center text-center p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80 shadow-[inset_0_2px_8px_rgba(244,114,182,0.05)]">
    <span className="text-3xl mb-1.5 opacity-80 animate-bounce">📊</span>
    <p className="text-xs font-semibold text-[#2D1B36]/80">
      {message || "No logs recorded yet."}
    </p>
    <p className="text-[11px] text-[#2D1B36]/50 mt-1">
      Complete your daily check-in to generate animated live analytics!
    </p>
  </div>
);

// 1. Cycle Length Trend
export const CycleLengthChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <EmptyChartState message="No cycle length history yet." />;
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="month" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis width={35} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="cycleLength" 
            name="Cycle Length (Days)" 
            stroke="url(#pinkLineGrad)" 
            strokeWidth={3.5} 
            dot={{ r: 5, fill: "#ec4899", stroke: "#ffffff", strokeWidth: 2 }} 
            activeDot={{ r: 8, fill: "#db2777", stroke: "#ffffff", strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={1900}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// 2. Period Duration Trend
export const PeriodDurationChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <EmptyChartState message="No bleeding duration history yet." />;
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="month" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis width={35} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="stepAfter" 
            dataKey="periodDuration" 
            name="Bleeding Days" 
            stroke="url(#stepLineGrad)" 
            strokeWidth={3.5} 
            dot={{ r: 5, fill: "#f43f5e", stroke: "#ffffff", strokeWidth: 2 }}
            activeDot={{ r: 8, fill: "#e11d48", stroke: "#ffffff", strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={1900}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// 3. Symptom Frequency
export const SymptomFrequencyChart = ({ data }: { data: any[] }) => {
  const symMap: any = {};
  if (data && data.length > 0) {
    data.forEach(log => {
      if (log.symptoms) {
        log.symptoms.forEach((s: string) => {
          if (s && s !== 'None') symMap[s] = (symMap[s] || 0) + 1;
        });
      }
    });
  }
  const chartData = Object.keys(symMap).map(k => ({ name: k, count: symMap[k] })).sort((a,b) => b.count - a.count).slice(0, 5);

  if (chartData.length === 0) return <EmptyChartState message="No physical symptoms reported yet." />;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="name" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis width={35} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244,114,182,0.12)' }} />
          <Bar 
            dataKey="count" 
            name="Days Experienced" 
            fill="url(#barPurpleGrad)" 
            radius={[8, 8, 0, 0]}
            isAnimationActive={true}
            animationDuration={1700}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

const formatChartDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// 4. Mood vs Cycle Phase
export const MoodCycleChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <EmptyChartState message="No emotional logs recorded yet." />;
  const moodScore: any = { "Happy": 5, "Calm": 4, "Energetic": 4, "Fatigued": 3, "Anxious": 2, "Irritable": 1, "Sad": 0 };
  const moodColors: any = { 5: "#34d399", 4: "#60a5fa", 3: "#fbbf24", 2: "#f97316", 1: "#ef4444", 0: "#64748b" };
  
  const sorted = [...data].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  const chartData = sorted.slice(-14).map(log => ({
    date: formatChartDate(log.log_date),
    moodVal: moodScore[log.mood] !== undefined ? moodScore[log.mood] : 4,
    moodName: log.mood || "Calm"
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 15, left: 20, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis width={65} domain={[0, 5]} ticks={[0,1,2,3,4,5]} stroke={chartConfig.text} opacity={0.6} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => Object.keys(moodScore).find(k => moodScore[k] === val) || ""} />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
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

// 5. Flow Intensity
export const FlowIntensityChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <EmptyChartState message="No flow entries logged yet." />;
  const flowScore: any = { "None": 0, "Spotting": 1, "Light": 2, "Moderate": 3, "Heavy": 4, "Very Heavy": 5 };
  
  const sorted = [...data].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  const chartData = sorted.slice(-14).map(log => ({
    date: formatChartDate(log.log_date),
    intensity: flowScore[log.flow_intensity] || 0,
    flowName: log.flow_intensity
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 10, right: 15, left: 20, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis width={65} domain={[0, 5]} ticks={[0,1,2,3,4,5]} stroke={chartConfig.text} opacity={0.6} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => Object.keys(flowScore).find(k => flowScore[k] === val) || ""} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244,114,182,0.12)' }} />
          <Bar 
            dataKey="intensity" 
            name="Flow" 
            fill="#fda4af" 
            radius={[8, 8, 0, 0]}
            isAnimationActive={true}
            animationDuration={1700}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.intensity > 3 ? "#e11d48" : entry.intensity > 1 ? "#fb7185" : "#fbcfe8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// 6. Pain Trend
export const PainTrendChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <EmptyChartState message="No pain logs recorded yet." />;
  
  const sorted = [...data].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  const chartData = sorted.slice(-14).map(log => ({
    date: formatChartDate(log.log_date),
    pain: log.cramps_severity || 0
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis width={35} domain={[0, 10]} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="pain" 
            name="Pain Score" 
            stroke="#f43f5e" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#painGrad)" 
            isAnimationActive={true}
            animationDuration={2100}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// 7. Weight Trend
export const WeightTrendChart = ({ data }: { data: any[] }) => {
  const sorted = [...(data || [])].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  const chartData = sorted.slice(-30).filter(log => log && log.weight).map(log => ({
    date: formatChartDate(log.log_date),
    weight: log.weight
  }));

  if (chartData.length === 0) return <EmptyChartState message="No weight logs recorded yet." />;

  const minW = Math.max(0, Math.min(...chartData.map(d => d.weight)) - 1);
  const maxW = Math.max(...chartData.map(d => d.weight)) + 1;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis width={40} domain={[minW, maxW]} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="weight" 
            name="Weight (kg)" 
            stroke="url(#cyanLineGrad)" 
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

// 8. Sleep Hours
export const SleepHoursChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <EmptyChartState message="No sleep hours logged yet." />;
  
  const sorted = [...data].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  const chartData = sorted.slice(-14).map(log => ({
    date: formatChartDate(log.log_date),
    sleep: log.sleep_hours || 0
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <ChartAnimationDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
          <XAxis dataKey="date" stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis width={35} domain={[0, 12]} stroke={chartConfig.text} opacity={0.6} fontSize={12} tickLine={false} axisLine={false} />
          <ReferenceLine y={8} stroke="#10b981" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="sleep" 
            name="Sleep (Hours)" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#sleepGrad)" 
            isAnimationActive={true}
            animationDuration={2100}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// 9. Ovulation & Fertile Window Calendar
export const OvulationCalendar = ({ profile }: { profile: any }) => {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Safe date resolution with robust fallback
  let lastP: Date;
  const rawDate = profile?.last_period_start || profile?.lastPeriodStart || profile?.last_period_date;
  if (rawDate) {
    const parsed = new Date(rawDate);
    lastP = isNaN(parsed.getTime()) ? new Date(todayMidnight.getTime() - 14 * 24 * 60 * 60 * 1000) : parsed;
  } else {
    // Default baseline: 14 days ago so today aligns with ovulation/fertile window
    lastP = new Date(todayMidnight.getTime() - 14 * 24 * 60 * 60 * 1000);
  }
  
  const lastPMidnight = new Date(lastP.getFullYear(), lastP.getMonth(), lastP.getDate());
  
  const diffTime = Math.abs(todayMidnight.getTime() - lastPMidnight.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const cycleLen = Number(profile?.cycle_length_avg || profile?.cycle_length || profile?.cycleLengthAvg) || 28;
  const periodDur = Number(profile?.period_duration || profile?.periodDuration) || 5;
  const currentCycleDay = diffDays % cycleLen;
  const ovulationCycleDay = Math.floor(cycleLen / 2); // Midpoint of cycle (e.g. Day 14 of 28)
  
  const days = [];
  let ovuDateStr = "";
  let fertileStartStr = "";
  let fertileEndStr = "";

  for (let i = -3; i <= 10; i++) {
    const d = new Date(todayMidnight);
    d.setDate(todayMidnight.getDate() + i);
    const cDay = (currentCycleDay + i + cycleLen) % cycleLen;
    const isPeriod = cDay < periodDur;
    const isFertile = cDay >= Math.max(0, ovulationCycleDay - 4) && cDay <= ovulationCycleDay + 1;
    const isOvulation = cDay === ovulationCycleDay;
    const isToday = i === 0;
    
    if (isOvulation && !ovuDateStr) {
      ovuDateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (cDay === Math.max(0, ovulationCycleDay - 4) && !fertileStartStr) {
      fertileStartStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (cDay === ovulationCycleDay + 1 && !fertileEndStr) {
      fertileEndStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    days.push({
      date: d.getDate(),
      dayName: d.toLocaleString('en-US', { weekday: 'short' }),
      cycleDay: cDay + 1,
      isPeriod,
      isFertile,
      isOvulation,
      isToday
    });
  }

  // Phase badge calculation
  const phaseLabel = currentCycleDay === ovulationCycleDay 
    ? "Ovulation Peak Day" 
    : (currentCycleDay >= ovulationCycleDay - 4 && currentCycleDay <= ovulationCycleDay + 1)
      ? "Fertile Window Open" 
      : (currentCycleDay < periodDur) 
        ? "Menstrual Phase" 
        : (currentCycleDay < ovulationCycleDay) 
          ? "Follicular Phase" 
          : "Luteal Phase";

  return (
    <div className="w-full mt-3">
      {/* Quick Summary Pill Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cycle Day {currentCycleDay + 1} of {cycleLen}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/80 shadow-sm">
            {phaseLabel}
          </span>
        </div>
        {ovuDateStr && (
          <div className="text-xs text-[#2D1B36]/70 flex items-center gap-2">
            <span>Estimated Ovulation: <strong className="text-emerald-700 font-bold">{ovuDateStr}</strong></span>
            {fertileStartStr && fertileEndStr && (
              <span className="hidden sm:inline text-[#2D1B36]/50">• Fertile Window: <strong className="text-[#2D1B36] font-semibold">{fertileStartStr} – {fertileEndStr}</strong></span>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Day Strip */}
      <div className="flex gap-2.5 overflow-x-auto custom-scrollbar pb-3 pt-1 px-1 w-full items-center">
        {days.map((d, idx) => {
          const isToday = d.isToday;
          
          return (
            <motion.div 
              key={idx} 
              whileHover={{ scale: 1.08, y: -2 }}
              transition={{ duration: 0.2 }}
              className={`shrink-0 w-[70px] h-[94px] rounded-2xl flex flex-col items-center justify-between py-2 transition-[background-color,border-color,box-shadow,transform] relative ${
                isToday 
                  ? "bg-white ring-2 ring-pink-500 border-2 border-pink-400 shadow-[0_4px_20px_rgba(244,114,182,0.35)] scale-105 z-10 animate-pulse" 
                  : d.isPeriod 
                    ? "bg-red-50/80 border border-red-200/90 shadow-sm" 
                    : d.isFertile 
                      ? "bg-emerald-50/80 border border-emerald-200/90 shadow-sm" 
                      : "bg-white/60 border border-pink-100/80 shadow-sm"
              }`}
            >
              <span className={`text-[11px] font-semibold ${
                isToday ? "text-pink-600 font-bold" : "text-[#2D1B36]/60"
              }`}>
                {d.dayName}
              </span>

              <span className={`text-2xl font-black ${
                isToday 
                  ? "text-pink-600" 
                  : d.isPeriod 
                    ? "text-red-500" 
                    : d.isFertile 
                      ? "text-emerald-600" 
                      : "text-[#2D1B36]"
              }`}>
                {d.date}
              </span>

              <div className="h-5 flex items-center justify-center">
                {isToday ? (
                  <span className="text-[10px] font-bold bg-pink-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                    {d.isOvulation ? "Today · Ovu" : "Today"}
                  </span>
                ) : d.isOvulation ? (
                  <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
                    Ovu
                  </span>
                ) : d.isPeriod ? (
                  <span className="text-[9px] font-semibold text-rose-500">Period</span>
                ) : d.isFertile ? (
                  <span className="text-[9px] font-semibold text-emerald-600">Fertile</span>
                ) : (
                  <span className="text-[9px] text-[#2D1B36]/40">Day {d.cycleDay}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 p-3 rounded-2xl bg-white/70 border border-pink-100/90 shadow-[0_2px_12px_rgba(244,114,182,0.06)] backdrop-blur-sm flex flex-wrap items-center justify-end gap-4 text-xs text-[#2D1B36]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 ring-2 ring-pink-200"></span>
          <span className="text-[#2D1B36]/70 font-medium text-xs">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
          <span className="text-[#2D1B36]/70 font-medium text-xs">Period Flow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-[#2D1B36]/70 font-medium text-xs">Ovulation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300"></span>
          <span className="text-[#2D1B36]/70 font-medium text-xs">Fertile Window</span>
        </div>
      </div>
    </div>
  );
};
