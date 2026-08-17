"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./nav-items";

// モバイル用下部タブ。24 で v2（ダーク・ガラス面）へ塗り替えた。
// 構造・項目・タップ領域は v1 のまま（授業中のワンタップ操作を変えないため）。
// 管理画面のアクセントはスカイ固定（DESIGN §8）。
export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ground/[0.82] px-2 py-2 backdrop-blur-[12px] md:hidden">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[56px] flex-1 items-center justify-center rounded-12 text-[14px] font-bold transition active:scale-95 ${
              active ? "bg-sky-fill text-white shadow-glow-sky" : "text-sub"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
