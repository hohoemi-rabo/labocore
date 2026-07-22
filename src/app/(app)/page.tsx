import { createClient } from "@/lib/supabase/server";
import { todayJst, formatDateWithWeekday } from "@/lib/format";
import { getDayAttendance } from "@/lib/attendance";
import { AttendanceBoard } from "./attendance-board";

export default async function TodayPage() {
  const today = todayJst();
  const supabase = await createClient();
  const { closed, subtitle, hasClass, rows, candidates } =
    await getDayAttendance(supabase, today);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
          {title}
        </h1>
        {subtitle && <p className="text-[17px] text-ink-muted-48">{subtitle}</p>}
      </div>

      {!hasClass && rows.length === 0 ? (
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
