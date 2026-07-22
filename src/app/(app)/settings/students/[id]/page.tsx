import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Yen } from "@/components/yen";
import {
  WEEKDAY_LABELS,
  formatTimeRange,
  formatMonthJa,
  formatDateJa,
} from "@/lib/format";

const SMARTPHONE_OS_LABELS: Record<string, string> = {
  android: "Android",
  iphone: "iPhone",
};

const sectionTitleClass = "text-[21px] font-semibold text-ink";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const isEmpty =
    value === null || value === undefined || value === "" || value === false;
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 border-t border-divider-soft px-5 first:border-t-0">
      <span className="shrink-0 text-[14px] text-ink-muted-48">{label}</span>
      <span className="text-right text-[17px] text-ink">
        {isEmpty ? "—" : value}
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
      {children}
    </div>
  );
}

type MonthAgg = {
  month: string;
  present: number;
  absent: number;
  amount: number;
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) notFound();

  const [{ data: cls }, { data: records }] = await Promise.all([
    supabase
      .from("classes")
      .select("name, weekday, start_time, end_time")
      .eq("id", student.class_id)
      .single(),
    supabase
      .from("attendance_records")
      .select("lesson_date, status, unit_price_at_time")
      .eq("student_id", id),
  ]);

  // 月別に集約（請求額 = 出席分の unit_price_at_time 合計 = 単価スナップショット）。
  const byMonth = new Map<string, MonthAgg>();
  for (const r of records ?? []) {
    const month = r.lesson_date.slice(0, 7);
    const agg =
      byMonth.get(month) ?? { month, present: 0, absent: 0, amount: 0 };
    if (r.status === "present") {
      agg.present += 1;
      agg.amount += r.unit_price_at_time;
    } else if (r.status === "absent") {
      agg.absent += 1;
    }
    byMonth.set(month, agg);
  }
  const history = [...byMonth.values()].sort((a, b) =>
    b.month.localeCompare(a.month),
  );

  const classLabel = cls
    ? `${cls.name}（${WEEKDAY_LABELS[cls.weekday]} ${
        cls.start_time && cls.end_time
          ? formatTimeRange(cls.start_time, cls.end_time)
          : ""
      }）`
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/settings/students"
          className="text-[14px] text-ink-muted-48"
        >
          ‹ 生徒管理
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
            {student.name}
          </h1>
          <Link
            href={`/settings/students/${student.id}/edit`}
            className="shrink-0 text-[17px] font-semibold text-primary transition-transform active:scale-95"
          >
            編集
          </Link>
        </div>
      </div>

      {/* 基本情報 */}
      <section className="flex flex-col gap-4">
        <h2 className={sectionTitleClass}>基本情報</h2>
        <Card>
          <InfoRow label="氏名" value={student.name} />
          <InfoRow label="ふりがな" value={student.kana} />
          <InfoRow label="所属コマ" value={classLabel} />
          <InfoRow
            label="単価"
            value={
              <span>
                <Yen amount={student.unit_price} />
                <span className="text-ink-muted-48"> / 回</span>
              </span>
            }
          />
        </Card>
      </section>

      {/* 連絡先 */}
      <section className="flex flex-col gap-4">
        <h2 className={sectionTitleClass}>連絡先</h2>
        <Card>
          <InfoRow label="電話" value={student.phone} />
          <InfoRow label="メール" value={student.email} />
          <InfoRow label="住所" value={student.address} />
          <InfoRow
            label="生年月日"
            value={student.birth_date ? formatDateJa(student.birth_date) : null}
          />
          <InfoRow
            label="使用スマホ"
            value={
              student.smartphone_os
                ? SMARTPHONE_OS_LABELS[student.smartphone_os]
                : null
            }
          />
        </Card>
      </section>

      {/* 緊急連絡先 */}
      <section className="flex flex-col gap-4">
        <h2 className={sectionTitleClass}>緊急連絡先</h2>
        <Card>
          <InfoRow label="氏名" value={student.emergency_contact_name} />
          <InfoRow label="続柄" value={student.emergency_contact_relation} />
          <InfoRow label="電話" value={student.emergency_contact_phone} />
        </Card>
      </section>

      {/* メモ */}
      <section className="flex flex-col gap-4">
        <h2 className={sectionTitleClass}>メモ</h2>
        <Card>
          <div className="min-h-[52px] px-5 py-4">
            <p className="whitespace-pre-wrap text-[17px] text-ink">
              {student.note ? (
                student.note
              ) : (
                <span className="text-ink-muted-48">—</span>
              )}
            </p>
          </div>
        </Card>
      </section>

      {/* 出欠履歴 */}
      <section className="flex flex-col gap-4">
        <h2 className={sectionTitleClass}>出欠履歴</h2>
        {history.length > 0 ? (
          <Card>
            {history.map((h, i) => (
              <div
                key={h.month}
                className={`flex flex-col gap-1 px-5 py-4 ${
                  i > 0 ? "border-t border-divider-soft" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[17px] font-semibold text-ink">
                    {formatMonthJa(h.month)}
                  </span>
                  <Yen
                    amount={h.amount}
                    className="text-[17px] font-semibold text-ink"
                  />
                </div>
                <span className="text-[14px] text-ink-muted-48 tabular-nums">
                  出席 {h.present}回 ・ 欠席 {h.absent}回
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <p className="text-[17px] text-ink-muted-48">
            まだ出欠の記録がありません。
          </p>
        )}
      </section>
    </div>
  );
}
