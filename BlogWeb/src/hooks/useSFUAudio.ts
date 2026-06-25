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
        // 解析失败（如 SourceBuffer 状态错误），放回并暂停
        player.queue.unshift(chunk);
        return;
      }
    }
    // 队列过长丢弃旧数据，控制延迟
    while (player.queue.length > 10) {
      player.queue.shift();
    }
  }, []);

  const createPlayer = useCallback((userId: number): SFUPlayer => {
    const audio = new Audio();
    audio.autoplay = true;
    document.body.appendChild(audio);

    const ms = new MediaSource();
    audio.src = URL.createObjectURL(ms);

    const mime = MediaSource.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const player: SFUPlayer = { audio, ms, sb: null, queue: [], ready: false };
    playersRef.current.set(userId, player);

    const onOpen = () => {
      ms.removeEventListener("sourceopen", onOpen);
      if (ms.readyState !== "open") return;
      try {
        const sb = ms.addSourceBuffer(mime);
        sb.mode = "sequence";
        player.sb = sb;
        player.ready = true;
        sb.addEventListener("updateend", () => tryAppend(player));
        sb.addEventListener("error", () => {
          player.sb = null;
          player.ready = false;
        });
        tryAppend(player);
      } catch {
        // mime 不支持
      }
    };
    ms.addEventListener("sourceopen", onOpen);

    audio.play().catch(() => {});
    return player;
  }, [tryAppend]);

  const handleBinary = useCallback((data: ArrayBuffer) => {
    if (data.byteLength < 5) return;

    const view = new DataView(data);
    const userId = view.getUint32(0, true);
    const audioData = data.slice(4);

    let player = playersRef.current.get(userId);
    if (!player) {
      player = createPlayer(userId);
    }

    player.queue.push(audioData);
    if (player.ready) tryAppend(player);
  }, [createPlayer, tryAppend]);

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
