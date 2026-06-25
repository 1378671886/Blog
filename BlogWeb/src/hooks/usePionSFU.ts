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

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      // 重新协商：后续 addTrack（如 setMicEnabled 补获媒体）自动发 offer
      pc.onnegotiationneeded = async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (pc.signalingState !== "stable") return;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsRef.current.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
        } catch {}
      };

      // 尝试获取本地媒体，失败则不发送（仅接收模式，如移动端缺少用户手势）
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        streamRef.current = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      } catch {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      pc.ontrack = (event) => {
        console.log("[SFU] ontrack fired, streams:", event.streams, "track:", event.track);
        const remoteStream = event.streams[0];
        if (!remoteStream) {
          console.log("[SFU] no remote stream — streams array is empty");
          return;
        }
        console.log("[SFU] remoteStream.id:", remoteStream.id);
        const remoteUserId = parseInt(remoteStream.id);
        console.log("[SFU] parsed userId:", remoteUserId);
        if (isNaN(remoteUserId)) {
          console.log("[SFU] userId is NaN, skipping");
          return;
        }

        let audio = remoteAudiosRef.current.get(remoteUserId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          document.body.appendChild(audio);
          remoteAudiosRef.current.set(remoteUserId, audio);
          console.log("[SFU] created audio element for user", remoteUserId);
        }
        audio.srcObject = remoteStream;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log("[SFU] audio playing for user", remoteUserId);
          }).catch((e) => {
            console.error("[SFU] audio play failed for user", remoteUserId, e);
          });
        }
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
          }
        });
      };

      ws.onerror = () => stop();
      ws.onclose = () => stop();

      setRecording(true);
    } catch {
      stop();
    }
  }, [userIdRef, roomId, isLocal, stop]);

  const setMicEnabled = useCallback((enabled: boolean) => {
    if (!enabled) {
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
      return;
    }
    // 用户已交互，恢复被 autoplay 策略阻止的远端音频
    remoteAudiosRef.current.forEach((audio) => {
      if (audio.paused) audio.play().catch(() => {});
    });
    // 开启 mic：如果之前没有获取到媒体（如移动端自动连接时被拒绝），现在获取
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
    const audio = remoteAudiosRef.current.get(userId);
    if (audio) {
      audio.pause();
      audio.remove();
      remoteAudiosRef.current.delete(userId);
    }
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
