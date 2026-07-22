"use client";

import { useOptimistic, useTransition } from "react";
import { useToast, Toast } from "@/components/toast";
import { Yen } from "@/components/yen";
import { setPayment } from "./payment-actions";

export type SummaryRow = {
  studentId: string;
  name: string;
  present: number;
  absent: number;
  amount: number;
  isPaid: boolean;
};

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function PaymentTable({
  rows: initialRows,
  month,
}: {
  rows: SummaryRow[];
  month: string;
}) {
  const { message, showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [rows, applyOptimistic] = useOptimistic(
    initialRows,
    (state: SummaryRow[], update: { studentId: string; isPaid: boolean }) =>
      state.map((r) =>
        r.studentId === update.studentId ? { ...r, isPaid: update.isPaid } : r,
      ),
  );

  function togglePaid(row: SummaryRow) {
    const next = !row.isPaid;
    startTransition(async () => {
      applyOptimistic({ studentId: row.studentId, isPaid: next });
      const result = await setPayment({
        studentId: row.studentId,
        month,
        isPaid: next,
      });
      if (result?.error) {
        // 楽観値は base に戻り自動ロールバック。失敗のみトーストで知らせる。
        showToast("支払い状態の更新に失敗しました。もう一度お試しください。");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
      {rows.map((row, i) => (
        <div
          key={row.studentId}
          className={`flex min-h-[64px] items-center justify-between gap-4 px-5 ${
            i > 0 ? "border-t border-divider-soft" : ""
          }`}
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[17px] font-semibold text-ink">
              {row.name}
            </span>
            <span className="text-[14px] text-ink-muted-48 tabular-nums">
              出席 {row.present}回 ・ 欠席 {row.absent}回
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <Yen
              amount={row.amount}
              className="w-[88px] text-right text-[17px] font-semibold text-ink"
            />
            <button
              type="button"
              onClick={() => togglePaid(row)}
              disabled={isPending}
              aria-pressed={row.isPaid}
              className={`flex min-h-[44px] items-center justify-center gap-1 rounded-pill px-4 text-[15px] font-semibold transition-transform active:scale-95 disabled:opacity-60 ${
                row.isPaid
                  ? "bg-primary text-on-dark"
                  : "border border-hairline text-ink-muted-48"
              }`}
            >
              {row.isPaid && <CheckIcon />}
              {row.isPaid ? "支払済" : "未払い"}
            </button>
          </div>
        </div>
      ))}

      <Toast message={message} />
    </div>
  );
}
