import { AppHeader } from "@/components/nav/app-header";
import { BottomTabs } from "@/components/nav/bottom-tabs";
import { appShellClass } from "@/components/v2/styles";

// 認証必須側の共通シェル（24 で v2 = ダーク基調へ刷新）。
// PC: sticky なガラスヘッダーにブランドとタブ / モバイル: ヘッダー + 下部タブ。
//
// ⚠️ このツリーに overflow-* / transform / filter を足さないこと。
//    祖先に付くとヘッダーの position: sticky が黙って効かなくなる。
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={appShellClass}>
      <AppHeader />
      <BottomTabs />

      {/* pb-24 は固定の下部タブに本文が隠れないための逃げ（モバイルのみ必要） */}
      <main className="pb-24 md:pb-10">
        <div className="mx-auto max-w-[980px] px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
