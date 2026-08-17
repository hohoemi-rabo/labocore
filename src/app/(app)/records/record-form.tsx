"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { accentStyle } from "@/lib/accent";
import { WEEKDAY_LABELS } from "@/lib/format";
import {
  labelClass,
  inputClass,
  selectClass,
  textareaClass,
  errorClass,
  errorBandClass,
} from "@/components/v2/form";
import { skyButtonClass } from "@/components/v2/styles";
import { Toast, useToast } from "@/components/v2/toast";
import { AiDraftPanel } from "./ai-draft-panel";
import { PhotoPicker, type PickedPhoto } from "./photo-picker";
import type { RecordFormState } from "./actions";

type Action = (
  prevState: RecordFormState,
  formData: FormData,
) => Promise<RecordFormState>;

export type RecordClassOption = {
  id: string;
  name: string;
  weekday: number;
  theme_color: string;
};

export type RecordDefaultValues = {
  id?: string;
  class_id?: string;
  lesson_date?: string;
  theme?: string;
  memo?: string;
  prompt?: string | null;
  image_urls?: string[];
};

export function RecordForm({
  action,
  classes,
  defaultValues,
  today,
  aiEnabled,
}: {
  action: Action;
  classes: RecordClassOption[];
  defaultValues?: RecordDefaultValues;
  /** JST の今日。既定の日付に使う（サーバーで算出して渡す） */
  today: string;
  /** AI 下書きが使えるか（GEMINI_API_KEY の有無。サーバーで判定して渡す） */
  aiEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    RecordFormState,
    FormData
  >(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const { message, showToast } = useToast();

  const [keptUrls, setKeptUrls] = useState<string[]>(
    defaultValues?.image_urls ?? [],
  );
  const [picked, setPicked] = useState<PickedPhoto[]>([]);
  const [photosBlocking, setPhotosBlocking] = useState(false);

  // AI の下書きを流し込むため、テーマとメモだけ制御コンポーネントにする
  // （非制御のままだと defaultValue を差し替えても再レンダーでは反映されない）。
  const [theme, setTheme] = useState(defaultValues?.theme ?? "");
  const [memo, setMemo] = useState(defaultValues?.memo ?? "");

  // スウォッチに選択中の色を映すためだけの state（select 自体は非制御のまま）
  const [classId, setClassId] = useState(
    defaultValues?.class_id ?? classes[0]?.id ?? "",
  );
  const selectedClass = classes.find((c) => c.id === classId);

  // <form action={formAction}> は使わない。React 19 は action が throw せずに返ると
  // 非制御フィールドを自動リセットするため、{fieldErrors} を返した瞬間に
  // テーマ・メモ・写真の選択がすべて消えてしまう。
  // 「同じクラス・同じ日付」は日常的に起きるエラーなので、そこで入力が消えるのは致命的。
  // 手動 dispatch は form 送信ではないのでリセットされない。
  function submit(status: "draft" | "published") {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;

    const formData = new FormData(form);
    formData.set("status", status);
    // ファイル入力には name を付けていないので、ここで詰めた縮小済みファイルだけが送られる。
    for (const p of picked) formData.append("photos", p.file);

    startTransition(() => formAction(formData));
  }

  const disabled = pending || photosBlocking;

  return (
    <form ref={formRef} className="flex flex-col gap-5">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="class_id" className={labelClass}>
          クラス
        </label>
        <div className="flex items-center gap-3">
          <ClassSwatch color={selectedClass?.theme_color} />
          <select
            id="class_id"
            name="class_id"
            required
            defaultValue={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={selectClass}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}（{WEEKDAY_LABELS[c.weekday]}）
              </option>
            ))}
          </select>
        </div>
        {state.fieldErrors?.class_id && (
          <p className={errorClass}>{state.fieldErrors.class_id}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lesson_date" className={labelClass}>
          日付
        </label>
        <input
          id="lesson_date"
          name="lesson_date"
          type="date"
          required
          defaultValue={defaultValues?.lesson_date ?? today}
          className={`${inputClass} tabular-nums`}
        />
        {state.fieldErrors?.lesson_date && (
          <p className={errorClass}>{state.fieldErrors.lesson_date}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="theme" className={labelClass}>
          テーマ
        </label>
        <input
          id="theme"
          name="theme"
          type="text"
          required
          placeholder="AIで暑中見舞いを作りました"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className={inputClass}
        />
        {state.fieldErrors?.theme && (
          <p className={errorClass}>{state.fieldErrors.theme}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="memo" className={labelClass}>
          ひとことメモ
        </label>
        <textarea
          id="memo"
          name="memo"
          required
          placeholder="授業の様子が伝わるように2〜3文で。"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className={textareaClass}
        />
        {state.fieldErrors?.memo && (
          <p className={errorClass}>{state.fieldErrors.memo}</p>
        )}
      </div>

      <PhotoPicker
        keptUrls={keptUrls}
        onKeptUrlsChange={setKeptUrls}
        picked={picked}
        onPickedChange={setPicked}
        onBlockingChange={setPhotosBlocking}
      />

      <AiDraftPanel
        enabled={aiEnabled}
        recordId={defaultValues?.id}
        picked={picked}
        keptUrls={keptUrls}
        photosBusy={photosBlocking}
        currentTheme={theme}
        currentMemo={memo}
        onApply={(draft) => {
          setTheme(draft.theme);
          setMemo(draft.memo);
          showToast("下書きを反映しました。手直しして保存してください。");
        }}
        onError={showToast}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="prompt" className={labelClass}>
          プロンプト（任意）
        </label>
        <textarea
          id="prompt"
          name="prompt"
          placeholder="その日 AI に送った指示文。生徒さんが家で同じことを試せます。"
          defaultValue={defaultValues?.prompt ?? ""}
          className={textareaClass}
        />
      </div>

      {state.formError && <p className={errorBandClass}>{state.formError}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => submit("draft")}
          className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-6 text-[17px] font-bold text-fg transition active:scale-95 disabled:opacity-60"
        >
          下書き保存
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => submit("published")}
          className={`${skyButtonClass} disabled:opacity-60`}
        >
          {pending ? "保存しています…" : "公開する"}
        </button>
      </div>
      {pending && picked.length > 0 && (
        <p className="text-[15px] text-sub">
          写真を保存しています。そのままお待ちください。
        </p>
      )}

      {/* トーストは画面に1つ（position: fixed なので複数置くと重なる） */}
      <Toast message={message} />
    </form>
  );
}

/** 選択中クラスの色を小さな四角で見せる（DESIGN_v2 §3 のテーマカラー） */
function ClassSwatch({ color }: { color?: string }) {
  if (!color) return null;

  return (
    <span
      aria-hidden
      style={accentStyle(color)}
      className="h-8 w-8 flex-none rounded-12 bg-accent-fill shadow-glow"
    />
  );
}
