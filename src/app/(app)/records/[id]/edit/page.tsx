import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayJst } from "@/lib/format";
import { isGeminiConfigured } from "@/lib/gemini";
import { ConfirmDialog } from "@/components/v2/confirm-dialog";
import { sectionTitleClass, v2CanvasClass } from "@/components/v2/styles";
import { CopyToClassDialog } from "../../copy-to-class-dialog";
import { RecordForm, type RecordClassOption } from "../../record-form";
import { deleteRecord, updateRecord } from "../../actions";

export default async function EditRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** 複製直後は `?copied=1` で来る（コピー元の画面と見分けが付くように） */
  searchParams: Promise<{ copied?: string }>;
}) {
  const [{ id }, { copied }] = await Promise.all([params, searchParams]);
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
        <Link href="/records" className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
          ‹ 授業の記録
        </Link>

        <h1 className={`${sectionTitleClass} mt-4`}>記録を編集</h1>

        {/* 役割色は「完了=緑」を文字色で使う。面は既存の surface のまま
            （DESIGN §2 に done の面・枠トークンは無い。新造しない） */}
        {copied === "1" && (
          <p className="mb-5 rounded-12 border border-line bg-surface px-4 py-3 text-[17px] font-bold leading-jp text-done">
            複製しました。内容を手直ししてから公開してください。
          </p>
        )}

        {/* ⚠️ key に記録 ID を入れる。複製すると /records/A/edit → /records/B/edit と
            **同じルートの別パラメータへ**移動するが、App Router はこのときページ内の
            クライアントコンポーネントを再マウントしない（同じ型・同じ位置なので state
            が引き継がれる）。key が無いと、複製先の画面にコピー元のテーマ・メモが
            残ったまま表示される。 */}
        <RecordForm
          key={record.id}
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

        {/* どちらのダイアログも自前の <form>・独自の送信を持つので、RecordForm の <form> の外に置く */}
        <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
          <CopyToClassDialog
            key={record.id}
            recordId={record.id}
            sourceClassId={record.class_id}
            sourceDate={record.lesson_date}
            classes={options}
          />
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
