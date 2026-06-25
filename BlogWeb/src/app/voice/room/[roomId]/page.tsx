"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useSFUAudio } from "@/hooks/useSFUAudio";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useWebSocket } from "@/hooks/useWebSocket";

interface Message {
  id: string;
  username: string;
  content: string;
  time: string;
  self: boolean;
}

export default function VoiceRoom() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [testMicOn, setTestMicOn] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"p2p" | "sfu">("p2p");
  const [showSettings, setShowSettings] = useState(false);
  const myUserIdRef = useRef<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<{ userId: number; username: string }[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const testStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const sendTextRef = useRef<(text: string) => void>(() => {});
  const webRTCHandlersRef = useRef<ReturnType<typeof useWebRTC>>(null!);

  useEffect(() => {
    const t = sessionStorage.getItem("token");
    const n = sessionStorage.getItem("username");
    if (!t || !n) {
      router.replace("/voice");
    } else {
      /* eslint-disable react-hooks/set-state-in-effect */
      setToken(t);
      setUsername(n);
      setReady(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [router]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const isLocal = apiBase.includes("localhost") || apiBase.includes("127.0.0.1");
  const wsUrl = isLocal
    ? apiBase.replace(/^http/, "ws").replace(/:\d+/, ":4001") + `/voice/ws?room=${roomId}`
    : apiBase.replace(/^http/, "ws") + `/voice/ws?room=${roomId}`;

  const signalSend = useCallback((msg: Record<string, unknown>) => {
    sendTextRef.current(JSON.stringify(msg));
  }, []);

  const webRTC = useWebRTC({
    signalSend,
    onRemoteStream: (userId, stream) => {
      const existing = remoteAudioRef.current.get(userId);
      if (existing) { existing.srcObject = stream; return; }
      const audio = new Audio();
      audio.autoplay = true;
      audio.srcObject = stream;
      audio.play().catch(() => {});
      remoteAudioRef.current.set(userId, audio);
    },
    onPeerDisconnected: (userId) => {
      const audio = remoteAudioRef.current.get(userId);
      if (audio) { audio.pause(); audio.srcObject = null; remoteAudioRef.current.delete(userId); }
    },
  });

  const handleText = useCallback((text: string) => {
    try {
      const msg = JSON.parse(text);
      const rtc = webRTCHandlersRef.current;
      if (msg.type === "users") {
        const list = msg.users as Array<{userId: number; username: string}>;
        setUsers(list);
        const myId = list.find((u) => u.username === username)?.userId;
        if (myId) myUserIdRef.current = myId;
        if (mic.stream.current && myId) {
          rtc.setLocalStream(mic.stream.current, myId);
          if (prevUsersLen.current === 0 && list.length > 1) {
            for (const u of list) {
              if (u.userId !== myId) rtc.createOfferForPeer(u.userId);
            }
          }
        }
        prevUsersLen.current = list.length;
      } else if (msg.type === "chat") {
        setMessages((prev) => [...prev, {
          id: msg.id || Date.now().toString(),
          username: msg.username,
          content: msg.content,
          time: msg.time,
          self: false,
        }]);
      } else if (msg.type === "peer-joined") {
        // 新用户加入，已在线用户准备接收 offer
      } else if (msg.type === "room-mode") {
        const newMode = msg.mode as "p2p" | "sfu";
        if (newMode === "p2p" || newMode === "sfu") {
          sfuRef.current.stop();
          rtc.closeAll();
          micRef.current.stop();
          setVoiceMode(newMode);
          setMicOn(false);
        }
      } else if (msg.type === "peer-left") {
        const uid = msg.userId as number;
        rtc.closePeerConnection(uid);
        sfuRef.current.removePlayer(uid);
      } else if (
        msg.type === "sdp-offer" ||
        msg.type === "sdp-answer" ||
        msg.type === "ice-candidate"
      ) {
        rtc.handleSignaling(msg);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleBinary = useCallback((data: ArrayBuffer) => {
    sfuRef.current.handleBinary(data);
  }, []);

  const ws = useWebSocket(wsUrl, { token, onText: handleText, onBinary: handleBinary, enabled: !!token });

  sendTextRef.current = ws.sendText ?? (() => {});
  webRTCHandlersRef.current = webRTC;

  const mic = useAudioCapture({});
  const micRef = useRef(mic);
  micRef.current = mic;

  // SFU 发送：拼接 userId 头
  const sendBinaryRef = useRef<(data: ArrayBuffer) => void>(() => {});
  const sendSfuBinary = useCallback((data: ArrayBuffer) => {
    const uid = myUserIdRef.current;
    if (!uid) return;
    const header = new ArrayBuffer(4);
    new DataView(header).setUint32(0, uid, true);
    const combined = new Uint8Array(4 + data.byteLength);
    combined.set(new Uint8Array(header), 0);
    combined.set(new Uint8Array(data), 4);
    sendBinaryRef.current(combined.buffer);
  }, []);
  const sfuAudio = useSFUAudio({ sendBinary: sendSfuBinary });
  const sfuRef = useRef(sfuAudio);
  sfuRef.current = sfuAudio;
  sendBinaryRef.current = ws.send ?? (() => {});

  const toggleMic = async () => {
    if (micOn) {
      if (voiceMode === "p2p") {
        webRTC.setMicEnabled(false);
      } else {
        sfuAudio.setMicEnabled(false);
      }
      setMicOn(false);
    } else {
      if (voiceMode === "p2p") {
        if (!mic.stream.current) {
          await mic.start();
          if (mic.stream.current) {
            const myId = users.find((u) => u.username === username)?.userId;
            webRTC.setLocalStream(mic.stream.current, myId);
            for (const u of users) {
              if (u.userId !== myId) {
                webRTC.createOfferForPeer(u.userId);
              }
            }
          }
        } else {
          webRTC.setMicEnabled(true);
        }
      } else {
        // SFU 模式
        await sfuAudio.start();
      }
      setMicOn(true);
    }
  };

  const prevUsersLen = useRef(0);
  const testAudioRef = useRef<AudioContext | null>(null);

  const toggleTestMic = async () => {
    if (testMicOn) {
      testAudioRef.current?.close();
      testAudioRef.current = null;
      testStreamRef.current?.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
      setTestMicOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        testStreamRef.current = stream;
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const gain = ctx.createGain();
        gain.gain.value = 0.7;
        source.connect(gain);
        gain.connect(ctx.destination);
        if (ctx.state === "suspended") await ctx.resume();
        testAudioRef.current = ctx;
        setTestMicOn(true);
      } catch {}
    }
  };

  const statusText = {
    connecting: "连接中...",
    open: "已连接",
    closed: "重连中...",
    error: "连接出错",
    idle: "未连接",
  }[ws.state] || "未连接";

  useEffect(() => {
    const m = mic;
    const rtc = webRTC;
    const w = ws;
    const ta = testAudioRef;
    const ts = testStreamRef;
    const ra = remoteAudioRef;
    const sfu = sfuRef.current;
    return () => {
      if (m.recording) m.stop();
      sfu.stop();
      ta.current?.close();
      ts.current?.getTracks().forEach((t) => t.stop());
      ra.current.forEach((audio) => { audio.pause(); audio.srcObject = null; });
      ra.current.clear();
      rtc.closeAll();
      w.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !ws.sendText) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const chatMsg = {
      type: "chat",
      id: Date.now().toString(),
      username,
      content: text,
      time: timeStr,
    };
    ws.sendText(JSON.stringify(chatMsg));
    setMessages((prev) => [...prev, {
      id: chatMsg.id,
      username,
      content: text,
      time: timeStr,
      self: true,
    }]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!ready) return null;

  return (
    <div className="flex h-screen bg-dark">
      {/* 左侧栏 */}
      <aside className="w-60 flex flex-col bg-[#1e1e1e] border-r border-gray-800 shrink-0">
        <div className="px-3 py-3 border-b border-gray-800 space-y-2">
          <Link
            href="/voice/lobby"
            className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#333] border border-gray-700 rounded-lg px-3 py-1.5 text-xs transition-colors"
          >
            ← 返回大厅
          </Link>
          <div className="text-center">
            <span className="text-gray-300 font-semibold text-sm">🎙️ 房间</span>
            <span className="block text-emerald-400 text-xs mt-0.5"># {roomId}</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#333] border border-gray-700 rounded-lg px-3 py-1.5 text-xs transition-colors w-full"
          >
            ⚙️ 房间设置
          </button>
        </div>

        <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-gray-600 text-xs px-2 mb-2">在线 - {users.length} 人</p>
          {users.map((u) => (
            <div key={u.userId} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2a]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-gray-300 text-sm">{u.username}</span>
              {u.username === username && <span className="text-gray-600 text-xs ml-auto">我</span>}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-800 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className={`w-2 h-2 rounded-full ${
              ws.state === "open" ? "bg-emerald-400" :
              ws.state === "connecting" ? "bg-amber-400 animate-pulse" : "bg-gray-500"
            }`} />
            <span className="text-gray-500 text-xs">{statusText}</span>
          </div>

          <div className="w-full py-2 rounded-lg text-sm font-medium bg-[#2a2a2a] text-gray-500 border border-gray-700 text-center">
            {voiceMode === "p2p" ? "🔗 P2P 模式" : "📡 SFU 模式"}
          </div>

          <button
            onClick={toggleTestMic}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
              testMicOn
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-[#2a2a2a] text-gray-400 border border-gray-700 hover:bg-[#333]"
            }`}
          >
            {testMicOn ? "🔊 关闭试麦" : "🎧 试麦"}
          </button>

          <button
            onClick={toggleMic}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
              micOn
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {micOn ? "🔴 闭麦" : "🎤 开麦"}
          </button>

          {mic.error && <p className="text-red-400 text-xs">{mic.error}</p>}
        </div>
      </aside>

      {/* 右侧聊天区 */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600 text-sm">暂无消息，开始聊天吧</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.self ? "justify-end" : ""}`}>
              {!msg.self && (
                <div className="w-9 h-9 rounded-full bg-[#333] flex items-center justify-center text-sm shrink-0">
                  {msg.username[0]}
                </div>
              )}
              <div className={`max-w-[70%] ${msg.self ? "items-end" : ""}`}>
                {!msg.self && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-300">{msg.username}</span>
                    <span className="text-xs text-gray-600">{msg.time}</span>
                  </div>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    msg.self
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-[#2a2a2a] text-gray-200 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.self && (
                  <span className="text-xs text-gray-600 mt-1 block text-right">{msg.time}</span>
                )}
              </div>
              {msg.self && (
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm text-white shrink-0">
                  {msg.username[0]}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-800">
          <div className="flex gap-3">
            <input
              className="flex-1 px-4 py-2.5 bg-[#1e1e1e] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 outline-none focus:border-gray-500 transition-colors text-sm"
              placeholder="发送消息..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={sendMessage}
              className="px-5 py-2.5 bg-gray-300 hover:bg-white text-gray-800 rounded-lg font-medium text-sm transition-all"
            >
              发送
            </button>
          </div>
        </div>
      </main>

      {/* 房间设置弹窗 */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-gray-200 font-semibold text-lg mb-4">房间设置</h3>
            <p className="text-gray-500 text-xs mb-3">连接模式（切换后同步给房间内所有人）</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  ws.sendText?.(JSON.stringify({ type: "room-mode", mode: "p2p" }));
                  setShowSettings(false);
                }}
                className={`w-full px-4 py-3 rounded-lg text-sm text-left border transition-all ${
                  voiceMode === "p2p"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-[#2a2a2a] border-gray-700 text-gray-400 hover:bg-[#333]"
                }`}
              >
                <div className="font-medium">P2P 直连</div>
                <div className="text-[10px] text-gray-600 mt-0.5">点对点加密传输，适合 2-3 人</div>
              </button>
              <button
                onClick={() => {
                  ws.sendText?.(JSON.stringify({ type: "room-mode", mode: "sfu" }));
                  setShowSettings(false);
                }}
                className={`w-full px-4 py-3 rounded-lg text-sm text-left border transition-all ${
                  voiceMode === "sfu"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-[#2a2a2a] border-gray-700 text-gray-400 hover:bg-[#333]"
                }`}
              >
                <div className="font-medium">SFU 中转</div>
                <div className="text-[10px] text-gray-600 mt-0.5">服务器中转音频，适合多人</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
