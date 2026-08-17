"use client";

import { startTransition, useActionState, useRef } from "react";
import { errorBandClass, inputClass, labelClass } from "@/components/v2/form";
import { entryButtonClass } from "@/components/v2/styles";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // <form action={formAction}> は使わない。React 19 は action が throw せずに返ると
  // 非制御フィールドをリセットするため、ログインを1回間違えるだけで
  // メールアドレスまで消えて入れ直しになる（16 で確立した回避策）。
  //
  // 送信ボタンは type="submit" のままにして、ここで preventDefault してから手動 dispatch する。
  // こうすると required のネイティブ検証と Enter 送信がそのまま効く
  // （入力欄が1つだけの合言葉フォームと違い、ここは onSubmit が確実に発火する）。
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const form = formRef.current;
        if (!form) return;
        startTransition(() => formAction(new FormData(form)));
      }}
      className="mt-7 flex flex-col gap-4 text-left"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={labelClass}>
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      {state.error && (
        <p role="alert" className={errorBandClass}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${entryButtonClass} mt-2 disabled:opacity-60`}
      >
        {pending ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
