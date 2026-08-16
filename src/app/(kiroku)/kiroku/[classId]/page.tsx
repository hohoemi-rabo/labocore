import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accentStyle } from "@/lib/accent";
import {
  formatDateWithWeekday,
  formatTimeRange,
  shiftMonth,
  todayJst,
} from "@/lib/format";
import { findActiveClass, listActiveClasses, type KirokuClass } from "@/lib/kiroku/classes";
import { buildMonthlySchedule, type ClosedDay } from "@/lib/kiroku/schedule";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  accentCardClass,
  eyebrowClass,
  eyebrowNewsClass,
  glassCardClass,
  kirokuCanvasClass,
  sectionTitleClass,
  tricolorSmClass,
} from "@/components/v2/styles";
import { KirokuHeader } from "./kiroku-header";
import { RecordCard, type KirokuRecord } from "./record-card";
import { forgetClass } from "../actions";

// K3 クラスページ（REQUIREMENTS_phase2 §7 / DESIGN_v2 §7）。
//
// レンダー時に todayJst() を読んでよいのは、(kiroku)/layout.tsx の force-dynamic で
// 必ず動的レンダリングになるため。**このルートに revalidate を足さないこと**
// （足すと期限切れのお知らせが生徒に出続ける）。

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ classId: string }> };

