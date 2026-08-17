"use client";

import { useCallback, useRef, useState } from "react";

// トースト（DESIGN.md §8）。
//
// 楽観的更新の失敗通知に使う（即時反映 → 失敗でロールバック + この通知）。
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
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8"
    >
      <div className="rounded-pill border border-line bg-surface-2 px-5 py-3 text-[15px] font-bold text-fg shadow-elev-2">
        {message}
      </div>
    </div>
  );
}
