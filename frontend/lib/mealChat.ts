/**
 * "Had 2 roti, dal and curd for lunch" in chat: add it to today's food log and
 * say how the day is going for the nutrients that matter.
 */
import { Owner, readDoc, writeDoc } from '@/lib/store';
import { localNow } from '@/lib/tabletChat';
import { gestation } from '@/lib/pregnancyWeeks';
import { ageDays } from '@/lib/postpartum';
import {
  EMPTY_MEALS, FOOD_BY_ID, NUTRIENT_LABEL, TARGETS, addItems, foodsInText, saysAte, stageFor, suggestions, totals, waterInText,
  type MealsDoc, type Stage,
} from '@/lib/meals';

export interface MealChatResult { reply: string; summary: string; chartUpdate: any }

async function stageOf(owner: Owner, mode: 'her' | 'pregnancy', today: string): Promise<Stage> {
  if (mode === 'her') return 'not_pregnant';
  const [profile, pp] = await Promise.all([readDoc<any>('preg_profile', null, owner), readDoc<any>('postpartum', null, owner)]);
  // Feeding a baby under 6 months needs the most
  if (pp?.birth_date && ageDays(pp.birth_date, today) <= 182) return stageFor(null, true);
  return stageFor(profile ? gestation(profile, today).weeks : null, false);
}

export async function logMealsFromChat(owner: Owner, message: string, mode: 'her' | 'pregnancy'): Promise<MealChatResult | null> {
  if (!saysAte(message)) return null;
  const items = foodsInText(message);
  const water = waterInText(message);
  if (!items.length && !water) return null;

  const { day } = localNow();
  const stored = await readDoc<MealsDoc>('meals', EMPTY_MEALS, owner);
  const doc = addItems(stored && stored.days ? stored : EMPTY_MEALS, day, items, water);
  await writeDoc('meals', doc, owner);

  const stage = await stageOf(owner, mode, day);
  const t = totals(doc.days[day]);
  const target = TARGETS[stage];
  // "Roti / chapati" reads as just "roti" in a sentence
  const plain = (name: string) => name.split(' / ')[0].toLowerCase();
  const noted = items.map(i => `${i.qty === 1 ? '' : `${i.qty} `}${plain(FOOD_BY_ID[i.id].name)}`);
  if (water) noted.push(`${water} glass${water === 1 ? '' : 'es'} of water`);
  const pct = (k: 'protein' | 'calcium' | 'iron') => Math.round((t[k] / target[k]) * 100);
  const tip = suggestions(doc.days[day], stage, 2);
  const tea = items.some(i => i.id === 'tea') ? ' Keep tea or coffee an hour away from meals and iron tablets, so the iron is absorbed.' : '';

  const reply = `Noted: ${noted.join(', ')}. Today so far: protein ${Math.round(t.protein)} of ${target.protein} g, calcium ${pct('calcium')}%, iron ${pct('iron')}% of what you need.`
    + (tip ? ` For more ${NUTRIENT_LABEL[tip.nutrient].name.toLowerCase()}, try ${tip.foods.map(x => plain(x.name)).join(' or ')}.` : '')
    + tea;
  return {
    reply,
    summary: `She just logged food: ${noted.join(', ')}. Today's totals: protein ${Math.round(t.protein)}/${target.protein} g, iron ${t.iron.toFixed(1)}/${target.iron} mg, calcium ${Math.round(t.calcium)}/${target.calcium} mg. Mention this briefly.`,
    chartUpdate: { type: 'meals_update' },
  };
}
