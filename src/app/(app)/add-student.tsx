"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/form";
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
        className="flex h-11 items-center justify-center self-start rounded-pill border border-hairline bg-canvas px-6 text-[17px] font-semibold text-ink transition-transform active:scale-95"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px] font-semibold text-ink">
          本日の出席に追加
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="text-[17px] font-semibold text-ink-muted-48 transition-transform active:scale-95"
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
        <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onAdd(c);
                setOpen(false);
                setQuery("");
              }}
              className={`flex min-h-[64px] w-full items-center justify-between gap-4 px-5 text-left transition-colors hover:bg-canvas-parchment ${
                i > 0 ? "border-t border-divider-soft" : ""
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[17px] font-semibold text-ink">
                  {c.name}
                </span>
                <span className="truncate text-[14px] text-ink-muted-48">
                  {c.kana}
                  {c.className ? ` ・ ${c.className}` : ""}
                </span>
              </div>
              <span aria-hidden className="shrink-0 text-primary">
                ＋
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[17px] text-ink-muted-48">
          {candidates.length === 0
            ? "追加できる生徒がいません。"
            : "該当する生徒がいません。"}
        </p>
      )}
    </div>
  );
}
