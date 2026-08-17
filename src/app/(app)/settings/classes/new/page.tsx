import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";
import { ClassForm } from "../class-form";
import { createClass } from "../actions";

export default async function NewClassPage() {
  // 既に使われている色を渡し、新しいコマには未使用の色を既定で選ばせる。
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("name, theme_color")
    .eq("is_active", true);

  const usedColors = Object.fromEntries(
    (classes ?? []).map((c) => [c.theme_color.toLowerCase(), c.name]),
  );

  return (
    <div className={`${v2CanvasClass} flex max-w-[520px] flex-col gap-6`}>
      <Link href="/settings/classes" className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
        ‹ コマ管理
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-[23px] font-black tracking-[.02em]">コマを追加</h1>
        <div className={`${tricolorSmClass} flex-none`} aria-hidden />
      </div>

      <ClassForm
        action={createClass}
        submitLabel="追加する"
        usedColors={usedColors}
      />
    </div>
  );
}
