import { NextResponse } from 'next/server';
import { getOwner, readDoc, storageMode, writeDoc } from '@/lib/store';
import { gestation } from '@/lib/pregnancyWeeks';

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export async function GET() {
  try {
    const owner = await getOwner();
    const saved = await readDoc<any>('preg_profile', null, owner);

    if (!saved || !saved.preferred_name) {
      return NextResponse.json({ profile: { preferred_name: '' }, onboarded: false, logs: [], nutrition: null, appointments: [] });
    }

    const DAY = 24 * 60 * 60 * 1000;
    const today = new Date();
    // Weeks move on by themselves: worked out from the due date every time
    const g = gestation(saved);
    const weeksPregnant = g.weeks;
    const expectedDueDate = new Date(g.due + 'T00:00:00Z');
    const conceptionDate = new Date(expectedDueDate.getTime() - 266 * DAY);

    const maternalConditions: string[] = saved.maternal_conditions || [];
    const hasRisk = maternalConditions.length > 0 && !maternalConditions.includes('None');

    const profile = {
      ...saved,
      preferred_name: saved.preferred_name,
      weeks_pregnant: weeksPregnant,
      conception_date: conceptionDate.toISOString(),
      expected_due_date: expectedDueDate.toISOString(),
      pregnancy_experience: saved.pregnancy_experience || 'First-time Mother',
      maternal_conditions: maternalConditions,
      primary_goal: saved.primary_goal || 'Tracking Baby Growth & Fetal Movement',
      risk_level: hasRisk ? 'Elevated' : 'Low',
      baby_size_fruit: weeksPregnant < 12 ? 'Lime' : weeksPregnant < 20 ? 'Mango' : weeksPregnant < 28 ? 'Eggplant' : 'Pineapple',
    };

    const [logs, nutrition, storedAppointments, recordedMonth, storage] = await Promise.all([
      readDoc<any[]>('pregnancy_logs', [], owner),
      readDoc<any>('pregnancy_nutrition', null, owner),
      readDoc<any[]>('pregnancy_appointments', [], owner),
      readDoc<string | null>('appointments_month', null, owner),
      storageMode(),
    ]);

    // Appointments checklist resets at the start of each month
    let appointments = Array.isArray(storedAppointments) ? storedAppointments : [];
    const currentMonth = monthKey(today);
    if (recordedMonth !== currentMonth) {
      if (recordedMonth) {
        appointments = [];
        await writeDoc('pregnancy_appointments', [], owner);
      }
      await writeDoc('appointments_month', currentMonth, owner);
    }

    return NextResponse.json({
      profile,
      onboarded: true,
      logs: (Array.isArray(logs) ? logs : []).sort(
        (a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
      ),
      nutrition,
      appointments,
      storage,
    });
  } catch (error: any) {
    console.error('Pregnancy data error:', error);
    return NextResponse.json({ error: 'Failed to load pregnancy data' }, { status: 500 });
  }
}
