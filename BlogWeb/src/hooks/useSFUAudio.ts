"use client";

import { useRef, useState, useCallback, useMemo } from "react";

interface SFUPlayer {
  audio: HTMLAudioElement;
  ms: MediaSource;
  sb: SourceBuffer | null;
  queue: ArrayBuffer[];
  ready: boolean;
}

interface UseSFUAudioOptions {
  sendBinary: (data: ArrayBuffer) => void;
}

export function useSFUAudio(options: UseSFUAudioOptions) {
  const { sendBinary } = options;

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const playersRef = useRef<Map<number, SFUPlayer>>(new Map());
  const [recording, setRecording] = useState(false);

  const tryAppend = useCallback((player: SFUPlayer) => {
    while (player.queue.length > 0 && player.sb && !player.sb.updating) {
      const chunk = player.queue.shift()!;
      try {
        player.sb.appendBuffer(chunk);
      } catch {
        player.queue.unshift(chunk);
        break;
      }
    }
    // 队列过长则丢弃旧数据，防止延迟累积
    while (player.queue.length > 8) {
      player.queue.shift();
    }
  }, []);

  const handleBinary = useCallback((data: ArrayBuffer) => {
    if (data.byteLength < 5) return;

    const view = new DataView(data);
    const userId = view.getUint32(0, true);
    const audioData = data.slice(4);

    let player = playersRef.current.get(userId);
    if (!player) {
      const audio = new Audio();
      audio.autoplay = true;
      const ms = new MediaSource();
      audio.src = URL.createObjectURL(ms);

      player = { audio, ms, sb: null, queue: [], ready: false };
      playersRef.current.set(userId, player);

      ms.onsourceopen = () => {
        // 等待 SourceBuffer 就绪后刷新队列
        const mime = MediaSource.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        try {
          const sb = ms.addSourceBuffer(mime);
          sb.mode = "sequence";
          player!.sb = sb;
          player!.ready = true;
          // 初始队列里可能有数据，触发一次刷新
          sb.addEventListener("updateend", () => tryAppend(player!));
          tryAppend(player!);
        } catch {
          // mime 不支持，降级为 srcObject 方式
        }
      };
      audio.play().catch(() => {});
    }

    player.queue.push(audioData);
    if (player.ready) tryAppend(player);
  }, [tryAppend]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const raw = await e.data.arrayBuffer();
          sendBinary(raw);
        }
      };

      recorder.start(40);
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [sendBinary]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    playersRef.current.forEach((p) => {
      p.audio.pause();
      p.audio.removeAttribute("src");
      p.audio.remove();
    });
    playersRef.current.clear();
  }, []);

  const setMicEnabled = useCallback((enabled: boolean) => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  }, []);

  const removePlayer = useCallback((userId: number) => {
    const p = playersRef.current.get(userId);
    if (p) {
      p.audio.pause();
      p.audio.removeAttribute("src");
      p.audio.remove();
      playersRef.current.delete(userId);
    }
  }, []);

  return useMemo(() => ({
    start,
    stop,
    setMicEnabled,
    handleBinary,
    removePlayer,
    recording,
    stream: streamRef,
  }), [start, stop, setMicEnabled, handleBinary, removePlayer, recording]);
}
