"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./nav-items";

// PC 用サイドバー。純黒トップバー(44px)の下に固定表示。
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 top-11 z-20 hidden w-[220px] flex-col gap-1 border-r border-hairline bg-canvas px-3 py-6 md:flex">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-sm px-4 py-3 text-[17px] transition-colors ${
              active
                ? "font-semibold text-primary"
                : "text-ink hover:text-ink-muted-80"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
