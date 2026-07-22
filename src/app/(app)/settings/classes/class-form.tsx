"use client";

import { useActionState } from "react";
import { WEEKDAY_LABELS } from "@/lib/format";
import type { ClassFormState } from "./actions";

const labelClass = "text-[14px] font-semibold text-ink";
const inputClass =
  "h-11 rounded-pill border border-hairline bg-canvas px-5 text-[17px] text-ink outline-none focus:ring-2 focus:ring-primary-focus";
const errorClass = "text-[14px] font-semibold text-ink";

type Action = (
  prevState: ClassFormState,
  formData: FormData,
) => Promise<ClassFormState>;

export type ClassDefaultValues = {
  id?: string;
  name?: string;
  weekday?: number;
  start_time?: string;
  end_time?: string;
};

export function ClassForm({
  action,
  submitLabel,
  defaultValues,
}: {
  action: Action;
  submitLabel: string;
  defaultValues?: ClassDefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={labelClass}>
          コマ名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="水曜午前クラス"
          defaultValue={defaultValues?.name}
          className={inputClass}
        />
        {state.fieldErrors?.name && (
          <p className={errorClass}>{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="weekday" className={labelClass}>
          曜日
        </label>
        <select
          id="weekday"
          name="weekday"
          defaultValue={defaultValues?.weekday ?? 3}
          className={`${inputClass} pr-4`}
        >
          {WEEKDAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}曜日
            </option>
          ))}
        </select>
        {state.fieldErrors?.weekday && (
          <p className={errorClass}>{state.fieldErrors.weekday}</p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="start_time" className={labelClass}>
            開始時間
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            required
            defaultValue={defaultValues?.start_time}
            className={inputClass}
          />
          {state.fieldErrors?.start_time && (
            <p className={errorClass}>{state.fieldErrors.start_time}</p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="end_time" className={labelClass}>
            終了時間
          </label>
          <input
            id="end_time"
            name="end_time"
            type="time"
            required
            defaultValue={defaultValues?.end_time}
            className={inputClass}
          />
          {state.fieldErrors?.end_time && (
            <p className={errorClass}>{state.fieldErrors.end_time}</p>
          )}
        </div>
      </div>

      {state.formError && <p className={errorClass}>{state.formError}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-11 items-center justify-center self-start rounded-pill bg-primary px-8 text-[17px] font-semibold text-on-dark transition-transform active:scale-95 disabled:opacity-60"
      >
        {pending ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
