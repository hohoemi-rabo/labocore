import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDayAttendance } from "@/lib/attendance";
import {
  WEEKDAY_LABELS,
  todayJst,
  formatMonthJa,
  formatDateWithWeekday,
  shiftMonth,
} from "@/lib/format";
import { AttendanceBoard } from "../attendance-board";

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const { month: monthParam, date: dateParam } = await searchParams;
  const today = todayJst();

  const month =
    monthParam && MONTH_RE.test(monthParam) ? monthParam : today.slice(0, 7);
  const selectedDate =
    dateParam && DATE_RE.test(dateParam) && dateParam.slice(0, 7) === month
      ? dateParam
      : null;

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${pad(daysInMonth)}`;

  const supabase = await createClient();

  const [{ data: records }, { data: closedDays }, day] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("lesson_date")
      .gte("lesson_date", monthStart)
      .lte("lesson_date", monthEnd),
    supabase
      .from("closed_days")
      .select("closed_date")
      .gte("closed_date", monthStart)
      .lte("closed_date", monthEnd),
    selectedDate ? getDayAttendance(supabase, selectedDate) : Promise.resolve(null),
  ]);

  const recordedDates = new Set((records ?? []).map((r) => r.lesson_date));
  const closedDates = new Set((closedDays ?? []).map((c) => c.closed_date));

  // 先頭の空白セル + 各日 + 末尾の空白セル（7列の矩形に整える）。
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const closeHref = `/calendar?month=${month}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
        カレンダー
      </h1>

      {/* 月送り */}
      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?month=${shiftMonth(month, -1)}`}
          className="flex h-11 items-center rounded-pill px-4 text-[17px] font-semibold text-primary transition-transform active:scale-95"
        >
          ‹ 前月
        </Link>
        <span className="text-[17px] font-semibold text-ink tabular-nums">
          {formatMonthJa(month)}
        </span>
        <Link
          href={`/calendar?month=${shiftMonth(month, 1)}`}
          className="flex h-11 items-center rounded-pill px-4 text-[17px] font-semibold text-primary transition-transform active:scale-95"
        >
          翌月 ›
        </Link>
      </div>

      {/* 月グリッド */}
      <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
        <div className="grid grid-cols-7 border-b border-divider-soft">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-[13px] font-semibold text-ink-muted-48"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={`empty-${i}`} className="min-h-[56px]" />;
            }
            const dayNum = Number(cell.slice(8));
            const hasRecord = recordedDates.has(cell);
            const isClosed = closedDates.has(cell);
            const isToday = cell === today;
            const isSelected = cell === selectedDate;

            return (
              <Link
                key={cell}
                href={`/calendar?month=${month}&date=${cell}`}
                className={`flex min-h-[56px] flex-col items-center gap-1 py-2 transition-colors active:scale-95 ${
                  isSelected ? "bg-canvas-parchment" : ""
                }`}
              >
                <span
                  className={`text-[15px] tabular-nums ${
                    isToday ? "font-semibold text-primary" : "text-ink"
                  } ${isClosed ? "text-ink-muted-48 line-through" : ""}`}
                >
                  {dayNum}
                </span>
                <span className="flex h-1.5 items-center gap-1">
                  {hasRecord && (
                    <span className="h-1.5 w-1.5 rounded-pill bg-primary" />
                  )}
                  {isClosed && (
                    <span className="h-1.5 w-1.5 rounded-pill bg-ink-muted-48" />
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 日付パネル（モバイル: 下シート / PC: 右パネル） */}
      {selectedDate && day && (
        <>
          <Link
            href={closeHref}
            aria-label="閉じる"
            className="fixed inset-0 z-40 bg-ink/40"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-lg bg-canvas md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-hairline">
            <div className="flex flex-col gap-6 p-5 md:p-6 md:pt-[68px]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[21px] font-semibold text-ink">
                  {formatDateWithWeekday(selectedDate)}
                </h2>
                <Link
                  href={closeHref}
                  className="text-[17px] font-semibold text-ink-muted-48 transition-transform active:scale-95"
                >
                  閉じる
                </Link>
              </div>

              {day.closed ? (
                <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg bg-canvas-parchment px-6 py-10 text-center">
                  <p className="text-[21px] font-semibold text-ink">休講日</p>
                  {day.closed.reason && (
                    <p className="text-[17px] text-ink-muted-48">
                      {day.closed.reason}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {!day.hasClass && day.rows.length === 0 && (
                    <p className="text-[15px] text-ink-muted-48">
                      この日はコマがありません。下のボタンから生徒を追加できます。
                    </p>
                  )}
                  <AttendanceBoard
                    lessonDate={selectedDate}
                    initialRows={day.rows}
                    candidates={day.candidates}
                    doneLabel="記録完了"
                    addLabel="生徒を追加"
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
