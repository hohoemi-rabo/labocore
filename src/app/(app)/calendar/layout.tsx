import { LegacyPanel } from "@/components/legacy-panel";

// ⚠️ 移行期間だけのレイアウト（チケット24）。
// カレンダーはまだ v1 デザインなので、ダークになったシェルの上で読めるよう白い面で包む。
// **チケット25 でこの画面を v2 化したら、このファイルごと削除する。**
export default function CalendarLegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LegacyPanel>{children}</LegacyPanel>;
}
