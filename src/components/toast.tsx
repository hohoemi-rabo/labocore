"use client";

import { useCallback, useRef, useState } from "react";

// DESIGN §6: トーストは ink 塗り・白文字・pill・下部中央・3秒で消える。
// 出欠タップの失敗ロールバック通知（09）や支払いチェック（11）で使い回す。
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  return { message, showToast };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
      <div className="rounded-pill bg-ink px-5 py-3 text-[15px] font-semibold text-on-dark">
        {message}
      </div>
    </div>
  );
}
