import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WEEKDAY_LABELS, formatTimeRange } from "@/lib/format";
import { accentStyle } from "@/lib/accent";
import {
  cardClass,
  skyButtonClass,
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("is_active", true)
    .order("weekday")
    .order("start_time");

  return (
    <div className={`${v2CanvasClass} flex flex-col gap-6`}>
      <Link href="/settings" className="text-[15px] text-sub">
        ‹ 設定
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[23px] font-black tracking-[.02em]">コマ管理</h1>
          <div className={`${tricolorSmClass} flex-none`} aria-hidden />
        </div>
        <Link href="/settings/classes/new" className={skyButtonClass}>
          コマを追加
        </Link>
      </div>

      {classes && classes.length > 0 ? (
        <div className={cardClass}>
          {classes.map((c, i) => (
            <div
              key={c.id}
              className={`flex min-h-[64px] items-center justify-between gap-4 px-4 py-2 md:px-5 ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* テーマカラーは動的な値なのでクラス名に埋めず CSS 変数で注入する */}
                <span
                  aria-hidden
                  style={accentStyle(c.theme_color)}
                  className="h-8 w-8 flex-none rounded-12 bg-accent-fill shadow-glow"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[17px] font-bold text-fg">
                    {c.name}
                  </span>
                  <span className="text-[14px] text-sub tabular-nums">
                    {WEEKDAY_LABELS[c.weekday]}{" "}
                    {c.start_time && c.end_time
                      ? formatTimeRange(c.start_time, c.end_time)
                      : ""}
                  </span>
                </div>
              </div>
              <Link
                href={`/settings/classes/${c.id}/edit`}
                className="flex min-h-[44px] flex-none items-center text-[15px] font-bold text-accent transition active:scale-95"
              >
                編集 ›
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-20 border border-dashed border-line px-4 py-10 text-center text-[17px] text-sub">
          まだコマが登録されていません。「コマを追加」から作成してください。
        </p>
      )}
    </div>
  );
}