async function loadClass(params: Props["params"]) {
  const { classId } = await params;
  // 形が違う id は DB まで投げない。
  if (!UUID_RE.test(classId)) return undefined;
  return findActiveClass(await listActiveClasses(), classId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cls = await loadClass(params);
  return { title: cls?.name };
}

export default async function KirokuClassPage({ params }: Props) {
  const { classId } = await params;
  if (!UUID_RE.test(classId)) redirect("/kiroku/select");

  const today = todayJst();
  const month = today.slice(0, 7);
  const supabase = createAnonClient();

  // RLS が届く行を決める（lesson_records は published のみ・announcements は掲載期間内のみ）。
  // アプリ側でやるのは「このクラス向けか」の判定だけ。
  // ⚠️ redirect() は NEXT_REDIRECT を throw するので、この一帯を try/catch で囲まない。
  const [classes, recordsRes, newsRes, closedRes] = await Promise.all([
    listActiveClasses(),
    supabase
      .from("lesson_records")
      .select("id, lesson_date, theme, memo, prompt, image_urls")
      .eq("class_id", classId)
      .eq("status", "published")
      .order("lesson_date", { ascending: false }),
    supabase
      .from("announcements")
      .select("id, class_id, title, body, starts_on")
      // 同じ開始日で並びが揺れないよう created_at をタイブレークに使う。
      .order("starts_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("closed_days")
      .select("closed_date, reason")
      .gte("closed_date", `${month}-01`)
      .lt("closed_date", `${shiftMonth(month, 1)}-01`)
      .order("closed_date"),
  ]);

  const cls = findActiveClass(classes, classId);
  if (!cls) redirect("/kiroku/select");

  // 1本失敗しても他のセクションは出す（お知らせの失敗で記録一覧まで消さない）。
  if (recordsRes.error) console.error("[kiroku] 記録の取得に失敗:", recordsRes.error.message);
  if (newsRes.error) console.error("[kiroku] お知らせの取得に失敗:", newsRes.error.message);
  if (closedRes.error) console.error("[kiroku] 休講日の取得に失敗:", closedRes.error.message);

  const records: KirokuRecord[] = (recordsRes.data ?? []).map((r) => ({
    id: r.id,
    lessonDate: r.lesson_date,
    theme: r.theme,
    memo: r.memo,
    prompt: r.prompt,
    imageUrls: r.image_urls ?? [],
  }));

  // 全体向け（class_id が null）+ このクラス向け。掲載期間の絞り込みは RLS 側。
  const news = (newsRes.data ?? []).filter(
    (n) => n.class_id === null || n.class_id === cls.id,
  );

  const closed: ClosedDay[] = (closedRes.data ?? []).map((c) => ({
    date: c.closed_date,
    reason: c.reason,
  }));
  const schedule = buildMonthlySchedule(month, cls.weekday, closed);

  return (
    <div
      className={`${kirokuCanvasClass} flex flex-col`}
      style={accentStyle(cls.themeColor)}
    >
      <KirokuHeader classes={classes} currentId={cls.id} />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-16 pt-6">
        <div className="mb-5 flex items-center gap-3">
          <h1 className="text-[23px] font-black tracking-[.02em]">{cls.name}</h1>
          <div className={`${tricolorSmClass} flex-none`} aria-hidden />
        </div>

        {news.map((n) => (
          <section
            key={n.id}
            className="mb-4 rounded-20 border border-news-line bg-news-panel px-5 py-4 shadow-elev-1"
          >
            <p className={eyebrowNewsClass}>Information</p>
            <h2 className="mt-1 text-[18px] font-black">
              <span aria-hidden>📢 </span>
              {n.title}
            </h2>
            <p className="mt-1 whitespace-pre-wrap text-[17px] leading-jp text-news-body">
              {n.body}
            </p>
          </section>
        ))}

        <NextLessonCard cls={cls} today={today} />

        <section className={`${glassCardClass} mb-8 px-5 py-4`}>
          <h2 className="text-[17px] font-black">
            <span aria-hidden>📅 </span>
            {Number(month.slice(5, 7))}月のよてい
          </h2>
          <p className="mt-1 text-[17px] tabular-nums text-fg-body">
            {schedule.lessonDays.length > 0
              ? `授業日: ${schedule.lessonDays.map((d) => `${d}日`).join("・")}`
              : "今月の授業日はありません"}
          </p>
          {schedule.offDays.map((o) => (
            <p key={o.date} className="mt-1 text-[17px] font-bold text-off">
              お休み: {formatDateWithWeekday(o.date)}は
              {o.reason ? `${o.reason}のため` : ""}お休みです
            </p>
          ))}
        </section>

        <h2 className={sectionTitleClass}>これまでのじゅぎょう</h2>

        {records.length === 0 ? (
          <p className="rounded-20 border border-dashed border-line px-4 py-10 text-center text-[17px] text-sub">
            このクラスの記録は、これから増えていきます。お楽しみに！
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {records.map((r) => (
              <RecordCard key={r.id} record={r} />
            ))}
          </div>
        )}
      </main>

      <footer className="mx-auto w-full max-w-[680px] px-4 pb-12 pt-4 text-center">
        <div className={`${tricolorSmClass} mx-auto mb-3`} aria-hidden />
        <p className="text-[15px] leading-jp text-sub">
          ほほ笑みラボ ― このページは生徒さん向けです。
          <br />
          わからないことは、次の授業で気軽に聞いてください。
        </p>
        <form action={forgetClass} className="mt-3">
          <button
            type="submit"
            className="mx-auto flex min-h-[44px] items-center px-4 text-[17px] font-bold text-sub underline underline-offset-4 transition active:scale-95"
          >
            クラスをえらびなおす
          </button>
        </form>
      </footer>
    </div>
  );
}

/** 次回のじゅぎょう。未設定・過去日・テーマ空のいずれかなら何も出さない。 */
function NextLessonCard({ cls, today }: { cls: KirokuClass; today: string }) {
  const theme = cls.nextLessonTheme?.trim();
  // 日付は "YYYY-MM-DD" なので文字列比較でよい（Date にすると UTC 深夜になりJSTで9時間ずれる）。
  if (!cls.nextLessonDate || cls.nextLessonDate < today || !theme) return null;

  const note = cls.nextLessonNote?.trim();

  return (
    <section className={`${accentCardClass} mb-4 px-5 py-5`}>
      <p className={eyebrowClass}>Next Lesson / 次回の授業</p>
      <p className="mt-1 text-[19px] font-bold tabular-nums">
        {formatDateWithWeekday(cls.nextLessonDate)}
        {cls.startTime && cls.endTime && ` ${formatTimeRange(cls.startTime, cls.endTime)}`}
      </p>
      <p className="mt-1 text-[24px] font-black leading-[1.5]">{theme}</p>
      {note && (
        <p className="mt-1 whitespace-pre-wrap text-[17px] leading-jp text-sub">
          {note}
        </p>
      )}
    </section>
  );
}
