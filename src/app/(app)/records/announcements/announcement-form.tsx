"use client";

import { startTransition, useActionState, useRef } from "react";
import {
  labelClass,
  inputClass,
  selectClass,
  textareaClass,
  errorClass,
  errorBandClass,
} from "@/components/v2/form";
import { skyButtonClass } from "@/components/v2/styles";
import type { AnnouncementFormState } from "./actions";

type Action = (
  prevState: AnnouncementFormState,
  formData: FormData,
) => Promise<AnnouncementFormState>;

export type AnnouncementClassOption = {
  id: string;
  name: string;
  theme_color: string;
};

export type AnnouncementDefaultValues = {
  id?: string;
  title?: string;
  body?: string;
  class_id?: string | null;
  starts_on?: string;
  ends_on?: string;
};

export function AnnouncementForm({
  action,
  classes,
  defaultValues,
  defaultStartsOn,
  defaultEndsOn,
}: {
  action: Action;
  classes: AnnouncementClassOption[];
  defaultValues?: AnnouncementDefaultValues;
  /** 新規時の既定期間（サーバーで JST の今日から算出して渡す） */
  defaultStartsOn: string;
  defaultEndsOn: string;
}) {
  const [state, formAction, pending] = useActionState<
    AnnouncementFormState,
    FormData
  >(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // <form action={formAction}> は使わない。React 19 は action が throw せずに返ると
  // 非制御フィールドをリセットするため、{fieldErrors} を返した瞬間に
  // タイトル・本文が消えてしまう（チケット16 で確立した回避策）。
  function submit() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    startTransition(() => formAction(new FormData(form)));
  }

  return (
    <form ref={formRef} className="flex flex-col gap-5">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={labelClass}>
          タイトル
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="お盆休みのお知らせ"
          defaultValue={defaultValues?.title}
          className={inputClass}
        />
        {state.fieldErrors?.title && (
          <p className={errorClass}>{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="body" className={labelClass}>
          本文
        </label>
        <textarea
          id="body"
          name="body"
          required
          placeholder="8月13日(木)・14日(金)はお盆休みです。お間違えのないようご注意ください。"
          defaultValue={defaultValues?.body}
          className={textareaClass}
        />
        {state.fieldErrors?.body && (
          <p className={errorClass}>{state.fieldErrors.body}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="class_id" className={labelClass}>
          お知らせする相手
        </label>
        <select
          id="class_id"
          name="class_id"
          defaultValue={defaultValues?.class_id ?? ""}
          className={selectClass}
        >
          <option value="">全体向け（すべてのクラス）</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="starts_on" className={labelClass}>
            掲載開始日
          </label>
          <input
            id="starts_on"
            name="starts_on"
            type="date"
            required
            defaultValue={defaultValues?.starts_on ?? defaultStartsOn}
            className={`${inputClass} tabular-nums`}
          />
          {state.fieldErrors?.starts_on && (
            <p className={errorClass}>{state.fieldErrors.starts_on}</p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="ends_on" className={labelClass}>
            掲載終了日
          </label>
          <input
            id="ends_on"
            name="ends_on"
            type="date"
            required
            defaultValue={defaultValues?.ends_on ?? defaultEndsOn}
            className={`${inputClass} tabular-nums`}
          />
          {state.fieldErrors?.ends_on && (
            <p className={errorClass}>{state.fieldErrors.ends_on}</p>
          )}
        </div>
      </div>

      <p className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
        この期間だけ生徒向けページに表示されます。期間が過ぎると自動で消えるので、
        あとから削除する必要はありません。
      </p>

      {state.formError && <p className={errorBandClass}>{state.formError}</p>}

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className={`${skyButtonClass} self-start disabled:opacity-60`}
      >
        {pending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
