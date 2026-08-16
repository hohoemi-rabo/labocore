import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  sectionTitleClass,
  skyButtonClass,
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";
import { RecordList, type ClassFilter, type RecordRow } from "./record-list";

// 授業記録の管理。新設画面なので最初から v2 デザイン（チケット16 の方針）。
// 共通シェルはまだ v1 なので、ページ側でフルブリードのダーク面を敷く。
export default async function RecordsPage() {
  const supabase = await createClient();

  const [{ data: records }, { data: classes }] = await Promise.all([
    supabase
      .from("lesson_records")
      .select("id, class_id, lesson_date, theme, image_urls, status")
      .order("lesson_date", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name, weekday, start_time, theme_color")
      .eq("is_active", true)
      .order("weekday")
      .order("start_time"),
  ]);

  const classById = new Map((classes ?? []).map((c) => [c.id, c]));

  const rows: RecordRow[] = (records ?? []).map((r) => {
    const cls = classById.get(r.class_id);
    return {
      id: r.id,
      classId: r.class_id,
      className: cls?.name ?? "（廃止されたクラス）",
      themeColor: cls?.theme_color ?? "#38bdf8",
      lessonDate: r.lesson_date,
      theme: r.theme,
      photoCount: r.image_urls.length,
      status: r.status === "published" ? "published" : "draft",
    };
  });

  const filters: ClassFilter[] = (classes ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    themeColor: c.theme_color,
  }));

  return (
    <div className={v2CanvasClass}>
      <div className="mx-auto max-w-[680px]">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-[23px] font-black tracking-[.02em]">授業の記録</h1>
          <div className={tricolorSmClass} aria-hidden />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link href="/records/new" className={skyButtonClass}>
            ＋ 新しく書く
          </Link>
          <Link
            href="/records/next-lessons"
            className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-5 text-[17px] font-bold text-fg transition active:scale-95"
          >
            次回のじゅぎょう
          </Link>
          <Link
            href="/records/announcements"
            className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-5 text-[17px] font-bold text-fg transition active:scale-95"
          >
            お知らせ
          </Link>
        </div>

        <h2 className={sectionTitleClass}>これまでの記録</h2>
        <RecordList rows={rows} classes={filters} />
      </div>
    </div>
  );
}
