"use client";

import { useEffect } from "react";
import {
  entryBoxClass,
  entryButtonClass,
  entryCanvasClass,
  tricolorClass,
} from "@/components/v2/styles";

// 生徒向け /kiroku 配下のエラー受け皿（チケット29）。
// シニアの方が読む前提で、原因の説明より「どうすればいいか」だけを短く出す。
export default function KirokuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[kiroku] ページの描画に失敗しました:", error);
  }, [error]);

  return (
    <main className={entryCanvasClass}>
      <div className={entryBoxClass}>
        <div className={`${tricolorClass} mx-auto mb-5`} aria-hidden />

        <h1 className="text-[23px] font-black leading-[1.5]">
          うまく読み込めませんでした
        </h1>

        <p className="mt-3 text-[17px] leading-jp text-sub">
          電波の良いところで、もう一度お試しください。
          <br />
          何度も出るときは、次の授業で先生に教えてください。
        </p>

        <button
          type="button"
          onClick={reset}
          className={`${entryButtonClass} mt-6`}
        >
          もう一度ためす
        </button>
      </div>
    </main>
  );
}
