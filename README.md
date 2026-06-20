# PreVisit

AI-powered longitudinal patient briefing system. A voice-first AI checks in with
chronic-illness patients (hardcoded to Rheumatoid Arthritis) between appointments,
extracts doctor-defined clinical metrics, and generates a physician-ready pre-visit
briefing. Hackathon MVP.

## Structure

```
shared/        TypeScript contracts (imported by both sides)
backend/       Node + Express API, Deepgram WS relay, Redis, Claude, Arize
frontend/      Vite + React + Tailwind (/patient mobile flow, /doctor dashboard)
scripts/       seed.ts — loads Sarah Chen demo data into Redis
demo-data/     rheumatology-patient.json
```

## Setup

1. `cp .env.example .env` and fill in keys (Anthropic, Deepgram, Redis, Token Company, Arize).
2. Backend: `cd backend && npm install && npm run seed && npm run dev`
3. Frontend: `cd frontend && npm install && npm run dev`
4. Open `http://localhost:5173/patient` (phone-style) and `/doctor/demo-sarah-chen-ra`.

> **Mic needs HTTPS on mobile.** For phone testing, deploy the frontend (Vercel) and
> backend (Render) — `localhost` works on desktop only. Test on a real phone hour one.

## Key architecture decisions

- **Two-phase check-in:** interim transcripts drive instant keyword highlighting on the
  frontend (no API call); a single Claude call runs on the final transcript after "Done".
- **Audio:** browser captures 16 kHz linear16 PCM via an AudioWorklet (`public/pcm-worklet.js`)
  and streams it over WebSocket to the backend Deepgram relay. (Avoids MediaRecorder/opus
  chunk-header breakage.)
- **In-progress check-ins** live in `checkin:{id}` with a TTL; promoted to the ZSet on `/complete`.
- **Models:** extraction → `claude-haiku-4-5`; summary → `claude-sonnet-4-6`.
- **Deepgram param** is `keyterm` (singular), not `keyterms`.

## Outstanding wiring (see plan)

- Arize: run the `arize-instrumentation` skill; emit token-before/after as custom span attributes.
- Token Company: verify the JS export name (`with_compression` vs `withCompression`); passthrough fallback is in place.
- Deepgram SDK option names/event payloads — validate against the installed `@deepgram/sdk` version.
