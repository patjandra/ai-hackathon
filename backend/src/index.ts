import "./env.js"; // must be first — loads root .env before clients read process.env
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";

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
app.use(cors({ origin: process.env.FRONTEND_URL ?? true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/checkin", checkinRouter);
app.use("/api/summary", summaryRouter);
app.use("/api/patient", patientRouter);
app.use("/api/demo", demoRouter);

const server = http.createServer(app);

// Deepgram relay: browser mic audio -> this WS -> Deepgram -> {interim|final} back.
const wss = new WebSocketServer({ server, path: "/ws/deepgram" });
attachDeepgramProxy(wss);

const PORT = Number(process.env.PORT ?? 3001);
server.listen(PORT, () => {
  console.log(`PreVisit backend listening on :${PORT}`);
  console.log(`  Deepgram relay at ws://localhost:${PORT}/ws/deepgram`);
});
