"use client";

import React from "react";
import { motion } from "framer-motion";
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface PainFlowCorrelationProps {
  logs: any[];
}

export default function PainFlowCorrelation({ logs }: PainFlowCorrelationProps) {
  const flowMap: Record<string, number> = {
    "None": 0,
    "Spotting": 1,
    "Light": 2,
    "Moderate": 3,
    "Heavy": 4,
    "Very Heavy": 5
  };

  const data = logs.slice(-7).map(log => ({
    date: new Date(log.log_date).toLocaleDateString('en-US', { weekday: 'short' }),
    cramps: log.cramps_severity || 0,
    flow: flowMap[log.flow_intensity] || 0,
  }));

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-plum-900/50 text-xs p-4 bg-white/30 rounded-2xl border border-dashed border-pink-200/80">
        <span className="text-3xl mb-1.5 opacity-80 animate-bounce">🩸</span>
        <p className="font-semibold text-xs">Not enough log data to chart.</p>
        <p className="text-[11px] text-plum-900/40 mt-1">Complete your check-in to correlate flow with cramps.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-64 mt-4"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="flowBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fbcfe8" />
            </linearGradient>
            <linearGradient id="painLineGrad2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f472b6" strokeOpacity={0.15} vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#2D1B36', opacity: 0.6 }} />
          <YAxis yAxisId="left" hide />
          <YAxis yAxisId="right" orientation="right" hide />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '20px', 
              border: '1px solid rgba(244,114,182,0.6)', 
              boxShadow: '0 10px 35px rgba(244,114,182,0.25)', 
              backgroundColor: 'rgba(255,255,255,0.95)', 
              backdropFilter: 'blur(12px)',
              padding: '12px 16px'
            }}
            labelStyle={{ color: '#2D1B36', fontWeight: 'bold' }}
          />
          <Bar 
            yAxisId="left" 
            dataKey="flow" 
            name="Flow Intensity" 
            fill="url(#flowBarGrad)" 
            radius={[8, 8, 0, 0]} 
            barSize={24}
            isAnimationActive={true}
            animationDuration={1700}
            animationEasing="ease-out"
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="cramps" 
            name="Cramps (0-10)" 
            stroke="url(#painLineGrad2)" 
            strokeWidth={3.5} 
            dot={{ r: 5, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }} 
            activeDot={{ r: 8, fill: '#b91c1c', stroke: '#ffffff', strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={2100}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
