"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StreamingCallbacks = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function useAssemblyAIStreaming(callbacks: StreamingCallbacks = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [isRecording, setIsRecording] = useState(false);

  const stop = useCallback(() => {
    setIsRecording(false);

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: "Terminate" }));
      } catch {}
      wsRef.current.close();
    }

    callbacks.onClose?.();
  }, [callbacks]);

  const start = useCallback(async () => {
    try {
      const tokenRes = await fetch("/api/assemblyai/token");
      const { token } = await tokenRes.json();

      if (!token) throw new Error("Failed to get AssemblyAI token");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;

      const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`;

      const ws = new WebSocket(wsUrl);

      wsRef.current = ws;

      ws.onopen = () => {
        callbacks.onOpen?.();
        setIsRecording(true);
        mediaRecorder.start(100);
      };

      ws.onerror = (ev) => {
        callbacks.onError?.(new Error("WebSocket error"));
      };

      ws.onclose = () => {
        stop();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "PartialTranscript") {
            callbacks.onPartial?.(data.transcript || "");
          }

          if (data.type === "FinalTranscript") {
            callbacks.onFinal?.(data.transcript || "");
          }
        } catch (err) {
          callbacks.onError?.(new Error("Failed to parse AssemblyAI message"));
        }
      };

      mediaRecorder.ondataavailable = async (ev) => {
        if (ws.readyState === WebSocket.OPEN) {
          const blob = ev.data;
          if (!blob) return;

          const buf = await blob.arrayBuffer();
          ws.send(buf);
        }
      };

      mediaRecorder.onerror = () => {
        callbacks.onError?.(new Error("MediaRecorder error"));
        stop();
      };
    } catch (err) {
      callbacks.onError?.(err instanceof Error ? err : new Error("Unknown error"));
      stop();
    }
  }, [callbacks, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    start,
    stop,
    isRecording,
  };
}