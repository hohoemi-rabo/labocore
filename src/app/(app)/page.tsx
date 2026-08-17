import { createClient } from "@/lib/supabase/server";
import { todayJst, formatDateWithWeekday } from "@/lib/format";
import { getDayAttendance } from "@/lib/attendance";
import {
  glassCardClass,
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";
import { AttendanceBoard } from "./attendance-board";

// 今日の出欠（最重要画面）。25 で v2 デザインへ刷新。
// データ取得と楽観的更新の作りはフェーズ1のまま変えていない。
export default async function TodayPage() {
  const today = todayJst();
  const supabase = await createClient();
  const { closed, subtitle, hasClass, rows, candidates } =
    await getDayAttendance(supabase, today);

  const title = formatDateWithWeekday(today);

  // 休講日はその旨のみ表示し、生徒リストは出さない（REQUIREMENTS §8）。
  if (closed) {
    return (
      <div className={v2CanvasClass}>
        <PageTitle title={title} />
        <div
          className={`${glassCardClass} flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 py-12 text-center`}
        >
          {/* 役割色「休み」= ローズ（DESIGN §2） */}
          <p className="text-[26px] font-black text-off">本日は休講日</p>
          {closed.reason && (
            <p className="text-[17px] text-sub">{closed.reason}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={v2CanvasClass}>
      <PageTitle title={title} subtitle={subtitle} />

      {!hasClass && rows.length === 0 ? (
        <p className="text-[17px] text-sub">本日のコマはありません。</p>
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

function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <h1 className="text-[23px] font-black tracking-[.02em] tabular-nums">
          {title}
        </h1>
        <div className={`${tricolorSmClass} flex-none`} aria-hidden />
      </div>
      {subtitle && <p className="text-[17px] text-sub">{subtitle}</p>}
    </div>
  );
}
