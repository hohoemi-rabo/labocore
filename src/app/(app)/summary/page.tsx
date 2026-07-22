import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayJst, formatMonthJa, shiftMonth } from "@/lib/format";
import { PaymentTable, type SummaryRow } from "./payment-table";

const MONTH_RE = /^\d{4}-\d{2}$/;

type Agg = { present: number; absent: number; amount: number };

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month =
    monthParam && MONTH_RE.test(monthParam)
      ? monthParam
      : todayJst().slice(0, 7);

  const monthStart = `${month}-01`;
  const nextStart = `${shiftMonth(month, 1)}-01`;

  const supabase = await createClient();

  // 生徒名は集約結果に依存させず並列で取得する（10〜30名規模なので全件で良い）。
  // is_active で絞らない＝当月に記録がある退会者も表示対象に含める。
  const [{ data: records }, { data: payments }, { data: students }] =
    await Promise.all([
      supabase
        .from("attendance_records")
        .select("student_id, status, unit_price_at_time")
        .gte("lesson_date", monthStart)
        .lt("lesson_date", nextStart),
      supabase
        .from("payments")
        .select("student_id, is_paid")
        .eq("target_month", month),
      supabase.from("students").select("id, name, kana"),
    ]);

  // 生徒ごとに集約（請求額 = present の unit_price_at_time 合計 = 単価スナップショット）。
  const byStudent = new Map<string, Agg>();
  for (const r of records ?? []) {
    const agg = byStudent.get(r.student_id) ?? {
      present: 0,
      absent: 0,
      amount: 0,
    };
    if (r.status === "present") {
      agg.present += 1;
      agg.amount += r.unit_price_at_time;
    } else if (r.status === "absent") {
      agg.absent += 1;
    }
    byStudent.set(r.student_id, agg);
  }

  const studentIds = [...byStudent.keys()];

  const studentById = new Map(
    (students ?? []).map((s) => [s.id, { name: s.name, kana: s.kana }]),
  );

  const paidById = new Map<string, boolean>();
  for (const p of payments ?? []) {
    paidById.set(p.student_id, p.is_paid);
  }

  const rows: SummaryRow[] = studentIds
    .map((id) => {
      const agg = byStudent.get(id)!;
      const student = studentById.get(id);
      return {
        studentId: id,
        name: student?.name ?? "（不明な生徒）",
        kana: student?.kana ?? "",
        present: agg.present,
        absent: agg.absent,
        amount: agg.amount,
        isPaid: paidById.get(id) ?? false,
      };
    })
    // ふりがな順に並べてから、クライアントに渡す形（kana を除く）へ整える。
    .sort((a, b) => a.kana.localeCompare(b.kana, "ja"))
    .map((r) => ({
      studentId: r.studentId,
      name: r.name,
      present: r.present,
      absent: r.absent,
      amount: r.amount,
      isPaid: r.isPaid,
    }));

  let totalAmount = 0;
  let totalPresent = 0;
  for (const r of rows) {
    totalAmount += r.amount;
    totalPresent += r.present;
  }

  return (
    <div>
      {/* フルブリード ダークタイルのヒーロー */}
      <section className="-mx-4 -mt-6 bg-surface-tile-1 px-5 py-10 text-center md:-mx-8 md:py-12">
        <div className="mx-auto flex max-w-[520px] items-center justify-between">
          <Link
            href={`/summary?month=${shiftMonth(month, -1)}`}
            aria-label="前月"
            className="flex h-11 w-11 items-center justify-center rounded-pill bg-on-dark text-[20px] text-ink transition-transform active:scale-95"
          >
            ‹
          </Link>
          <span className="text-[14px] text-body-muted tabular-nums">
            {formatMonthJa(month)}
          </span>
          <Link
            href={`/summary?month=${shiftMonth(month, 1)}`}
            aria-label="翌月"
            className="flex h-11 w-11 items-center justify-center rounded-pill bg-on-dark text-[20px] text-ink transition-transform active:scale-95"
          >
            ›
          </Link>
        </div>

        <p className="mt-6 text-[40px] font-semibold tracking-[-0.02em] text-on-dark tabular-nums md:text-[56px]">
          <span className="mr-1 text-[0.55em] text-body-muted">¥</span>
          {totalAmount.toLocaleString("ja-JP")}
        </p>
        <p className="mt-1 text-[14px] text-body-muted tabular-nums">
          出席のべ {totalPresent}回
        </p>
      </section>

      {rows.length > 0 ? (
        <div className="mt-8">
          <PaymentTable rows={rows} month={month} />
        </div>
      ) : (
        <p className="mt-8 text-[17px] text-ink-muted-48">
          この月の出欠記録はありません。
        </p>
      )}
    </div>
  );
}
