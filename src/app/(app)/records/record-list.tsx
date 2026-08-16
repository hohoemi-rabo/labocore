"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { accentStyle } from "@/lib/accent";
import { formatDateWithWeekday } from "@/lib/format";
import { Toast, useToast } from "@/components/v2/toast";
import { setRecordStatus } from "./actions";

export type RecordRow = {
  id: string;
  classId: string;
  className: string;
  themeColor: string;
  lessonDate: string;
  theme: string;
  photoCount: number;
  status: "draft" | "published";
};

export type ClassFilter = { id: string; name: string; themeColor: string };

export function RecordList({
  rows: initialRows,
  classes,
}: {
  rows: RecordRow[];
  classes: ClassFilter[];
}) {
  const { message, showToast } = useToast();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("all");

  const [rows, applyOptimistic] = useOptimistic(
    initialRows,
    (state: RecordRow[], update: { id: string; status: RecordRow["status"] }) =>
      state.map((r) => (r.id === update.id ? { ...r, status: update.status } : r)),
  );

  function toggleStatus(row: RecordRow) {
    const next = row.status === "published" ? "draft" : "published";
    startTransition(async () => {
      applyOptimistic({ id: row.id, status: next });
      const result = await setRecordStatus({ id: row.id, status: next });
      if (result?.error) {
        // 楽観値は自動でロールバックされる。失敗だけ知らせる。
        showToast("状態の更新に失敗しました。もう一度お試しください。");
      }
    });
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.classId === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterTab
          label="すべて"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {classes.map((c) => (
          <FilterTab
            key={c.id}
            label={c.name.replace(/クラス$/, "")}
            color={c.themeColor}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-20 border border-dashed border-line px-4 py-10 text-center text-[17px] text-sub">
          まだ記録がありません。「新しく書く」から作成してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((row) => (
            <li
              key={row.id}
              style={accentStyle(row.themeColor)}
              className="rounded-20 border border-line bg-card px-4 py-4 shadow-elev-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-pill bg-accent-fill px-3 py-0.5 text-[13px] font-bold text-white">
                      {row.className}
                    </span>
                    <span className="text-[15px] tabular-nums text-sub">
                      {formatDateWithWeekday(row.lessonDate)}
                    </span>
                    {row.photoCount > 0 && (
                      <span className="text-[13px] text-sub">
                        📷 {row.photoCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[19px] font-black text-fg">
                    {row.theme}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleStatus(row)}
                  aria-pressed={row.status === "published"}
                  className={
                    row.status === "published"
                      ? "flex min-h-[44px] flex-none items-center justify-center rounded-16 bg-accent-fill px-4 text-[15px] font-bold text-white shadow-glow transition active:scale-95"
                      : "flex min-h-[44px] flex-none items-center justify-center rounded-16 border border-line px-4 text-[15px] font-bold text-sub transition active:scale-95"
                  }
                >
                  {row.status === "published" ? "公開中" : "下書き"}
                </button>
              </div>

              <Link
                href={`/records/${row.id}/edit`}
                className="mt-3 inline-flex min-h-[44px] items-center text-[15px] font-bold text-accent"
              >
                編集する ›
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Toast message={message} />
    </div>
  );
}

function FilterTab({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={color ? accentStyle(color) : undefined}
      className={
        active
          ? "min-h-[44px] flex-none rounded-12 bg-accent-fill px-4 text-[17px] font-bold text-white shadow-glow"
          : "min-h-[44px] flex-none rounded-12 border border-line px-4 text-[17px] font-bold text-sub transition hover:-translate-y-px"
      }
    >
      {label}
    </button>
  );
}
