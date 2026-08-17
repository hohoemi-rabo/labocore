"use client";

import { useRef, useState, useTransition } from "react";
import { errorClass, labelClass, textareaClass } from "@/components/v2/form";
import { skyButtonClass } from "@/components/v2/styles";
import { MAX_PHOTOS } from "@/lib/records";
import { generateDraft } from "./actions";
import type { PickedPhoto } from "./photo-picker";

// AI 下書きパネル（REQUIREMENTS_phase2 §9・チケット22）。
// 走り書きメモ + 上で選んだ写真を Gemini へ送り、テーマ・ひとことメモの下書きを受け取る。
//
// 状態の持ち方は PhotoPicker と同じで、**書き込み先（テーマ・メモ）は親が持つ**。
// ここは「走り書きメモ」だけを自前で持ち、結果は onApply で親へ返す。
//
// ⚠️ 走り書きメモの textarea に name を付けないこと。付けると保存時の
// `new FormData(form)` に混ざって Server Action へ送られてしまう。
// AI 用の FormData はこのコンポーネントが state から手で組む。

export type RecordDraft = { theme: string; memo: string };

export function AiDraftPanel({
  enabled,
  recordId,
  picked,
  keptUrls,
  photosBusy,
  currentTheme,
  currentMemo,
  onApply,
  onError,
}: {
  /** GEMINI_API_KEY が設定されているか（サーバー側で判定して渡す） */
  enabled: boolean;
  /** 編集中の記録 ID。保存済み写真を AI に渡すために使う（新規作成時は undefined） */
  recordId?: string;
  picked: PickedPhoto[];
  keptUrls: string[];
  /**
   * 写真がまだ送れる状態にないか（ブラウザ側で縮小中・合計サイズ超過）。
   * **true のあいだは生成させない。** 縮小が終わるまで picked には入らないので、
   * ここで押せてしまうと「写真を選んだのに読んでくれない」が起きる。
   */
  photosBusy: boolean;
  /** 上書き確認を出すかの判断に使う現在値 */
  currentTheme: string;
  currentMemo: string;
  onApply: (draft: RecordDraft) => void;
  onError: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // サーバー側でも MAX_PHOTOS で切るので、表示もそれに合わせる。
  const photoCount = Math.min(keptUrls.length + picked.length, MAX_PHOTOS);

  function run() {
    const formData = new FormData();
    formData.set("note", note);
    // 保存済み写真はサーバー側で DB と突き合わせるため、ID と URL の両方を送る。
    if (recordId) formData.set("id", recordId);
    for (const url of keptUrls) formData.append("existing_image_urls", url);
    for (const p of picked) formData.append("photos", p.file);

    startTransition(async () => {
      const result = await generateDraft(formData);
      if (result.error || !result.theme || !result.memo) {
        onError(result.error ?? "AI の下書きを作れませんでした。");
        return;
      }

      const next = { theme: result.theme, memo: result.memo };
      // 書きかけがあるときだけ確認を挟む（押し間違いで手直しを失わないため）。
      if (currentTheme.trim() || currentMemo.trim()) {
        setDraft(next);
        dialogRef.current?.showModal();
        return;
      }
      onApply(next);
    });
  }

  function applyDraft() {
    if (draft) onApply(draft);
    dialogRef.current?.close();
  }

  return (
    <section className="flex flex-col gap-3 rounded-16 border border-line bg-surface p-4">
      <div className="flex flex-col gap-1">
        <span className="text-[17px] font-bold text-fg">
          AIに下書きを作ってもらう
        </span>
        <p className="text-[15px] leading-jp text-sub">
          走り書きのメモと上の写真から、テーマとひとことメモの下書きを作ります。
          出来上がった文はそのまま直せます。ここに書いたメモは保存されません。
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ai_note" className={labelClass}>
          走り書きメモ
        </label>
        <textarea
          id="ai_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例）暑中見舞いをAIで作った。写真の入れ方でつまずく人が多かった。みなさん盛り上がった。"
          className={textareaClass}
        />
        <p className="text-[13px] leading-jp text-sub">
          入力したメモと写真は Google の AI に送られます。
          氏名・住所・電話番号・メールアドレスなどの個人情報は書かないでください。
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!enabled || pending || photosBusy || note.trim() === ""}
          onClick={run}
          className={`${skyButtonClass} disabled:opacity-60`}
        >
          {pending ? "作っています…" : "下書きを作ってもらう"}
        </button>

        {/* 何が AI に渡るのかをその場で見せる（写真が読まれたか迷わないように） */}
        {enabled && (
          <p className="text-[15px] leading-jp text-sub">
            {photosBusy
              ? "写真を読み込んでいます。終わるまでお待ちください。"
              : photoCount > 0
                ? `上の写真${photoCount}枚もいっしょに見て書きます。`
                : "写真がないので、メモだけから書きます。"}
          </p>
        )}
      </div>

      {!enabled && (
        <p className={errorClass}>
          AIの下書きは今使えません（サーバーの設定が未完了です）。
          手入力での作成・公開はいつもどおり行えます。
        </p>
      )}

      {/* ConfirmDialog（v2）は自前の <form> を持つため RecordForm の <form> に入れ子にできず、
          プログラムから開く用途にも合わないので、同じ体裁の dialog をここに持つ。
          <dialog> 自体は form の内側に置いても妥当（入れ子が不正なのは form）。 */}
      <dialog
        ref={dialogRef}
        className="m-auto w-[90vw] max-w-[420px] rounded-20 border border-line bg-card p-6 font-jp text-fg shadow-elev-3 [&::backdrop]:bg-black/60"
      >
        <h2 className="text-[21px] font-black">AIの下書きができました</h2>
        <p className="mt-2 text-[17px] leading-jp text-fg-body">
          今入力されているテーマとひとことメモを、この内容で置き換えますか？
        </p>

        <div className="mt-4 flex flex-col gap-3 rounded-12 border border-line bg-sunken p-3">
          <div className="flex flex-col gap-1">
            <span className={labelClass}>テーマ</span>
            <p className="text-[17px] leading-jp text-fg-body">
              {draft?.theme}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClass}>ひとことメモ</span>
            <p className="whitespace-pre-wrap text-[17px] leading-jp text-fg-body">
              {draft?.memo}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-5 text-[17px] font-bold text-fg transition active:scale-95"
          >
            やめる
          </button>
          <button type="button" onClick={applyDraft} className={skyButtonClass}>
            置き換える
          </button>
        </div>
      </dialog>
    </section>
  );
}
