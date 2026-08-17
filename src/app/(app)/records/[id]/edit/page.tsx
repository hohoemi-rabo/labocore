import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayJst } from "@/lib/format";
import { isGeminiConfigured } from "@/lib/gemini";
import { ConfirmDialog } from "@/components/v2/confirm-dialog";
import { sectionTitleClass, v2CanvasClass } from "@/components/v2/styles";
import { RecordForm, type RecordClassOption } from "../../record-form";
import { deleteRecord, updateRecord } from "../../actions";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: record }, { data: classes }] = await Promise.all([
    supabase.from("lesson_records").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("classes")
      .select("id, name, weekday, theme_color")
      .eq("is_active", true)
      .order("weekday")
      .order("start_time"),
  ]);

  if (!record) notFound();

  // 廃止済みクラスの記録も編集できるよう、選択肢に元のクラスを補っておく。
  const options: RecordClassOption[] = [...(classes ?? [])];
  if (!options.some((c) => c.id === record.class_id)) {
    const { data: own } = await supabase
      .from("classes")
      .select("id, name, weekday, theme_color")
      .eq("id", record.class_id)
      .maybeSingle();
    if (own) options.push(own);
  }

  return (
    <div className={v2CanvasClass}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/records" className="text-[15px] text-sub">
          ‹ 授業の記録
        </Link>

        <h1 className={`${sectionTitleClass} mt-4`}>記録を編集</h1>

        <RecordForm
          action={updateRecord}
          classes={options}
          today={todayJst()}
          aiEnabled={isGeminiConfigured()}
          defaultValues={{
            id: record.id,
            class_id: record.class_id,
            lesson_date: record.lesson_date,
            theme: record.theme,
            memo: record.memo,
            prompt: record.prompt,
            image_urls: record.image_urls,
          }}
        />

        {/* ConfirmDialog は自前の <form> を持つので、RecordForm の <form> の外に置く */}
        <div className="mt-10 border-t border-line pt-6">
          <ConfirmDialog
            triggerLabel="この記録を削除"
            title="記録を削除しますか？"
            message={`「${record.theme}」を削除します。写真も一緒に消えます。元に戻せません。`}
            confirmLabel="削除する"
            action={deleteRecord}
            hidden={{ id: record.id }}
          />
        </div>
      </div>
    </div>
  );
}
