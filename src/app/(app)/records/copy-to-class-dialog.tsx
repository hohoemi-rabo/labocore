"use client";

import { useRef, useState, useTransition } from "react";
import { WEEKDAY_LABELS, nextWeekdayOnOrAfter } from "@/lib/format";
import {
  errorBandClass,
  inputClass,
  labelClass,
  selectClass,
} from "@/components/v2/form";
import { skyButtonClass } from "@/components/v2/styles";
import { copyRecordToClass } from "./actions";
import type { RecordClassOption } from "./record-form";

// 記録カードを別クラスへ複製する（チケット23）。
//
// v2 の ConfirmDialog と同じ体裁だが別部品にしている。あちらは自前の <form> +
// Server Action 直結で、入力欄を持てないため（クラスと日付を選ばせる必要がある）。
// 成功すると Server Action がコピー先の編集画面へ redirect するので、ここでは
// 失敗した場合だけを扱う（ダイアログを閉じずにエラーを見せ、日付を直せるようにする）。

export function CopyToClassDialog({
  recordId,
  sourceClassId,
  sourceDate,
  classes,
}: {
  recordId: string;
  /** 元カードのクラス。コピー先の候補からは外す */
  sourceClassId: string;
  /** 元カードの日付。コピー先の曜日に合わせた既定日の起点にする */
  sourceDate: string;
  classes: RecordClassOption[];
}) {
  const targets = classes.filter((c) => c.id !== sourceClassId);
  const [classId, setClassId] = useState(targets[0]?.id ?? "");
  const [lessonDate, setLessonDate] = useState(() =>
    defaultDateFor(sourceDate, targets[0]),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 複製できる先が無ければ導線ごと出さない（クラスが1つしかない教室の初期状態）。
  if (targets.length === 0) return null;

  function selectClassId(nextId: string) {
    setClassId(nextId);
    // クラスを選び直したら日付も合わせ直す。曜日が違うクラスへ元の日付のまま
    // 複製することはまず無いので、毎回入れ直すほうが直せる回数が少ない。
    setLessonDate(
      defaultDateFor(
        sourceDate,
        targets.find((c) => c.id === nextId),
      ),
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await copyRecordToClass({
        id: recordId,
        class_id: classId,
        lesson_date: lessonDate,
      });
      // 成功時は redirect されるのでここには来ない。
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-5 text-[17px] font-bold text-fg transition active:scale-95"
      >
        別のクラスに複製
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[90vw] max-w-[420px] rounded-20 border border-line bg-card p-6 font-jp text-fg shadow-elev-3 [&::backdrop]:bg-black/60"
      >
        <h2 className="text-[21px] font-black">別のクラスに複製</h2>
        <p className="mt-2 text-[17px] leading-jp text-fg-body">
          テーマ・ひとことメモ・プロンプト・写真をそのまま写した
          <strong className="font-bold">下書き</strong>
          を作ります。公開はコピー先で手直ししてから行います。
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="copy_class_id" className={labelClass}>
              コピー先のクラス
            </label>
            <select
              id="copy_class_id"
              value={classId}
              onChange={(e) => selectClassId(e.target.value)}
              className={selectClass}
            >
              {targets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{WEEKDAY_LABELS[c.weekday]}）
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="copy_lesson_date" className={labelClass}>
              日付
            </label>
            <input
              id="copy_lesson_date"
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              className={`${inputClass} tabular-nums`}
            />
          </div>

          {error && <p className={errorBandClass}>{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-5 text-[17px] font-bold text-fg transition active:scale-95 disabled:opacity-60"
          >
            やめる
          </button>
          <button
            type="button"
            disabled={pending || !classId || !lessonDate}
            onClick={submit}
            className={`${skyButtonClass} disabled:opacity-60`}
          >
            {pending ? "複製しています…" : "複製する"}
          </button>
        </div>
      </dialog>
    </>
  );
}

function defaultDateFor(sourceDate: string, target?: RecordClassOption) {
  return target ? nextWeekdayOnOrAfter(sourceDate, target.weekday) : sourceDate;
}
