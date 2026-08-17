"use client";

import { useEffect } from "react";
import {
  glassCardClass,
  skyButtonClass,
  v2CanvasClass,
} from "@/components/v2/styles";

// (app) 配下のページが throw したときの受け皿（チケット29）。
// これが無いと Next の素のエラー画面（英語）がそのまま出る。
// digest はサーバーログ（vercel logs）と突き合わせるためのキー。
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] ページの描画に失敗しました:", error);
  }, [error]);

  return (
    <div className={v2CanvasClass}>
      <div
        className={`${glassCardClass} flex min-h-[240px] flex-col items-center justify-center gap-4 px-6 py-12 text-center`}
      >
        {/* 役割色「エラー」= ローズ（DESIGN §2） */}
        <p className="text-[21px] font-black text-off">読み込みに失敗しました</p>
        <p className="text-[17px] leading-jp text-sub">
          通信状況を確認して、もう一度お試しください。
          {error.digest && (
            <span className="mt-1 block text-[14px] tabular-nums">
              エラーID: {error.digest}
            </span>
          )}
        </p>
        <button type="button" onClick={reset} className={skyButtonClass}>
          もう一度読み込む
        </button>
      </div>
    </div>
  );
}
