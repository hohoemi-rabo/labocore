import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayJst } from "@/lib/format";
import { ConfirmDialog } from "@/components/v2/confirm-dialog";
import { sectionTitleClass, v2CanvasClass } from "@/components/v2/styles";
import {
  AnnouncementForm,
  type AnnouncementClassOption,
} from "../../announcement-form";
import { deleteAnnouncement, updateAnnouncement } from "../../actions";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: announcement }, { data: classes }] = await Promise.all([
    supabase.from("announcements").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("classes")
      .select("id, name, theme_color")
      .eq("is_active", true)
      .order("weekday")
      .order("start_time"),
  ]);

  if (!announcement) notFound();

  // 対象クラスが廃止済みでも編集できるよう、選択肢に補っておく。
  const options: AnnouncementClassOption[] = [...(classes ?? [])];
  if (
    announcement.class_id &&
    !options.some((c) => c.id === announcement.class_id)
  ) {
    const { data: own } = await supabase
      .from("classes")
      .select("id, name, theme_color")
      .eq("id", announcement.class_id)
      .maybeSingle();
    if (own) options.push({ ...own, name: `${own.name}（廃止済み）` });
  }

  const today = todayJst();

  return (
    <div className={v2CanvasClass}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/records/announcements" className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
          ‹ お知らせ
        </Link>

        <h1 className={`${sectionTitleClass} mt-4`}>お知らせを編集</h1>

        <AnnouncementForm
          action={updateAnnouncement}
          classes={options}
          defaultStartsOn={today}
          defaultEndsOn={addDays(today, 14)}
          defaultValues={{
            id: announcement.id,
            title: announcement.title,
            body: announcement.body,
            class_id: announcement.class_id,
            starts_on: announcement.starts_on,
            ends_on: announcement.ends_on,
          }}
        />

        {/* ConfirmDialog は自前の <form> を持つので、フォームの外に置く */}
        <div className="mt-10 border-t border-line pt-6">
          <ConfirmDialog
            triggerLabel="このお知らせを削除"
            title="お知らせを削除しますか？"
            message={`「${announcement.title}」を削除します。元に戻せません。掲載期間が過ぎたものは自動で非表示になるので、記録として残しておくこともできます。`}
            confirmLabel="削除する"
            action={deleteAnnouncement}
            hidden={{ id: announcement.id }}
          />
        </div>
      </div>
    </div>
  );
}
