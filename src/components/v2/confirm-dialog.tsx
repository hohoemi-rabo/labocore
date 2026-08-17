"use client";

import { useRef } from "react";

// 破壊的操作の確認ダイアログ（DESIGN.md §8）。
//
// 注意: 自前の <form> を持つので、**他の <form> の内側に置かない**（入れ子は不正）。
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
        className="flex min-h-[44px] items-center justify-center rounded-16 border border-off-line bg-off-surface px-5 text-[17px] font-bold text-off transition active:scale-95"
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[90vw] max-w-[420px] rounded-20 border border-line bg-card p-6 font-jp text-fg shadow-elev-3 [&::backdrop]:bg-black/60"
      >
        <h2 className="text-[21px] font-black">{title}</h2>
        <p className="mt-2 text-[17px] leading-jp text-fg-body">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-5 text-[17px] font-bold text-fg transition active:scale-95"
          >
            キャンセル
          </button>

          <form action={action}>
            {hidden &&
              Object.entries(hidden).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
            {/* DESIGN §8: 破壊的操作の確定はローズ系 */}
            <button
              type="submit"
              className="flex min-h-[44px] items-center justify-center rounded-16 bg-off-fill px-6 text-[17px] font-bold text-white shadow-elev-1 transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              {confirmLabel}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
