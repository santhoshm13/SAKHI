# SAKHI Architecture & Implementation Plan: Free, Private, Multi-Tier Intelligence Engine

## 1. Executive Summary & Intent
SAKHI is a compassionate, privacy-first women’s reproductive health and pregnancy tracking platform. Currently, natural language conversations and data logging rely on Google’s Gemini Flash Lite cloud API. 

This plan details a **100% free, private, hybrid AI architecture** that combines:
1. **Tier 1 (Conversational Intelligence):** Free on-device conversational AI via Chrome’s Built-in Prompt API (`window.ai` / Gemini Nano) and WebGPU fallback (`@mlc-ai/web-llm` with Qwen 2.5 1.5B/3B) for fluid, warm, empathetic natural language dialogues with zero server cost and total device-level privacy.
2. **Tier 2 (Structured Health Metric Extraction):** On-server / edge execution with **Cactus Compute** (<50MB footprint) embedded in SAKHI's Python ML service (`ai-health-app/ml-service`) to perform deterministic, grammar-constrained JSON parsing of vitals, symptoms, sleep, and cycle dates into database entries.
3. **Tier 3 (Cloud Fallback & Offline Heuristics):** Retains cloud Gemini when an API key is provided, and falls back to deterministic rule matching (`offlineChat.ts`) when offline or on non-accelerated legacy browsers.

---

## 2. System Architecture & Routing Flow

```
                                  User Chat Input
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      [Client-Side Chat Pipeline]                [Health Data Extraction]
                   │                                           │
       Does Browser Support window.ai?                         ▼
       (Chrome Built-In Gemini Nano)               POST /api/ml/chat-extract
            /                     \                            │
         [Yes]                   [No]                          ▼
           │                       │                  Cactus Compute Engine
           ▼                       ▼                   (sub-50MB RAM, CPU)
   Run Local Gemini Nano   Check WebGPU Support                │
   (0 download, 0 fees)     (Web-LLM / Qwen 1.5B)       Grammar-Constrained
           │                    /         \             Structured JSON Vitals
           │                 [Yes]        [No]                 │
           │                   │           │                   ▼
           │                   ▼           ▼            Save to SAKHI DB
           │            Run WebGPU LLM  Heuristic     (Blood Pressure, Sleep,
           │            (In-Browser)   Offline Reply   Period Start, Mood)
           │                   │           │
           └───────────────────┼───────────┘
                               ▼
                    Synthesized Warm Reply
                               +
                    Live Chart & Vital Updates
```

---

## 3. Component Breakdown

### A. Client-Side: Local Conversational Adapter (`frontend/lib/localChat.ts`)
- **Technology:** `window.ai` (W3C Prompt API) + WebGPU `@mlc-ai/web-llm` fallback.
- **Role:** Generates conversational empathy, symptom soothing advice, and answers medical questions without network hops.
- **Safety Prompting:** Built-in medical guardrails emphasizing that SAKHI is an educational companion, not a substitute for clinical diagnostics.

### B. Server-Side: Cactus Metric Extractor (`ai-health-app/ml-service`)
- **Technology:** `cactus-compute` Python library inside FastAPI.
- **Role:** Analyzes chat messages to extract clinical parameters:
  - Sleep duration (hours, quality)
  - Blood pressure (systolic / diastolic)
  - Blood sugar (mg/dL)
  - Kick counts / fetal movements
  - Mood & cycle indicators (spotting, cramps, flow)
- **Engine Constraint:** Uses grammar-based decoding to ensure responses are 100% valid JSON matching Pydantic schemas.

### C. Orchestration API Route (`frontend/app/api/ask-sakhi/route.ts` & `pregnancy`)
- **Role:** Bridges client conversational state with backend metric persistence.
- **Operation:**
  1. If user opted for local/free mode, forwards message to `/api/ml/chat-extract`.
  2. Applies extracted vitals to the user's encrypted local database.
  3. Returns confirmation data back to the frontend so dashboard charts update instantly.

---

## 4. Phased Implementation Roadmap

### Phase 1: Python ML-Service Cactus Setup
- [ ] Add `cactus` to `ai-health-app/ml-service/requirements.txt` and `pyproject.toml`.
- [ ] Create `ai-health-app/ml-service/extractors/vitals.py` with Pydantic models for `VitalExtractionResult` and `CycleExtractionResult`.
- [ ] Implement `POST /api/ml/chat-extract` in `main.py` utilizing Cactus tiny foundation models with grammar masking.
- [ ] Write integration test verifying extraction of phrases like *"slept 8.5h, mood irritable, BP 115/75"*.

