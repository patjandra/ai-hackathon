import { DeepgramClient } from "@deepgram/sdk";
import type { WebSocketServer, WebSocket } from "ws";
import type { TranscriptMessage } from "../../../shared/types.js";

// Nova-3 keyterm prompting. NOTE: the correct parameter is `keyterm` (singular,
// one entry per term) — NOT `keyterms`. See plan correction #2.
const KEYTERMS = [
  "rheumatoid arthritis",
  "methotrexate",
  "prednisone",
  "hydroxychloroquine",
  "flare",
  "synovitis",
  "morning stiffness",
  "fatigue",
  "swelling",
  "medication adherence",
  "inflammation",
  "joint pain",
  "biologics",
];

/**
 * Relays browser microphone audio to Deepgram and pushes transcripts back.
 *
 * AUDIO FORMAT (plan issue A): the frontend should send raw 16 kHz linear16 PCM
 * captured via an AudioWorklet. MediaRecorder/opus chunks lose their container
 * headers after the first chunk and fail to decode mid-stream. If you switch to
 * opus, send the full stream (not independent Blobs) and set encoding accordingly.
 */
export function attachDeepgramProxy(wss: WebSocketServer) {
  const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! });

  wss.on("connection", async (client: WebSocket) => {
    // One Deepgram connection per check-in session; kept alive across the
    // follow-up turn (plan issue F). Send KeepAlive during idle if needed.
    const connection = await deepgram.listen.v1.connect({
      model: "nova-3",
      language: "en-US",
      smart_format: true,
      interim_results: true, // Phase 1 optimistic highlighting
      utterance_end_ms: 1500, // emits an UtteranceEnd message after 1.5s silence
      encoding: "linear16",
      sample_rate: 16000,
      keyterm: KEYTERMS,
    });

    const send = (msg: TranscriptMessage) => {
      if (client.readyState === client.OPEN) client.send(JSON.stringify(msg));
    };

    connection.on("open", () => {
      connection.on("message", (data: any) => {
        if (data.type === "Results") {
          const transcript: string =
            data.channel?.alternatives?.[0]?.transcript ?? "";
          if (!transcript) return;
          // interim → Phase 1 keyword scan; final → trigger Claude call
          send({ transcript, type: data.is_final ? "final" : "interim" });
        } else if (data.type === "UtteranceEnd") {
          send({ transcript: "", type: "utterance_end" });
        }
      });
      connection.on("error", (err: unknown) => console.error("[deepgram]", err));
      connection.on("close", () => client.close());
    });

    // Browser audio frames in → forward to Deepgram.
    client.on("message", (chunk: Buffer) => connection.sendMedia(chunk));
    client.on("close", () => connection.disconnect?.());

    connection.connect();
    await connection.waitForOpen();
  });
}
