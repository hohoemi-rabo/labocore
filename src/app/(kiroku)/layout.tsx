import type { Metadata } from "next";

// ⚠️ /kiroku 配下は必ず動的レンダリングにする（チケット18 からの申し送り）。
//
// 生徒向けページは cookie ベースの Supabase クライアントではなく anon クライアントで読むため、
// 管理画面と違ってルートキャッシュが効いてしまう。お知らせの掲載期間と「次回のじゅぎょう」の
// 過去日判定は時刻で状態が変わるのに、日付をまたいでも何のミューテーションも起きないので
// revalidatePath は走らない。そのままだと期限切れのお知らせが生徒に出続ける。
// RLS は毎リクエスト now() を評価するので、リクエストが DB に届きさえすれば正しく消える。
//
// クラスえらび（/kiroku/select）は cookie を1つも読まないため、これが無いと
// ビルド時にプリレンダされ、クラス一覧がビルドに焼き付く（新しいコマを登録しても出てこない）。
//
// layout の dynamic は配下の **page** に継承される（route handler には継承されない点に注意）。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "ほほ笑みラボ 授業の記録",
    template: "%s｜ほほ笑みラボ 授業の記録",
  },
  description: "ほほ笑みラボの授業のようすをまとめたページです。",
  // 生徒向けページは検索結果に出さない（REQUIREMENTS_phase2 §5）。
  robots: { index: false, follow: false },
  // チケット21 でここに manifest / appleWebApp / icons を足す。
};

// viewport は意図的に export しない。maximumScale / userScalable: false を入れると
// シニアの方がピンチズームで文字を大きくできなくなる。
export default function KirokuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 面は各ページが entryCanvasClass / kirokuCanvasClass で敷く。
  // ここでキャンバスを敷くと入口画面のアンビエントが二重になる。
  return children;
}
