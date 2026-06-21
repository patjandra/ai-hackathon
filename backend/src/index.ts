import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { attachDeepgramProxy } from "./services/deepgram";
import checkinRouter from "./routes/checkin";
import summaryRouter from "./routes/summary";
import patientRouter from "./routes/patient";
import demoRouter from "./routes/demo";

const app = express();
const server = createServer(app);

// Deepgram audio proxy on /ws/audio
const wss = new WebSocketServer({ server, path: "/ws/audio" });
attachDeepgramProxy(wss);

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/checkin", checkinRouter);
app.use("/api/summary", summaryRouter);
app.use("/api/patient", patientRouter);
app.use("/api/demo", demoRouter);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Interim backend running on http://localhost:${PORT}`);
});
