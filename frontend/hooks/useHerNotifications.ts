"use client";

import { useState, useEffect, useRef } from 'react';
import { discreetNotice, isDiscreet } from '@/lib/discreet';

export type ReminderStatus = 'upcoming' | 'completed' | 'snoozed' | 'missed';
export type HerReminderCategory = 
  | 'period_prep_3d' | 'period_prep_1d' | 'period_start' | 'daily_checkin' 
  | 'hydration' | 'iron_food' | 'pain_mgmt' | 'mood_support' 
  | 'ovulation' | 'fertile_start' | 'fertile_end' 
  | 'missed_period' | 'irregular_cycle' | 'symptom_monitor' | 'weekly_summary' | 'ai_insight';

export interface HerReminder {
  id: string;
  title: string;
  message: string;
  category: HerReminderCategory;
  scheduledTime: number; // Unix timestamp
  status: ReminderStatus;
  snoozedUntil?: number;
}

export interface HerNotificationPreferences {
  enabled: boolean;
  period_alerts: boolean;
  fertile_alerts: boolean;
  daily_checkins: boolean;
  health_tips: boolean;
}

const DEFAULT_PREFS: HerNotificationPreferences = {
  enabled: false,
  period_alerts: true,
  fertile_alerts: true,
  daily_checkins: true,
  health_tips: true,
};

