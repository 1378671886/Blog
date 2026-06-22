"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

interface UseWebSocketOptions {
  onBinary?: (data: ArrayBuffer) => void;
  onText?: (data: string) => void;
  token?: string;
  enabled?: boolean;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { onBinary, onText, token, enabled = true } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const connectRef = useRef<() => void>(() => {});
  const [state, setState] = useState<ConnectionState>("idle");

  const connect = useCallback(() => {
    if (wsRef.current) return;

    setState("connecting");
    const sep = url.includes("?") ? "&" : "?";
    const wsUrl = token
      ? `${url}${sep}token=${encodeURIComponent(token)}`
      : url;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setState("open");
    };

    ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        onBinary?.(event.data);
      } else if (typeof event.data === "string") {
        onText?.(event.data);
      }
    };

    ws.onclose = () => {
      setState("closed");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(() => {
        connectRef.current();
      }, 3000);
    };

    ws.onerror = () => {
      setState("error");
    };

    wsRef.current = ws;
  }, [url, token, onBinary, onText]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // 阻止自动重连
      wsRef.current.close();
      wsRef.current = null;
    }
    setState("idle");
  }, []);

  const send = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(text);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled]);

  return useMemo(() => ({ state, connect, disconnect, send, sendText }), [state, connect, disconnect, send, sendText]);
}
