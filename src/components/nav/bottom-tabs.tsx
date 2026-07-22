"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./nav-items";

// モバイル用下部タブ。フロストガラス（DESIGN §2 の sticky バー例外）。
export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline bg-canvas-parchment/80 backdrop-blur-[20px] backdrop-saturate-[180%] md:hidden">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[56px] flex-1 items-center justify-center text-[14px] transition-transform active:scale-95 ${
              active ? "font-semibold text-primary" : "text-ink-muted-48"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
