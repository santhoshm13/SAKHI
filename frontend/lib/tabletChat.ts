/**
 * "Took my iron tablet after dinner" in chat: record that dose in her tablet
 * ledger, at the time she said or the current time in India.
 */
import { Owner, readDoc, writeDoc } from '@/lib/store';
import {
  EMPTY_TABLETS, SLOT_LABEL, doseOf, doseState, fmtHm, fmtLate, matchTablets, pickDose, plannedDoses, saysTookTablet,
  setDose, streak, timeInText, type TabletsDoc,
} from '@/lib/tablets';

const TZ = process.env.SAKHI_TZ || 'Asia/Kolkata';

export function localNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map(p => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hm: `${parts.hour}:${parts.minute}` };
}

export interface TabletChatResult { reply: string; summary: string; chartUpdate: any }

const short = (name: string) => name.split(' (')[0];

export async function logTabletsFromChat(owner: Owner, message: string): Promise<TabletChatResult | null> {
  if (!saysTookTablet(message)) return null;
  const stored = await readDoc<TabletsDoc>('tablets', EMPTY_TABLETS, owner);
  let doc: TabletsDoc = stored && Array.isArray(stored.list) ? { ...EMPTY_TABLETS, ...stored } : EMPTY_TABLETS;
  if (!doc.list.length) {
    return {
      reply: "I'd love to track that for you. Add your tablets in the \"Tablets today\" card first, then just tell me when you take them.",
      summary: 'She mentioned taking a tablet, but has no tablets set up in the tracker yet.',
      chartUpdate: null,
    };
  }
  const which = matchTablets(doc, message);
  if (!which.length) {
    return {
      reply: `Which one did you take? Your tablets are: ${doc.list.map(t => short(t.name)).join(', ')}.`,
      summary: 'She mentioned taking a tablet but it did not match her list; asked which one.',
      chartUpdate: null,
    };
  }
  const { day, hm } = localNow();
  const said = timeInText(message);
  const at = said && said <= hm ? said : hm;
  const bits: string[] = [];
  for (const t of which) {
    const p = pickDose(doc, t, day, message, at);
    if (!p) continue;
    doc = setDose(doc, day, p.key, at);
    const st = doseState(doc, p, day, day, hm);
    const slot = t.slots && t.slots.length > 1 ? ` (${SLOT_LABEL[p.slot].toLowerCase()})` : '';
    bits.push(`${short(t.name)}${slot} at ${fmtHm(at)}${st.status === 'late' ? `, ${fmtLate(st.lateBy)}` : ', on time'}`);
  }
  if (!bits.length) return null;
  await writeDoc('tablets', doc, owner);

  const run = streak(doc, day);
  const left = plannedDoses(doc).filter(p => !doseOf(doc, day, p.key) && (!p.tablet.since || day >= p.tablet.since) && p.time >= hm);
  const tail = left.length
    ? ` Next: ${left.slice(0, 3).map(p => `${short(p.tablet.name)} at ${fmtHm(p.time)}`).join(', ')}.`
    : plannedDoses(doc).every(p => doseOf(doc, day, p.key))
      ? run > 1 ? ` That's everything for today, ${run} days in a row.` : " That's everything for today."
      : '';
  const reply = `Noted in your tablet ledger: ${bits.join('; ')}.${tail}`;
  return { reply, summary: `Just saved to her tablet ledger: ${bits.join('; ')}.${tail}`, chartUpdate: { type: 'tablets_update' } };
}
