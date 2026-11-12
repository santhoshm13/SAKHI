/**
 * What she ate, in everyday Indian servings, turned into the nutrients that
 * matter most in pregnancy and breastfeeding.
 *
 * Nutrients per serving are rounded approximations from the Indian Food
 * Composition Tables (IFCT 2017, NIN). Daily targets are ICMR-NIN 2020 RDAs for
 * a moderately active Indian woman. Food groups follow the FAO Minimum Dietary
 * Diversity for Women (MDD-W): 5 or more of 10 groups in a day is a good sign.
 */
export type Nutrient = 'kcal' | 'protein' | 'iron' | 'calcium' | 'folate';
export type FoodGroup = 'grains' | 'pulses' | 'nuts' | 'dairy' | 'meat' | 'eggs' | 'greens' | 'vitA' | 'otherVeg' | 'fruit';

export interface Food {
  id: string;
  name: string;
  serving: string;
  group: FoodGroup | null;
  n: Record<Nutrient, number>;
  /** words she might type in chat */
  words: RegExp;
}

const f = (id: string, name: string, serving: string, group: FoodGroup | null, kcal: number, protein: number, iron: number, calcium: number, folate: number, words: RegExp): Food =>
  ({ id, name, serving, group, n: { kcal, protein, iron, calcium, folate }, words });

export const FOODS: Food[] = [
  f('roti', 'Roti / chapati', '1 roti', 'grains', 100, 3.5, 1.2, 10, 11, /\b(roti|rotis|chapati|chapatis|chapathi|phulka|paratha|parathas|bhakri)\b/i),
  f('rice', 'Rice', '1 cup cooked', 'grains', 175, 3.5, 0.4, 5, 5, /\b(rice|chawal|bhaat|bhat|annam|sadam|pulao|khichdi)\b/i),
  f('ragi', 'Ragi / bajra / jowar', '1 roti or mudde', 'grains', 130, 3, 1.8, 140, 15, /\b(ragi|nachni|mudde|bajra|jowar|millet)\b/i),
  f('idli', 'Idli / dosa', '2 idli or 1 dosa', 'grains', 150, 4.5, 0.8, 20, 15, /\b(idli|idlis|dosa|dosas|uttapam|appam)\b/i),
  f('poha', 'Poha / upma', '1 plate', 'grains', 250, 5, 2, 20, 15, /\b(poha|upma|aval|avalakki)\b/i),
  f('dal', 'Dal / sambar', '1 katori', 'pulses', 100, 7, 1.3, 25, 50, /\b(dal|daal|dhal|sambar|sambhar|paruppu|pappu)\b/i),
  f('chana', 'Chana / rajma / chole', '1 katori', 'pulses', 130, 7.5, 2, 50, 100, /\b(chana|chole|rajma|lobia|chickpeas?|kidney beans)\b/i),
  f('sprouts', 'Sprouts', '1 katori', 'pulses', 80, 6, 1.5, 30, 80, /\b(sprouts?|moong sprouts|ankurit)\b/i),
  f('greens', 'Green leafy sabzi', '1 katori (palak, methi, sarson, drumstick leaves)', 'greens', 60, 2.5, 2, 100, 120, /\b(palak|spinach|methi|sarson|saag|greens|keerai|drumstick leaves|moringa|bathua|amaranth|chaulai)\b/i),
  f('orangeveg', 'Carrot / pumpkin / papaya', '1 katori', 'vitA', 60, 1, 0.5, 30, 20, /\b(carrot|gajar|pumpkin|kaddu|papaya|mango|sweet potato|shakarkandi)\b/i),
  f('sabzi', 'Other sabzi', '1 katori', 'otherVeg', 70, 2, 0.8, 30, 25, /\b(sabzi|sabji|subzi|aloo|bhindi|gobi|cabbage|green beans|french beans|brinjal|baingan|lauki|tori|poriyal|kootu|vegetables?|veggies)\b/i),
  f('milk', 'Milk', '1 glass', 'dairy', 130, 6.5, 0.2, 240, 10, /\b(milk|doodh|paal)\b/i),
  f('curd', 'Curd / buttermilk', '1 katori or glass', 'dairy', 90, 5, 0.2, 180, 10, /\b(curd|dahi|yogurt|yoghurt|buttermilk|chaas|lassi|mor|thayir)\b/i),
  f('paneer', 'Paneer', '50 g', 'dairy', 130, 9, 0.1, 240, 5, /\b(paneer|cottage cheese)\b/i),
  f('egg', 'Egg', '1 egg', 'eggs', 75, 6.5, 0.9, 28, 24, /\b(eggs?|anda|omelette|omelet|bhurji)\b/i),
  f('meat', 'Chicken / mutton', '1 portion', 'meat', 160, 18, 1.2, 15, 5, /\b(chicken|mutton|meat|keema|liver)\b/i),
  f('fish', 'Fish', '1 portion', 'meat', 140, 17, 0.8, 50, 10, /\b(fish|machli|meen|prawns?)\b/i),
  f('fruit', 'Fruit', '1 fruit (banana, guava, orange, apple…)', 'fruit', 80, 1, 0.3, 15, 25, /\b(fruits?|banana|kela|guava|amrood|orange|apple|pomegranate|anar|chikoo|watermelon|grapes)\b/i),
  f('nuts', 'Nuts / seeds', '1 handful', 'nuts', 150, 6, 1.2, 60, 30, /\b(nuts|groundnuts?|peanuts?|moongphali|almonds?|badam|til|sesame|seeds|walnuts?|cashew|kaju)\b/i),
  f('chikki', 'Gur / chikki / dates', '1 piece', 'nuts', 100, 2, 0.8, 25, 5, /\b(gur|jaggery|chikki|dates|khajur|laddoo|ladoo)\b/i),
  f('snack', 'Biscuits / namkeen / fried snack', '1 small plate', null, 150, 2, 0.5, 15, 5, /\b(biscuits?|namkeen|samosa|pakoras?|bhajji|chips|mixture|vada)\b/i),
  f('tea', 'Tea / coffee', '1 cup', null, 40, 1, 0.1, 40, 2, /\b(tea|chai|coffee)\b/i),
];
export const FOOD_BY_ID = Object.fromEntries(FOODS.map(x => [x.id, x])) as Record<string, Food>;

