import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { accentStyle } from "@/lib/accent";
import { formatDateJa, todayJst } from "@/lib/format";
import { sectionTitleClass, skyButtonClass, v2CanvasClass } from "@/components/v2/styles";

type Row = {
  id: string;
  title: string;
  body: string;
  starts_on: string;
  ends_on: string;
  className: string | null;
  themeColor: string | null;
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const [{ data: announcements }, { data: classes }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, class_id, starts_on, ends_on")
      .order("starts_on", { ascending: false }),
    supabase.from("classes").select("id, name, theme_color"),
  ]);

  const classById = new Map((classes ?? []).map((c) => [c.id, c]));
  const today = todayJst();

  const rows: Row[] = (announcements ?? []).map((a) => {
    const cls = a.class_id ? classById.get(a.class_id) : undefined;
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      starts_on: a.starts_on,
      ends_on: a.ends_on,
      className: cls?.name ?? null,
      themeColor: cls?.theme_color ?? null,
    };
  });

  // 判定は anon の RLS ポリシーと同じ「JST の今日・両端を含む」で揃える。
  // ずれると管理画面には「掲載中」と出ているのに生徒に見えない、という食い違いが起きる。
  // 日付はすべて "YYYY-MM-DD" なので文字列比較でよい（Date に変換すると
  // new Date("2026-08-16") が UTC 深夜になり、JST の朝9時までずれる）。
  const live = rows.filter((r) => r.starts_on <= today && today <= r.ends_on);
  const upcoming = rows
    .filter((r) => r.starts_on > today)
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on)); // 近い順
  const expired = rows
    .filter((r) => r.ends_on < today)
    .sort((a, b) => b.ends_on.localeCompare(a.ends_on)); // 終わったばかりの順

  return (
    <div className={v2CanvasClass}>
      <div className="mx-auto max-w-[680px]">
        <Link href="/records" className="text-[15px] text-sub">
          ‹ 授業の記録
        </Link>

        <h1 className={`${sectionTitleClass} mt-4`}>お知らせ</h1>

        <div className="mb-8">
          <Link href="/records/announcements/new" className={skyButtonClass}>
            ＋ 新しく書く
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-20 border border-dashed border-line px-4 py-10 text-center text-[17px] text-sub">
            まだお知らせがありません。「新しく書く」から作成してください。
          </p>
        ) : (
          // 通常は全部で 0〜2 件なので、空のセクションまで並べるとかえって読みにくい。
          <div className="flex flex-col gap-8">
            <Section
              title="掲載中"
              note="いま生徒に表示されています"
              rows={live}
            />
            <Section
              title="掲載予定"
              note="開始日になると自動で表示されます"
              rows={upcoming}
            />
            <Section
              title="期限切れ"
              note="生徒には表示されていません。消さずに残しておけます"
              rows={expired}
              muted
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  note,
  rows,
  muted,
}: {
  title: string;
  note: string;
  rows: Row[];
  /** 期限切れ用。opacity で薄くはせず、面と文字色を落として区別する */
  muted?: boolean;
}) {
  // 空のセクションは出さない（見出しだけが並ぶのを避ける）。
  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="text-[19px] font-black text-fg">
        {title}
        <span className="ml-2 text-[15px] font-normal text-sub">（{note}）</span>
      </h2>

      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className={
              muted
                ? "rounded-20 border border-line bg-surface px-4 py-4"
                : "rounded-20 border border-line bg-card px-4 py-4 shadow-elev-2"
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              {r.themeColor ? (
                <>
                  <span
                    aria-hidden
                    style={accentStyle(r.themeColor)}
                    className="h-3 w-3 flex-none rounded-pill bg-accent"
                  />
                  <span className="text-[15px] text-sub">{r.className}</span>
                </>
              ) : (
                <span className="text-[15px] text-sub">全体向け</span>
              )}
              <span className="text-[15px] tabular-nums text-sub">
                {formatDateJa(r.starts_on)} 〜 {formatDateJa(r.ends_on)}
              </span>
            </div>

            <p
              className={`mt-1 text-[19px] font-black ${muted ? "text-sub" : "text-fg"}`}
            >
              {r.title}
            </p>
            <p
              className={`mt-1 line-clamp-2 text-[17px] leading-jp ${
                muted ? "text-sub" : "text-fg-body"
              }`}
            >
              {r.body}
            </p>

            <Link
              href={`/records/announcements/${r.id}/edit`}
              className="mt-3 inline-flex min-h-[44px] items-center text-[15px] font-bold text-accent"
            >
              編集する ›
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
