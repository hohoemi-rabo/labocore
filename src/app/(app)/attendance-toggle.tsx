"use client";

export type AttendanceStatus = "present" | "absent" | null;

// 出席のチェックアイコン（絵文字ではなく 1px ストロークの SVG）。
function CheckIcon() {
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

// 同一 pill 内の2セグメント（出席｜欠席）。状態は親（board）が保持する純粋 UI。
// 出席=Action Blue 塗り+白+チェック / 欠席=ink 塗り+白 / 未記録=ゴースト（DESIGN §4）。
export function AttendanceToggle({
  status,
  onSet,
  disabled,
}: {
  status: AttendanceStatus;
  onSet: (next: AttendanceStatus) => void;
  disabled?: boolean;
}) {
  const isPresent = status === "present";
  const isAbsent = status === "absent";
  const segmentBase =
    "flex min-h-[44px] min-w-[64px] items-center justify-center gap-1 px-4 text-[15px] font-semibold transition-transform active:scale-95 disabled:opacity-60";

  return (
    <div className="flex shrink-0 overflow-hidden rounded-pill border border-hairline">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isPresent}
        onClick={() => onSet(isPresent ? null : "present")}
        className={`${segmentBase} ${
          isPresent ? "bg-primary text-on-dark" : "text-ink-muted-48"
        }`}
      >
        {isPresent && <CheckIcon />}
        出席
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isAbsent}
        onClick={() => onSet(isAbsent ? null : "absent")}
        className={`${segmentBase} border-l border-hairline ${
          isAbsent ? "bg-ink text-on-dark" : "text-ink-muted-48"
        }`}
      >
        欠席
      </button>
    </div>
  );
}
