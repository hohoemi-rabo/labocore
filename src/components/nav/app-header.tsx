"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./nav-items";

// 管理画面の共通ヘッダー（チケット24）。
// 生徒向けクラスページの kiroku-header.tsx と同じ文法に揃えてある
// （sticky なガラス面 + ブランドマーク + タブ）。管理画面のアクセントはスカイ固定（DESIGN_v2 §8）。
//
// PC の左サイドバー(220px)と純黒トップバー(44px)は 24 で廃止し、この1枚に統合した
// （DESIGN_v2 §8 の「未確定: PC用サイドバー・純黒トップバーの扱い」の決定）。
// タブは PC だけに出す。モバイルは下部タブ（bottom-tabs.tsx）が担う。
//
// ⚠️ position: sticky は**祖先**に overflow / transform / filter / contain が付くと
//    黙って効かなくなる。シェル側にそれらを足さないこと（エラーは一切出ない）。

const tabBase =
  "flex min-h-[44px] items-center justify-center rounded-12 px-4 text-[15px] font-bold transition active:scale-95";
const tabIdleClass = `${tabBase} border border-line bg-white/[0.04] text-sub hover:-translate-y-px`;
const tabActiveClass = `${tabBase} bg-sky-fill text-white shadow-glow-sky`;

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/[0.82] px-4 py-3 backdrop-blur-[12px] md:px-8">
      <div className="mx-auto flex max-w-[980px] items-center gap-3">
        <Link href="/" className="flex flex-none items-center gap-3">
          {/* ブランドマーク。トリコロールをそのまま意匠として使う（DESIGN_v2 §2） */}
          <span
            aria-hidden
            className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-12 bg-sky-fill shadow-glow-sky"
          >
            <span className="h-1 w-5 rounded-pill bg-tricolor" />
          </span>
          <span className="text-[17px] font-black leading-tight tracking-[.02em]">
            LaboCore
            <small className="block text-[12px] font-medium tracking-[.18em] text-sub">
              ADMIN
            </small>
          </span>
        </Link>

        {/* 片軸を auto にすると もう片軸も clip され、アクティブタブのグローが切れる。
            5項目なら 980px に収まるので overflow は付けない。 */}
        <nav
          aria-label="メニュー"
          className="ml-auto hidden items-center gap-2 md:flex"
        >
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={active ? tabActiveClass : tabIdleClass}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
