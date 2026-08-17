import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayJst, formatMonthJa, shiftMonth } from "@/lib/format";
import {
  heroCardClass,
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";
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
    <div className={v2CanvasClass}>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-[23px] font-black tracking-[.02em]">月次集計</h1>
        <div className={`${tricolorSmClass} flex-none`} aria-hidden />
      </div>

      {/* 請求額のヒーロー（DESIGN §8: アクセントの radial グローを持つ大型カード）。
          巨大数値は <Yen> を流用せず手書きする（Yen は本文サイズ向けの muted 前提）。 */}
      <section className={`${heroCardClass} px-5 py-10 text-center md:py-12`}>
        <div className="mx-auto flex max-w-[520px] items-center justify-between">
          <MonthLink month={shiftMonth(month, -1)} label="前月">
            ‹
          </MonthLink>
          <span className="text-[15px] font-bold text-sub tabular-nums">
            {formatMonthJa(month)}
          </span>
          <MonthLink month={shiftMonth(month, 1)} label="翌月">
            ›
          </MonthLink>
        </div>

        <p className="mt-6 text-[40px] font-black tracking-[-0.02em] text-fg tabular-nums md:text-[56px]">
          <span className="mr-1 text-[0.55em] text-sub">¥</span>
          {totalAmount.toLocaleString("ja-JP")}
        </p>
        <p className="mt-1 text-[15px] text-sub tabular-nums">
          出席のべ {totalPresent}回
        </p>
      </section>

      {rows.length > 0 ? (
        <div className="mt-8">
          <PaymentTable rows={rows} month={month} />
        </div>
      ) : (
        <p className="mt-8 rounded-20 border border-dashed border-line px-4 py-10 text-center text-[17px] text-sub">
          この月の出欠記録はありません。
        </p>
      )}
    </div>
  );
}

function MonthLink({
  month,
  label,
  children,
}: {
  month: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/summary?month=${month}`}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-pill border border-line text-[20px] text-fg transition active:scale-95"
    >
      {children}
    </Link>
  );
}
