"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Clock, BellRinging, Trash, WarningCircle, Drop, Heartbeat, Brain, BellZ, Flower, Calendar } from '@phosphor-icons/react';
import { HerReminder, HerNotificationPreferences } from '@/hooks/useHerNotifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: HerNotificationPreferences;
  reminders: HerReminder[];
  onToggleMaster: () => void;
  onUpdatePref: (key: keyof HerNotificationPreferences, value: boolean) => void;
  onMarkCompleted: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
  onDelete: (id: string) => void;
}

export default function HerNotificationCenter({
  isOpen, onClose, preferences, reminders,
  onToggleMaster, onUpdatePref, onMarkCompleted, onSnooze, onDelete
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'missed' | 'completed' | 'settings'>('upcoming');

  const filteredReminders = reminders.filter(r => {
    if (activeTab === 'upcoming') return r.status === 'upcoming' || r.status === 'snoozed';
    return r.status === activeTab;
  });

  const getIcon = (category: string) => {
    switch(category) {
      case 'hydration': return <Drop weight="fill" className="text-blue-500 w-6 h-6" />;
      case 'pain_mgmt': return <Heartbeat weight="fill" className="text-red-500 w-6 h-6" />;
      case 'ovulation':
      case 'fertile_start':
      case 'fertile_end':
        return <Flower weight="fill" className="text-amber-500 w-6 h-6" />;
      case 'period_prep_3d':
      case 'period_prep_1d':
      case 'period_start':
        return <Calendar weight="fill" className="text-pink-500 w-6 h-6" />;
      case 'ai_insight': 
      case 'irregular_cycle':
        return <Brain weight="fill" className="text-purple-500 w-6 h-6" />;
      case 'missed_period': return <WarningCircle weight="fill" className="text-red-600 w-6 h-6" />;
      default: return <BellRinging weight="fill" className="text-plum-900/60 w-6 h-6" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l-2 border-pink-200/80 shadow-[0_20px_60px_rgba(244,114,182,0.22)] z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-purple-50/50">
              <h2 className="text-2xl font-semibold text-plum-900">Cycle Notifications</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 text-plum-900/60">
                <X weight="bold" className="w-6 h-6" />
              </button>
            </div>

            {/* Master Toggle */}
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-medium text-plum-900">Enable Notifications</h3>
                <p className="text-sm text-plum-900/60">Receive cycle & fertile reminders.</p>
              </div>
              <button 
                onClick={onToggleMaster}
                className={`w-14 h-8 rounded-full p-1 transition-colors ${preferences.enabled ? 'bg-purple-500' : 'bg-gray-200'}`}
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${preferences.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {preferences.enabled && (
              <>
                {/* Tabs */}
                <div className="flex border-b border-black/5 bg-white">
                  {['upcoming', 'missed', 'completed', 'settings'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`flex-1 py-4 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-purple-500 text-purple-600' : 'border-transparent text-plum-900/60 hover:text-plum-900'}`}
                    >
                      {tab}
                      {(tab === 'missed' && reminders.filter(r => r.status === 'missed').length > 0) && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs">{reminders.filter(r => r.status === 'missed').length}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 custom-scrollbar">
                  {activeTab === 'settings' ? (
                    <div className="space-y-4">
                      {['period_alerts', 'fertile_alerts', 'daily_checkins', 'health_tips'].map(key => (
                        <div key={key} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-black/5">
                          <span className="font-medium capitalize text-plum-900">{key.replace('_', ' ')}</span>
                          <button 
                            onClick={() => onUpdatePref(key as keyof HerNotificationPreferences, !preferences[key as keyof HerNotificationPreferences])}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${preferences[key as keyof HerNotificationPreferences] ? 'bg-purple-400' : 'bg-gray-200'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${preferences[key as keyof HerNotificationPreferences] ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : filteredReminders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-plum-900/40">
                      <BellZ className="w-16 h-16 mb-4 opacity-20" />
                      <p>No {activeTab} notifications.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredReminders.map(reminder => (
                        <div key={reminder.id} className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
                          <div className="flex gap-4">
                            <div className="mt-1">{getIcon(reminder.category)}</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-plum-900">{reminder.title}</h4>
                              <p className="text-sm text-plum-900/70 mt-1">{reminder.message}</p>
                              
                              <div className="mt-3 flex items-center gap-3 text-xs text-plum-900/50">
                                {reminder.status === 'snoozed' ? (
                                  <span className="text-amber-500 font-medium">Snoozed until {new Date(reminder.snoozedUntil || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                ) : (
                                  <span>Due: {new Date(reminder.scheduledTime).toLocaleString([], {hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric'})}</span>
                                )}
                              </div>

                              {(activeTab === 'upcoming' || activeTab === 'missed') && (
                                <div className="mt-4 flex gap-2">
                                  <button onClick={() => onMarkCompleted(reminder.id)} className="flex-1 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 flex items-center justify-center gap-1">
                                    <CheckCircle weight="bold" /> Done
                                  </button>
                                  <button onClick={() => onSnooze(reminder.id, 1)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-1">
                                    <Clock weight="bold" /> Snooze 1h
                                  </button>
                                  <button onClick={() => onDelete(reminder.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                                    <Trash weight="bold" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {!preferences.enabled && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-plum-900/50">
                <BellRinging className="w-16 h-16 mb-4 opacity-20" />
                <p>Notifications are disabled. Turn them on to receive personalized menstrual tracking reminders.</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
