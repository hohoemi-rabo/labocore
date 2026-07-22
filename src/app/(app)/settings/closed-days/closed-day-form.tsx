"use client";

import { useActionState } from "react";
import { labelClass, inputClass, errorClass } from "@/components/ui/form";
import { createClosedDay } from "./actions";

export function ClosedDayForm() {
  const [state, formAction, pending] = useActionState(createClosedDay, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
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
            className={inputClass}
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

      {state.formError && <p className={errorClass}>{state.formError}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center justify-center self-start rounded-pill bg-primary px-8 text-[17px] font-semibold text-on-dark transition-transform active:scale-95 disabled:opacity-60"
      >
        {pending ? "登録中…" : "登録する"}
      </button>
    </form>
  );
}
