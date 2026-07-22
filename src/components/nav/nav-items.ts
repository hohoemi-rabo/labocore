export const navItems = [
  { href: "/", label: "今日" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/summary", label: "集計" },
  { href: "/settings", label: "設定" },
] as const;

// "/" は完全一致でのみ active。それ以外は前方一致（"/settings" は配下も active にする）。
export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
