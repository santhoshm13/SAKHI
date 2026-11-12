import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOwner, patchDoc, readDoc, writeDoc } from '@/lib/store';

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export async function POST(req: Request) {
  try {
    const { mode, profile, resetData } = await req.json();
    const owner = await getOwner();

    // "Restart setup": forget both mode profiles so onboarding runs again
    if (mode === 'restart') {
      await writeDoc('her_profile', null, owner);
      await writeDoc('preg_profile', null, owner);
      return NextResponse.json({ success: true });
    }

    if (!mode || !profile || typeof profile !== 'object') {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const name = typeof profile.preferred_name === 'string' ? profile.preferred_name.trim().slice(0, 60) : '';
    if (name) {
      // Non-sensitive display-name hint used to personalise chat replies
      (await cookies()).set('sakhi_preferred_name', name, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
      profile.preferred_name = name;
    }

    if (mode === 'pregnancy') {
      if (resetData) {
        // Completely fresh start for Mom Mode
        await writeDoc('preg_profile', profile, owner);
        await writeDoc('pregnancy_logs', [], owner);
        await writeDoc('pregnancy_nutrition', null, owner);
        await writeDoc('pregnancy_appointments', [], owner);
        await writeDoc('appointments_month', monthKey(), owner);
        // A new pregnancy: the last baby's record moves to "previous", so the
        // dashboard starts in pregnancy view, not the old baby view
        const pp = await readDoc<any>('postpartum', null, owner);
        if (pp?.birth_date) {
          const previous = [...(Array.isArray(pp.previous) ? pp.previous : []), { birth_date: pp.birth_date, baby_name: pp.baby_name, delivery: pp.delivery, vaccines_done: pp.vaccines_done || [] }].slice(-5);
          await writeDoc('postpartum', { feeds: [], diapers: [], recovery: [], vaccines_done: [], previous }, owner);
        }
      } else {
        await patchDoc('preg_profile', profile, owner);
      }
      // Keep the name in sync across both modes
      if (name && (await readDoc('her_profile', null, owner))) await patchDoc('her_profile', { preferred_name: name }, owner);
    } else if (mode === 'her') {
      if (resetData) {
        // Completely fresh start for Her Mode
        await writeDoc('her_profile', profile, owner);
        await writeDoc('daily_logs', [], owner);
        await writeDoc('notifications', [], owner);
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
        await writeDoc('cycle_history', [{
          month: `${currentMonth} (Setup)`,
          cycleLength: parseInt(profile.cycle_length) || 28,
          periodDuration: parseInt(profile.period_duration) || 5,
        }], owner);
      } else {
        await patchDoc('her_profile', profile, owner);
      }
      if (name && (await readDoc('preg_profile', null, owner))) await patchDoc('preg_profile', { preferred_name: name }, owner);
    } else {
      return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Profile API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
