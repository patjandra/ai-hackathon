import "./env.js"; // must be first — loads root .env before clients read process.env
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

import { initArize } from "./services/arize.js";
import { connectRedis } from "./services/redis.js";
import { attachDeepgramProxy } from "./services/deepgram.js";
import checkinRouter from "./routes/checkin.js";
import summaryRouter from "./routes/summary.js";
import patientRouter from "./routes/patient.js";
import demoRouter from "./routes/demo.js";

// Arize tracing must be initialized before the Anthropic SDK is used so the
// instrumentation can patch the client. Keep this first.
await initArize();
await connectRedis();

const app = express();
// Allow the configured prod origin plus any localhost port in dev, so Vite
// landing on 5173 vs 5174 never causes a CORS block.
app.use(
  cors({
    origin: (origin, cb) => {
      const ok =
        !origin ||
        origin === process.env.FRONTEND_URL ||
        /^http:\/\/localhost:\d+$/.test(origin);
      cb(null, ok);
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/checkin", checkinRouter);
app.use("/api/summary", summaryRouter);
app.use("/api/patient", patientRouter);
app.use("/api/demo", demoRouter);

// ── Serve the built frontend (single-origin production) ─────────────────────
// In production the React SPA is bundled into frontend/dist and served from this
// same Express app, so the browser only ever talks to one origin (API + WS too).
// Probe a few candidate locations so it works whether run from repo root (Render)
// or from the compiled dist tree.
const here = dirname(fileURLToPath(import.meta.url));
const clientDir = [
  join(process.cwd(), "frontend/dist"), // cwd = repo root (Render start command)
  join(here, "../../../../frontend/dist"), // backend/dist/backend/src -> repo/frontend/dist
  join(here, "../../../frontend/dist"),
].find((p) => existsSync(join(p, "index.html")));

if (clientDir) {
  app.use(
    express.static(clientDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          // The SPA route table lives in this file. Never let browsers/CDNs keep
          // an old entry point that references the previous route bundle.
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        } else if (filePath.includes(`${join("assets", "")}`)) {
          // Vite assets are content-hashed, so they are safe to cache forever.
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  // SPA fallback: any non-API, non-WS, non-health GET serves index.html so
  // client-side routes (/patient, /doctor, /doctor/:id) load on hard refresh.
  app.get(/^\/(?!api\/|ws\/|health).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.sendFile(join(clientDir, "index.html"));
  });
  console.log(`[static] serving frontend from ${clientDir}`);
} else {
  console.warn("[static] no frontend build found — running API only");
}

const server = http.createServer(app);

// Deepgram relay: browser mic audio -> this WS -> Deepgram -> {interim|final} back.
const wss = new WebSocketServer({ server, path: "/ws/deepgram" });
attachDeepgramProxy(wss);

const PORT = Number(process.env.PORT ?? 3001);
server.listen(PORT, () => {
  console.log(`PreVisit backend listening on :${PORT}`);
  console.log(`  Deepgram relay at ws://localhost:${PORT}/ws/deepgram`);
});
