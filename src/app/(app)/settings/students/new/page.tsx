import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";
import { StudentForm } from "../student-form";
import { NoClassesNotice } from "../no-classes-notice";
import { createStudent } from "../actions";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("is_active", true)
    .order("weekday")
    .order("start_time");

  const classOptions = classes ?? [];

  return (
    <div className={`${v2CanvasClass} flex max-w-[560px] flex-col gap-6`}>
      <Link href="/settings/students" className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
        ‹ 生徒管理
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-[23px] font-black tracking-[.02em]">生徒を追加</h1>
        <div className={`${tricolorSmClass} flex-none`} aria-hidden />
      </div>

      {classOptions.length === 0 ? (
        <NoClassesNotice />
      ) : (
        <StudentForm
          action={createStudent}
          submitLabel="追加する"
          classOptions={classOptions}
        />
      )}
    </div>
  );
}
