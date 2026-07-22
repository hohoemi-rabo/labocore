import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WEEKDAY_LABELS, formatTimeRange } from "@/lib/format";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("is_active", true)
    .order("weekday")
    .order("start_time");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/settings" className="text-[14px] text-ink-muted-48">
        ‹ 設定
      </Link>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
          コマ管理
        </h1>
        <Link
          href="/settings/classes/new"
          className="flex h-11 items-center justify-center rounded-pill bg-primary px-6 text-[17px] font-semibold text-on-dark transition-transform active:scale-95"
        >
          コマを追加
        </Link>
      </div>

      {classes && classes.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
          {classes.map((c, i) => (
            <div
              key={c.id}
              className={`flex min-h-[64px] items-center justify-between gap-4 px-5 ${
                i > 0 ? "border-t border-divider-soft" : ""
              }`}
            >
              <div className="flex flex-col">
                <span className="text-[17px] font-semibold text-ink">
                  {c.name}
                </span>
                <span className="text-[14px] text-ink-muted-48 tabular-nums">
                  {WEEKDAY_LABELS[c.weekday]}{" "}
                  {c.start_time && c.end_time
                    ? formatTimeRange(c.start_time, c.end_time)
                    : ""}
                </span>
              </div>
              <Link
                href={`/settings/classes/${c.id}/edit`}
                className="text-[17px] font-semibold text-primary transition-transform active:scale-95"
              >
                編集
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[17px] text-ink-muted-48">
          まだコマが登録されていません。「コマを追加」から作成してください。
        </p>
      )}
    </div>
  );
}
