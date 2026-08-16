import { createAnonClient } from "@/lib/supabase/anon";

// 生徒向けページのクラス一覧。クラスえらび（19）・クラスタブ（20）・
// 記憶クラスの生存確認（19）で同じものを使う。
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
};

/**
 * 生徒に見せる active なコマを weekday → start_time 順で返す。
 * anon の RLS ポリシー（`classes` は is_active = true のみ）が実質のフィルタだが、
 * ポリシー変更に巻き込まれないよう `.eq("is_active", true)` も明示しておく。
 */
export async function listActiveClasses(): Promise<KirokuClass[]> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, weekday, start_time, end_time, theme_color")
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
  }));
}

/** 指定 id が「いま生徒に見せてよいクラス」かを確認する。廃止済み・存在しない id は undefined。 */
export function findActiveClass(classes: KirokuClass[], id: string | undefined) {
  if (!id) return undefined;
  return classes.find((c) => c.id === id);
}
