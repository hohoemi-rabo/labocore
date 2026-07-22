import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateJa, todayJst } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
    <div className="flex flex-col gap-6">
      <Link href="/settings" className="text-[14px] text-ink-muted-48">
        ‹ 設定
      </Link>

      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
        休講日管理
      </h1>

      <div className="rounded-lg border border-hairline bg-canvas p-5">
        <ClosedDayForm />
      </div>

      {closedDays && closedDays.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
          {closedDays.map((c, i) => {
            const isPast = c.closed_date < today;
            return (
              <div
                key={c.id}
                className={`flex min-h-[64px] items-center justify-between gap-4 px-5 ${
                  i > 0 ? "border-t border-divider-soft" : ""
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={`text-[17px] font-semibold tabular-nums ${
                      isPast ? "text-ink-muted-48" : "text-ink"
                    }`}
                  >
                    {formatDateJa(c.closed_date)}
                  </span>
                  {c.reason && (
                    <span className="text-[14px] text-ink-muted-48">
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
        <p className="text-[17px] text-ink-muted-48">
          まだ休講日が登録されていません。上のフォームから登録してください。
        </p>
      )}
    </div>
  );
}
