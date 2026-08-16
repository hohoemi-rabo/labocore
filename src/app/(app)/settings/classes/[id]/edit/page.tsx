import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "../../class-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateClass, deactivateClass } from "../../actions";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (!cls) notFound();

  // 重複の注意書き用。自分自身は除く（今の色のままなのに「重複」と言われないように）。
  const { data: others } = await supabase
    .from("classes")
    .select("name, theme_color")
    .eq("is_active", true)
    .neq("id", id);

  const usedColors = Object.fromEntries(
    (others ?? []).map((c) => [c.theme_color.toLowerCase(), c.name]),
  );

  return (
    <div className="flex max-w-[520px] flex-col gap-6">
      <Link href="/settings/classes" className="text-[14px] text-ink-muted-48">
        ‹ コマ管理
      </Link>

      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
        コマを編集
      </h1>

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

      <div className="mt-6 flex flex-col gap-3 border-t border-divider-soft pt-6">
        <p className="text-[14px] text-ink-muted-48">
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
