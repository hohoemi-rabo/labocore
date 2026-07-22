"use client";

import { useState } from "react";
import Link from "next/link";
import { inputClass } from "@/components/ui/form";
import { formatYen } from "@/lib/format";

export type StudentRow = {
  id: string;
  name: string;
  kana: string;
  unitPrice: number;
  className: string | null;
};

export function StudentSearchList({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim();
  const filtered = q
    ? students.filter((s) => s.name.includes(q) || s.kana.includes(q))
    : students;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="氏名・ふりがなで検索"
        className={inputClass}
      />

      <p className="text-[14px] text-ink-muted-48 tabular-nums">
        {filtered.length}名
      </p>

      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
          {filtered.map((s, i) => (
            <div
              key={s.id}
              className={`flex min-h-[64px] items-center justify-between gap-4 px-5 ${
                i > 0 ? "border-t border-divider-soft" : ""
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[17px] font-semibold text-ink">
                  {s.name}
                </span>
                <span className="truncate text-[14px] text-ink-muted-48 tabular-nums">
                  {s.kana}
                  {s.className ? ` ・ ${s.className}` : ""} ・{" "}
                  {formatYen(s.unitPrice)}
                </span>
              </div>
              <Link
                href={`/settings/students/${s.id}/edit`}
                className="shrink-0 text-[17px] font-semibold text-primary transition-transform active:scale-95"
              >
                編集
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[17px] text-ink-muted-48">
          {students.length === 0
            ? "まだ生徒が登録されていません。「生徒を追加」から登録してください。"
            : "該当する生徒がいません。"}
        </p>
      )}
    </div>
  );
}
