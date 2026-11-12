# Sakhi

**A women's health companion built for India: period and hormone care in Her Mode, pregnancy and after-birth care in Mom Mode.**

Sakhi ("friend" in Hindi) turns everyday logs, lab reports and a friendly chat into clear guidance. It tells a woman what is normal, what to watch, and when to see a doctor. It is designed for low-cost phones, patchy networks, Indian languages and the public health system: ASHA workers, government hospitals and national schemes.

> Sakhi supports care. It does not replace it. Every warning sign in the app points to a doctor, a hospital or an emergency number.

---

## Contents

- [Features](#features)
- [Safety and clinical grounding](#safety-and-clinical-grounding)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Risk models](#risk-models)
- [Data and privacy](#data-and-privacy)
- [What works without AI or a connection](#what-works-without-ai-or-a-connection)
- [Verifying changes](#verifying-changes)
- [Deployment](#deployment)
- [Further reading](#further-reading)

---

## Features

### Her Mode: cycles, hormones and everyday health

| Area | What it does |
|---|---|
| Cycle tracking | Phase engine that learns her own cycle and period length, handles long periods, late and very late periods, and shows a confidence level. |
| Goals | Switch between *just tracking*, *trying for a baby* (fertile window, folic acid, when to see a doctor) and *nearing menopause* (hot flashes, sleep, mood, bone health). |
| Pain relief | Severity-aware relief toolkit that opens automatically after a painful check-in. |
| Patterns | PCOS-style pattern table (month by month, longest gap between periods), symptom and mood trends. |
| Anaemia watch | Combines fatigue, dizziness, breathlessness, heavy flow and Hb results into a simple *clear / watch / check* signal with iron-rich food ideas. |

### Mom Mode: pregnancy and after the birth

| Area | What it does |
|---|---|
| Week by week | Trimester, baby size, due-date countdown and growth timeline. |
| Vitals | Blood pressure, fasting sugar, weight gain against her BMI band, and fetal kick counts. |
| Risk screening | Preeclampsia and gestational diabetes models that score **only readings she actually logged**, with plain-language explanations. |
| Late pregnancy | Contraction timer with *go to hospital now* rules, and a hospital bag checklist from 28 weeks. |
| Government schemes | Short questionnaire that shows which of PMMVY, JSY, JSSK and PMSMA apply to her, with the steps to claim each. |
| After the birth | One tap switches to postnatal care: feed and nappy log with side tracking, a daily recovery check for the postnatal danger signs, and baby's vaccine dates on India's Universal Immunisation Programme schedule. |

### Shared across both modes

- **Sakhi chat.** Logs vitals, symptoms and tablets from ordinary sentences ("BP 121/79", "took my iron tablet after dinner") and answers questions using her own data. Replies in English, Hindi, Tamil or Telugu.
- **Voice.** Speech in and out, with a choice of a young girl's or a woman's voice.
- **Lab report photo.** Photograph a report; Sakhi reads Hb, sugars, HbA1c, TSH, ferritin, platelets, vitamin D, B12, urine protein and BP. Every value is shown for review before it is saved, and each is checked against WHO, IADPSG/DIPSI and ATA ranges.
- **Tablet ledger.** Prescriptions the Indian way: morning, afternoon, evening and night slots, before or after food, `1-0-1` patterns, and due times worked out from her meal times. Keeps a 14-day on-time / late / missed record.
- **Mood check.** Two-weekly PHQ-4 with a safety question. A crisis answer surfaces Tele-MANAS (14416) immediately.
- **Family alert.** Up to three contacts. When a red flag appears, one tap sends a ready-written WhatsApp or SMS, optionally with her location.
- **Help near you.** Google Maps searches for the nearest government hospital, PHC, Jan Aushadhi store or blood bank, plus 108, 102, 104 and 181.
- **Doctor summary.** Printable report with vitals, labs, tablet adherence, cycle patterns, mood flags and suggested questions for the visit.
- **Discreet mode.** PIN lock, neutral tab title and notifications, and a quick-hide button for shared phones.
- **Offline logging.** Logs saved with no signal stay on the phone and are sent automatically when the connection returns.

---

## Safety and clinical grounding

Sakhi is conservative by design.

- **Safety check first.** Every chat message passes a rule-based safety check before any AI model sees it. Bleeding, severe headache with vision changes, reduced fetal movement, waters breaking and self-harm language return emergency guidance at once.
- **Red-flag banner.** Emergencies from chat, check-ins, the recovery check or the mood check open a banner with 112, the nearest hospital and the family alert.
- **No made-up readings.** Risk models are only run on values she entered. Missing inputs are reported as *not scored*, never filled with defaults.
- **Referenced thresholds.** WHO anaemia cut-offs, ACOG blood-pressure bands, IADPSG and DIPSI glucose criteria, ATA trimester TSH ranges, MoHFW antenatal supplements and the UIP vaccine schedule.
- **Clear limits.** Guidance always ends with *when to see a doctor*. Scheme amounts are labelled as subject to state rules, with a prompt to confirm with an ASHA worker.

---

## Architecture

```
Browser (Next.js App Router, React 19)
  ├─ Her Mode / Mom Mode dashboards, chat, voice (Web Speech API)
  ├─ On-device OCR fallback (tesseract.js) and offline outbox
  │
  ▼
Next.js API routes (/api/*)
  ├─ Chat engine:  safety check → tablet logging → Gemini (tools) → offline rules / local LLM
  ├─ Risk scoring: Python ML service, or the identical TypeScript model copy
  ├─ Lab reading:  Gemini vision, with on-device OCR as fallback
  └─ Store:        one document store per user
        ├─ PostgreSQL (user_documents) when DATABASE_URL is set
        ├─ local JSON files (.data/) in development
        └─ httpOnly cookies as the last resort
```

Every feature degrades gracefully: without Gemini the chat uses its offline engine; without the Python service risk scoring uses the TypeScript models; without a database data is stored locally.

---

## Tech stack

| Layer | Technology |
|---|---|
| Web app | Next.js 15 (App Router), React 19, TypeScript |
| Styling and motion | Tailwind CSS 4, Framer Motion, Phosphor Icons |
| Authentication | NextAuth.js (Google OAuth, email and password, guest accounts) |
| AI | Google Gemini via `@google/genai` (chat with tool calls, vision), optional OpenAI-compatible local model |
| On-device | Web Speech API (voice), tesseract.js (OCR) |
| Data | PostgreSQL (`pg`), with a file store for development |
| ML service | Python, FastAPI, scikit-learn-trained logistic regression exported to JSON |
| Hosting | Vercel (frontend and ML service as separate services, see `vercel.json`) |

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- Python 3.11 (only for the optional ML service)
- PostgreSQL (optional; local files are used without it)

### 1. Configure

```bash
cd frontend
cp .env.example .env.local
```

Fill in `NEXTAUTH_SECRET` at minimum. See [Configuration](#configuration) for the rest.

### 2. Run the web app

```bash
npm install
npm run dev
```

Open http://localhost:3000. The onboarding page offers one-click **Her Mode demo** and **Mom Mode demo** accounts.

### 3. Run the ML service (optional)

```bash
cd ai-health-app/ml-service
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Set `ML_SERVICE_URL=http://127.0.0.1:8000` in `frontend/.env.local`. If the service is not running, the app uses the TypeScript copy of the same models, so every feature still works.

---

## Configuration

All variables go in `frontend/.env.local` locally, or in your hosting provider's settings.

| Variable | Required | Purpose |
|---|---|---|
| `NEXTAUTH_SECRET` | Yes (production) | Signs sessions. |
| `NEXTAUTH_URL` | Yes (production) | Public URL of the app. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Enables Google sign-in. |
| `DATABASE_URL` | No | PostgreSQL connection. Without it, data is stored in `frontend/.data/`. |
| `GEMINI_API_KEY` or `GEMINI_API_KEYS` | No | Gemini for chat, Indian-language replies and lab photo reading. `GEMINI_API_KEYS` takes a comma-separated pool. |
| `GEMINI_MODEL` | No | Model name. Default `gemini-2.5-flash-lite`. |
| `SAKHI_AI_DAILY_LIMIT` | No | Gemini replies per user per day. Default `50`. |
| `LOCAL_LLM_URL`, `LOCAL_LLM_MODEL`, `LOCAL_LLM_API_KEY` | No | OpenAI-compatible local model (for example Ollama at `http://localhost:11434/v1`) for private mode. |
| `ML_SERVICE_URL` | No | Python risk-model service. Falls back to the TypeScript models. |
| `SAKHI_DATA_DIR` | No | Folder for the local file store. Default `frontend/.data/`. |
| `SAKHI_DISABLE_FILE_STORE` | No | Set to `1` to turn the file store off. |
| `SAKHI_TZ` | No | Time zone for tablet logging from chat. Default `Asia/Kolkata`. |

---

## Project structure

```
SAKHI/
├─ frontend/                 Next.js app
│  ├─ app/                   Pages (her-mode, pregnancy-mode, doctor-summary, onboarding…) and /api routes
│  ├─ components/            Dashboard cards, chat, check-ins, postpartum, labs, tablets, alerts
│  ├─ hooks/                 Chat, notifications and per-user document hooks
│  └─ lib/
│     ├─ chat/               Chat engine, safety check, offline rules, language, context
│     ├─ ml/                 TypeScript copy of the risk models
│     ├─ store.ts            Unified per-user data store
│     └─ cyclePhase.ts, labs.ts, tablets.ts, postpartum.ts, herGoal.ts, mood.ts, outbox.ts …
├─ ai-health-app/ml-service/ FastAPI risk-model service, training scripts and datasets
├─ ARCHITECTURE.md           Detailed system design
├─ DEMO.md                   Two-minute demo walkthrough
└─ vercel.json               Multi-service deployment config
```

---

## Risk models

Models are standardised logistic regressions trained on public datasets and stored as plain JSON (`ai-health-app/ml-service/models/risk_models.json`, mirrored to `frontend/lib/ml/risk_models.json`). Each prediction returns its main drivers, clinical rule flags and a model card.

| Screen | Data and method | 5-fold cross-validation |
|---|---|---|
| Preeclampsia / maternal risk | UCI Maternal Health Risk (452 unique rows) plus ACOG blood-pressure thresholds | ROC-AUC 0.84, sensitivity 0.87 at the screening cut-off |
| Gestational diabetes | Pima Indians Diabetes (768 rows) plus the DIPSI ≥140 mg/dL rule | ROC-AUC 0.83, sensitivity 0.85 at the screening cut-off |
| PCOS | Rotterdam criteria (rule-based; no open dataset with matching inputs) | — |
| Thyroid | Symptom screen (rule-based) | — |
| Cycle | Cycle statistics (21–35 day normal range, more than 9 days' variation flagged) | — |

- Retrain: `python train_models.py` (datasets and citations in `ai-health-app/ml-service/data/README.md`).
- Check that the Python and TypeScript copies agree: `python scripts/check_parity.py`.

These are screening aids trained on small public datasets. They are not diagnostic and have not been clinically validated on Indian populations.

---

## Data and privacy

- **One store.** All user data goes through `frontend/lib/store.ts`. Guests get their own isolated id.
- **Consent first.** First use shows a consent screen. Declining AI processing keeps the chat working on the offline engine, and no message is sent to Gemini.
- **Her control.** Settings offers **Download my data** (`/api/export-data`) and **Delete all my data** (`/api/reset-data`).
- **On the phone.** Discreet-mode PINs are stored salted and hashed. Logs waiting to sync and the last copy of her cards are kept in browser storage and cleared on sign-out.
- **Location.** Location is never stored. It is only added to a family alert message when she taps to include it, and map searches open in Google Maps.
- **Hardening.** Chat and lab reading are rate-limited, security headers are set, `/api/*` responses are never cached, and `NEXTAUTH_SECRET` is required in production.

---

## What works without AI or a connection

| Capability | Without a Gemini key | Without a connection |
|---|---|---|
| Logging from chat (BP, sugar, kicks, symptoms, tablets) | Yes (offline engine) | No (needs the server) |
| Chat replies | Yes, in English | No |
| Hindi, Tamil and Telugu replies | No: falls back to English with a notice | No |
| Lab report reading | Yes, with on-device OCR | OCR runs on the device; saving waits for the connection |
| Daily check-ins and card updates | Yes | Yes: queued and sent automatically later |
| Risk scores, doctor summary, schemes, vaccines | Yes | Shown from what was last loaded |

---

## Verifying changes

```bash
cd frontend
npx tsc --noEmit
```

```bash
npm run build
```

Use the demo accounts on the onboarding page to try both modes end to end.

---

## Deployment

The repository is set up for Vercel with two services (see `vercel.json`): the Next.js app from `frontend/` and the FastAPI ML service from `ai-health-app/ml-service/`, reachable at `/api/ml/*`. Set `NEXTAUTH_URL`, `NEXTAUTH_SECRET` and `DATABASE_URL` in the project settings; the file store is turned off automatically on Vercel.

---

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md): system design, data flows and component hierarchy
- [DEMO.md](DEMO.md): a two-minute walkthrough for presentations
- [ai-health-app/ml-service/data/README.md](ai-health-app/ml-service/data/README.md): datasets and citations

---

**Medical disclaimer:** Sakhi provides general health information and screening support. It is not a medical device and does not diagnose or treat any condition. In an emergency, call **112** or **108**, or go to the nearest hospital.

*Built by NextGen Creators.*
