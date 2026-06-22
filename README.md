# Interim

Voice-first AI that interviews chronic-illness patients (built around Rheumatoid
Arthritis) between appointments and turns those conversations into a physician-ready
pre-visit briefing — so the doctor walks in already knowing what changed.

**Live:** https://interim-pc04.onrender.com → `/patient` (mobile) · `/doctor` (dashboard)

## What it does

- **Patient (mobile):** logs in, taps a mic, and talks naturally about how they've been.
  An AI conversation extracts clinical metrics, checks topics off live as they speak, and
  asks staged follow-ups for anything vague. Patients can also type, and can "add an update"
  if symptoms change after finishing a check-in.
- **Doctor (desktop):** a patient directory plus a per-patient briefing — "Why This Visit
  Matters," a since-last-visit summary, a pain-trend chart, a key-events timeline, anomaly
  flags, and the patient's own words. Doctors can edit/regenerate the briefing and configure
  custom tracked parameters that flow back into what the patient is asked.

## Structure

```
shared/        TypeScript contracts (types.ts) imported by both sides
backend/       Node + Express — API, Deepgram WS relay, Redis, Claude, Arize
  src/routes/    checkin, summary, patient (login/checkins/anomaly/parameters), demo
  src/services/  deepgram, redis, claude, arize, anomaly
  src/prompts/   combined (extraction), summary
frontend/      Vite + React + Tailwind
  src/pages/       LandingPage, PatientCheckin, DoctorDirectory, DoctorDashboard, DemoSetup
  src/components/  AIConversation, VoiceRecorder, LiveChecklist, DoctorTopBar, MetricChart, …
scripts/       seed.ts — loads the Sarah Chen demo arc into Redis
demo-data/     rheumatology-patient.json
```

## Run locally

1. `cp .env.example .env` and fill in keys (Anthropic, Deepgram, Redis, Token Company, Arize).
2. Backend: `cd backend && npm install && npm run seed && npm run dev`
3. Frontend: `cd frontend && npm install && npm run dev`
4. Open `http://localhost:5173/patient` and `/doctor`.

In dev, Vite proxies `/api` and `/ws` to the backend on `:3001`, so the browser only ever
talks to one origin (matches production). `server.host: true` exposes the dev server on the
LAN for phone testing.

> **Mic needs HTTPS on mobile.** `localhost` works on desktop only — use the deployed URL
> (or a tunnel) to test voice on a real phone.

## Deployment — single Render service, no Vercel

The whole app is **one Node web service on Render**. Express builds and serves the React
SPA (`frontend/dist`) *and* the JSON API *and* the Deepgram WebSocket from a single origin —
so there's no CORS and `wss://` just works over HTTPS. **Redis Cloud** (via `REDIS_URL`) is
the only external piece.

- Blueprint: `render.yaml`. Build installs+builds frontend then backend; start runs
  `node backend/dist/backend/src/index.js`.
- `buildCommand` uses `npm install --include=dev` because `NODE_ENV=production` otherwise
  skips devDependencies — and the build tools (vite, typescript, tailwind) live there.
- Static serving + SPA fallback live in `backend/src/index.ts` (any non-`/api`, non-`/ws`,
  non-`/health` GET serves `index.html`).
- The six secrets are `sync: false` in the blueprint; Render prompts for them on first deploy.

## Architecture notes

- **Two-phase check-in:** interim transcripts drive instant keyword highlighting on the
  frontend (no API call); a single Claude call runs on the final transcript after "Done".
- **Audio:** the browser captures 16 kHz linear16 PCM via an AudioWorklet and streams it over
  WebSocket to the backend Deepgram relay (avoids MediaRecorder/opus chunk-header breakage).
- **Patient identity:** the patient logs in (`POST /api/patient/login`), the choice persists in
  `localStorage["interim.patient"]`, and check-ins are sent with that `patient.id` so they tie
  to the doctor's `/doctor/:patientId` view.
- **Check-in lifecycle:** `/api/checkin` writes `checkin:{id}` (short TTL); `/:id/followup`
  merges newly-found metrics server-side (never null-overwrites a confirmed value);
  `/:id/complete` persists it and zAdds to `checkins:{patientId}`. Completed check-ins aren't
  deleted, so "add an update" can append to one already finished.
- **Strict extraction + staged follow-ups:** vague/qualitative answers are recorded as `null`
  and surfaced as ambiguous rather than guessed; follow-ups escalate (presence question first,
  then a precise-detail question) so the doctor gets specific data.
- **Configurable tracking:** `GET/PUT /api/patient/:id/parameters` lets the doctor define which
  metrics are tracked, which the patient prompts then ask about.
- **Models:** extraction → `claude-haiku-4-5`; summary → `claude-sonnet-4-6`.
- **Deepgram:** installed `@deepgram/sdk@4.x` — `createClient` → `listen.live()`,
  `LiveTranscriptionEvents` (Transcript = `"Results"`), `connection.send()/finalize()`.
  The keyterm param is `keyterm` (singular), not `keyterms`.

## Observability and compression

- **Arize:** the Anthropic SDK is auto-instrumented; extraction and summary calls produce
  traces. `initArize()` runs first in `index.ts`, before the SDK is used, so the patch lands.
- **Token Company:** the official Node SDK compresses check-in history before summary
  generation, while schemas and clinical-output instructions stay untouched. If compression is
  unavailable, the backend falls back to the original history.
