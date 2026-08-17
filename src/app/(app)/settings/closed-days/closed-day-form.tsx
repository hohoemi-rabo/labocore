"use client";

import { startTransition, useActionState, useRef } from "react";
import {
  labelClass,
  inputClass,
  errorClass,
  errorBandClass,
} from "@/components/v2/form";
import { skyButtonClass } from "@/components/v2/styles";
import { createClosedDay } from "./actions";

export function ClosedDayForm() {
  const [state, formAction, pending] = useActionState(createClosedDay, {});
  const formRef = useRef<HTMLFormElement>(null);

  // <form action={formAction}> は使わない。React 19 は action が throw せずに返ると
  // 非制御フィールドをリセットするため、日付が重複していた瞬間に入力が全部消える
  // （16 からの申し送り。ここが一番の被害箇所だった）。
  //
  // 送信ボタンは type="submit" のままにして onSubmit で止め、手動 dispatch する。
  // こうすると required のネイティブ検証と Enter 送信がそのまま効く（24 のログイン画面と同じ形）。
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const form = formRef.current;
        if (!form) return;
        startTransition(() => formAction(new FormData(form)));
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex flex-col gap-2 md:w-[200px]">
          <label htmlFor="closed_date" className={labelClass}>
            日付
          </label>
          <input
            id="closed_date"
            name="closed_date"
            type="date"
            required
            className={`${inputClass} tabular-nums`}
          />
          {state.fieldErrors?.closed_date && (
            <p className={errorClass}>{state.fieldErrors.closed_date}</p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="reason" className={labelClass}>
            理由メモ（任意）
          </label>
          <input
            id="reason"
            name="reason"
            type="text"
            placeholder="山の日 など"
            className={inputClass}
          />
          {state.fieldErrors?.reason && (
            <p className={errorClass}>{state.fieldErrors.reason}</p>
          )}
        </div>
      </div>

      {state.formError && <p className={errorBandClass}>{state.formError}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`${skyButtonClass} self-start disabled:opacity-60`}
      >
        {pending ? "登録中…" : "登録する"}
      </button>
    </form>
  );
}
