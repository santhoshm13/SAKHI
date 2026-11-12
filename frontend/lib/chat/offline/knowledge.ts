/**
 * What Simple mode knows: short, safe, general answers for common questions,
 * personalised with her cycle phase or pregnancy week. No diagnoses, no medicines.
 */
import { PHASE_META, type PhaseInfo } from '@/lib/cyclePhase';
import { PHASE_GUIDE, tipsForToday } from '@/lib/phaseTips';

export const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const prettyDate = (day: number) =>
  new Date(day * 86_400_000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' });

export interface HerCtx {
  who: string;
  pet: string;
  phase: PhaseInfo | null;
  pms: string[];
  avgSleep: number | null;
  fatigueDays: number;
}

export interface MomCtx {
  who: string;
  pet: string;
  weeks: number | null;
  lastBp: { s: number; d: number } | null;
  lastSugar: number | null;
}

export interface Topic<C> { id: string; match: RegExp; answer: (c: C) => string }

// ------------------------------------------------------------------ Her Mode

const phaseLine = (p: PhaseInfo) => {
  if (p.late) return `your period is about ${plural(p.daysLate, 'day')} late`;
  if (p.bleedingDay) return `you're on day ${p.bleedingDay} of your period`;
  return `you're on cycle day ${p.cycleDay}, in your ${PHASE_META[p.phase].short.toLowerCase()} phase`;
};

export const HER_TOPICS: Topic<HerCtx>[] = [
  {
    id: 'next-period',
    match: /\b(next period|period (due|coming|come)|when (will|is|does|should) my period|when.*\bperiod\b.*(come|start|due))\b/,
    answer: ({ who, pet, phase: p }) => {
      if (!p) return `I don't know your cycle yet, ${pet}. Tell me when your last period started, like "my period started on 3 November", and I'll work it out.`;
      const due = prettyDate(p.lastStart + p.cycleLength);
      const unsure = p.confidence === 'low' ? ' Treat this as a rough guess until I see a few more cycles.' : '';
      if (p.late) return `Your period is about ${plural(p.daysLate, 'day')} later than usual, ${pet}. Stress, travel, illness or sleep changes can all delay it. If there's any chance of pregnancy, a home test can help, and if it's more than two weeks late, please check in with a doctor.`;
      if (p.bleedingDay) return `You're on day ${p.bleedingDay} of your period right now, ${who}. The next one should come around ${due}, ${pet}.${unsure}`;
      return `Your next period should start in about ${plural(p.daysUntilPeriod, 'day')}, around ${due}, ${pet}.${unsure}`;
    },
  },
  {
    id: 'phase',
    match: /\b(what|which) (phase|part of my cycle)|\bcycle day\b|\bwhere am i in my cycle\b/,
    answer: ({ pet, phase: p }) => {
      if (!p) return `Tell me when your last period started, ${pet}, and I'll show you where you are in your cycle.`;
      const g = PHASE_GUIDE[p.phase];
      return `Right now ${phaseLine(p)}, ${pet}. ${g.hormones} ${g.feel}`;
    },
  },
  {
    id: 'ovulation',
    match: /\b(ovulat\w*|fertile|fertility window|best time to (conceive|get pregnant)|trying to conceive|ttc)\b/,
    answer: ({ pet, phase: p }) => {
      if (!p) return `Ovulation usually happens about 14 days before your next period, ${pet}. Tell me when your last period started and I'll estimate your fertile days.`;
      const ov = p.lastStart + p.ovulationDay - 1;
      const window = `${prettyDate(ov - 5)} to ${prettyDate(ov)}`;
      return `Based on your cycle, your most fertile days are roughly ${window}, with ovulation around ${prettyDate(ov)}, ${pet}. Signs can include clear, stretchy discharge and a slight one-sided twinge. Please don't rely on this as birth control: cycles shift, and sperm can live up to 5 days.`;
    },
  },
  {
    id: 'pregnant-on-period',
    match: /\b(get pregnant|pregnancy) (on|during) (my|your|the)? ?period|\bsafe days?\b/,
    answer: ({ pet }) => `It's less likely, but yes, it is possible, ${pet}, especially with shorter cycles, because sperm can survive up to 5 days. There are no truly "safe days", so use contraception if you don't want to get pregnant.`,
  },
  {
    id: 'cramps-help',
    match: /\b(cramps?|period pain|menstrual pain)\b.*\b(help|reduce|stop|relief|relieve|ease|tips?|what (can|should) i do)\b|\b(help|reduce|stop|relieve|ease)\b.*\b(cramps?|period pain)\b/,
    answer: () => '__RELIEF__',
  },
  {
    id: 'pms',
    match: /\b(pms|premenstrual|pmdd|before (my|the) period|mood swings?)\b/,
    answer: ({ pet, pms, phase: p }) => {
      const mine = pms.length ? ` From your logs, ${pms.join(', ').toLowerCase()} tend to show up in the days before your period.` : '';
      const when = p && !p.late && p.phase === 'luteal' && p.daysUntilPeriod <= 7 ? ' This is exactly that window for you now.' : '';
      return `PMS is real, ${pet}: hormones drop in the days before your period.${mine}${when} What helps many women: regular meals with whole grains, less salt and caffeine, a daily walk, magnesium-rich foods like bananas, nuts and seeds, and an earlier bedtime. If mood dips feel overwhelming every month, please talk to a doctor; it's very treatable.`;
    },
  },
  {
    id: 'tired',
    match: /\b(tired|fatigue|exhausted|no energy|low energy|so sleepy|drained)\b/,
    answer: ({ pet, phase: p, avgSleep, fatigueDays }) => {
      const bits: string[] = [];
      if (p?.bleedingDay || p?.phase === 'menstrual') bits.push('During your period, hormones are at their lowest and you lose some iron, so tiredness is common. Iron-rich foods like spinach, rajma, dates and jaggery with a squeeze of lemon help.');
      else if (p?.phase === 'luteal') bits.push('In your luteal phase, progesterone can make you feel sleepier and slower, especially in the last week before your period.');
      else bits.push('Energy usually rises in this part of your cycle, so tiredness now is more likely about sleep, stress, meals or hydration.');
      if (avgSleep !== null && avgSleep < 6.5) bits.push(`You've been averaging about ${avgSleep} hours of sleep lately, which is less than your body needs.`);
      if (fatigueDays >= 8) bits.push("Since you've felt tired on many days, it's worth asking a doctor about simple blood tests for iron, thyroid and vitamin D.");
      return `${bits.join(' ')} Be gentle with yourself, ${pet}.`;
    },
  },
  {
    id: 'bloating',
    match: /\bbloat(ed|ing)?\b/,
    answer: ({ pet, phase: p }) => `${p?.phase === 'luteal' ? 'Bloating is very common in your luteal phase, as hormones make your body hold more water. ' : ''}A few things help, ${pet}: less salty and packaged food, plenty of water (it really does reduce water retention), a short walk after meals, skipping fizzy drinks, and a warm cup of jeera or ajwain water.`,
  },
  {
    id: 'headache',
    match: /\b(headaches?|migraines?)\b/,
    answer: ({ pet }) => `Hormone changes around your period can trigger headaches, ${pet}. Try a big glass of water, a proper meal, a cool cloth on your forehead and a few minutes in a dark, quiet room. If a headache is sudden and the worst you've ever had, or comes with weakness or confusion, please get medical help right away.`,
  },
  {
    id: 'acne',
    match: /\b(acne|pimples?|breakouts?)\b/,
    answer: ({ pet }) => `Breakouts before a period are common because of hormone shifts, ${pet}. Wash gently twice a day, use non-comedogenic products, try not to pick, and change your pillowcase often. If acne is persistent along with irregular periods or extra hair growth, mention it to a doctor so they can check your hormones.`,
  },
  {
    id: 'cravings',
    match: /\b(cravings?|craving|want (sweets|chocolate|sugar))\b/,
    answer: ({ pet }) => `Cravings before a period are normal, ${pet}; your body burns a little more energy then. Go for a balanced snack with protein: roasted chana, a banana with peanut butter, curd with fruit, or a couple of squares of dark chocolate. No guilt needed.`,
  },
  {
    id: 'sleep',
    match: /\b(can'?t sleep|insomnia|trouble sleeping|sleep (better|problems?|issues?)|not sleeping)\b/,
    answer: ({ pet, phase: p }) => `${p?.phase === 'luteal' ? 'Your body temperature runs a little higher in the luteal phase, which can disturb sleep. ' : ''}Some gentle help, ${pet}: a cooler, darker room, the same bedtime each night, no screens for 30 minutes before bed, and a warm drink like haldi doodh. Try 4-7-8 breathing if your mind is racing.`,
  },
  {
    id: 'exercise',
    match: /\b(exercise|workout|work out|gym|yoga|walk(ing)?|run(ning)?|move more)\b/,
    answer: ({ pet, phase: p }) => {
      if (!p) return `Any movement you enjoy counts, ${pet}: a 20–30 minute walk most days is a great start.`;
      const tip = tipsForToday(p.phase, Math.floor(Date.now() / 86_400_000)).find(x => x.kind === 'move');
      return `In your ${PHASE_META[p.phase].short.toLowerCase()} phase, ${pet}, try this: **${tip?.title}**. ${tip?.text} Always go by how your body feels on the day.`;
    },
  },
  {
    id: 'food',
    match: /\b(eat|food|diet|meal|nutrition|what should i have)\b/,
    answer: ({ pet, phase: p }) => {
      if (!p) return `Balanced plates help your cycle, ${pet}: dal or eggs for protein, plenty of vegetables, whole grains, and fruit.`;
      const seed = Math.floor(Date.now() / 86_400_000);
      const tip = tipsForToday(p.phase, seed).find(x => x.kind === 'nourish');
      return `For your ${PHASE_META[p.phase].short.toLowerCase()} phase, ${pet}: **${tip?.title}**. ${tip?.text} Keep up the water too.`;
    },
  },
  {
    id: 'spotting',
    match: /\bspotting\b.*\b(normal|why|okay|ok|worry)\b|\b(why|is it normal).*\bspotting\b/,
    answer: ({ pet }) => `Light spotting around ovulation, or just before a period, can be normal, ${pet}. It's worth seeing a doctor if it happens often between periods, after sex, or after menopause, or if you could be pregnant.`,
  },
  {
    id: 'heavy',
    match: /\b(heavy (flow|period|bleeding)|too much (blood|bleeding)|clots?)\b.*\b(normal|why|okay|ok|worry|help)\b|\bis my (flow|period) (too )?heavy\b/,
    answer: ({ pet }) => `A period may be too heavy if you change a pad every 1–2 hours, pass clots bigger than a ₹5 coin, bleed for more than 7 days, or feel dizzy and breathless, ${pet}. If any of that sounds familiar, please see a doctor; they may check your iron levels too. Iron-rich foods help in the meantime.`,
  },
  {
    id: 'irregular',
    match: /\b(irregular|late again|periods? (are|is) (not regular|irregular)|missed (my )?period|skipped (a|my) period)\b/,
    answer: ({ pet, phase: p }) => `Cycles can vary by a few days, ${pet}, and stress, travel, illness, weight changes, thyroid issues or hormone conditions like PCOS can all shift them. ${p?.variability && p.variability > 8 ? `Your recent cycles have varied by ${p.variability} days, so keep logging, and ` : 'Keep logging, and '}see a doctor if your periods stay irregular for a few months, stop for 3 months, or you could be pregnant.`,
  },
  {
    id: 'pcos',
    match: /\b(pcos|pcod|polycystic|endometriosis|thyroid)\b/,
    answer: ({ pet }) => `I can't diagnose conditions, ${pet}; only a doctor can, with an exam and tests. What I can do is notice patterns worth mentioning: irregular or long cycles, acne, extra hair growth or very painful periods. Your Insights tab and the doctor summary gather these, so you can take them to an appointment.`,
  },
  {
    id: 'stress',
    match: /\b(stress(ed)?|anxious|anxiety|overwhelmed|panic|worried)\b/,
    answer: ({ pet }) => `I'm sorry it feels heavy right now, ${pet}. Let's slow down together: breathe in for 4, hold for 7, breathe out slowly for 8, and repeat four times. Then pick just one small thing to do next. If anxiety is with you most days, talking to a counsellor really helps; Tele-MANAS on 14416 is free.`,
  },
  {
    id: 'medicine',
    match: /\b(medicine|medication|tablet|pill|painkiller|ibuprofen|paracetamol|meftal|dose|dosage|prescri\w*)\b/,
    answer: ({ pet }) => `I'm not able to suggest medicines or doses, ${pet}. A pharmacist or your doctor can tell you what's safe for you. Meanwhile, heat on your lower belly and gentle stretches help many women.`,
  },
];

// ------------------------------------------------------------------ Mom Mode

const SIZES: [number, string][] = [
  [4, 'a poppy seed'], [5, 'a sesame seed'], [6, 'a lentil'], [7, 'a blueberry'], [8, 'a rajma bean'], [9, 'a grape'],
  [10, 'a strawberry'], [11, 'a fig'], [12, 'a lime'], [13, 'a lemon'], [15, 'an apple'], [16, 'an avocado'],
  [18, 'a sweet potato'], [19, 'a mango'], [20, 'a banana'], [22, 'a papaya'], [24, 'a corn cob'], [26, 'a lettuce'],
  [28, 'a brinjal'], [30, 'a cabbage'], [32, 'a coconut'], [34, 'a melon'], [36, 'a large papaya'], [38, 'a small pumpkin'], [40, 'a watermelon'],
];
export const sizeFor = (w: number) => [...SIZES].reverse().find(([wk]) => w >= wk)?.[1] ?? 'a tiny seed';
const milestone = (w: number) =>
  w < 13 ? "Baby's heart is beating and all the major organs are forming."
  : w < 21 ? 'Baby is moving, and you may start to feel flutters between 18 and 22 weeks.'
  : w < 28 ? 'Baby has regular sleep and wake times, and the lungs are developing.'
  : w < 37 ? 'Baby is putting on weight, opening their eyes, and you should feel movements every day.'
  : 'Baby is full term and getting ready to meet you.';
const trimester = (w: number | null) => (!w ? null : w <= 13 ? 1 : w <= 27 ? 2 : 3);

export const MOM_TOPICS: Topic<MomCtx>[] = [
  {
    id: 'baby-size',
    match: /\b(how big|baby('s)? size|size of (my|the) baby|this week|what('s| is) happening|baby (now|development))\b/,
    answer: ({ pet, weeks }) => weeks
      ? `At ${weeks} weeks, baby is about the size of ${sizeFor(weeks)}, ${pet}. ${milestone(weeks)}`
      : `Tell me how many weeks along you are, ${pet}, and I'll tell you what baby is up to.`,
  },
  {
    id: 'avoid',
    match: /\b(avoid|not eat|shouldn'?t eat|safe to eat|can i (eat|have|drink)|papaya|pineapple|coffee|tea|caffeine|alcohol|fish)\b/,
    answer: ({ pet }) => `Good question, ${pet}. Avoid alcohol, raw or undercooked eggs and meat, unpasteurised milk or paneer, high-mercury fish, and unwashed salads or street food. Keep caffeine to about 200 mg a day (roughly one coffee or two cups of tea). Many families also avoid raw papaya and large amounts of pineapple; ripe papaya in small amounts is generally considered fine, but check with your doctor if unsure.`,
  },
  {
    id: 'food',
    match: /\b(eat|food|diet|meal|nutrition|protein|iron|calcium)\b/,
    answer: ({ pet, weeks }) => {
      const t = trimester(weeks);
      if (t === 1) return `In the first trimester, ${pet}: small, frequent meals, leafy greens, dal and fruit, and keep taking the folic acid your doctor gave you. If nausea is strong, dry snacks like khakhra or toast first thing help.`;
      if (t === 2) return `In the second trimester, ${pet}, baby is growing fast: add protein (dal, paneer, eggs, curd), iron (spinach, rajma, dates, jaggery) with vitamin C like amla or lemon, and calcium from milk, curd and ragi. You only need about 300 extra calories a day, roughly one extra small meal.`;
      if (t === 3) return `In the third trimester, ${pet}: keep up protein and iron, add fibre (fruits, vegetables, whole grains) and plenty of water to prevent constipation, and eat smaller meals more often if heartburn bothers you.`;
      return `A pregnancy plate, ${pet}: protein (dal, paneer, eggs, curd), iron-rich greens with lemon, calcium from milk and ragi, whole grains, fruit, and plenty of water.`;
    },
  },
  {
    id: 'kicks',
    match: /\b(count (the )?kicks|kick count|how many (kicks|movements)|movements? (normal|enough))\b/,
    answer: ({ pet, weeks }) => `${weeks && weeks < 28 ? `From about 28 weeks you'll count kicks daily, ${pet}. ` : ''}Pick a time when baby is usually active, lie on your left side, and count every kick, roll or flutter. Feeling 10 movements within 2 hours is reassuring. If movements are fewer than usual or the pattern changes, call your maternity unit the same day; don't wait until tomorrow.`,
  },
  {
    id: 'bp',
    match: /\b(bp|blood pressure)\b.*\b(normal|okay|ok|high|low|good|range|worry)\b|\bis my (bp|blood pressure)\b/,
    answer: ({ pet, lastBp }) => {
      const mine = lastBp ? ` Your last reading was ${lastBp.s}/${lastBp.d}, which ${lastBp.s >= 140 || lastBp.d >= 90 ? 'is high: please contact your doctor today' : 'is in the normal range'}.` : '';
      return `In pregnancy, a reading under 140/90 is generally fine, ${pet}.${mine} At 140/90 or above, rest and recheck, and call your doctor. At 160/110 or above, or with a bad headache, blurred vision or upper belly pain, go to the hospital.`;
    },
  },
  {
    id: 'sugar',
    match: /\b(sugar|glucose|gdm|gestational diabetes)\b/,
    answer: ({ pet, lastSugar }) => `Common pregnancy targets are under 95 mg/dL fasting and under 120 two hours after a meal, ${pet}, though your doctor may use slightly different numbers.${lastSugar ? ` Your last logged reading was ${lastSugar}.` : ''} The sugar test (GTT) is usually done between 24 and 28 weeks. Walking after meals and swapping sweets for fruit and protein both help.`,
  },
  {
    id: 'nausea',
    match: /\b(nausea|vomit\w*|morning sickness|throwing up|feel sick)\b/,
    answer: ({ pet }) => `Morning sickness is so tiring, ${pet}. Try a dry snack before getting up, small meals every 2–3 hours, sips of water or nimbu pani through the day, ginger tea, and avoiding strong smells. If you can't keep any fluids down for a day, or feel dizzy and pass very little urine, please see your doctor.`,
  },
  {
    id: 'heartburn',
    match: /\b(heartburn|acidity|acid reflux|burning in (my )?chest)\b/,
    answer: ({ pet }) => `Heartburn is common as baby grows, ${pet}. Eat smaller meals, avoid lying down for 2–3 hours after eating, raise your head with an extra pillow, and go easy on spicy and oily food. Cold milk or curd soothes many mums.`,
  },
  {
    id: 'constipation',
    match: /\bconstipat\w*\b/,
    answer: ({ pet }) => `Pregnancy hormones slow digestion, ${pet}. Drink plenty of water, add fibre such as fruit, vegetables, whole grains and soaked raisins or figs, and take a gentle daily walk. Tell your doctor if it lasts more than a few days.`,
  },
  {
    id: 'back-pain',
    match: /\b(back ?pain|backache|lower back)\b/,
    answer: ({ pet }) => `Your back is carrying a lot, ${pet}. Try sleeping on your side with a pillow between your knees, sitting with support behind your lower back, wearing flat shoes, and gentle cat-cow stretches. A warm (not hot) compress on your back can help. Back pain that comes in waves, or with bleeding, needs a call to your doctor.`,
  },
  {
    id: 'swelling',
    match: /\b(swell\w*|swollen|puffy)\b/,
    answer: ({ pet }) => `Some swelling in the feet and ankles is common later in pregnancy, ${pet}. Put your feet up, avoid standing for long, drink water and go easy on salt. Sudden swelling of the face or hands, especially with a headache or blurred vision, needs a BP check and a call to your doctor right away.`,
  },
  {
    id: 'sleep',
    match: /\b(sleep\w*|insomnia|position|lie down|lying)\b/,
    answer: ({ pet, weeks }) => `${weeks && weeks >= 28 ? 'From 28 weeks, going to sleep on your side (left is great) is safest for baby. ' : 'Side sleeping is comfiest as your bump grows. '}A pillow between your knees and one under your bump helps, ${pet}. A short walk in the evening, a warm shower and limiting fluids just before bed can also help you sleep through.`,
  },
  {
    id: 'exercise',
    match: /\b(exercise|workout|yoga|walk(ing)?|gym|swim\w*)\b/,
    answer: ({ pet }) => `If your doctor is happy, about 30 minutes of gentle activity most days is great, ${pet}: walking, prenatal yoga and swimming are lovely choices. Avoid contact sports, lying flat on your back for long after the first trimester, and getting overheated. Stop and call your doctor if you feel dizzy, breathless, or have pain or bleeding.`,
  },
  {
    id: 'scans',
    match: /\b(scan|ultrasound|test|appointment|check ?up|nt scan|anomaly|gtt)\b/,
    answer: ({ pet, weeks }) => {
      const next = !weeks ? '' : weeks < 11 ? ' Next up for you is likely the NT scan at 11–13 weeks.'
        : weeks < 18 ? ' Next up for you is likely the anomaly scan at 18–22 weeks.'
        : weeks < 24 ? ' Next up for you is likely the sugar test (GTT) at 24–28 weeks.'
        : weeks < 32 ? ' Next up for you is likely a growth scan around 32 weeks.' : ' From here, check-ups usually become more frequent.';
      return `The usual pregnancy check-ups, ${pet}: a dating scan at 6–9 weeks, the NT scan with blood tests at 11–13 weeks, the anomaly scan at 18–22 weeks, the sugar test (GTT) at 24–28 weeks, and a growth scan in the third trimester.${next} Your doctor may adjust this. You can tell me an appointment date and I'll remember it.`;
    },
  },
  {
    id: 'weight',
    match: /\b(weight gain|gain(ed)? weight|how much weight|weigh)\b/,
    answer: ({ pet }) => `Healthy weight gain depends on your weight before pregnancy, ${pet}: for most women it's about 11–16 kg in total, mostly in the second and third trimesters. Steady matters more than exact numbers; a sudden jump in a week, especially with swelling, is worth a call to your doctor. You can log your weight here and I'll chart it.`,
  },
  {
    id: 'labour',
    match: /\b(labou?r|contractions?|delivery|due date|go to (the )?hospital)\b/,
    answer: ({ pet }) => `Signs that labour may be starting, ${pet}: regular contractions that get stronger and closer together, a "show" of mucus, or your waters breaking. Go in when contractions are about 5 minutes apart for an hour, or as your doctor advised, and straight away if your waters break, you bleed, or baby moves less.`,
  },
  {
    id: 'stress',
    match: /\b(stress(ed)?|anxious|anxiety|worried|scared|nervous|overwhelmed)\b/,
    answer: ({ pet }) => `It's so natural to feel worried, ${pet}; it shows how much you already love your baby. Try slow breathing (in for 4, out for 6) for two minutes, and share what's on your mind with someone you trust. If worry or low mood is with you most days, please tell your doctor; Tele-MANAS on 14416 is free too.`,
  },
  {
    id: 'medicine',
    match: /\b(medicine|medication|tablet|pill|painkiller|paracetamol|dose|dosage|prescri\w*|supplement)\b/,
    answer: ({ pet }) => `I can't suggest medicines or doses, ${pet}. In pregnancy, please check every tablet, even common ones, with your doctor or pharmacist first.`,
  },
];

export function findTopics<C>(topics: Topic<C>[], text: string, max = 2): Topic<C>[] {
  return topics.filter(tp => tp.match.test(text)).slice(0, max);
}
