"use client";

import { useActionState } from "react";
import {
  labelClass,
  inputClass,
  textareaClass,
  errorClass,
} from "@/components/ui/form";
import type { StudentFormState } from "./actions";

type Action = (
  prevState: StudentFormState,
  formData: FormData,
) => Promise<StudentFormState>;

export type StudentDefaultValues = {
  id?: string;
  name?: string;
  kana?: string;
  class_id?: string;
  unit_price?: number;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  birth_date?: string | null;
  smartphone_os?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_phone?: string | null;
  note?: string | null;
};

const sectionTitleClass = "text-[21px] font-semibold text-ink";

export function StudentForm({
  action,
  submitLabel,
  classOptions,
  defaultValues,
}: {
  action: Action;
  submitLabel: string;
  classOptions: { id: string; name: string }[];
  defaultValues?: StudentDefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const d = defaultValues;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {d?.id && <input type="hidden" name="id" value={d.id} />}

      {/* 基本情報（必須） */}
      <section className="flex flex-col gap-5">
        <h2 className={sectionTitleClass}>基本情報</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className={labelClass}>
            氏名
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={d?.name}
            className={inputClass}
          />
          {state.fieldErrors?.name && (
            <p className={errorClass}>{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="kana" className={labelClass}>
            ふりがな
          </label>
          <input
            id="kana"
            name="kana"
            type="text"
            required
            placeholder="やまだ たろう"
            defaultValue={d?.kana}
            className={inputClass}
          />
          {state.fieldErrors?.kana && (
            <p className={errorClass}>{state.fieldErrors.kana}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="class_id" className={labelClass}>
            所属コマ
          </label>
          <select
            id="class_id"
            name="class_id"
            required
            defaultValue={d?.class_id ?? ""}
            className={`${inputClass} pr-4`}
          >
            <option value="" disabled>
              選択してください
            </option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.class_id && (
            <p className={errorClass}>{state.fieldErrors.class_id}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="unit_price" className={labelClass}>
            単価（円／回）
          </label>
          <input
            id="unit_price"
            name="unit_price"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            required
            defaultValue={d?.unit_price ?? 2000}
            className={`${inputClass} tabular-nums`}
          />
          {state.fieldErrors?.unit_price && (
            <p className={errorClass}>{state.fieldErrors.unit_price}</p>
          )}
        </div>
      </section>

      {/* 連絡先（任意） */}
      <section className="flex flex-col gap-5">
        <h2 className={sectionTitleClass}>連絡先（任意）</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className={labelClass}>
            電話
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={d?.phone ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClass}>
            メール
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={d?.email ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.email && (
            <p className={errorClass}>{state.fieldErrors.email}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="address" className={labelClass}>
            住所
          </label>
          <input
            id="address"
            name="address"
            type="text"
            defaultValue={d?.address ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="birth_date" className={labelClass}>
            生年月日
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            defaultValue={d?.birth_date ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="smartphone_os" className={labelClass}>
            使用スマホ
          </label>
          <select
            id="smartphone_os"
            name="smartphone_os"
            defaultValue={d?.smartphone_os ?? ""}
            className={`${inputClass} pr-4`}
          >
            <option value="">未選択</option>
            <option value="android">Android</option>
            <option value="iphone">iPhone</option>
          </select>
        </div>
      </section>

      {/* 緊急連絡先（任意） */}
      <section className="flex flex-col gap-5">
        <h2 className={sectionTitleClass}>緊急連絡先（任意）</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="emergency_contact_name" className={labelClass}>
            氏名
          </label>
          <input
            id="emergency_contact_name"
            name="emergency_contact_name"
            type="text"
            defaultValue={d?.emergency_contact_name ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="emergency_contact_relation" className={labelClass}>
            続柄
          </label>
          <input
            id="emergency_contact_relation"
            name="emergency_contact_relation"
            type="text"
            placeholder="長女 など"
            defaultValue={d?.emergency_contact_relation ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="emergency_contact_phone" className={labelClass}>
            電話
          </label>
          <input
            id="emergency_contact_phone"
            name="emergency_contact_phone"
            type="tel"
            defaultValue={d?.emergency_contact_phone ?? ""}
            className={inputClass}
          />
        </div>
      </section>

      {/* メモ（任意） */}
      <section className="flex flex-col gap-5">
        <h2 className={sectionTitleClass}>メモ（任意）</h2>
        <textarea
          id="note"
          name="note"
          defaultValue={d?.note ?? ""}
          className={textareaClass}
        />
      </section>

      {state.formError && <p className={errorClass}>{state.formError}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center justify-center self-start rounded-pill bg-primary px-8 text-[17px] font-semibold text-on-dark transition-transform active:scale-95 disabled:opacity-60"
      >
        {pending ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
