"use client";

import { useEffect, useRef, useState } from "react";
import { copyButtonClass, copyDoneButtonClass } from "@/components/v2/styles";

const IDLE_LABEL = "この言葉をコピーする（おうちでも試せます）";
const DONE_LABEL = "コピーしました";
const FAILED_HINT = "コピーできませんでした。文字を長押しして選んでください。";
const REVERT_MS = 2500;

type State = "idle" | "done" | "failed";

/**
 * プロンプトのコピーボタン（DESIGN §7）。生徒向けページ唯一のクライアント部品。
 *
 * 本文は prop で受け取る（サンプルの getElementById(pre).textContent は移植しない。
 * 記録がN件並ぶと id が衝突する）。
 */
export function CopyPromptButton({ text }: { text: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleClick() {
    setState((await copyText(text)) ? "done" : "failed");
    // 連打されたら前のタイマーを捨てて貼り直す。
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), REVERT_MS);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        // 2.5秒間 disabled にしない（フォーカスが外れて壊れたように見える。操作は冪等）。
        // クラスは連結せず丸ごと差し替える（塗りが2つ当たると出力順で勝敗が決まる）。
        className={state === "done" ? copyDoneButtonClass : copyButtonClass}
      >
        <span aria-hidden>{state === "done" ? "✅" : "📋"}</span>
        <span className="ml-2">
          {state === "done" ? DONE_LABEL : IDLE_LABEL}
        </span>
      </button>

      {state === "failed" && (
        <p className="mt-2 text-[15px] font-bold text-off">{FAILED_HINT}</p>
      )}

      {/* ボタンの文字が変わっても読み上げられるとは限らないので、状態は別に通知する */}
      <span role="status" className="sr-only">
        {state === "done" ? DONE_LABEL : state === "failed" ? FAILED_HINT : ""}
      </span>
    </div>
  );
}

/**
 * クリップボードへ書く。成功したら true。
 *
 * ⚠️ `navigator.clipboard` は **secure context にしか存在しない**。
 * 実機確認は http://192.168.x.x:3000 で行うため、素直に呼ぶと TypeError で落ちる。
 * 非 secure な場面では textarea + execCommand の旧方式に落とす。
 */
async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 権限拒否などはフォールバックに回す
    }
  }
  return copyWithTextarea(text);
}

function copyWithTextarea(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  // display:none だと選択できない。readOnly を付けないと iOS でキーボードが出る。
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);

  try {
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS は範囲指定まで必要
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}
