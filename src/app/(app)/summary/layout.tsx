import { LegacyPanel } from "@/components/legacy-panel";

// ⚠️ 移行期間だけのレイアウト（チケット24）。
// 月次集計はまだ v1 デザイン（ダークタイルのヒーロー）なので、白い面で包んで可読性を保つ。
// ヒーローの `-mx-4 -mt-6 md:-mx-8` が面の縁にぴたりと合うよう、
// LegacyPanel のパディングは刷新前の共通シェルと同じ値にしてある。
// **チケット26 でこの画面を v2 化したら、このファイルごと削除する。**
export default function SummaryLegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LegacyPanel>{children}</LegacyPanel>;
}
