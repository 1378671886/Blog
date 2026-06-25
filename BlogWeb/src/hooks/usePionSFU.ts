"use client";

import { useRef, useState, useCallback, useMemo } from "react";

interface UsePionSFUOptions {
  userIdRef: React.MutableRefObject<number>;
  roomId: string;
  isLocal: boolean;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: ["stun:liuzirui.top:3478", "turn:liuzirui.top:3478?transport=udp"],
      username: "turnuser",
      credential: "Vo!ceTURN_2024_liuzirui",
    },
    {
      urls: "turn:liuzirui.top:3478?transport=tcp",
      username: "turnuser",
      credential: "Vo!ceTURN_2024_liuzirui",
    },
    {
      urls: "turns:liuzirui.top:5349?transport=tcp",
      username: "turnuser",
      credential: "Vo!ceTURN_2024_liuzirui",
    },
  ],
};

export function usePionSFU(options: UsePionSFUOptions) {
  const { userIdRef, roomId, isLocal } = options;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudiosRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const [recording, setRecording] = useState(false);

  const stop = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    remoteAudiosRef.current.forEach((a) => {
      a.pause();
      a.remove();
    });
    remoteAudiosRef.current.clear();
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const userId = userIdRef.current;
      if (!userId) return;

      stop();

      const sfuWsUrl = isLocal
        ? `ws://localhost:8080/sfu-ws?room=${roomId}&user=${userId}`
        : `wss://liuzirui.top/sfu-ws?room=${roomId}&user=${userId}`;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;
        const remoteUserId = parseInt(remoteStream.id);
        if (isNaN(remoteUserId)) return;

        let audio = remoteAudiosRef.current.get(remoteUserId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          document.body.appendChild(audio);
          remoteAudiosRef.current.set(remoteUserId, audio);
        }
        audio.srcObject = remoteStream;
        audio.play().catch(() => {});
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || !wsRef.current) return;
        wsRef.current.send(
          JSON.stringify({
            type: "ice",
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          })
        );
      };

      const ws = new WebSocket(sfuWsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: "offer", sdp: pc.localDescription!.sdp }));
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "answer") {
            await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
          } else if (msg.type === "offer") {
            await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
          } else if (msg.type === "ice") {
            await pc.addIceCandidate({
              candidate: msg.candidate,
              sdpMid: msg.sdpMid,
              sdpMLineIndex: msg.sdpMLineIndex,
            });
          }
        } catch {}
      };

      ws.onerror = () => stop();
      ws.onclose = () => stop();

      setRecording(true);
    } catch {
      stop();
    }
  }, [userIdRef, roomId, isLocal, stop]);

  const setMicEnabled = useCallback((enabled: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  const removePlayer = useCallback((userId: number) => {
    const audio = remoteAudiosRef.current.get(userId);
    if (audio) {
      audio.pause();
      audio.remove();
      remoteAudiosRef.current.delete(userId);
    }
  }, []);

  return useMemo(
    () => ({ start, stop, setMicEnabled, removePlayer, recording }),
    [start, stop, setMicEnabled, removePlayer, recording]
  );
}
