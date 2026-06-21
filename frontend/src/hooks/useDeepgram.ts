import { useCallback, useEffect, useRef, useState } from "react";
import { WS_BASE } from "../lib/api";
import type { TranscriptMessage } from "../../../shared/types";

// Captures mic audio as linear16 PCM via an AudioWorklet and streams it to the
// backend Deepgram relay. The mic + AudioContext + worklet are created ONCE and
// reused across record/stop cycles (browsers cap the number of AudioContexts,
// so re-creating one per utterance breaks after a few toggles). A fresh
// WebSocket is opened per utterance; we wait for it to open before sending and
// flush Deepgram on stop so the first/last words aren't dropped.

const FLUSH_GRACE_MS = 600; // wait for Deepgram's trailing final after finalize

interface UseDeepgramOpts {
  onInterim: (transcript: string) => void;
}

export function useDeepgram({ onInterim }: UseDeepgramOpts) {
  const [recording, setRecording] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const finalRef = useRef("");
  const sendingRef = useRef(false); // gate: only forward audio while recording
  const onInterimRef = useRef(onInterim);
  onInterimRef.current = onInterim;

  // Create the mic + audio graph once, reuse forever.
  const ensureAudio = useCallback(async () => {
    if (!streamRef.current) {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    }
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      await ctxRef.current.audioWorklet.addModule("/pcm-worklet.js");
      const node = new AudioWorkletNode(ctxRef.current, "pcm-worklet");
      node.port.onmessage = (e) => {
        const ws = wsRef.current;
        if (sendingRef.current && ws && ws.readyState === ws.OPEN) ws.send(e.data as ArrayBuffer);
      };
      nodeRef.current = node;
      sourceRef.current = ctxRef.current.createMediaStreamSource(streamRef.current);
      sourceRef.current.connect(node);
    }
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
    return ctxRef.current.sampleRate; // honor the real rate (Safari may ignore 16k)
  }, []);

  const start = useCallback(async () => {
    finalRef.current = "";
    const sampleRate = await ensureAudio();

    // Tell the backend the actual sample rate so Deepgram decodes correctly.
    const ws = new WebSocket(`${WS_BASE}/ws/deepgram?sr=${Math.round(sampleRate)}`);
    ws.binaryType = "arraybuffer";
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as TranscriptMessage;
      if (msg.type === "interim") onInterimRef.current(msg.transcript);
      else if (msg.type === "final" && msg.transcript) {
        finalRef.current = `${finalRef.current} ${msg.transcript}`.trim();
      }
    };

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Deepgram socket failed to open"));
    });

    wsRef.current = ws;
    sendingRef.current = true;
    setRecording(true);
  }, [ensureAudio]);

  // Returns the accumulated final transcript for the Phase 2 Claude call.
  const stop = useCallback(async (): Promise<string> => {
    sendingRef.current = false;
    setRecording(false);
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "finalize" })); // flush Deepgram's buffer
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, FLUSH_GRACE_MS));
      ws.close();
    }
    return finalRef.current.trim();
  }, []);

  // Tear down the persistent audio graph when the component unmounts.
  useEffect(() => {
    return () => {
      sendingRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => {});
      wsRef.current?.close();
    };
  }, []);

  return { recording, start, stop };
}