export const GROUP_LABEL: Record<FoodGroup, string> = {
  grains: 'Grains', pulses: 'Dal & pulses', nuts: 'Nuts & seeds', dairy: 'Milk & curd', meat: 'Meat & fish',
  eggs: 'Eggs', greens: 'Green leafy veg', vitA: 'Orange fruit & veg', otherVeg: 'Other veg', fruit: 'Other fruit',
};

export type Stage = 'trimester1' | 'trimester2' | 'trimester3' | 'lactating' | 'not_pregnant';
export const stageFor = (weeks: number | null, breastfeeding: boolean): Stage =>
  breastfeeding ? 'lactating' : weeks === null ? 'not_pregnant' : weeks <= 13 ? 'trimester1' : weeks <= 27 ? 'trimester2' : 'trimester3';

/** ICMR-NIN 2020 RDAs (moderately active woman, 55 kg). */
export const TARGETS: Record<Stage, Record<Nutrient, number>> = {
  not_pregnant: { kcal: 2130, protein: 46, iron: 29, calcium: 1000, folate: 220 },
  trimester1: { kcal: 2130, protein: 46, iron: 27, calcium: 1000, folate: 570 },
  trimester2: { kcal: 2480, protein: 55, iron: 27, calcium: 1000, folate: 570 },
  trimester3: { kcal: 2480, protein: 68, iron: 27, calcium: 1000, folate: 570 },
  lactating: { kcal: 2730, protein: 60, iron: 23, calcium: 1200, folate: 330 },
};
export const WATER_GLASSES: Record<Stage, number> = { not_pregnant: 8, trimester1: 10, trimester2: 10, trimester3: 10, lactating: 12 };

export const NUTRIENT_LABEL: Record<Nutrient, { name: string; unit: string }> = {
  kcal: { name: 'Energy', unit: 'kcal' }, protein: { name: 'Protein', unit: 'g' }, iron: { name: 'Iron', unit: 'mg' },
  calcium: { name: 'Calcium', unit: 'mg' }, folate: { name: 'Folate', unit: 'mcg' },
};

export interface MealItem { id: string; qty: number }
export interface MealDay { items: MealItem[]; water: number }
export interface MealsDoc { days: Record<string, MealDay> }
export const EMPTY_MEALS: MealsDoc = { days: {} };
export const emptyDay = (): MealDay => ({ items: [], water: 0 });

