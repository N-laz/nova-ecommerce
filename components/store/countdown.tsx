"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(end - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const { h, m, s } = parts(left ?? 0);
  const cell = (v: number, l: string) => (
    <div className="flex flex-col items-center">
      <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/6 font-mono text-2xl font-medium tabular hairline md:h-16 md:w-16 md:text-3xl">{left === null ? "--" : String(v).padStart(2, "0")}</span>
      <span className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">{l}</span>
    </div>
  );
  if (left !== null && left <= 0) return <p className="text-sm text-muted">This drop has ended.</p>;
  return (
    <div className="flex items-start gap-2" role="timer" aria-label="Time remaining">
      {cell(h, "Hours")}
      <span className="pt-4 text-xl text-subtle">:</span>
      {cell(m, "Min")}
      <span className="pt-4 text-xl text-subtle">:</span>
      {cell(s, "Sec")}
    </div>
  );
}
