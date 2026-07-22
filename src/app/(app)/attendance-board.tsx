"use client";

import { useOptimistic, useTransition } from "react";
import { useToast, Toast } from "@/components/toast";
import type {
  AttendanceStatus,
  AttendanceRow,
  AttendanceCandidate,
} from "@/lib/attendance";
import { recordAttendance } from "./actions";
import { AttendanceToggle } from "./attendance-toggle";
import { AddStudent } from "./add-student";

type OptimisticUpdate = {
  studentId: string;
  status: AttendanceStatus;
  row?: AttendanceRow; // 一覧に無い生徒（別の日追加）を楽観的に append するとき渡す
};

function DoneIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function AttendanceBoard({
  lessonDate,
  initialRows,
  candidates,
  doneLabel = "本日の記録完了",
  addLabel,
}: {
  lessonDate: string;
  initialRows: AttendanceRow[];
  candidates: AttendanceCandidate[];
  doneLabel?: string;
  addLabel?: string;
}) {
  const { message, showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [rows, applyOptimistic] = useOptimistic(
    initialRows,
    (state: AttendanceRow[], update: OptimisticUpdate) => {
      const exists = state.some((r) => r.studentId === update.studentId);
      if (!exists && update.row) {
        return [...state, { ...update.row, status: update.status }];
      }
      return state.map((r) =>
        r.studentId === update.studentId ? { ...r, status: update.status } : r,
      );
    },
  );

  function setStatus(row: AttendanceRow, next: AttendanceStatus) {
    startTransition(async () => {
      applyOptimistic({ studentId: row.studentId, status: next, row });
      const result = await recordAttendance({
        studentId: row.studentId,
        lessonDate,
        status: next,
      });
      if (result?.error) {
        // 楽観値は base に戻り自動ロールバック。失敗のみトーストで知らせる。
        showToast("記録に失敗しました。もう一度お試しください。");
      }
    });
  }

  const existingIds = new Set(rows.map((r) => r.studentId));
  const pickable = candidates.filter((c) => !existingIds.has(c.id));

  const allRecorded = rows.length > 0 && rows.every((r) => r.status !== null);

  return (
    <div className="flex flex-col gap-6">
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
          {rows.map((row, i) => (
            <div
              key={row.studentId}
              className={`flex min-h-[64px] items-center justify-between gap-4 px-5 ${
                i > 0 ? "border-t border-divider-soft" : ""
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[17px] font-semibold text-ink">
                  {row.name}
                </span>
                {row.subLabel && (
                  <span className="truncate text-[14px] text-ink-muted-48">
                    {row.subLabel}
                  </span>
                )}
              </div>
              <AttendanceToggle
                status={row.status}
                onSet={(next) => setStatus(row, next)}
                disabled={isPending}
              />
            </div>
          ))}
        </div>
      )}

      {allRecorded && (
        <div className="flex items-center justify-center gap-2 text-[15px] font-semibold text-primary">
          <DoneIcon />
          {doneLabel}
        </div>
      )}

      <AddStudent
        candidates={pickable}
        label={addLabel}
        onAdd={(c) =>
          setStatus(
            {
              studentId: c.id,
              name: c.name,
              subLabel: c.className,
              status: null,
            },
            "present",
          )
        }
      />

      <Toast message={message} />
    </div>
  );
}
