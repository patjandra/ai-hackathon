import { useCallback, useRef, useState } from "react";
import { WS_BASE } from "../lib/api";
import type { TranscriptMessage } from "../../../shared/types";

// Captures mic audio as 16 kHz linear16 PCM via an AudioWorklet and streams it
// to the backend Deepgram relay (plan issue A: avoid MediaRecorder/opus chunking).
//
// interim → onInterim (Phase 1 keyword scan)
// final   → accumulated into the running final transcript (Phase 2 trigger)
//
// NOTE: a small AudioWorklet processor module must exist at /pcm-worklet.js in
// frontend/public — it should downsample to 16 kHz and postMessage Int16 frames.
const TARGET_RATE = 16000;

interface UseDeepgramOpts {
  onInterim: (transcript: string) => void;
}

export function useDeepgram({ onInterim }: UseDeepgramOpts) {
  const [recording, setRecording] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalRef = useRef<string>("");

  const start = useCallback(async () => {
    finalRef.current = "";
    const ws = new WebSocket(`${WS_BASE}/ws/deepgram`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as TranscriptMessage;
      if (msg.type === "interim") onInterim(msg.transcript);
      else if (msg.type === "final" && msg.transcript) {
        finalRef.current = `${finalRef.current} ${msg.transcript}`.trim();
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const ctx = new AudioContext({ sampleRate: TARGET_RATE });
    ctxRef.current = ctx;
    await ctx.audioWorklet.addModule("/pcm-worklet.js");
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "pcm-worklet");
    node.port.onmessage = (e) => {
      if (ws.readyState === ws.OPEN) ws.send(e.data as ArrayBuffer);
    };
    source.connect(node);

    setRecording(true);
  }, [onInterim]);

  // Returns the accumulated final transcript for the Phase 2 Claude call.
  const stop = useCallback(async (): Promise<string> => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    await ctxRef.current?.close();
    wsRef.current?.close();
    setRecording(false);
    return finalRef.current.trim();
  }, []);

  return { recording, start, stop };
}
