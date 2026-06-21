import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

const KEYTERMS = [
  "rheumatoid arthritis", "methotrexate", "prednisone", "hydroxychloroquine",
  "flare", "synovitis", "morning stiffness", "fatigue", "swelling",
  "medication adherence", "inflammation", "joint pain", "biologics",
];

export function attachDeepgramProxy(wss: WebSocketServer) {
  wss.on("connection", (clientWs: WebSocket, req: IncomingMessage) => {
    if (!process.env.DEEPGRAM_API_KEY) {
      clientWs.close(1008, "DEEPGRAM_API_KEY not configured");
      return;
    }

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const live = deepgram.listen.live({
      model: "nova-3",
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1500,
      keyterms: KEYTERMS,
      encoding: "opus",
      container: "webm",
    });

    live.on(LiveTranscriptionEvents.Open, () => {
      console.log("Deepgram session open");
    });

    live.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript?.trim()) return;
      clientWs.send(JSON.stringify({
        transcript,
        type: data.is_final ? "final" : "interim",
      }));
    });

    live.on(LiveTranscriptionEvents.Error, (err: any) => {
      console.error("Deepgram error:", err);
    });

    live.on(LiveTranscriptionEvents.Close, () => {
      console.log("Deepgram session closed");
    });

    clientWs.on("message", (data: Buffer) => {
      if (live.getReadyState() === WebSocket.OPEN) {
        live.send(data);
      }
    });

    clientWs.on("close", () => {
      try { live.finish(); } catch {}
    });

    clientWs.on("error", () => {
      try { live.finish(); } catch {}
    });
  });
}
