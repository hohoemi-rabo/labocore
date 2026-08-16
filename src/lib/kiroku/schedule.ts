import { addDays, weekdayOf } from "@/lib/format";

// 「今月のよてい」の算出（REQUIREMENTS_phase2 §7 K3）。
// Supabase に触らない純関数にしてある（日付計算だけを1画面で見て検証できるように）。

export type ClosedDay = { date: string; reason: string | null };

export type MonthlySchedule = {
  /** 開講日の「日」だけ（例 [3, 10, 17, 24, 31]） */
  lessonDays: number[];
  /** 休講で潰れた日 */
  offDays: ClosedDay[];
};

/**
 * 指定月のうち、そのクラスの曜日にあたる日を「授業日」と「お休み」に振り分ける。
 *
 * 月末日数を計算せず、初日から目的の曜日までオフセットして7日ずつ進める。
 * `weekdayOf` / `addDays` はどちらも UTC 基準なので tz 非依存
 * （`new Date("2026-08-01")` を直に使うと JST の朝9時まで前日になる）。
 *
 * `closed_days` は教室全体の休講日だが、クラスの曜日で絞る時点で無関係な日は
 * 自然に落ちる（月曜クラスのページに木曜の休講日は出てこない）。
 */
export function buildMonthlySchedule(
  month: string,
  weekday: number,
  closed: ClosedDay[],
): MonthlySchedule {
  const first = `${month}-01`;
  const offset = (weekday - weekdayOf(first) + 7) % 7;
  const closedByDate = new Map(closed.map((c) => [c.date, c.reason]));

  const lessonDays: number[] = [];
  const offDays: ClosedDay[] = [];

  for (let d = addDays(first, offset); d.slice(0, 7) === month; d = addDays(d, 7)) {
    if (closedByDate.has(d)) {
      offDays.push({ date: d, reason: closedByDate.get(d) ?? null });
    } else {
      lessonDays.push(Number(d.slice(8, 10)));
    }
  }

  return { lessonDays, offDays };
}