export function useHerNotifications(profile: any, logs: any[], cycleHistory: any[]) {
  const [preferences, setPreferences] = useState<HerNotificationPreferences>(DEFAULT_PREFS);
  const [reminders, setReminders] = useState<HerReminder[]>([]);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem('her_notif_prefs');
    if (savedPrefs) setPreferences(JSON.parse(savedPrefs));
    
    const savedReminders = localStorage.getItem('her_reminders');
    if (savedReminders) setReminders(JSON.parse(savedReminders));
  }, []);

  // Save Prefs
  useEffect(() => {
    localStorage.setItem('her_notif_prefs', JSON.stringify(preferences));
  }, [preferences]);

  // Save Reminders
  useEffect(() => {
    localStorage.setItem('her_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Master Generation Logic
  const generateSchedule = () => {
    if (!profile || !profile.last_period_start) return;
    
    const now = Date.now();
    const todayStr = new Date().toDateString();
    const newReminders: HerReminder[] = [];
    
    const cycleLength = profile.cycle_length_avg || 28;
    const periodDuration = profile.period_duration || 5;
    
    const lastPeriodDate = new Date(profile.last_period_start);
    
    // Core Cycle Dates Calculation
    const nextPeriodDate = new Date(lastPeriodDate.getTime() + (cycleLength * 24 * 60 * 60 * 1000));
    const ovulationDate = new Date(nextPeriodDate.getTime() - (14 * 24 * 60 * 60 * 1000));
    const fertileStartDate = new Date(ovulationDate.getTime() - (4 * 24 * 60 * 60 * 1000));
    const fertileEndDate = new Date(ovulationDate.getTime() + (1 * 24 * 60 * 60 * 1000));
    
    const addReminder = (
      id: string, title: string, message: string, 
      category: HerReminderCategory, scheduledTime: number, 
      cond: boolean = true
    ) => {
      if (cond && scheduledTime > now - (24 * 60 * 60 * 1000)) { // Don't schedule way in the past
        // If it's technically in the past but within the last 24 hours, schedule it for +5 seconds from now for demo purposes
        const adjustedTime = scheduledTime <= now ? now + 5000 : scheduledTime;
        newReminders.push({ id: `${id}_${new Date(scheduledTime).toDateString()}`, title, message, category, scheduledTime: adjustedTime, status: 'upcoming' });
      }
    };

    if (preferences.period_alerts) {
      // 1. Period Prep (3 days before)
      addReminder(
        'prep_3d', 'Period Preparation', 
        '🌸 Your period is expected in 3 days. Remember to carry sanitary pads, tampons, or your menstrual cup.', 
        'period_prep_3d', nextPeriodDate.getTime() - (3 * 24 * 60 * 60 * 1000)
      );

      // 2. Period Tomorrow (1 day before)
      addReminder(
        'prep_1d', 'Period Tomorrow', 
        '🌸 Your period is expected tomorrow. Keep your menstrual essentials ready.', 
        'period_prep_1d', nextPeriodDate.getTime() - (1 * 24 * 60 * 60 * 1000)
      );

      // 3. Period Start
      addReminder(
        'start_0d', 'Period Start Reminder', 
        '🩸 Your period is expected to begin today. Don\'t forget to update your flow and symptoms.', 
        'period_start', nextPeriodDate.getTime()
      );
      
      // 12. Missed Period
      addReminder(
        'missed_alert', 'Missed Period?', 
        '⚠️ Your period appears delayed. Please update your cycle or consult a healthcare professional if delays continue.', 
        'missed_period', nextPeriodDate.getTime() + (3 * 24 * 60 * 60 * 1000)
      );
    }

    if (preferences.fertile_alerts) {
      // 9. Ovulation
      addReminder(
        'ovu_day', 'Ovulation Day', 
        '🌼 Today is your predicted ovulation day.', 
        'ovulation', ovulationDate.getTime()
      );

      // 10. Fertile Start
      addReminder(
        'fert_start', 'Fertile Window Start', 
        '🌸 Your fertile window starts today.', 
        'fertile_start', fertileStartDate.getTime()
      );

      // 11. Fertile End
      addReminder(
        'fert_end', 'Fertile Window End', 
        '🌼 Your fertile window ends today.', 
        'fertile_end', fertileEndDate.getTime()
      );
    }

    // Daily Checks & Current Phase
    // Determine if user is currently on period
    const daysSinceLastPeriod = Math.floor((now - lastPeriodDate.getTime()) / (24 * 60 * 60 * 1000));
    const isCurrentlyOnPeriod = daysSinceLastPeriod >= 0 && daysSinceLastPeriod < periodDuration;

    if (preferences.daily_checkins && isCurrentlyOnPeriod) {
      // 4. Daily Period Check-in
      addReminder(
        'daily_check', 'Daily Period Check-in', 
        'How are you feeling today? Please update: Flow, Pain, Symptoms, and Mood.', 
        'daily_checkin', new Date().setHours(19, 0, 0, 0)
      );
    }

    if (preferences.health_tips) {
      if (isCurrentlyOnPeriod) {
        // 5. Hydration
        addReminder(
          'hydrate', 'Hydration Reminder', 
          '💧 Stay hydrated today. Proper hydration may help reduce cramps and fatigue.', 
          'hydration', new Date().setHours(14, 0, 0, 0)
        );
        
        // 6. Iron Rich (Mocking logic based on heavy flow history)
        const hasHeavyFlow = logs.some(l => l.flow_intensity === 'Heavy' || l.flow_intensity === 'Very Heavy');
        addReminder(
          'iron', 'Iron-rich Food Reminder', 
          '🥗 Your recent cycles indicate heavy flow. Include iron-rich foods such as spinach, beans, dates, and leafy vegetables today.', 
          'iron_food', new Date().setHours(13, 0, 0, 0), hasHeavyFlow
        );

        // 7. Pain Mgmt
        const hasSevereCramps = logs.some(l => l.cramps_severity >= 6);
        addReminder(
          'pain', 'Pain Management Reminder', 
          '🌿 Based on your previous cycles, cramps usually begin today. Use a heating pad or light stretching.', 
          'pain_mgmt', new Date().setHours(10, 0, 0, 0), hasSevereCramps
        );
      }
      
      // 8. Mood Support (Luteal phase)
      const isLutealPhase = daysSinceLastPeriod >= 15 && daysSinceLastPeriod < cycleLength;
      if (isLutealPhase) {
        addReminder(
          'mood', 'Mood Support Reminder', 
          '😊 Your mood usually changes around this phase. Take some time to rest, relax, or practice self-care.', 
          'mood_support', new Date().setHours(18, 0, 0, 0)
        );
      }
      
      // 13. Irregular cycle alert
      if (profile.cycle_regularity === 'No' || cycleHistory.some(c => c.cycleLength > 35 || c.cycleLength < 21)) {
         addReminder(
          'irreg', 'Irregular Cycle Alert', 
          '📋 We\'ve noticed recurring irregular cycles. Consider consulting a gynecologist.', 
          'irregular_cycle', now + 15000 // demo
        );
      }
      
      // 14. Symptom Monitoring
      addReminder(
        'symp', 'Symptom Monitoring', 
        '🤕 You usually experience headaches before your period. Please update today\'s symptoms.', 
        'symptom_monitor', nextPeriodDate.getTime() - (2 * 24 * 60 * 60 * 1000)
      );
    }
    
    // 15. Weekly Summary (Next Sunday)
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()));
    d.setHours(9, 0, 0, 0);
    addReminder(
      'weekly', 'Weekly Health Summary', 
      '📊 Weekly Summary available: View your Cycle, Mood, and upcoming predictions.', 
      'weekly_summary', d.getTime()
    );

    // Merge new reminders with existing ones (don't overwrite status of existing ones)
    setReminders(prev => {
      const merged = [...prev];
      newReminders.forEach(nr => {
        if (!merged.find(r => r.id === nr.id)) {
          merged.push(nr);
        }
      });
      // Sort and limit to keep it manageable
      return merged.sort((a, b) => a.scheduledTime - b.scheduledTime).filter(r => r.scheduledTime > now - (30*24*60*60*1000));
    });
  };

  // Re-generate on profile/log/preferences change
  useEffect(() => {
    if (preferences.enabled) {
      generateSchedule();
    } else {
      // Clear upcoming when disabled
      setReminders(prev => prev.filter(r => r.status !== 'upcoming'));
    }
  }, [profile, logs, cycleHistory, preferences]);

  // Background Checker Interval
  useEffect(() => {
    if (!preferences.enabled) {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      return;
    }

    const checkNotifications = () => {
      const now = Date.now();
      setReminders(prev => {
        let hasChanges = false;
        const updated = prev.map(reminder => {
          if (reminder.status === 'upcoming' || reminder.status === 'snoozed') {
            const targetTime = reminder.status === 'snoozed' ? (reminder.snoozedUntil || 0) : reminder.scheduledTime;
            
            if (now >= targetTime) {
              // FIRE NOTIFICATION
              fireNativeNotification(reminder.title, reminder.message);
              hasChanges = true;
              return { ...reminder, status: 'missed' as ReminderStatus }; 
            }
          }
          return reminder;
        });
        return hasChanges ? updated : prev;
      });
    };

    checkIntervalRef.current = setInterval(checkNotifications, 10000); // 10s for demo responsiveness
    checkNotifications();

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [preferences.enabled]);

  const fireNativeNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const shown = discreetNotice(title, body);
      new Notification(shown.title, { body: shown.body, icon: isDiscreet() ? undefined : '/sakhi-doll.png' });
    }
  };

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPreferences(prev => ({ ...prev, enabled: true }));
      } else {
        alert("Notification permission denied. Enable it in browser settings.");
      }
    }
  };

  const toggleMaster = () => {
    if (!preferences.enabled) {
      requestPermission();
    } else {
      setPreferences(prev => ({ ...prev, enabled: false }));
    }
  };

  const updatePreference = (key: keyof HerNotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const markCompleted = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' as ReminderStatus } : r));
  };

  const snoozeReminder = (id: string, hours: number = 1) => {
    const snoozedUntil = Date.now() + (hours * 60 * 60 * 1000);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: 'snoozed' as ReminderStatus, snoozedUntil } : r));
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  return {
    preferences,
    reminders,
    toggleMaster,
    updatePreference,
    markCompleted,
    snoozeReminder,
    deleteReminder
  };
}
