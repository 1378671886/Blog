"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Room {
  id: number;
  roomId: string;
  creatorId: number;
  createdAt: string;
}

export default function Lobby() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [createInput, setCreateInput] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [msg, setMsg] = useState<{ type: "loading" | "error" | "info"; text: string } | null>(null);
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${api}/api/rooms`);
      const data = await res.json();
      if (Array.isArray(data)) setRooms(data);
    } catch {}
  }, [api]);

  useEffect(() => {
    if (token) {
      const load = async () => {
        try {
          const res = await fetch(`${api}/api/rooms`);
          const data = await res.json();
          if (Array.isArray(data)) setRooms(data);
        } catch {}
      };
      load();
    }
  }, [token, api]);

  const createRoom = async () => {
    const id = createInput.trim();
    if (!id) { setMsg({ type: "error", text: "请输入房间号" }); return; }
    setMsg({ type: "loading", text: "创建中..." });
    try {
      const res = await fetch(`${api}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: id }),
      });
      const data = await res.json();
      if (data.roomId) {
        router.push(`/voice/room/${data.roomId}`);
      } else {
        setMsg({ type: "error", text: data.error || "创建失败" });
      }
    } catch {
      setMsg({ type: "error", text: "网络错误" });
    }
  };

  const joinRoom = (roomId: string) => {
    if (roomId) router.push(`/voice/room/${roomId}`);
  };

  const deleteRoom = async (roomId: string) => {
    try {
      await fetch(`${api}/api/rooms/${roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRooms();
    } catch {}
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    router.replace("/voice");
  };

  if (!ready) return null;

  return (
    <div className="flex h-screen bg-dark">
      {/* 左侧栏：房间列表 */}
      <aside className="w-60 flex flex-col bg-[#1e1e1e] border-r border-gray-800 shrink-0">
        <div className="px-3 py-3 border-b border-gray-800 space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#333] border border-gray-700 rounded-lg px-3 py-1.5 text-xs transition-colors"
          >
            ← 返回主界面
          </Link>
          <div className="text-center">
            <span className="text-gray-300 font-semibold text-sm">🎙️ 语音大厅</span>
          </div>
        </div>

        {/* 房间列表 */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <p className="text-gray-600 text-xs px-2 mb-2">房间 - {rooms.length}</p>
          {rooms.map((r) => (
            <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2a] group">
              <button
                onClick={() => joinRoom(r.roomId)}
                className="text-gray-300 text-sm hover:text-emerald-400 transition-colors flex-1 text-left"
              >
                # {r.roomId}
              </button>
              <button
                onClick={() => deleteRoom(r.roomId)}
                className="text-gray-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all"
                title="删除房间"
              >
                ✕
              </button>
            </div>
          ))}
          {rooms.length === 0 && (
            <p className="text-gray-700 text-xs px-2">暂无房间</p>
          )}
        </div>

        {/* 底部用户信息 */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-gray-400 text-sm">{username}</span>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 右侧主区域 */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-lg mx-auto space-y-8">
          {/* 创建房间 */}
          <div className="bg-[#242424] border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="text-gray-200 font-semibold">创建房间</h2>
            <p className="text-gray-500 text-sm">输入一个房间号，邀请朋友加入</p>
            <div className="flex gap-3">
              <input
                className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 outline-none focus:border-gray-500 transition-colors text-sm"
                placeholder="房间号（如 2024）"
                value={createInput}
                onChange={(e) => setCreateInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
              />
              <button
                onClick={createRoom}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-all"
              >
                创建
              </button>
            </div>
          </div>

          {/* 加入房间 */}
          <div className="bg-[#242424] border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="text-gray-200 font-semibold">加入房间</h2>
            <p className="text-gray-500 text-sm">输入房间号加入已有房间</p>
            <div className="flex gap-3">
              <input
                className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 outline-none focus:border-gray-500 transition-colors text-sm"
                placeholder="输入房间号"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom(joinInput.trim())}
              />
              <button
                onClick={() => joinRoom(joinInput.trim())}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm transition-all"
              >
                加入
              </button>
            </div>
          </div>

          {/* 消息提示 */}
          {msg && (
            <div
              className={`text-center text-sm py-2 px-4 rounded-lg ${
                msg.type === "loading" ? "bg-gray-700 text-gray-300" :
                msg.type === "error" ? "bg-red-900/30 text-red-400 border border-red-800" :
                "bg-gray-700 text-gray-300"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
