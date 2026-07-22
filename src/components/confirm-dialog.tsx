"use client";

import { useRef } from "react";

// 破壊的操作（廃止・退会・休講取消）の確認ダイアログ。
// ネイティブ <dialog> を使い、確定は渡された Server Action を form 送信で実行する。
export function ConfirmDialog({
  triggerLabel,
  title,
  message,
  confirmLabel,
  action,
  hidden,
}: {
  triggerLabel: string;
  title: string;
  message: string;
  confirmLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex h-11 items-center justify-center rounded-pill border border-hairline bg-canvas px-6 text-[17px] font-semibold text-ink transition-transform active:scale-95"
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[90vw] max-w-[400px] rounded-lg border border-hairline bg-canvas p-6 text-ink [&::backdrop]:bg-ink/40"
      >
        <h2 className="text-[21px] font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-[17px] text-ink-muted-80">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="flex h-11 items-center justify-center rounded-pill border border-hairline bg-canvas px-6 text-[17px] font-semibold text-ink transition-transform active:scale-95"
          >
            キャンセル
          </button>

          <form action={action}>
            {hidden &&
              Object.entries(hidden).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
            <button
              type="submit"
              className="flex h-11 items-center justify-center rounded-pill bg-ink px-6 text-[17px] font-semibold text-on-dark transition-transform active:scale-95"
            >
              {confirmLabel}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
