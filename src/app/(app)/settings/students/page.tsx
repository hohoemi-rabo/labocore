import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  StudentSearchList,
  type StudentRow,
} from "./student-search-list";

export default async function StudentsPage() {
  const supabase = await createClient();

  // 埋め込み JOIN の型ゆらぎを避け、students と classes を別々に取得して JS で結合する。
  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase.from("students").select("*").eq("is_active", true).order("kana"),
    supabase.from("classes").select("id, name"),
  ]);

  const classNameById = new Map((classes ?? []).map((c) => [c.id, c.name]));

  const rows: StudentRow[] = (students ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    kana: s.kana,
    unitPrice: s.unit_price,
    className: classNameById.get(s.class_id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/settings" className="text-[14px] text-ink-muted-48">
        ‹ 設定
      </Link>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink md:text-[34px]">
          生徒管理
        </h1>
        <Link
          href="/settings/students/new"
          className="flex h-11 shrink-0 items-center justify-center rounded-pill bg-primary px-6 text-[17px] font-semibold text-on-dark transition-transform active:scale-95"
        >
          生徒を追加
        </Link>
      </div>

      <StudentSearchList students={rows} />
    </div>
  );
}
