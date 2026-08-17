import Link from "next/link";
import { WEEKDAY_LABELS } from "@/lib/format";
import { periodLabels, type KirokuClass } from "@/lib/kiroku/classes";

// 生徒向けクラスページの sticky ヘッダー（DESIGN §7）。Server Component。
//
// ⚠️ position: sticky は**祖先**に overflow / transform / filter / contain が付くと
//    黙って効かなくなる。「タブが横に溢れるから」とキャンバス側に overflow-x-hidden を
//    足すとヘッダーが固定されなくなるので注意（エラーは一切出ない）。
//    タブ行自身の overflow-x-auto は子孫なので影響しない。

const tabBase =
  "flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-12 px-2 text-[17px] font-bold leading-tight transition active:scale-95";
const tabIdleClass = `${tabBase} min-w-[3.1em] border border-line bg-white/[0.04] text-sub`;
const tabActiveClass = `${tabBase} min-w-[3.1em] bg-accent-fill text-white shadow-glow`;

export function KirokuHeader({
  classes,
  currentId,
}: {
  classes: KirokuClass[];
  currentId: string;
}) {
  const periods = periodLabels(classes);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ground/[0.82] px-4 pb-2.5 pt-3.5 backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[680px] items-center gap-3">
        <div
          className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-12 bg-accent-fill text-[21px] shadow-glow"
          aria-hidden
        >
          😊
        </div>
        <div className="text-[17px] font-black leading-tight tracking-[.02em]">
          ほほ笑みラボ
          <small className="block text-[12px] font-medium tracking-[.18em] text-sub">
            CLASS RECORD
          </small>
        </div>
      </div>

      {/* 片軸を auto にすると もう片軸も clip されるため、アクティブタブのグローが
          下で切れる。pb-3 で逃がす。 */}
      <nav
        aria-label="クラス"
        className="mx-auto mt-3 flex max-w-[680px] gap-2 overflow-x-auto pb-3"
      >
        {classes.map((c) => {
          const active = c.id === currentId;
          return (
            <Link
              key={c.id}
              href={`/kiroku/${c.id}`}
              // タブは全部が画面内に入るので、prefetch を切らないと
              // 1回の閲覧で force-dynamic なルートを人数分だけ余計に叩く。
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={active ? tabActiveClass : tabIdleClass}
            >
              {WEEKDAY_LABELS[c.weekday]}
              {periods.get(c.id) && (
                <small className="text-[13px] font-bold tracking-[.05em]">
                  {periods.get(c.id)}
                </small>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
