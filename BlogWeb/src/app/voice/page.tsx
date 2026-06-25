"use client";

import { useState } from "react";
import Link from "next/link";
import VideoBackground from "@/components/VideoBackground";

type Status = { type: "idle" } | { type: "loading"; text: string } | { type: "error"; text: string };

export default function Voice() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function handleLogin() {
    setStatus({ type: "loading", text: "登录中..." });
    try {
      const res = await fetch(`${api}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.token) {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("username", username);
        window.location.href = "/voice/lobby";
      } else {
        setStatus({ type: "error", text: data.error || "登录失败" });
      }
    } catch {
      setStatus({ type: "error", text: "网络错误，请检查后端是否启动" });
    }
  }

  async function handleRegister() {
    setStatus({ type: "loading", text: "注册中..." });
    try {
      const res = await fetch(`${api}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.userId) {
        handleLogin();
      } else {
        setStatus({ type: "error", text: data.error || "注册失败" });
      }
    } catch {
      setStatus({ type: "error", text: "网络错误，请检查后端是否启动" });
    }
  }

  const loading = status.type === "loading";

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen">
      <VideoBackground src="/videos/初音.mp4" />
      <div className="fixed inset-0 bg-black/50 z-[1]" />
      <div className="relative z-10 bg-white/10 backdrop-blur-md p-8 rounded-2xl w-full max-w-sm space-y-5 border border-white/20 shadow-xl">
        <div className="text-center">
          <span className="text-5xl block mb-3">🎙️</span>
          <h1 className="text-2xl font-bold text-white">实时语音</h1>
          <p className="text-white/60 text-sm mt-1">登录或注册以开始使用</p>
        </div>

        <input
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-gray-700 text-gray-200 placeholder-gray-500 outline-none focus:border-gray-500 transition-colors"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
        <input
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-gray-700 text-gray-200 placeholder-gray-500 outline-none focus:border-gray-500 transition-colors"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <div className="flex gap-3">
          <button
            onClick={handleRegister}
            disabled={loading}
            className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "注册"}
          </button>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex-1 py-3 bg-gray-200 hover:bg-white text-gray-800 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "登录"}
          </button>
        </div>

        {status.type !== "idle" && (
          <div
            className={`text-center text-sm py-2 px-4 rounded-lg ${
              status.type === "loading"
                ? "bg-gray-700 text-gray-300"
                : "bg-red-900/30 text-red-400 border border-red-800"
            }`}
          >
            {status.text}
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
