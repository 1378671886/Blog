"use client";

import { useRef, useCallback, useMemo } from "react";

interface UseWebRTCOptions {
  signalSend: (msg: Record<string, unknown>) => void;
  onRemoteStream?: (userId: number, stream: MediaStream) => void;
  onPeerDisconnected?: (userId: number) => void;
}

export function useWebRTC(options: UseWebRTCOptions) {
  const { signalSend, onRemoteStream, onPeerDisconnected } = options;

  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const myUserIdRef = useRef<number | null>(null);
  const negotiatingRef = useRef<Set<number>>(new Set());

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const isPolite = useCallback((otherUserId: number): boolean => {
    return (myUserIdRef.current ?? 0) > otherUserId;
  }, []);

  const closePeerConnection = useCallback((userId: number) => {
    const pc = peersRef.current.get(userId);
    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
    }
    negotiatingRef.current.delete(userId);
  }, []);

  const setupPeerHandlers = useCallback((pc: RTCPeerConnection, userId: number) => {
    pc.ontrack = (event: RTCTrackEvent) => {
      if (event.streams[0]) {
        onRemoteStream?.(userId, event.streams[0]);
      }
    };
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        signalSend({
          type: "ice-candidate",
          targetUserId: userId,
          candidate: event.candidate.toJSON(),
        });
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "disconnected"
      ) {
        closePeerConnection(userId);
        onPeerDisconnected?.(userId);
      }
    };
  }, [signalSend, onRemoteStream, onPeerDisconnected, closePeerConnection]);

  const setLocalStream = useCallback((stream: MediaStream | null, myUserId?: number) => {
    localStreamRef.current = stream;
    if (myUserId !== undefined) myUserIdRef.current = myUserId;
  }, []);

  const createOfferForPeer = useCallback(async (userId: number) => {
    if (!localStreamRef.current) return;
    if (negotiatingRef.current.has(userId)) return;

    let pc = peersRef.current.get(userId);
    if (!pc) {
      pc = new RTCPeerConnection(rtcConfig);
      peersRef.current.set(userId, pc);
      setupPeerHandlers(pc, userId);
    }

    negotiatingRef.current.add(userId);

    localStreamRef.current.getTracks().forEach((track) => {
      if (!pc!.getSenders().some((s) => s.track === track)) {
        pc!.addTrack(track, localStreamRef.current!);
      }
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signalSend({
        type: "sdp-offer",
        targetUserId: userId,
        sdp: pc.localDescription?.toJSON(),
      });
    } catch (err) {
      console.error("[WebRTC] createOffer failed:", err);
      closePeerConnection(userId);
    } finally {
      negotiatingRef.current.delete(userId);
    }
  }, [signalSend, setupPeerHandlers, closePeerConnection]);

  const handleSignaling = useCallback(async (msg: Record<string, unknown>) => {
    const type = msg.type as string;
    const fromUserId = msg.fromUserId as number;

    if (type === "sdp-offer") {
      const description = new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit);
      let pc = peersRef.current.get(fromUserId);
      const isMakingOffer = negotiatingRef.current.has(fromUserId);

      if (isMakingOffer && !isPolite(fromUserId)) {
        return;
      }
      if (isMakingOffer && isPolite(fromUserId)) {
        closePeerConnection(fromUserId);
      }
      if (!pc) {
        pc = new RTCPeerConnection(rtcConfig);
        peersRef.current.set(fromUserId, pc);
        setupPeerHandlers(pc, fromUserId);
      }

      try {
        await pc.setRemoteDescription(description);
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            const senders = pc!.getSenders();
            if (!senders.some((s) => s.track === track)) {
              pc!.addTrack(track, localStreamRef.current!);
            }
          });
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalSend({
          type: "sdp-answer",
          targetUserId: fromUserId,
          sdp: pc.localDescription?.toJSON(),
        });
      } catch (err) {
        console.error("[WebRTC] handleOffer failed:", err);
        closePeerConnection(fromUserId);
        onPeerDisconnected?.(fromUserId);
      }
    } else if (type === "sdp-answer") {
      const description = new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit);
      const pc = peersRef.current.get(fromUserId);
      if (pc) {
        try {
          await pc.setRemoteDescription(description);
        } catch (err) {
          console.error("[WebRTC] handleAnswer failed:", err);
        }
      }
    } else if (type === "ice-candidate") {
      const candidate = new RTCIceCandidate(msg.candidate as RTCIceCandidateInit);
      const pc = peersRef.current.get(fromUserId);
      if (pc) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.error("[WebRTC] addIceCandidate failed:", err);
        }
      }
    }
  }, [signalSend, onPeerDisconnected, isPolite, closePeerConnection, setupPeerHandlers]);

  const setMicEnabled = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  const closeAll = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    negotiatingRef.current.clear();
  }, []);

  return useMemo(() => ({
    setLocalStream,
    createOfferForPeer,
    handleSignaling,
    closePeerConnection,
    closeAll,
    setMicEnabled,
  }), [setLocalStream, createOfferForPeer, handleSignaling, closePeerConnection, closeAll, setMicEnabled]);
}
