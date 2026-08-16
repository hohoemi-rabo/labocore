import { revalidatePath } from "next/cache";

// 記録・次回のじゅぎょう・お知らせ・コマは、いずれも生徒向けページ（/kiroku）の内容を変える。
// 再検証の対象をここに集約し、各 actions.ts で書き分けないようにする。
//
// ※ "use server" のファイルからは非 async の関数を export できないため、ここに置く。
//
// どちらも "layout" 指定にしてある。既定の "page" は**そのパスだけ**が対象で
// 配下のルートを含まないため、/records だけ指定すると /records/next-lessons や
// /records/announcements が古いまま残る。

/** 記録カードの変更（/records 配下すべて + 生徒向け） */
export function revalidateRecords() {
  revalidatePath("/records", "layout");
  revalidatePath("/kiroku", "layout");
}

/**
 * コマ自体の変更（名前・曜日・時間・テーマカラー・廃止）。
 * 生徒向けのクラスタブ・クラスえらび・差し色が変わるほか、
 * 管理側の記録一覧・次回のじゅぎょうにもクラス名と色が出ている。
 */
export function revalidateClasses() {
  revalidatePath("/settings/classes");
  revalidateRecords();
}
