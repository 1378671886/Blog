"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const POOL = [
  "🎉", "✨", "🌟", "💫", "🎈", "🎊", "🎀", "💝", "🌸", "🌺",
  "🍀", "🌈", "⭐", "💖", "🦋", "🐱", "🐶", "🦊", "🐼", "🐨",
  "🍕", "🍦", "🍩", "🎂", "🍭", "🎵", "🎶", "💡", "🔥", "💎",
];

interface Burst {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

function Particle({
  emoji,
  x,
  y,
  onDone,
}: {
  emoji: string;
  x: number;
  y: number;
  onDone: () => void;
}) {
  const endX = (Math.random() - 0.5) * 160;
  const endY = (Math.random() - 0.5) * 160 - 40;
  const rotation = (Math.random() - 0.5) * 540;
  const size = 16 + Math.random() * 16;

  const [flying, setFlying] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFlying(true), 16);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!flying) return;
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [flying, onDone]);

  return (
    <span
      className="pointer-events-none fixed z-[100]"
      style={{
        left: x,
        top: y,
        fontSize: size,
        transform: flying
          ? `translate(${endX}px, ${endY}px) rotate(${rotation}deg)`
          : "translate(0,0) rotate(0deg)",
        opacity: flying ? 0 : 1,
        transition: `transform 0.8s cubic-bezier(0, 0.7, 0.3, 1), opacity 0.7s ease-out 0.15s`,
      }}
    >
      {emoji}
    </span>
  );
}

export default function EmojiCalendar() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [date, setDate] = useState(new Date());
  const nextId = useRef(0);

  const year = date.getFullYear();
  const month = date.getMonth();
  const today = new Date();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const handleDayClick = useCallback((e: React.MouseEvent, day: number) => {
    const count = 6 + Math.floor(Math.random() * 8);
    const newBursts: Burst[] = [];
    for (let i = 0; i < count; i++) {
      newBursts.push({
        id: nextId.current++,
        emoji: POOL[Math.floor(Math.random() * POOL.length)],
        x: e.clientX,
        y: e.clientY,
      });
    }
    setBursts((prev) => [...prev, ...newBursts]);
  }, []);

  const removeBurst = useCallback((id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const MONTHS = [
    "一月","二月","三月","四月","五月","六月",
    "七月","八月","九月","十月","十一月","十二月",
  ];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <>
      {bursts.map((b) => (
        <Particle
          key={b.id}
          emoji={b.emoji}
          x={b.x}
          y={b.y}
          onDone={() => removeBurst(b.id)}
        />
      ))}

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-4 select-none">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="text-white/60 hover:text-white text-xs transition-colors"
          >
            ◀
          </button>
          <span className="text-white text-sm font-medium">
            {year} {MONTHS[month]}
          </span>
          <button
            onClick={nextMonth}
            className="text-white/60 hover:text-white text-xs transition-colors"
          >
            ▶
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {weekDays.map((w) => (
            <div
              key={w}
              className="text-center text-[10px] text-white/50 py-0.5"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) =>
            d === null ? (
              <div key={`e-${i}`} />
            ) : (
              <button
                key={d}
                onClick={(e) => handleDayClick(e, d)}
                className={`aspect-square flex items-center justify-center text-xs rounded-md transition-colors ${
                  isToday(d)
                    ? "bg-blue-500/30 text-white font-bold hover:bg-blue-500/50"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {d}
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}
