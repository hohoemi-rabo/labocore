import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";
import { ClassForm } from "../../class-form";
import { ConfirmDialog } from "@/components/v2/confirm-dialog";
import { updateClass, deactivateClass } from "../../actions";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // others は cls の結果ではなく URL の id にしか依存しないので、2本を並列で取る。
  const [{ data: cls }, { data: others }] = await Promise.all([
    supabase.from("classes").select("*").eq("id", id).single(),
    // 重複の注意書き用。自分自身は除く（今の色のままなのに「重複」と言われないように）。
    supabase
      .from("classes")
      .select("name, theme_color")
      .eq("is_active", true)
      .neq("id", id),
  ]);

  if (!cls) notFound();

  const usedColors = Object.fromEntries(
    (others ?? []).map((c) => [c.theme_color.toLowerCase(), c.name]),
  );

  return (
    <div className={`${v2CanvasClass} flex max-w-[520px] flex-col gap-6`}>
      <Link href="/settings/classes" className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
        ‹ コマ管理
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-[23px] font-black tracking-[.02em]">コマを編集</h1>
        <div className={`${tricolorSmClass} flex-none`} aria-hidden />
      </div>

      <ClassForm
        action={updateClass}
        submitLabel="保存する"
        usedColors={usedColors}
        defaultValues={{
          id: cls.id,
          name: cls.name,
          weekday: cls.weekday,
          start_time: cls.start_time?.slice(0, 5),
          end_time: cls.end_time?.slice(0, 5),
          theme_color: cls.theme_color,
        }}
      />

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
        <p className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
          このコマを廃止すると一覧から外れます。過去の出欠・請求の履歴は残ります。
        </p>
        <ConfirmDialog
          triggerLabel="このコマを廃止"
          title="コマを廃止しますか？"
          message={`「${cls.name}」を廃止します。過去の記録は保持されますが、一覧には表示されなくなります。`}
          confirmLabel="廃止する"
          action={deactivateClass}
          hidden={{ id: cls.id }}
        />
      </div>
    </div>
  );
}
