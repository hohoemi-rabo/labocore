"use client";

import { startTransition, useActionState, useRef } from "react";
import { WEEKDAY_LABELS } from "@/lib/format";
import { CLASS_THEME_COLORS, accentStyle } from "@/lib/accent";
import {
  labelClass,
  inputClass,
  selectClass,
  errorClass,
  errorBandClass,
} from "@/components/v2/form";
import { skyButtonClass } from "@/components/v2/styles";
import type { ClassFormState } from "./actions";

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
  theme_color?: string;
};

export function ClassForm({
  action,
  submitLabel,
  defaultValues,
  usedColors = {},
}: {
  action: Action;
  submitLabel: string;
  defaultValues?: ClassDefaultValues;
  /**
   * 他の active コマが既に使っている色（自分自身は除く）。
   * `色 → コマ名` で渡し、新規作成時の既定選択と重複の注意書きに使う。
   */
  usedColors?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // DB 値が大文字で入っていてもパレットと突き合わせられるように揃える。
  // 揃えないと defaultChecked がどれにも当たらず、ラジオが未選択のまま送信されてしまう。
  const current = defaultValues?.theme_color?.toLowerCase();
  const known = CLASS_THEME_COLORS.some((c) => c.value === current);

  // 新規作成で既定色のままだと、水曜午後を足したときに水曜午前と同じ色になってしまう。
  // まだ使われていない色を最初から選んでおく（全色埋まっていれば先頭に戻る）。
  const defaultColor =
    (known ? current : undefined) ??
    CLASS_THEME_COLORS.find((c) => !usedColors[c.value])?.value ??
    CLASS_THEME_COLORS[0].value;

  // action={formAction} は使わない（React 19 が返却時に非制御フィールドをリセットするため）。
  // 送信ボタンは type="submit" のままにして onSubmit で止め、手動 dispatch する。
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
          className={selectClass}
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
            className={`${inputClass} tabular-nums`}
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
            className={`${inputClass} tabular-nums`}
          />
          {state.fieldErrors?.end_time && (
            <p className={errorClass}>{state.fieldErrors.end_time}</p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>テーマカラー</legend>
        <p className="text-[14px] text-sub">
          生徒向けページで、このクラスの差し色になります。
        </p>
        <div className="flex flex-wrap gap-3">
          {CLASS_THEME_COLORS.map((c) => {
            return (
              <label
                key={c.value}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-pill border border-line px-4 transition has-[:checked]:border-accent has-[:checked]:bg-white/[0.06]"
              >
                <input
                  type="radio"
                  name="theme_color"
                  value={c.value}
                  defaultChecked={c.value === defaultColor}
                  className="peer sr-only"
                />
                {/* 色は DB 由来の動的な値なのでクラス名に埋め込まず CSS 変数で注入する
                    （DESIGN_v2 §9）。インライン hex は書かない。 */}
                <span
                  aria-hidden
                  style={accentStyle(c.value)}
                  className="h-5 w-5 rounded-pill bg-accent"
                />
                <span className="text-[14px] text-fg">{c.label}</span>
                {/* 選択状態を色だけで表さない（色覚・モノクロ表示への配慮） */}
                <span
                  aria-hidden
                  className="hidden text-[14px] font-bold text-accent peer-checked:inline"
                >
                  ✓
                </span>
              </label>
            );
          })}
        </div>
        {/* 6色より多くコマが増えることもあるので、重複は禁止せず注意だけ出す */}
        {usedColors[defaultColor] && (
          <p className="text-[14px] text-sub">
            選択中の色は「{usedColors[defaultColor]}」でも使われています。
          </p>
        )}
        {state.fieldErrors?.theme_color && (
          <p className={errorClass}>{state.fieldErrors.theme_color}</p>
        )}
      </fieldset>

      {state.formError && <p className={errorBandClass}>{state.formError}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`${skyButtonClass} mt-2 self-start disabled:opacity-60`}
      >
        {pending ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
