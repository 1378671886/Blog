"use client";

import { useState } from "react";
import Link from "next/link";

export default function Voice() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  async function handleLogin() {
    const res = await fetch(`${api}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  }

  async function handleRegister() {
    const res = await fetch(`${api}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-white/10 backdrop-blur p-6 rounded-xl w-full max-w-sm space-y-4">
        <div className="text-center">
          <span className="text-5xl block mb-2">🎙️</span>
          <h1 className="text-2xl font-bold text-white">实时语音 · 登录</h1>
        </div>

        <input
          className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 outline-none"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 outline-none"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-3">
          <button onClick={handleRegister} className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
            注册
          </button>
          <button onClick={handleLogin} className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
            登录
          </button>
        </div>

        {result && (
          <pre className="mt-4 p-4 bg-black/30 rounded-lg text-sm text-green-300 overflow-auto max-h-48">
            {result}
          </pre>
        )}

        <div className="text-center">
          <Link href="/" className="text-sm text-purple-300 hover:text-white transition-colors">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
