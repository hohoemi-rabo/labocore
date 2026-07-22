import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { weekdayOf, formatTimeRange } from "@/lib/format";

// 出欠 UI 共通の型（単一定義元）。クライアント側は import type で消去される。
export type AttendanceStatus = "present" | "absent" | null;

export type AttendanceRow = {
  studentId: string;
  name: string;
  subLabel: string | null; // 別コマの生徒（別の日追加）だけコマ名を入れて区別する
  status: AttendanceStatus;
};

export type AttendanceCandidate = {
  id: string;
  name: string;
  kana: string;
  className: string | null;
};

export type DayAttendance = {
  closed: { reason: string | null } | null;
  subtitle: string; // その日のコマ名（時間付き・"・"連結）
  hasClass: boolean;
  rows: AttendanceRow[];
  candidates: AttendanceCandidate[];
};

// 指定日の出欠パネルに必要なデータを組み立てる。
// ホーム（09・今日）とカレンダー（10・任意日）の両方から呼ぶ単一の情報源。
// supabase client は呼び出し側から受け取る（このモジュールを isomorphic に保つ）。
export async function getDayAttendance(
  supabase: SupabaseClient<Database>,
  date: string,
): Promise<DayAttendance> {
  const weekday = weekdayOf(date);

  const [
    { data: closed },
    { data: classes },
    { data: records },
    { data: students },
  ] = await Promise.all([
    supabase
      .from("closed_days")
      .select("reason")
      .eq("closed_date", date)
      .maybeSingle(),
    supabase
      .from("classes")
      .select("id, name, weekday, start_time, end_time")
      .eq("is_active", true)
      .order("start_time"),
    supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("lesson_date", date),
    supabase
      .from("students")
      .select("id, name, kana, class_id")
      .eq("is_active", true)
      .order("kana"),
  ]);

  const allClasses = classes ?? [];
  const classNameById = new Map(allClasses.map((c) => [c.id, c.name]));
  const dayClasses = allClasses.filter((c) => c.weekday === weekday);
  const dayClassIds = new Set(dayClasses.map((c) => c.id));

  const subtitle = dayClasses
    .map((c) =>
      c.start_time && c.end_time
        ? `${c.name}（${formatTimeRange(c.start_time, c.end_time)}）`
        : c.name,
    )
    .join(" ・ ");

  const statusById = new Map<string, AttendanceStatus>();
  for (const r of records ?? []) {
    statusById.set(r.student_id, r.status as AttendanceStatus);
  }

  const allStudents = students ?? [];

  // 表示対象 = その日のコマ在籍生徒 ∪ その日すでに記録がある生徒（別の日追加分）。
  const rows: AttendanceRow[] = allStudents
    .filter((s) => dayClassIds.has(s.class_id) || statusById.has(s.id))
    .map((s) => ({
      studentId: s.id,
      name: s.name,
      // その日のコマの生徒はコンテキスト自明なので subLabel なし。別コマ生徒だけコマ名で区別。
      subLabel: dayClassIds.has(s.class_id)
        ? null
        : (classNameById.get(s.class_id) ?? null),
      status: statusById.get(s.id) ?? null,
    }));

  const candidates: AttendanceCandidate[] = allStudents.map((s) => ({
    id: s.id,
    name: s.name,
    kana: s.kana,
    className: classNameById.get(s.class_id) ?? null,
  }));

  return {
    closed: closed ?? null,
    subtitle,
    hasClass: dayClasses.length > 0,
    rows,
    candidates,
  };
}
