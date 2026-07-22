import { createClient } from "@/lib/supabase/server";
import {
  todayJst,
  weekdayOf,
  formatDateWithWeekday,
  formatTimeRange,
} from "@/lib/format";
import { AttendanceBoard, type AttendanceRow } from "./attendance-board";
import type { Candidate } from "./add-student";
import type { AttendanceStatus } from "./attendance-toggle";

export default async function TodayPage() {
  const today = todayJst();
  const weekday = weekdayOf(today);
  const supabase = await createClient();

  const [
    { data: closed },
    { data: classes },
    { data: records },
    { data: students },
  ] = await Promise.all([
    supabase
      .from("closed_days")
      .select("reason")
      .eq("closed_date", today)
      .maybeSingle(),
    supabase
      .from("classes")
      .select("id, name, weekday, start_time, end_time")
      .eq("is_active", true)
      .order("start_time"),
    supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("lesson_date", today),
    supabase
      .from("students")
      .select("id, name, kana, class_id")
      .eq("is_active", true)
      .order("kana"),
  ]);

  const title = formatDateWithWeekday(today);

  // 休講日はその旨のみ表示し、生徒リストは出さない（DESIGN §5.2）。
  if (closed) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
          {title}
        </h1>
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-lg bg-canvas-parchment px-6 py-12 text-center">
          <p className="text-[28px] font-semibold text-ink">本日は休講日</p>
          {closed.reason && (
            <p className="text-[17px] text-ink-muted-48">{closed.reason}</p>
          )}
        </div>
      </div>
    );
  }

  const allClasses = classes ?? [];
  const classNameById = new Map(allClasses.map((c) => [c.id, c.name]));
  const todayClasses = allClasses.filter((c) => c.weekday === weekday);
  const todayClassIds = new Set(todayClasses.map((c) => c.id));

  const subtitle = todayClasses
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

  // 表示対象 = 今日のコマ在籍生徒 ∪ 今日すでに記録がある生徒（別の日追加分）。
  const rows: AttendanceRow[] = allStudents
    .filter((s) => todayClassIds.has(s.class_id) || statusById.has(s.id))
    .map((s) => ({
      studentId: s.id,
      name: s.name,
      // 今日のコマの生徒はコンテキスト自明なので subLabel なし。別コマ生徒だけコマ名で区別。
      subLabel: todayClassIds.has(s.class_id)
        ? null
        : (classNameById.get(s.class_id) ?? null),
      status: statusById.get(s.id) ?? null,
    }));

  const candidates: Candidate[] = allStudents.map((s) => ({
    id: s.id,
    name: s.name,
    kana: s.kana,
    className: classNameById.get(s.class_id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
          {title}
        </h1>
        {subtitle && <p className="text-[17px] text-ink-muted-48">{subtitle}</p>}
      </div>

      {todayClasses.length === 0 && rows.length === 0 ? (
        <p className="text-[17px] text-ink-muted-48">本日のコマはありません。</p>
      ) : (
        <AttendanceBoard
          lessonDate={today}
          initialRows={rows}
          candidates={candidates}
        />
      )}
    </div>
  );
}
