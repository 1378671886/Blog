"use client";

import { useRef, useCallback } from "react";

export function useAudioPlayer() {
  const msRef = useRef<MediaSource | null>(null);
  const sbRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const setupRef = useRef(false);

  const setupSourceBuffer = useCallback((ms: MediaSource) => {
    if (setupRef.current) return;
    const codecs = ["audio/webm;codecs=opus", "audio/webm", ""];
    for (const mime of codecs) {
      try {
        const sb = mime ? ms.addSourceBuffer(mime) : ms.addSourceBuffer("audio/webm");
        sbRef.current = sb;
        setupRef.current = true;

        sb.addEventListener("updateend", () => {
          if (queueRef.current.length > 0 && !sb.updating) {
            try { sb.appendBuffer(queueRef.current.shift()!); }
            catch { queueRef.current.shift(); }
          }
        });

        if (queueRef.current.length > 0) {
          try { sb.appendBuffer(queueRef.current.shift()!); }
          catch { queueRef.current = []; }
        }
        return;
      } catch {}
    }
    // 所有 codec 都不支持，降级为逐个播放
    while (queueRef.current.length > 0) {
      const data = queueRef.current.shift()!;
      const blob = new Blob([data], { type: "audio/webm" });
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play().catch(() => {});
    }
  }, []);

  const resetMediaSource = useCallback(() => {
    setupRef.current = false;
    sbRef.current = null;
    if (msRef.current) {
      if (msRef.current.readyState !== "closed") {
        try { msRef.current.endOfStream(); } catch {}
      }
      msRef.current = null;
    }
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    // 重建
    const ms = new MediaSource();
    msRef.current = ms;
    const audio = new Audio();
    audio.autoplay = true;
    audio.src = URL.createObjectURL(ms);
    audio.play().catch(() => {});
    audioRef.current = audio;

    const onOpen = () => setupSourceBuffer(ms);
    if (ms.readyState === "open") {
      onOpen();
    } else {
      ms.addEventListener("sourceopen", onOpen, { once: true });
    }
  }, [setupSourceBuffer]);

  const MAX_QUEUE = 8;

  const feed = useCallback((data: ArrayBuffer) => {
    if (!msRef.current) {
      resetMediaSource();
      queueRef.current.push(data);
      return;
    }
    const sb = sbRef.current;
    if (sb && !sb.updating && queueRef.current.length === 0) {
      try {
        sb.appendBuffer(data);
      } catch {
        queueRef.current.push(data);
        resetMediaSource();
      }
    } else {
      // 队列过长说明解码跟不上，丢旧数据保证实时性
      while (queueRef.current.length >= MAX_QUEUE) {
        queueRef.current.shift();
      }
      queueRef.current.push(data);
    }
  }, [resetMediaSource]);

  const stop = useCallback(() => {
    setupRef.current = false;
    sbRef.current = null;
    if (msRef.current?.readyState !== "closed") {
      try { msRef.current?.endOfStream(); } catch {}
    }
    msRef.current = null;
    queueRef.current = [];
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
  }, []);

  return { feed, stop };
}
