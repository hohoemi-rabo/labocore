import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
    <div className="flex max-w-[560px] flex-col gap-6">
      <Link href="/settings/students" className="text-[14px] text-ink-muted-48">
        ‹ 生徒管理
      </Link>

      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
        生徒を追加
      </h1>

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
