"use client";

import { useState, useEffect, useRef } from 'react';
import { discreetNotice, isDiscreet } from '@/lib/discreet';

export type ReminderStatus = 'upcoming' | 'completed' | 'snoozed' | 'missed';
export type ReminderCategory = 'progress' | 'development' | 'health_check' | 'water' | 'meal' | 'vitamins' | 'exercise' | 'sleep' | 'movement' | 'appointment' | 'ultrasound' | 'blood_test' | 'vaccine' | 'weight' | 'bp' | 'sugar' | 'due_date' | 'hospital_bag' | 'emergency' | 'ai_insight';

export interface Reminder {
  id: string;
  title: string;
  message: string;
  category: ReminderCategory;
  scheduledTime: number; // Unix timestamp
  status: ReminderStatus;
  snoozedUntil?: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  water: boolean;
  meal: boolean;
  vitamins: boolean;
  exercise: boolean;
  bp: boolean;
  sugar: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: false,
  water: true,
  meal: true,
  vitamins: true,
  exercise: true,
  bp: true,
  sugar: true,
};

export function usePregnancyNotifications(profile: any, logs: any[], appointments: any[]) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem('pregnancy_notif_prefs');
    if (savedPrefs) setPreferences(JSON.parse(savedPrefs));
    
    const savedReminders = localStorage.getItem('pregnancy_reminders');
    if (savedReminders) setReminders(JSON.parse(savedReminders));
  }, []);

  // Save Prefs
  useEffect(() => {
    localStorage.setItem('pregnancy_notif_prefs', JSON.stringify(preferences));
  }, [preferences]);

  // Save Reminders
  useEffect(() => {
    localStorage.setItem('pregnancy_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Master Generation Logic
  const generateSchedule = () => {
    if (!profile) return;
    
    const now = Date.now();
    const newReminders: Reminder[] = [];
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Helper to add if doesn't exist today
    const addDaily = (id: string, title: string, message: string, category: ReminderCategory, hourOffset: number) => {
      const scheduledTime = new Date().setHours(hourOffset, 0, 0, 0);
      if (scheduledTime > now) {
        newReminders.push({ id: `${id}_${new Date().toDateString()}`, title, message, category, scheduledTime, status: 'upcoming' });
      }
    };

    // 1. Progress & 2. Development (Weekly)
    newReminders.push({
      id: `prog_wk_${profile.weeks_pregnant}`,
      title: `Welcome to Week ${profile.weeks_pregnant}!`,
      message: `Your baby is now approximately the size of a ${profile.baby_size_fruit || 'fruit'}.`,
      category: 'progress',
      scheduledTime: now + (10 * 1000), // Trigger shortly after generation for demo
      status: 'upcoming'
    });

    // 3. Daily Health Check
    addDaily('health_check', 'Daily Health Check', 'How are you feeling today? Update symptoms and mood.', 'health_check', 20); // 8 PM
    
    // 4. Water
    if (preferences.water) addDaily('water_1', 'Stay Hydrated', '💧 Stay hydrated today for a healthy pregnancy.', 'water', 14); // 2 PM
    
    // 5. Meal
    if (preferences.meal) addDaily('meal_1', 'Meal Reminder', '🥗 Don\'t skip today\'s nutritious meals.', 'meal', 13); // 1 PM
    
    // 6. Vitamins
    if (preferences.vitamins) addDaily('vitamins_1', 'Prenatal Vitamins', '💊 Time to take your prenatal vitamins.', 'vitamins', 9); // 9 AM
    
    // 8. Sleep
    addDaily('sleep_1', 'Time to Rest', '😴 Aim for adequate rest tonight.', 'sleep', 22); // 10 PM
    
    // 9. Baby Movement (After 28 weeks)
    if (profile.weeks_pregnant >= 28) {
      addDaily('movement_1', 'Baby Movement', '👶 Have you felt your baby move today? Please record it.', 'movement', 19); // 7 PM
    }

    // 10. Appointments
    appointments.forEach((apt, i) => {
      if (!apt.completed) {
        newReminders.push({
          id: `apt_${i}`,
          title: `Upcoming: ${apt.name}`,
          message: `📅 Your ${apt.name} is scheduled soon.`,
          category: 'appointment',
          scheduledTime: now + (2 * oneDay), // Mock scheduling 2 days from now
          status: 'upcoming'
        });
      }
    });

    // 15 & 16. BP and Sugar
    if (preferences.bp) addDaily('bp_1', 'Blood Pressure', '❤️ Time to record today\'s blood pressure.', 'bp', 10);
    if (preferences.sugar) addDaily('sugar_1', 'Blood Sugar', '🩸 Please record today\'s blood sugar level.', 'sugar', 8);

    // AI Personalized
    if (logs.length > 0) {
      const recentSleep = logs[0].sleep_hours;
      if (recentSleep < 7) {
        newReminders.push({
          id: `ai_sleep_${new Date().toDateString()}`,
          title: 'AI Insight: Rest Needed',
          message: `😴 Your sleep has been below 7 hours this week. Try to get more rest tonight.`,
          category: 'ai_insight',
          scheduledTime: now + (15 * 1000), // Trigger 15s from now for demo
          status: 'upcoming'
        });
      }
    }
    
    // 18. Hospital Bag
    if (profile.weeks_pregnant === 36) {
       newReminders.push({ id: `bag_36`, title: 'Preparation', message: '🎒 It\'s time to prepare your hospital bag.', category: 'hospital_bag', scheduledTime: now + (60 * 1000), status: 'upcoming' });
    }

    // Merge new reminders with existing ones (don't overwrite status of existing ones)
    setReminders(prev => {
      const merged = [...prev];
      newReminders.forEach(nr => {
        if (!merged.find(r => r.id === nr.id)) {
          merged.push(nr);
        }
      });
      return merged.sort((a, b) => a.scheduledTime - b.scheduledTime);
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
  }, [profile, logs, appointments, preferences]);

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
              
              // Move to missed if it's way past due (e.g. 1 hour late), otherwise keep it in a "triggered/missed" state
              // For simplicity, we just mark it missed instantly after firing so the user has to manually complete it in the center.
              return { ...reminder, status: 'missed' as ReminderStatus }; 
            }
          }
          return reminder;
        });
        return hasChanges ? updated : prev;
      });
    };

    checkIntervalRef.current = setInterval(checkNotifications, 10000); // Check every 10 seconds for demo accuracy
    
    // Initial check
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

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
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
