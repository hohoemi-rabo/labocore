import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import {
  cardClass,
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";

const links = [
  { href: "/settings/students", label: "生徒管理" },
  { href: "/settings/classes", label: "コマ管理" },
  { href: "/settings/closed-days", label: "休講日管理" },
];

export default function SettingsPage() {
  return (
    <div className={`${v2CanvasClass} flex flex-col gap-8`}>
      <div className="flex items-center gap-3">
        <h1 className="text-[23px] font-black tracking-[.02em]">設定</h1>
        <div className={`${tricolorSmClass} flex-none`} aria-hidden />
      </div>

      <div className={cardClass}>
        {links.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-[56px] items-center justify-between px-5 text-[17px] font-bold text-fg transition hover:bg-white/[0.04] ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <span>{link.label}</span>
            <span aria-hidden className="text-sub">
              ›
            </span>
          </Link>
        ))}
      </div>

      {/* ログアウトは自前の <form> なので、他のフォームの外に置く */}
      <form action={signOut}>
        <button
          type="submit"
          className="flex min-h-[44px] items-center justify-center rounded-16 border border-line px-6 text-[17px] font-bold text-fg transition active:scale-95"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}
