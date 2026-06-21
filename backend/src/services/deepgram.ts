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
 * LiveTranscriptionEvents, connection.send(chunk), connection.finalize()/finish().
 *
 * Robustness:
 *  - sample rate comes from the client (?sr=) so Safari's 48k context still decodes.
 *  - audio that arrives before Deepgram opens is buffered, not dropped.
 *  - a "finalize" control message flushes Deepgram's last transcript before close.
 */
export function attachDeepgramProxy(wss: WebSocketServer) {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  wss.on("connection", (client: WebSocket, req) => {
    const sampleRate =
      Number(new URL(req.url ?? "", "http://localhost").searchParams.get("sr")) || 16000;

    const connection = deepgram.listen.live({
      model: "nova-3",
      language: "en-US",
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1500,
      encoding: "linear16",
      sample_rate: sampleRate,
      keyterm: KEYTERMS,
    } as any);

    let dgOpen = false;
    const queue: ArrayBuffer[] = [];

    const send = (msg: TranscriptMessage) => {
      if (client.readyState === client.OPEN) client.send(JSON.stringify(msg));
    };

    connection.on(LiveTranscriptionEvents.Open, () => {
      dgOpen = true;
      while (queue.length) connection.send(queue.shift()!);

      connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript: string = data.channel?.alternatives?.[0]?.transcript ?? "";
        if (!transcript) return;
        send({ transcript, type: data.is_final ? "final" : "interim" });
      });
      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        send({ transcript: "", type: "utterance_end" });
      });
      connection.on(LiveTranscriptionEvents.Error, (err: unknown) => console.error("[deepgram]", err));
      connection.on(LiveTranscriptionEvents.Close, () => {
        try {
          client.close();
        } catch {
          /* already closed */
        }
      });
    });

    client.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        if (dgOpen) connection.send(buf);
        else queue.push(buf); // not open yet — buffer instead of dropping
      } else {
        // text control frame from the client
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "finalize") connection.finalize();
        } catch {
          /* ignore malformed control message */
        }
      }
    });

    client.on("close", () => {
      try {
        connection.finish();
      } catch {
        /* already closed */
      }
    });
  });
}
