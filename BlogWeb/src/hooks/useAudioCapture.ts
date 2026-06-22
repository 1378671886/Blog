"use client";

import { useRef, useState, useCallback } from "react";

interface UseAudioCaptureOptions {
  onChunk?: (chunk: Blob) => void;
  timeslice?: number; // ms
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}) {
  const { onChunk, timeslice = 40 } = options;
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      if (onChunk) {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) onChunk(e.data);
        };

        recorder.start(timeslice);
      }
      setRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof DOMException
        ? err.name === "NotAllowedError"
          ? "麦克风权限被拒绝"
          : err.message
        : String(err);
      setError(msg);
    }
  }, [onChunk, timeslice]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }, []);

  return { recording, error, stream: streamRef, start, stop };
}
