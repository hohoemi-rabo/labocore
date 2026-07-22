"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 出欠記録のインラインアクション（ホーム 09・カレンダー 10 で共用）。
// 楽観的更新から呼ぶため redirect せず、結果を { error? } で返す。
const schema = z.object({
  studentId: z.string().uuid(),
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["present", "absent"]).nullable(),
});

export type RecordAttendanceInput = z.input<typeof schema>;

export async function recordAttendance(
  input: RecordAttendanceInput,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: "入力が不正です。" };
  }
  const { studentId, lessonDate, status } = parsed.data;

  const supabase = await createClient();

  if (status === null) {
    // 再タップによる記録取り消し（レコード削除 → 未記録に戻る）。
    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("student_id", studentId)
      .eq("lesson_date", lessonDate);
    if (error) {
      return { error: "記録の取り消しに失敗しました。" };
    }
  } else {
    // 単価スナップショット方式: 保存時点の生徒単価をサーバで取得してコピーする
    // （クライアントから渡さない＝改ざん防止）。過去の請求額は変わらない。
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("unit_price")
      .eq("id", studentId)
      .single();
    if (studentError || !student) {
      return { error: "生徒が見つかりませんでした。" };
    }

    const { error } = await supabase.from("attendance_records").upsert(
      {
        student_id: studentId,
        lesson_date: lessonDate,
        status,
        unit_price_at_time: student.unit_price,
      },
      { onConflict: "student_id,lesson_date" },
    );
    if (error) {
      return { error: "記録の保存に失敗しました。" };
    }
  }

  // 出欠は集計・カレンダーにも反映されるため関連画面を再検証する。
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/summary");
  return {};
}
