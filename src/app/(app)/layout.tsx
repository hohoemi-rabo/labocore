import Link from "next/link";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomTabs } from "@/components/nav/bottom-tabs";

// 認証必須側の共通シェル。
// PC: 純黒トップバー(44px) + 左サイドバー / モバイル: 下部タブ。
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* PC: 純黒トップバー（純黒はここだけ） */}
      <header className="fixed inset-x-0 top-0 z-30 hidden h-11 items-center bg-surface-black px-6 md:flex">
        <Link
          href="/"
          className="text-[12px] font-normal tracking-[-0.02em] text-on-dark"
        >
          LaboCore
        </Link>
      </header>

      <Sidebar />
      <BottomTabs />

      <main className="pb-24 md:ml-[220px] md:pb-8 md:pt-11">
        <div className="mx-auto max-w-[980px] px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
