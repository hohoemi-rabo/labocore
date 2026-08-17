import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayJst } from "@/lib/format";
import { sectionTitleClass, v2CanvasClass } from "@/components/v2/styles";
import { NextLessonList } from "./next-lesson-list";
import type { NextLessonClass } from "./next-lesson-card";

export default async function NextLessonsPage() {
  const supabase = await createClient();
  // 並び順は weekday→start_time 固定。保存で変わる値（日付など）で並べると、
  // 1つ保存しただけで一覧が並び替わり、編集中のカードが動いてしまう。
  const { data: classes } = await supabase
    .from("classes")
    .select(
      "id, name, theme_color, start_time, end_time, next_lesson_date, next_lesson_theme, next_lesson_note",
    )
    .eq("is_active", true)
    .order("weekday")
    .order("start_time");

  const items: NextLessonClass[] = (classes ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    themeColor: c.theme_color,
    startTime: c.start_time,
    endTime: c.end_time,
    date: c.next_lesson_date,
    theme: c.next_lesson_theme,
    note: c.next_lesson_note,
  }));

  return (
    <div className={v2CanvasClass}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/records" className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
          ‹ 授業の記録
        </Link>

        <h1 className={`${sectionTitleClass} mt-4`}>次回のじゅぎょう</h1>
        <p className="mb-6 text-[17px] text-sub">
          クラスごとに1件です。生徒向けページで最も目立つカードになります。
          日付が過ぎたものは自動で表示されなくなります。
        </p>

        {items.length === 0 ? (
          <p className="rounded-20 border border-dashed border-line px-4 py-10 text-center text-[17px] text-sub">
            コマが登録されていません。設定 → コマ管理から追加してください。
          </p>
        ) : (
          // todayJst() をレンダー時に読んでよいのは、Supabase の cookie クライアント経由で
          // このページが必ず動的レンダリングになるため（revalidate を足さないこと）。
          <NextLessonList classes={items} today={todayJst()} />
        )}
      </div>
    </div>
  );
}
