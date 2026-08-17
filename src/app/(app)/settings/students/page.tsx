import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  skyButtonClass,
  tricolorSmClass,
  v2CanvasClass,
} from "@/components/v2/styles";
import { StudentSearchList, type StudentRow } from "./student-search-list";

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
    <div className={`${v2CanvasClass} flex flex-col gap-6`}>
      <Link href="/settings" className="inline-flex min-h-[44px] items-center text-[15px] text-sub">
        ‹ 設定
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[23px] font-black tracking-[.02em]">生徒管理</h1>
          <div className={`${tricolorSmClass} flex-none`} aria-hidden />
        </div>
        <Link
          href="/settings/students/new"
          className={`${skyButtonClass} shrink-0`}
        >
          生徒を追加
        </Link>
      </div>

      <StudentSearchList students={rows} />
    </div>
  );
}
