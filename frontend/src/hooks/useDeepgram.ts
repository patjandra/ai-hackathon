import { useRef, useCallback } from "react";

export interface TranscriptEvent {
  transcript: string;
  type: "interim" | "final";
}

export function useDeepgram(onTranscript: (event: TranscriptEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const wsBase = import.meta.env.VITE_WS_URL || "";
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = wsBase || `${protocol}//${window.location.host}`;
      const ws = new WebSocket(`${host}/ws/audio`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          onTranscript(JSON.parse(e.data));
        } catch {}
      };

      ws.onopen = () => {
        // Find a supported audio MIME type
        const mimes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
        const mimeType = mimes.find(MediaRecorder.isTypeSupported) || "";

        const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        mr.start(250);
      };

      ws.onerror = () => stop();
    } catch (err) {
      console.error("Microphone access denied or WebSocket failed:", err);
      throw err;
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    mediaRecorderRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
  }, []);

  return { start, stop };
}