export function totals(day: MealDay | undefined): Record<Nutrient, number> {
  const t: Record<Nutrient, number> = { kcal: 0, protein: 0, iron: 0, calcium: 0, folate: 0 };
  for (const it of day?.items || []) {
    const food = FOOD_BY_ID[it.id];
    if (!food) continue;
    for (const k of Object.keys(t) as Nutrient[]) t[k] += food.n[k] * it.qty;
  }
  return t;
}

export const groupsEaten = (day: MealDay | undefined) =>
  Array.from(new Set((day?.items || []).map(i => FOOD_BY_ID[i.id]?.group).filter(Boolean))) as FoodGroup[];

/** Foods that would help most with what's lowest today, skipping ones already eaten. */
export function suggestions(day: MealDay | undefined, stage: Stage, max = 3): { nutrient: Nutrient; foods: Food[] } | null {
  const t = totals(day);
  const target = TARGETS[stage];
  const gaps = (['protein', 'calcium', 'folate', 'iron'] as Nutrient[])
    .map(k => ({ k, pct: t[k] / target[k] }))
    .sort((a, b) => a.pct - b.pct);
  const worst = gaps[0];
  if (!worst || worst.pct >= 1) return null;
  const eaten = new Set((day?.items || []).map(i => i.id));
  const foods = FOODS.filter(x => x.group && !eaten.has(x.id))
    .sort((a, b) => b.n[worst.k] / Math.max(60, b.n.kcal) - a.n[worst.k] / Math.max(60, a.n.kcal))
    .slice(0, max);
  return { nutrient: worst.k, foods };
}

/** Add servings to a day, keeping 21 days of history. */
export function addItems(doc: MealsDoc, date: string, items: MealItem[], water = 0): MealsDoc {
  const day = doc.days[date] || emptyDay();
  const merged = [...day.items];
  for (const it of items) {
    const ex = merged.find(m => m.id === it.id);
    if (ex) ex.qty = Math.max(0, Math.min(20, ex.qty + it.qty));
    else if (it.qty > 0) merged.push({ ...it });
  }
  const days = { ...doc.days, [date]: { items: merged.filter(m => m.qty > 0), water: Math.max(0, Math.min(30, day.water + water)) } };
  const keep = Object.keys(days).sort().slice(-21);
  return { days: Object.fromEntries(keep.map(k => [k, days[k]])) };
}

const NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, ek: 1, do: 2, teen: 3, char: 4 };

/** "had 2 roti, dal and a glass of milk for lunch" → [{roti,2},{dal,1},{milk,1}] */
export function foodsInText(text: string): MealItem[] {
  const t = ` ${text.toLowerCase()} `;
  const out: MealItem[] = [];
  for (const food of FOODS) {
    const m = food.words.exec(t);
    if (!m) continue;
    // A number or number-word just before the food name ("2 roti", "two eggs", "a glass of milk")
    const before = t.slice(Math.max(0, m.index - 22), m.index);
    const q = before.match(/(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|half|ek|do|teen|char)\s+(?:(?:glass(?:es)?|cups?|katori|bowls?|plates?|pieces?|handfuls?|of)\s+)*$/);
    const qty = q ? (Number(q[1]) || NUM[q[1]] || 1) : 1;
    out.push({ id: food.id, qty: Math.min(10, qty) });
  }
  return out;
}

/** Is she telling us what she ate (not asking what to eat)? */
export const saysAte = (text: string) =>
  /\b(ate|eaten|had|have had|eating|khaya|khaayi|khayi|drank|breakfast|lunch|dinner|nashta|for snack)\b/i.test(text)
  && !/\?|\b(should|can i|what to|which|is it ok|safe to|good to)\b/i.test(text);

export const waterInText = (text: string): number => {
  const m = text.match(/(\d+)\s*(?:glass(?:es)?)\s+(?:of\s+)?(?:water|paani|pani)/i);
  if (m) return Math.min(15, Number(m[1]));
  const l = text.match(/(\d+(?:\.\d+)?)\s*(?:l|litres?|liters?)\s+(?:of\s+)?(?:water|paani|pani)/i);
  return l ? Math.min(15, Math.round(Number(l[1]) * 4)) : 0;
};
