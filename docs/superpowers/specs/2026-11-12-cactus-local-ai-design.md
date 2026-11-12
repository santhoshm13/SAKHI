# Design Spec: Free Local Intelligence for SAKHI via Cactus Compute

## 1. Intent & Motivation
SAKHI currently relies on Google Gemini Flash Lite for empathetic chat and health metric extraction (blood pressure, sleep, kick counts, menstrual cycle days, mood). When API keys are exhausted or users prefer total privacy, the system falls back to regex-based rule matching in `offlineChat.ts`. 

The goal is to provide a **100% free, private, serverless/low-resource AI layer** using **[Cactus Compute](https://github.com/cactus-compute/cactus)** to perform local agentic tool calling and structured health metric extraction without incurring external token fees or sending sensitive medical information across third-party cloud APIs.

---

## 2. Goals, Non-Goals, and Anti-Goals
- **Goals:**
  - Zero API costs and zero token billing.
  - On-device / lightweight CPU execution (< 50MB memory footprint).
  - Reliable structured JSON extraction from chat inputs (e.g., extracting "slept 8.5h, mood irritable, BP 120/80" into SAKHI vital logs).
  - Seamless fallback integration in Next.js routes (`/api/ask-sakhi` and `/api/ask-sakhi-pregnancy`).
- **Non-Goals:**
  - Replacing the cloud Gemini tier entirely (Gemini remains an opt-in toggle when configured).
  - Training massive multi-billion parameter foundation models from scratch.
  - Generating long-form creative medical essays; responses remain concise, safe, and clinically grounded.
- **Anti-Goals:**
  - Introducing heavy GPU dependencies (e.g., CUDA/vLLM) that break lightweight CPU hosting.
  - Requiring users to download gigabytes of model weights in their browser on first load.

---

## 3. Approaches Considered & Trade-Offs

### Approach A: Cactus in SAKHI's Python ML-Service (Recommended)
- **Architecture:** Mount Cactus inside `ai-health-app/ml-service/main.py` (FastAPI). Add an endpoint `/api/ml/chat-extract` that accepts raw chat text and returns structured extraction + empathetic guidance using sub-50MB Cactus weights.
- **Pros:** 
  - Fits directly into the existing FastAPI service defined in `vercel.json`.
  - Runs in Python where Cactus has native, mature bindings.
  - Zero browser download penalty for users on mobile devices.
  - Fully local and private.
- **Cons:** Requires the Python microservice to be running alongside Next.js in production/deployment.

### Approach B: Client-Side WebGPU / In-Browser Cactus (WASM / React Native)
- **Architecture:** Run Cactus or Web-LLM inside the browser client via WebGPU/WASM.
- **Pros:** Zero server requirement; works even if all backend services are disconnected.
- **Cons:** Dependent on browser WebGPU support, may fail on older mobile phones, and initial client download delays first interaction.

### Approach C: Cloudflare Workers AI / Free Edge Inference
- **Architecture:** Route requests to Cloudflare's free Workers AI tier (running Llama 3.2 1B).
- **Pros:** Fast, zero maintenance.
- **Cons:** Still a third-party cloud service; does not achieve complete local privacy.

---

## 4. Architecture & System Flow

```
User Input (Chat)
       │
       ▼
Next.js API Route (/api/ask-sakhi)
       │
       ├─► [Consent Check / Local AI Preference]
       │
       ├─► If GEMINI_API_KEY configured & active ──► Google Gemini API (Cloud)
       │
       └─► If Local Mode / Gemini Unavailable ────► SAKHI ML-Service (/api/ml/chat-extract)
                                                           │
                                                           ▼
                                                    Cactus Engine (<50MB)
                                                           │
                                             ┌─────────────┴─────────────┐
                                             ▼                           ▼
                                    Structured Vitals           Compassionate Reply
                                   (BP, Sleep, Cycle)           (Clinically Grounded)
                                             │                           │
                                             └─────────────┬─────────────┘
                                                           ▼
                                                Update SAKHI Database
                                                           ▼
                                                Return Response to User
```

---

## 5. Detailed Implementation Steps

### Phase 1: Environment & Cactus Integration in ML-Service
1. Add `cactus` to `ai-health-app/ml-service/requirements.txt` and `pyproject.toml`.
2. Initialize Cactus with the lightweight sub-50MB model in `main.py` on startup.
3. Define Pydantic schemas for extracted health metrics:
   - `VitalMetrics`: `systolic`, `diastolic`, `fasting_sugar`, `kick_count`, `sleep_hours`, `weight`, `mood`, `symptoms`.
   - `CycleMetrics`: `period_start_date`, `flow_intensity`, `cramps_severity`.

### Phase 2: Microservice API Endpoint
1. Create `POST /api/ml/chat-extract` in `ai-health-app/ml-service/main.py`:
   - Input: `{ "message": str, "mode": "her" | "pregnancy", "user_context": dict }`
   - Output: `{ "reply": str, "extracted_vitals": dict, "tool_action": Optional[str] }`
2. Implement grammar-constrained JSON output using Cactus to guarantee 100% valid schema adherence without hallucinations.

### Phase 3: Frontend Route Integration
1. Update `frontend/app/api/ask-sakhi/route.ts` and `frontend/app/api/ask-sakhi-pregnancy/route.ts`:
   - Connect the offline fallback branch to call `POST /api/ml/chat-extract`.
   - Automatically execute SAKHI tools (`logHerTool`, `logPregnancyVital`) using the structured JSON returned by Cactus.
   - If the ML-service is unreachable, gracefully fall back to the existing deterministic `offlineChat.ts`.

### Phase 4: Verification & Benchmarking
1. Test memory usage to confirm the ML service stays under 150MB total RAM.
2. Verify extraction accuracy for common phrases ("logged 8.5 hours sleep, feeling irritable", "BP was 118/76 today").
3. Ensure zero latency regressions on CPU execution (< 300ms inference).


---

## 6. Review Notes and What Was Built (2026-11-12)

These notes correct some assumptions above and describe what is now in the code.

**Corrections**
- **Model size.** No useful chat model fits in 50 MB. The smallest usable instruction models (Gemma 3 270M, Qwen 2.5 0.5B, SmolLM2 360M) are roughly 150–400 MB quantised, and need 0.5–1 GB of RAM while running. "Under 150 MB total RAM" and "under 300 ms" are not realistic: expect 1–3 s per short reply on CPU.
- **Hosting.** Vercel serverless functions (including the Python `ml-service` there) cannot hold model weights in memory or run long CPU inference. A local model needs a long-running host: the user's own machine, a small VM, or a phone app.
- **Grammar-constrained JSON** guarantees valid JSON *syntax*, not correct values. A small model can still output a wrong BP or date. Readings must still be range-checked, and unclear ones confirmed with the user.
- **Cactus** targets on-device apps (mobile/desktop SDKs). For a web backend, run any OpenAI-compatible server (Cactus's server mode if available, or Ollama / llama.cpp `llama-server` / LM Studio) instead of new Python bindings.

**What was built (simpler, same goal)**
- `frontend/lib/chat/localLlm.ts`: an optional local provider behind `LOCAL_LLM_URL` / `LOCAL_LLM_MODEL` / `LOCAL_LLM_API_KEY`. It works with any OpenAI-compatible `/chat/completions` server, has a 15 s timeout, and backs off for 60 s after a failure.
- **Data is never decided by the small model.** The existing rule extractor (`offlineChat.ts`) still saves the readings, range-checked; impossible values are not saved and Sakhi asks her to re-check them. The local model only rewrites the reply to sound warmer.
- **Order of engines** (`frontend/lib/chat/engine.ts`): safety rules → Gemini → local model → offline rules. Private mode (Settings → Privacy) skips Gemini entirely.
- `GET /api/ai-status?ping=1` reports whether the local server is reachable.
