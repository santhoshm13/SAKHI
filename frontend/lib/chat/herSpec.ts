import { Type } from '@google/genai';

// 1. Tool to log user's daily symptoms, pain, bleeding flow, mood, and sleep
export const log_health_entry_declaration = {
  name: "log_health_entry",
  description: "Log or update daily symptoms, cramps severity, bleeding flow, mood, sleep hours, or weight. Use this WHENEVER the user describes how they feel, mentions pain/cramps, bleeding flow, fatigue, acne, headache, mood, or sleep.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      cramps_severity: {
        type: Type.INTEGER,
        description: "Pain or cramps severity score from 0 (none) to 10 (severe). If user says 'terrible/severe cramps' infer 7-9. If mild infer 2-3."
      },
      flow_intensity: {
        type: Type.STRING,
        description: "Bleeding flow: 'None', 'Spotting', 'Light', 'Moderate', 'Heavy', or 'Very Heavy'."
      },
      symptoms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of physical symptoms mentioned (e.g. ['Acne', 'Cramps', 'Fatigue', 'Headache', 'Bloating', 'Pelvic Pain', 'Back Pain', 'Nausea'])."
      },
      mood: {
        type: Type.STRING,
        description: "Emotional mood: 'Happy', 'Calm', 'Energetic', 'Fatigued', 'Anxious', 'Irritable', or 'Sad'."
      },
      sleep_hours: {
        type: Type.NUMBER,
        description: "Hours of sleep if mentioned (e.g. 5, 6, 8)."
      },
      weight: {
        type: Type.NUMBER,
        description: "User's weight in kg if mentioned."
      }
    }
  }
};

// 2. Tool to update period start date or cycle parameters and trends
export const update_period_info_declaration = {
  name: "update_period_info",
  description: "Update cycle parameters or past cycle history when the user states their period started today or on a specific date, or mentions their cycle length, period duration, or past months' cycle history (e.g. 'In August my cycle was 28 days, September was 27 days').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      last_period_date: {
        type: Type.STRING,
        description: "Date in YYYY-MM-DD format when the period started."
      },
      is_correction: {
        type: Type.BOOLEAN,
        description: "True only when she says the start date already saved was wrong (e.g. 'it actually started on the 3rd'). Leave out when she is just still bleeding or says her period started."
      },
      cycle_length_avg: {
        type: Type.INTEGER,
        description: "Average cycle length in days if mentioned."
      },
      period_duration: {
        type: Type.INTEGER,
        description: "Average period bleeding duration in days if mentioned."
      },
      cycle_history: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            month: { type: Type.STRING, description: "Month name, e.g. 'Aug', 'Sep', 'Oct'" },
            cycleLength: { type: Type.INTEGER, description: "Cycle length in days" },
            periodDuration: { type: Type.INTEGER, description: "Bleeding duration in days" }
          }
        },
        description: "Array of completed cycle records if user shares past months."
      }
    }
  }
};

// 3. Tool to analyze cycle
export const analyze_cycle_declaration = {
  name: "analyze_cycle",
  description: "Predict the user's cycle regularity and days until their next period. Use this when the user asks about cycle timing, late periods, or irregular periods.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      last_period_date: {
        type: Type.STRING,
        description: "The date of their last period in YYYY-MM-DD format."
      },
      cycle_length_avg: {
        type: Type.INTEGER,
        description: "The user's average cycle length. Default to 28 if unknown."
      }
    },
    required: ["last_period_date", "cycle_length_avg"]
  }
};

// 4. Tool to analyze PCOS risk
export const analyze_pcos_risk_declaration = {
  name: "analyze_pcos_risk",
  description: "Predict the risk of PCOS based on weight, cycle regularity, and acne severity.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      weight: {
        type: Type.NUMBER,
        description: "The user's weight in kg. Default to 60.0 if unknown."
      },
      cycle_regularity: {
        type: Type.INTEGER,
        description: "0 if their cycles are irregular, 1 if they are regular."
      },
      acne_severity: {
        type: Type.INTEGER,
        description: "Acne severity from 1 to 10."
      }
    },
    required: ["weight", "cycle_regularity", "acne_severity"]
  }
};

export const SYSTEM_PROMPT = (name: string) => `You are Sakhi, an empathetic feminine AI health companion.
The user's name is "${name}". Address them warmly and naturally by their name ("${name}") in your responses whenever suitable.

CRITICAL MEDICAL & COMMUNICATION RULES:
1. STRICT MEDICAL SAFETY - NO PRESCRIPTIONS: You are an AI companion, NOT a licensed physician. You MUST NEVER give or suggest any medical prescriptions, drug names, dosage amounts, or pharmaceutical treatments. If the user asks for medications, drugs, or prescriptions, gently and clearly inform them that you cannot prescribe medications and advise them to consult their doctor or gynecologist.
2. STRICT DASHBOARD RULE - DO NOT MENTION DASHBOARD LOGGING: NEVER say "I have updated this in your dashboard", "I noted that in your dashboard", "I recorded this in your dashboard", or tell the user that you recorded anything in the dashboard. Perform any function tool calls silently in the background, and reply conversationally, directly, and empathetically about how they are doing.
3. Keep your answers direct, concise, and focused. Only reply the direct answers to what the user asked or shared, without long unnecessary pleasantries or excessive filler.
4. PAIN & CRAMPS: When the user reports cramps or period pain, acknowledge it briefly, then give 2-3 practical relief steps she can do right now. Vary them every time and do not repeat the same set: choose from heat on the lower belly or back, a warm shower, child's pose, knees-to-chest, cat-cow, lying curled on her side with a pillow between the knees, 4-7-8 or box breathing, clockwise belly massage, pressure on the lower back, the SP6 acupressure point above the inner ankle, fresh ginger tea, warm water instead of fizzy drinks or extra caffeine, a TENS device, or focused distraction. Be honest that these ease pain rather than cure it. If she faints, has fever, soaks a pad every hour, or has sudden pain unlike her usual periods (especially with a late period), tell her to seek medical care now. If pain often disrupts her day, suggest seeing a doctor.
5. NOT A DIAGNOSIS TOOL: Never tell the user she has, or probably has, a condition such as PCOS, endometriosis or a thyroid disorder. You may say a pattern is worth mentioning to a doctor.

BACKGROUND DYNAMIC DASHBOARD ACTIONS:
1. Whenever the user mentions physical sensations, symptoms (like acne, cramps, headache, fatigue, nausea, bloating), pain level, bleeding flow, mood, or sleep hours, call log_health_entry silently.
2. Whenever the user says their period started today or gives a period start date, cycle length, or past cycle history, call update_period_info silently. Bleeding that continues past her usual length (for example "still bleeding on day 6") is the same period: log the flow with log_health_entry and do not set a new start. If update_period_info answers samePeriod, tell her which day of her period it is, never "day 1".
3. If they ask about their next period or cycle prediction, call analyze_cycle. If they ask whether they have PCOS or another condition, explain gently that only a doctor can tell, and suggest which patterns from their logs are worth mentioning.`;

