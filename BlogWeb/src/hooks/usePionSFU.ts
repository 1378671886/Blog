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
  const manualStopRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micEnabledRef = useRef(false);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
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
  }, []);

  const stop = useCallback(() => {
    if (!pcRef.current && !wsRef.current) return;
    console.log("[SFU] stop() called");
    manualStopRef.current = true;
    cleanup();
    setRecording(false);
  }, [cleanup]);

  const start = useCallback(async () => {
    if (pcRef.current || wsRef.current) return;

    try {
      const userId = userIdRef.current;
      if (!userId) return;

      manualStopRef.current = false;

      const sfuWsUrl = isLocal
        ? `ws://localhost:8080/sfu-ws?room=${roomId}&user=${userId}`
        : `wss://liuzirui.top/sfu-ws?room=${roomId}&user=${userId}`;

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      pc.onnegotiationneeded = async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (pc.signalingState !== "stable") return;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsRef.current.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
        } catch {}
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        streamRef.current = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        if (!micEnabledRef.current) {
          stream.getTracks().forEach((t) => { t.enabled = false; });
        }
      } catch {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;
        const remoteUserId = parseInt(remoteStream.id);
        if (isNaN(remoteUserId)) return;

        const userLabel = "sfu-audio-user-" + remoteUserId;
        let audio: HTMLAudioElement | null = document.querySelector(
          'audio[data-sfu-user="' + userLabel + '"]'
        );
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audio.dataset.sfuUser = userLabel;
          document.body.appendChild(audio);
        }
        remoteAudiosRef.current.set(remoteUserId, audio);
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

      pc.oniceconnectionstatechange = () => {
        console.log("[SFU] ICE state:", pc.iceConnectionState);
        const state = pc.iceConnectionState;

        if (state === "connected" || state === "completed") {
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          return;
        }

        if (manualStopRef.current) return;

        if (state === "disconnected") {
          if (!disconnectTimerRef.current) {
            console.log("[SFU] ICE disconnected, waiting 5s for recovery...");
            disconnectTimerRef.current = setTimeout(() => {
              disconnectTimerRef.current = null;
              if (!pcRef.current || pcRef.current.iceConnectionState !== "disconnected") return;
              if (manualStopRef.current) return;
              console.log("[SFU] ICE still disconnected, full reconnect...");
              cleanup();
              reconnectTimerRef.current = setTimeout(() => {
                if (!manualStopRef.current) start();
              }, 300);
            }, 5000);
          }
          return;
        }

        if (state === "failed") {
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          console.log("[SFU] ICE failed, full reconnect...");
          cleanup();
          reconnectTimerRef.current = setTimeout(() => {
            if (!manualStopRef.current) start();
          }, 300);
        }
      };

      const ws = new WebSocket(sfuWsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: "offer", sdp: pc.localDescription!.sdp }));
      };

      let msgQueue = Promise.resolve();

      ws.onmessage = (event) => {
        const data = event.data as string;
        msgQueue = msgQueue.then(async () => {
          try {
            const msg = JSON.parse(data);
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
          } catch (e) {
            console.error("[SFU] WS message error:", e);
            if (e instanceof Error && e.message.includes("msid") && !manualStopRef.current) {
              console.log("[SFU] SDP msid error, full reconnect...");
              cleanup();
              reconnectTimerRef.current = setTimeout(() => {
                if (!manualStopRef.current) start();
              }, 300);
            }
          }
        });
      };

      ws.onerror = () => { stop(); };
      ws.onclose = () => { stop(); };

      setRecording(true);
    } catch {
      stop();
    }
  }, [userIdRef, roomId, isLocal, stop, cleanup]);

  const setMicEnabled = useCallback((enabled: boolean) => {
    micEnabledRef.current = enabled;
    if (!enabled) {
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
      return;
    }
    remoteAudiosRef.current.forEach((audio) => {
      if (audio.paused) audio.play().catch(() => {});
    });
    if (!streamRef.current) {
      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      }).then((stream) => {
        streamRef.current = stream;
        stream.getTracks().forEach((track) => {
          if (pcRef.current) pcRef.current.addTrack(track, stream);
        });
      }).catch(() => {});
      return;
    }
    streamRef.current.getAudioTracks().forEach((t) => { t.enabled = true; });
  }, []);

  const removePlayer = useCallback((userId: number) => {
    const userLabel = "sfu-audio-user-" + userId;
    const audio = document.querySelector(
      'audio[data-sfu-user="' + userLabel + '"]'
    ) as HTMLAudioElement | null;
    if (audio) {
      audio.pause();
      audio.remove();
    }
    remoteAudiosRef.current.delete(userId);
  }, []);

  const resumeRemoteAudios = useCallback(() => {
    remoteAudiosRef.current.forEach((audio) => {
      if (audio.paused) audio.play().catch(() => {});
    });
  }, []);

  return useMemo(
    () => ({ start, stop, setMicEnabled, removePlayer, resumeRemoteAudios, recording }),
    [start, stop, setMicEnabled, removePlayer, resumeRemoteAudios, recording]
  );
}
