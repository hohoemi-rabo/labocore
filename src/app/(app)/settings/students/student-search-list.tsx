"use client";

import { useState } from "react";
import Link from "next/link";
import { inputClass } from "@/components/v2/form";
import { cardClass } from "@/components/v2/styles";
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
        aria-label="生徒を検索"
        className={inputClass}
      />

      <p className="text-[14px] text-sub tabular-nums">{filtered.length}名</p>

      {filtered.length > 0 ? (
        <div className={cardClass}>
          {filtered.map((s, i) => (
            <Link
              key={s.id}
              href={`/settings/students/${s.id}`}
              className={`flex min-h-[64px] items-center justify-between gap-4 px-4 py-2 transition hover:bg-white/[0.04] md:px-5 ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[17px] font-bold text-fg">
                  {s.name}
                </span>
                <span className="truncate text-[14px] text-sub tabular-nums">
                  {s.kana}
                  {s.className ? ` ・ ${s.className}` : ""} ・{" "}
                  {formatYen(s.unitPrice)}
                </span>
              </div>
              <span aria-hidden className="shrink-0 text-sub">
                ›
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-20 border border-dashed border-line px-4 py-10 text-center text-[17px] text-sub">
          {students.length === 0
            ? "まだ生徒が登録されていません。「生徒を追加」から登録してください。"
            : "該当する生徒がいません。"}
        </p>
      )}
    </div>
  );
}
