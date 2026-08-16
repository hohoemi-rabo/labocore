"use client";

import { startTransition, useActionState, useRef } from "react";
import { entryInputClass, errorBandClass } from "@/components/v2/form";
import { entryButtonClass } from "@/components/v2/styles";
import { enterKiroku, type GateState } from "./actions";

export function GateForm() {
  const [state, formAction, pending] = useActionState<GateState, FormData>(
    enterKiroku,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // <form action={formAction}> は使わない。React 19 は action が throw せずに返ると
  // 非制御フィールドをリセットするため、間違えた瞬間に入力が消えてしまう
  // （打ち直しではなく1文字直したい人が多い。チケット16 で確立した回避策）。
  function submit() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    startTransition(() => formAction(new FormData(form)));
  }

  return (
    <form
      ref={formRef}
      // 入力欄が1つだけのフォームは Enter で HTML の暗黙送信が起きる。
      // action も submit ボタンも無いので、そのままだとブラウザが素の GET を投げて
      // ページがリロードされ、エラー帯が消える。ここで止めて手動 dispatch に寄せる
      // （結果としてサンプルどおり Enter でも送信できる）。
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-6 flex flex-col gap-4"
    >
      <input
        id="password"
        name="password"
        type="text"
        required
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="あいことば"
        aria-label="あいことば"
        className={entryInputClass}
      />

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className={`${entryButtonClass} disabled:opacity-60`}
      >
        {pending ? "確認中…" : "開く"}
      </button>

      {state.formError && (
        <p className={`${errorBandClass} text-left`}>{state.formError}</p>
      )}
    </form>
  );
}
