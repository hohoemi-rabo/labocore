import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa, todayJst } from "@/lib/format";
import { ConfirmDialog } from "@/components/v2/confirm-dialog";
import {
  cardClass,
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";
import { ClosedDayForm } from "./closed-day-form";
import { deleteClosedDay } from "./actions";

export default async function ClosedDaysPage() {
  const supabase = await createClient();
  const { data: closedDays } = await supabase
    .from("closed_days")
    .select("*")
    .order("closed_date"); // 昇順＝時系列

  const today = todayJst();

  return (
    <div className={`${v2CanvasClass} flex flex-col gap-6`}>
      <Link href="/settings" className="text-[15px] text-sub">
        ‹ 設定
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-[23px] font-black tracking-[.02em]">休講日管理</h1>
        <div className={`${tricolorSmClass} flex-none`} aria-hidden />
      </div>

      <div className={`${cardClass} p-5`}>
        <ClosedDayForm />
      </div>

      {closedDays && closedDays.length > 0 ? (
        <div className={cardClass}>
          {closedDays.map((c, i) => {
            const isPast = c.closed_date < today;
            return (
              <div
                key={c.id}
                className={`flex min-h-[64px] items-center justify-between gap-4 px-4 py-2 md:px-5 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="flex min-w-0 flex-col">
                  {/* 過ぎた休講日は sub 色まで落として、これからの予定を目立たせる */}
                  <span
                    className={`text-[17px] font-bold tabular-nums ${
                      isPast ? "text-sub" : "text-fg"
                    }`}
                  >
                    {formatDateJa(c.closed_date)}
                  </span>
                  {c.reason && (
                    <span className="truncate text-[14px] text-sub">
                      {c.reason}
                    </span>
                  )}
                </div>
                <ConfirmDialog
                  triggerLabel="休講取消"
                  title="休講日を取り消しますか？"
                  message={`${formatDateJa(c.closed_date)}の休講を取り消します。`}
                  confirmLabel="取り消す"
                  action={deleteClosedDay}
                  hidden={{ id: c.id }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-20 border border-dashed border-line px-4 py-10 text-center text-[17px] text-sub">
          まだ休講日が登録されていません。上のフォームから登録してください。
        </p>
      )}
    </div>
  );
}
