import Link from "next/link";

// 生徒は所属コマ（class_id NOT NULL）が必須。コマが1件も無いときの案内。
export function NoClassesNotice() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-hairline bg-canvas p-6">
      <p className="text-[17px] text-ink">
        生徒を登録するには、先に所属先のコマが必要です。
      </p>
      <Link
        href="/settings/classes/new"
        className="flex h-11 items-center justify-center rounded-pill bg-primary px-6 text-[17px] font-semibold text-on-dark transition-transform active:scale-95"
      >
        コマを追加する
      </Link>
    </div>
  );
}
