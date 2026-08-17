"use client";

import type { AttendanceStatus } from "@/lib/attendance";

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

// 出席／欠席の2ボタン。状態は親（board）が保持する純粋 UI。
// DESIGN_v2 §8: 出席=アクセント（管理画面はスカイ固定）グラデ塗り+白+チェック+色グロー /
// 欠席=surface-2 塗り / 未記録=ゴースト（透明+line の縁+sub 文字）。
// 「出席だけが光る」関係性は v1 から変えていない。
//
// ⚠️ 2つを1つの pill に連結して `overflow-hidden` で囲まないこと。
//    出席の色グローが器の外に出る影なので、丸ごと切り取られる（25 で離して並べる形にした理由）。
const segmentBase =
  "flex min-h-[44px] min-w-[72px] items-center justify-center gap-1.5 rounded-pill px-4 text-[15px] font-bold transition active:scale-95 disabled:opacity-60";
const idleClass = `${segmentBase} border border-line text-sub`;
const presentClass = `${segmentBase} bg-sky-fill text-white shadow-glow-sky`;
const absentClass = `${segmentBase} border border-line bg-surface-2 text-fg`;

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

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isPresent}
        onClick={() => onSet(isPresent ? null : "present")}
        className={isPresent ? presentClass : idleClass}
      >
        {isPresent && <CheckIcon />}
        出席
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isAbsent}
        onClick={() => onSet(isAbsent ? null : "absent")}
        className={isAbsent ? absentClass : idleClass}
      >
        欠席
      </button>
    </div>
  );
}
