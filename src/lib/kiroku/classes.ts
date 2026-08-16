import { cache } from "react";
import { createAnonClient } from "@/lib/supabase/anon";

// 生徒向けページのクラス一覧。クラスえらび（19）・クラスタブ（20）・
// 記憶クラスの生存確認（19）・次回のじゅぎょう（20）で同じものを使う。
//
// ⚠️ middleware から import してはいけない（Supabase を Edge バンドルに引き込む）。
//    合言葉の判定に必要なものは `@/lib/kiroku/gate` にしか置かない。

export type KirokuClass = {
  id: string;
  name: string;
  weekday: number;
  startTime: string | null;
  endTime: string | null;
  themeColor: string;
  /** 次回のじゅぎょう。クラスページ（K3）だけが使う */
  nextLessonDate: string | null;
  nextLessonTheme: string | null;
  nextLessonNote: string | null;
};

/**
 * 生徒に見せる active なコマを weekday → start_time 順で返す。
 * anon の RLS ポリシー（`classes` は is_active = true のみ）が実質のフィルタだが、
 * ポリシー変更に巻き込まれないよう `.eq("is_active", true)` も明示しておく。
 *
 * `cache()` で包んであるのは、クラスページが generateMetadata と本体の両方から
 * これを呼ぶため（同一リクエスト内で同じクエリを2回投げない）。
 *
 * 次回のじゅぎょうの3列もここで一緒に取る。別クエリに分けると**同じ行を1リクエストで
 * 2回読む**ことになり、その間に管理画面から更新されると「Aの色でBの次回」が出うる。
 */
export const listActiveClasses = cache(async function listActiveClasses(): Promise<
  KirokuClass[]
> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("classes")
    .select(
      "id, name, weekday, start_time, end_time, theme_color, next_lesson_date, next_lesson_theme, next_lesson_note",
    )
    .eq("is_active", true)
    .order("weekday")
    .order("start_time");

  if (error) {
    console.error("[kiroku] クラス一覧の取得に失敗しました:", error.message);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    weekday: c.weekday,
    startTime: c.start_time,
    endTime: c.end_time,
    themeColor: c.theme_color,
    nextLessonDate: c.next_lesson_date,
    nextLessonTheme: c.next_lesson_theme,
    nextLessonNote: c.next_lesson_note,
  }));
});

/** 指定 id が「いま生徒に見せてよいクラス」かを確認する。廃止済み・存在しない id は undefined。 */
export function findActiveClass(classes: KirokuClass[], id: string | undefined) {
  if (!id) return undefined;
  return classes.find((c) => c.id === id);
}

/**
 * 「午前」「午後」を出すクラスを決める。
 *
 * 同じ曜日にコマが2つ以上あるときだけ併記する（1つしかない曜日では冗長）。
 * クラスえらび（K2）とクラスタブ（K3）で表記がずれると、同じクラスが画面ごとに
 * 違う名前で出てしまうため、判定はここ1か所に置く。
 */
export function periodLabels(
  classes: KirokuClass[],
): Map<string, "午前" | "午後" | null> {
  const perWeekday = new Map<number, number>();
  for (const c of classes) {
    perWeekday.set(c.weekday, (perWeekday.get(c.weekday) ?? 0) + 1);
  }

  return new Map(
    classes.map((c) => {
      if ((perWeekday.get(c.weekday) ?? 0) < 2 || !c.startTime) {
        return [c.id, null];
      }
      return [c.id, Number(c.startTime.slice(0, 2)) < 12 ? "午前" : "午後"];
    }),
  );
}
