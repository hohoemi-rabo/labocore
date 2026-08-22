"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./nav-items";

// 管理画面の共通ヘッダー（チケット24）。
// 生徒向けクラスページの kiroku-header.tsx と同じ文法に揃えてある
// （sticky なガラス面 + ブランドマーク + タブ）。管理画面のアクセントはスカイ固定（DESIGN §8）。
//
// PC の左サイドバー(220px)と純黒トップバー(44px)は 24 で廃止し、この1枚に統合した
// （DESIGN §8 の「未確定: PC用サイドバー・純黒トップバーの扱い」の決定）。
// タブは PC だけに出す。モバイルは下部タブ（bottom-tabs.tsx）が担う。
//
// ⚠️ position: sticky は**祖先**に overflow / transform / filter / contain が付くと
//    黙って効かなくなる。シェル側にそれらを足さないこと（エラーは一切出ない）。

const tabBase =
  "flex min-h-[44px] items-center justify-center rounded-12 px-4 text-[15px] font-bold transition active:scale-95";
const tabIdleClass = `${tabBase} border border-line bg-white/[0.04] text-sub hover:-translate-y-px`;
const tabActiveClass = `${tabBase} bg-sky-fill text-white shadow-glow-sky`;

// 生徒ページ（/kiroku）への導線（チケット30）。
// 記録・お知らせ・次回のじゅぎょうを登録したあと、「生徒さんの見た目」で確認するために使う。
//
// ⚠️ nav-items.ts には入れない。(app) の外へ出るので isActive の前方一致が効かず、
//    モバイルの下部タブも6個に増えて 375px で窮屈になる。ヘッダーに直接置けば
//    下部タブ（md:hidden）と違って PC・モバイルの両方から届く。
//
// 文字色はタブ（text-sub）より明るい text-fg にして、タブとは役割が違うことを示す。
const viewSiteClass =
  "flex min-h-[44px] flex-none items-center gap-1.5 rounded-12 border border-line bg-white/[0.04] px-4 text-[15px] font-bold text-fg transition hover:-translate-y-px active:scale-95";

/** 別タブで開くことを示す矢印。絵文字は使わない（WSL にフォントが無く豆腐になる） */
function ExternalIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 3.5h6v6" />
      <path d="M12.5 3.5l-8 8" />
    </svg>
  );
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/[0.82] px-4 py-3 backdrop-blur-[12px] md:px-8">
      <div className="mx-auto flex max-w-[980px] items-center gap-3">
        <Link
          href="/"
          className="flex min-h-[44px] flex-none items-center gap-3"
        >
          {/* ブランドマーク。トリコロールをそのまま意匠として使う（DESIGN §2） */}
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
            5タブ + 生徒ページで実測 700px 弱なので 980px に収まる。overflow は付けない。 */}
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

        {/* 新しいタブで開く。編集中の管理画面を閉じずに見比べて戻れるようにするため。
            モバイルはタブ列が hidden なので、ここで ml-auto して右端へ寄せる。
            prefetch は切る（別タブ遷移では使われないうえ、/kiroku は force-dynamic）。 */}
        <Link
          href="/kiroku"
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          aria-label="生徒ページを新しいタブで開く"
          className={`${viewSiteClass} ml-auto md:ml-0`}
        >
          生徒ページ
          <ExternalIcon />
        </Link>
      </div>
    </header>
  );
}
