import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayJst } from "@/lib/format";
import { sectionTitleClass, v2CanvasClass } from "@/components/v2/styles";
import {
  AnnouncementForm,
  type AnnouncementClassOption,
} from "../announcement-form";
import { createAnnouncement } from "../actions";

// 既定の掲載期間。毎回2つ日付を打つ手間を省く（変更可）。
const DEFAULT_PERIOD_DAYS = 14;

export default async function NewAnnouncementPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, theme_color")
    .eq("is_active", true)
    .order("weekday")
    .order("start_time");

  const today = todayJst();
  const options: AnnouncementClassOption[] = classes ?? [];

  return (
    <div className={v2CanvasClass}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/records/announcements" className="text-[15px] text-sub">
          ‹ お知らせ
        </Link>

        <h1 className={`${sectionTitleClass} mt-4`}>新しいお知らせ</h1>

        <AnnouncementForm
          action={createAnnouncement}
          classes={options}
          defaultStartsOn={today}
          defaultEndsOn={addDays(today, DEFAULT_PERIOD_DAYS)}
        />
      </div>
    </div>
  );
}
