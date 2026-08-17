import Link from "next/link";
import { glassCardClass, skyButtonClass } from "@/components/v2/styles";

// 生徒は所属コマ（class_id NOT NULL）が必須。コマが1件も無いときの案内。
export function NoClassesNotice() {
  return (
    <div className={`${glassCardClass} flex flex-col items-start gap-4 p-6`}>
      <p className="text-[17px] text-fg-body">
        生徒を登録するには、先に所属先のコマが必要です。
      </p>
      <Link href="/settings/classes/new" className={skyButtonClass}>
        コマを追加する
      </Link>
    </div>
  );
}
