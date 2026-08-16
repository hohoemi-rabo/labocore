import { accentStyle } from "@/lib/accent";
import { WEEKDAY_LABELS, formatTimeRange } from "@/lib/format";
import { listActiveClasses, type KirokuClass } from "@/lib/kiroku/classes";
import {
  entryBoxClass,
  entryCanvasClass,
  tricolorClass,
} from "@/components/v2/styles";
import { chooseClass } from "../actions";

// K2 クラスえらび（DESIGN_v2 §7）。
//
// このページはゲートを再チェックしない。middleware が唯一の判定者
// （管理画面の (app) 配下がページ側でログイン確認をしないのと同じ考え方）。
//
// <form action={chooseClass}> を直接使ってよい理由: v2 の「手動 dispatch」ルールは
// 「useActionState の action が {fieldErrors} を返すと非制御フィールドがリセットされる」
// 問題への対策。ここはテキスト入力が無く action は必ず redirect するので、
// リセットされる対象が存在しない。素の form にすればクライアント JS がゼロになり、
// 古いスマホでも確実に動く。
const classButtonClass =
  "relative min-h-[44px] overflow-hidden rounded-16 border border-line bg-glass px-3 py-3 pl-5 text-left shadow-elev-1 transition hover:-translate-y-[3px] hover:border-accent hover:shadow-elev-1-hover active:translate-y-0 active:scale-95 sm:px-4 sm:pl-6";

export default async function KirokuSelectPage() {
  const classes = await listActiveClasses();

  // 同じ曜日にコマが2つ以上あるときだけ「午前/午後」を併記する
  // （水曜午後クラスが増えたときに自動で出る。1つしかない曜日では冗長なので出さない）。
  const perWeekday = new Map<number, number>();
  for (const c of classes) {
    perWeekday.set(c.weekday, (perWeekday.get(c.weekday) ?? 0) + 1);
  }

  return (
    <main className={entryCanvasClass}>
      <div className={entryBoxClass}>
        <div className={`${tricolorClass} mx-auto mb-5`} aria-hidden />

        <h1 className="text-[26px] font-black leading-[1.5] tracking-[.04em]">
          <small className="mb-1 block text-[13px] font-medium tracking-[.3em] text-sub">
            SELECT CLASS
          </small>
          通っているクラスを選んでください
        </h1>

        <p className="mt-3 text-[17px] text-sub">
          あとから他のクラスのページも自由に見られます
        </p>

        {classes.length === 0 ? (
          <p className="mt-6 rounded-20 border border-dashed border-line px-4 py-10 text-[17px] text-sub">
            いま表示できるクラスがありません。教室で先生におたずねください。
          </p>
        ) : (
          <form action={chooseClass} className="mt-6 grid grid-cols-2 gap-3">
            {classes.map((c) => (
              <button
                key={c.id}
                type="submit"
                name="class_id"
                value={c.id}
                style={accentStyle(c.themeColor)}
                className={classButtonClass}
              >
                {/* 左端 5px の縦バー（クラス色→濃色のグラデ） */}
                <span
                  className="absolute inset-y-0 left-0 w-[5px] bg-accent-bar"
                  aria-hidden
                />
                <span className="block text-[22px] font-black leading-tight tracking-[.03em] text-fg">
                  {WEEKDAY_LABELS[c.weekday]}曜日
                  {(perWeekday.get(c.weekday) ?? 0) >= 2 && (
                    <span className="ml-1 text-[14px] font-bold text-accent">
                      {periodLabel(c)}
                    </span>
                  )}
                </span>
                {c.startTime && c.endTime && (
                  <span className="mt-0.5 block text-[14px] tabular-nums text-sub">
                    {formatTimeRange(c.startTime, c.endTime)}
                  </span>
                )}
              </button>
            ))}
          </form>
        )}
      </div>
    </main>
  );
}

/** 開始時刻から午前/午後を判定する。start_time が無いコマでは何も出さない。 */
function periodLabel(cls: KirokuClass) {
  if (!cls.startTime) return null;
  return Number(cls.startTime.slice(0, 2)) < 12 ? "午前" : "午後";
}
