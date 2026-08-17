import { LegacyPanel } from "@/components/legacy-panel";

// ⚠️ 移行期間だけのレイアウト（チケット24）。
// 設定配下（生徒・コマ・休講日）はまだ v1 デザインなので、
// ダークになったシェルの上で読めるよう白い面で包む。
// **チケット27 で設定画面を v2 化したら、このファイルごと削除する。**
export default function SettingsLegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LegacyPanel>{children}</LegacyPanel>;
}
