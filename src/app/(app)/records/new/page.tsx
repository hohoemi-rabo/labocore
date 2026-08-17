import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayJst } from "@/lib/format";
import { isGeminiConfigured } from "@/lib/gemini";
import { sectionTitleClass, v2CanvasClass } from "@/components/v2/styles";
import { RecordForm, type RecordClassOption } from "../record-form";
import { createRecord } from "../actions";

export default async function NewRecordPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, weekday, theme_color")
    .eq("is_active", true)
    .order("weekday")
    .order("start_time");

  const options: RecordClassOption[] = classes ?? [];

  return (
    <div className={v2CanvasClass}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/records" className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
          ‹ 授業の記録
        </Link>

        <h1 className={`${sectionTitleClass} mt-4`}>新しい記録</h1>

        {options.length === 0 ? (
          <p className="text-[17px] text-sub">
            先にコマを登録してください（設定 → コマ管理）。
          </p>
        ) : (
          <RecordForm
            action={createRecord}
            classes={options}
            today={todayJst()}
            aiEnabled={isGeminiConfigured()}
          />
        )}
      </div>
    </div>
  );
}
