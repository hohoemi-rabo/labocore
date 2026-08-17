"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/v2/form";
import { cardClass } from "@/components/v2/styles";
import type { AttendanceCandidate } from "@/lib/attendance";

// イレギュラー対応: 別の日に来た生徒をその日の出席として追加する（他コマの生徒も対象）。
export function AddStudent({
  candidates,
  onAdd,
  label = "別の日に来た生徒を追加",
}: {
  candidates: AttendanceCandidate[];
  onAdd: (candidate: AttendanceCandidate) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim();
  const filtered = q
    ? candidates.filter((c) => c.name.includes(q) || c.kana.includes(q))
    : candidates;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center justify-center self-start rounded-16 border border-line px-6 text-[17px] font-bold text-fg transition active:scale-95"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className={labelClass}>本日の出席に追加</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="flex min-h-[44px] items-center text-[17px] font-bold text-sub transition active:scale-95"
        >
          閉じる
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="氏名・ふりがなで検索"
        className={inputClass}
        autoFocus
      />

      {filtered.length > 0 ? (
        <div className={cardClass}>
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onAdd(c);
                setOpen(false);
                setQuery("");
              }}
              className={`flex min-h-[64px] w-full items-center justify-between gap-4 px-4 py-2 text-left transition hover:bg-white/[0.04] md:px-5 ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[17px] font-bold text-fg">
                  {c.name}
                </span>
                <span className="truncate text-[14px] text-sub">
                  {c.kana}
                  {c.className ? ` ・ ${c.className}` : ""}
                </span>
              </div>
              <span aria-hidden className="shrink-0 text-[19px] text-accent">
                ＋
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[17px] text-sub">
          {candidates.length === 0
            ? "追加できる生徒がいません。"
            : "該当する生徒がいません。"}
        </p>
      )}
    </div>
  );
}
