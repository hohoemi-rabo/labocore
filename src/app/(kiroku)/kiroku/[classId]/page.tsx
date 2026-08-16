import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accentStyle } from "@/lib/accent";
import { WEEKDAY_LABELS, formatTimeRange } from "@/lib/format";
import { findActiveClass, listActiveClasses } from "@/lib/kiroku/classes";
import { kirokuCanvasClass, tricolorSmClass } from "@/components/v2/styles";
import { forgetClass } from "../actions";

// K3 クラスページ。
// ⚠️ 中身はチケット20 で作る。ここは「合言葉 → クラスえらび → 自分のクラスへ直行」の
//    導線を19 単体で通すための暫定ページ。20 では本文だけを差し替え、
//    classId の検証・アクセント注入・フッターの選び直し導線はそのまま使える。

type Props = { params: Promise<{ classId: string }> };

async function loadClass(params: Props["params"]) {
  const { classId } = await params;
  return findActiveClass(await listActiveClasses(), classId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cls = await loadClass(params);
  return { title: cls?.name };
}

export default async function KirokuClassPage({ params }: Props) {
  const cls = await loadClass(params);
  // 存在しない・廃止済みのクラスはクラスえらびへ戻す。
  if (!cls) redirect("/kiroku/select");

  return (
    <main className={kirokuCanvasClass} style={accentStyle(cls.themeColor)}>
      <div className="mx-auto flex min-h-screen max-w-[680px] flex-col px-5 py-8">
        <div className={`${tricolorSmClass} mb-4`} aria-hidden />

        <h1 className="text-[23px] font-black tracking-[.02em]">{cls.name}</h1>
        <p className="mt-1 text-[15px] tabular-nums text-sub">
          {WEEKDAY_LABELS[cls.weekday]}曜日
          {cls.startTime && cls.endTime &&
            ` ${formatTimeRange(cls.startTime, cls.endTime)}`}
        </p>

        <p className="mt-8 rounded-20 border border-dashed border-line px-4 py-12 text-center text-[17px] text-sub">
          このページは準備中です。
          <br />
          もうすこしお待ちください。
        </p>

        <footer className="mt-auto flex flex-col items-center gap-3 pt-12 text-center">
          <div className={tricolorSmClass} aria-hidden />
          <form action={forgetClass}>
            <button
              type="submit"
              className="flex min-h-[44px] items-center px-4 text-[17px] font-bold text-sub underline underline-offset-4 transition active:scale-95"
            >
              クラスをえらびなおす
            </button>
          </form>
        </footer>
      </div>
    </main>
  );
}
