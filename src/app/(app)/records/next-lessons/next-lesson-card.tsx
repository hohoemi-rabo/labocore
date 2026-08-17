"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import { accentStyle } from "@/lib/accent";
import { formatTimeRange } from "@/lib/format";
import {
  labelClass,
  inputClass,
  textareaClass,
  errorClass,
  errorBandClass,
} from "@/components/v2/form";
import {
  clearNextLesson,
  saveNextLesson,
  type NextLessonFormState,
} from "./actions";

export type NextLessonClass = {
  id: string;
  name: string;
  themeColor: string;
  startTime: string | null;
  endTime: string | null;
  date: string | null;
  theme: string | null;
  note: string | null;
};

export function NextLessonCard({
  cls,
  today,
  onSaved,
  onError,
}: {
  cls: NextLessonClass;
  /** JST の今日。過去日の注意表示に使う */
  today: string;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [state, dispatch, pending] = useActionState<
    NextLessonFormState,
    Parameters<typeof saveNextLesson>[1]
  >(saveNextLesson, {});
  const [clearing, startClearing] = useTransition();

  const [form, setForm] = useState({
    date: cls.date ?? "",
    theme: cls.theme ?? "",
    note: cls.note ?? "",
  });

  // 入力は制御コンポーネントにしてある。非制御だと「未定に戻す」で DB を空にしても
  // 一度でも触った入力欄には古い値が残り、触っていない欄だけ消える、という
  // ちぐはぐな見え方になるため。
  //
  // サーバー側の値が変わったときだけ入力を追従させる（React の
  // 「レンダー中に state を調整する」パターン）。自分のカードを保存・クリアしたときは
  // 署名が変わって最新値に揃い、**他のカードを保存しても署名は変わらないので
  // 入力中の内容は消えない**。
  const signature = `${cls.date ?? ""}|${cls.theme ?? ""}|${cls.note ?? ""}`;
  const [prevSignature, setPrevSignature] = useState(signature);
  if (signature !== prevSignature) {
    setPrevSignature(signature);
    setForm({ date: cls.date ?? "", theme: cls.theme ?? "", note: cls.note ?? "" });
  }

  const busy = pending || clearing;
  const isPast = cls.date !== null && cls.date < today;
  const isUnset = !cls.date && !cls.theme && !cls.note;

  function save() {
    // useActionState の dispatch はトランジション内から呼ぶ必要がある
    // （外から呼ぶと pending が更新されない）。
    startTransition(() => dispatch({ classId: cls.id, ...form }));
  }

  function clear() {
    startClearing(async () => {
      const result = await clearNextLesson(cls.id);
      if (result.error) onError(result.error);
    });
  }

  // 保存が通ったら親にトーストを出してもらう（カードごとに出すと重なるため）。
  useEffect(() => {
    if (state.savedAt) onSaved();
  }, [state.savedAt, onSaved]);

  return (
    <section
      style={accentStyle(cls.themeColor)}
      className="rounded-20 border border-line bg-card px-5 py-5 shadow-elev-2"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="h-6 w-1.5 rounded-pill bg-accent-bar" aria-hidden />
        <h2 className="text-[19px] font-black text-fg">{cls.name}</h2>
        {cls.startTime && cls.endTime && (
          <span className="text-[15px] tabular-nums text-sub">
            {formatTimeRange(cls.startTime, cls.endTime)}
          </span>
        )}
        {isUnset && <span className="inline-flex min-h-[44px] items-center text-[15px] text-sub">未定</span>}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={`date-${cls.id}`} className={labelClass}>
            日付
          </label>
          <input
            id={`date-${cls.id}`}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={`${inputClass} tabular-nums`}
          />
          {state.fieldErrors?.date && (
            <p className={errorClass}>{state.fieldErrors.date}</p>
          )}
          {isPast && (
            <p className={errorClass}>
              この日付は過ぎています。生徒向けページには表示されていません。
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`theme-${cls.id}`} className={labelClass}>
            テーマ
          </label>
          <input
            id={`theme-${cls.id}`}
            type="text"
            value={form.theme}
            onChange={(e) => setForm({ ...form, theme: e.target.value })}
            placeholder="AIで「敬老の日」のカードを作ろう"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`note-${cls.id}`} className={labelClass}>
            持ち物などのメモ（任意）
          </label>
          <textarea
            id={`note-${cls.id}`}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="持ち物: スマホ（充電をお忘れなく）"
            className={`${textareaClass} min-h-[80px]`}
          />
        </div>

        {state.formError && <p className={errorBandClass}>{state.formError}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="flex min-h-[44px] items-center justify-center rounded-16 bg-accent-fill px-6 text-[17px] font-bold text-white shadow-glow-btn transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-60"
          >
            {pending ? "保存中…" : "保存する"}
          </button>
          {!isUnset && (
            <button
              type="button"
              disabled={busy}
              onClick={clear}
              className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-5 text-[17px] font-bold text-sub transition active:scale-95 disabled:opacity-60"
            >
              {clearing ? "戻しています…" : "未定に戻す"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
