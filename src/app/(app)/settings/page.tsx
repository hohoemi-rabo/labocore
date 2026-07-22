import Link from "next/link";
import { signOut } from "@/lib/auth/actions";

const links = [
  { href: "/settings/students", label: "生徒管理" },
  { href: "/settings/classes", label: "コマ管理" },
  { href: "/settings/closed-days", label: "休講日管理" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
        設定
      </h1>

      <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
        {links.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-[56px] items-center justify-between px-5 text-[17px] text-ink transition-colors hover:bg-canvas-parchment ${
              i > 0 ? "border-t border-divider-soft" : ""
            }`}
          >
            <span>{link.label}</span>
            <span aria-hidden className="text-ink-muted-48">
              ›
            </span>
          </Link>
        ))}
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="flex h-11 items-center justify-center rounded-pill border border-hairline bg-canvas px-6 text-[17px] font-semibold text-ink transition-transform active:scale-95"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}