### Phase 2: Frontend On-Device Chat Engine
- [ ] Create `frontend/lib/browserAi.ts` to detect `window.ai` availability and configure local streaming sessions.
- [ ] Configure graceful fallback to SAKHI's offline medical engine when browser-embedded AI is unavailable.
- [ ] Create user settings toggle: `"Prefer 100% Private Local AI (Free, Zero Cloud)"` in profile/consent settings.

### Phase 3: Route Integration & Database Tool Linking
- [ ] Update [ask-sakhi/route.ts](file:///c:/Users/Faster/Desktop/Balaji/SAKHI/frontend/app/api/ask-sakhi/route.ts) to route extraction through `/api/ml/chat-extract` when Gemini keys are absent or local mode is enabled.
- [ ] Update [ask-sakhi-pregnancy/route.ts](file:///c:/Users/Faster/Desktop/Balaji/SAKHI/frontend/app/api/ask-sakhi-pregnancy/route.ts) for maternal metrics (BP, kicks, fasting glucose).
- [ ] Verify that database documents (`daily_log`, `preg_log`, `cycle_log`) update correctly upon tool execution.

### Phase 4: Performance, Memory & Edge Case Verification
- [ ] Benchmark memory consumption to verify total backend memory remains under 150MB RAM.
- [ ] Test CPU latency to guarantee extraction completes under 350ms on standard multi-core hardware.
- [ ] Verify complete privacy: confirm zero network outbound calls to external LLM providers when Local Mode is active.

---

## 5. Risk Analysis & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Browser lacks `window.ai` support** | User gets static text instead of fluid chat | Seamless fallback to Web-LLM (WebGPU) or SAKHI’s rich local heuristic database in `offlineChat.ts`. |
| **Cactus platform dependency on Windows** | Build or C-binding issues during local dev | Wrap Cactus in a standard Python abstraction layer with regex fallback parity so the service never crashes. |
| **Ambiguous user chat messages** | Misinterpreted medical readings | Cactus confidence thresholds: if extraction certainty is low, prompt the user for clarification before database commit. |


---

## 6. Review Notes and What Was Built (2026-11-12)

These notes correct some assumptions above and describe what is now in the code.

**Corrections**
- **Chrome built-in AI (Gemini Nano)** is not "0 download". Chrome downloads a model of about 2 GB+ on first use. It needs a recent desktop Chrome with enough disk space and GPU/RAM, and is not available on mobile Chrome or other browsers. The API surface (`LanguageModel`, formerly `window.ai`) has changed several times. It is fine as a bonus, but not something to rely on.
- **WebLLM with Qwen 2.5 1.5B** is a ~1 GB download per device and needs WebGPU. That rules out most of SAKHI's likely users on mid-range Android phones. It also conflicts with this plan's own anti-goal of avoiding big downloads.
- **Cactus "<50 MB / <150 MB RAM / <350 ms"**: see the corrections in the Cactus design spec. Realistic figures are 150–400 MB models and 1–3 s on CPU, and they need a long-running host, not Vercel functions.
- **"Encrypted local database"**: the current store (Postgres `user_documents` → `.data` files → cookies) is not encrypted at rest by the app. Don't claim encryption in the UI until it exists.
- **Two separate pipelines** (client chat + server extraction) risk the reply and the saved data disagreeing. One server pipeline is simpler and keeps them consistent.

**What was built**
- **One server pipeline** (`frontend/lib/chat/engine.ts`) for both modes:
  1. A rule-based **safety check** runs before any model (`lib/chat/safety.ts`). Danger signs always get the same urgent advice, with Indian helplines 112 and Tele-MANAS 14416. In Mom Mode, emergencies also raise the dashboard alert.
  2. **Gemini** (default `gemini-2.5-flash-lite`, override with `GEMINI_MODEL`; falls back to `gemini-flash-lite-latest`). It has memory of the last 10 turns, a short summary of her own cycle or pregnancy data, a soothing tone, and multi-tool calls (up to 3 rounds).
  3. **Local / self-hosted model** via `LOCAL_LLM_URL` (see the Cactus spec notes).
  4. **Offline rules**, which always work.
- **Private mode** toggle (Settings → Privacy & your data): chats never go to Google.
- **Daily AI allowance** per user (`SAKHI_AI_DAILY_LIMIT`, default 50). After that, Sakhi switches to simple mode until tomorrow and logging keeps working. `GET /api/ai-status` shows engines, key-pool counts (never keys) and today's usage.
- **Chat history** is saved per user (`chat_her`, `chat_mom`). It is kept in the browser when the server has no database. Users can clear it from the chat.
- **Voice**: natural voice selection, sentence-by-sentence speech, lip-sync from word boundaries, an English (India) accent by default, auto-send after speaking, a hands-free conversation mode, and clear microphone error messages.
