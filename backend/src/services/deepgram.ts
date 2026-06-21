import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { WebSocketServer, WebSocket } from "ws";
import type { TranscriptMessage } from "../../../shared/types.js";

// Nova-3 keyterm prompting. The correct parameter is `keyterm` (singular, one
// entry per term) — NOT `keyterms`. See plan correction #2.
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
 * API matches the installed @deepgram/sdk@4.x: createClient -> listen.live(),
 * LiveTranscriptionEvents, connection.send(chunk), connection.finish().
 *
 * AUDIO FORMAT (plan issue A): the frontend sends raw 16 kHz linear16 PCM
 * captured via an AudioWorklet — MediaRecorder/opus chunks lose their container
 * headers after the first chunk and fail to decode mid-stream.
 */
export function attachDeepgramProxy(wss: WebSocketServer) {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  wss.on("connection", (client: WebSocket) => {
    // One Deepgram connection per check-in session; kept alive across the
    // follow-up turn (plan issue F).
    const connection = deepgram.listen.live({
      model: "nova-3",
      language: "en-US",
      smart_format: true,
      interim_results: true, // Phase 1 optimistic highlighting
      utterance_end_ms: 1500, // emits an UtteranceEnd event after 1.5s silence
      encoding: "linear16",
      sample_rate: 16000,
      // `keyterm` isn't in the SDK's option types yet; pass through via cast.
      keyterm: KEYTERMS,
    } as any);

    const send = (msg: TranscriptMessage) => {
      if (client.readyState === client.OPEN) client.send(JSON.stringify(msg));
    };

    connection.on(LiveTranscriptionEvents.Open, () => {
      connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript: string = data.channel?.alternatives?.[0]?.transcript ?? "";
        if (!transcript) return;
        // interim → Phase 1 keyword scan; final → trigger Claude call
        send({ transcript, type: data.is_final ? "final" : "interim" });
      });

      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        send({ transcript: "", type: "utterance_end" });
      });

      connection.on(LiveTranscriptionEvents.Error, (err: unknown) =>
        console.error("[deepgram]", err),
      );
      connection.on(LiveTranscriptionEvents.Close, () => client.close());
    });

    // Browser audio frames in → forward to Deepgram (Buffer → ArrayBuffer).
    client.on("message", (chunk: Buffer) =>
      connection.send(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength)),
    );
    client.on("close", () => connection.finish());
  });
}
