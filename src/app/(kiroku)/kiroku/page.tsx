import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  KIROKU_CLASS_COOKIE,
  KIROKU_COOKIE,
  isKirokuUnlocked,
} from "@/lib/kiroku/gate";
import { findActiveClass, listActiveClasses } from "@/lib/kiroku/classes";
import {
  entryBoxClass,
  entryCanvasClass,
  tricolorClass,
} from "@/components/v2/styles";
import { GateForm } from "./gate-form";

// K1 合言葉画面（DESIGN §7）。
// このページだけは middleware が Cookie なしでも通す。通過済みの人の行き先の判断も
// ここに集約する（合言葉の Server Action 側では計算しない）。
export default async function KirokuGatePage() {
  const cookieStore = await cookies();

  if (await isKirokuUnlocked(cookieStore.get(KIROKU_COOKIE)?.value)) {
    // 記憶しているクラスがあり、いまも開講中ならそのページへ直行する。
    // 記憶が無いときは DB を叩かない。
    const remembered = cookieStore.get(KIROKU_CLASS_COOKIE)?.value;
    if (remembered) {
      const target = findActiveClass(await listActiveClasses(), remembered);
      if (target) redirect(`/kiroku/${target.id}`);
    }
    redirect("/kiroku/select");
  }

  return (
    <main className={entryCanvasClass}>
      <div className={entryBoxClass}>
        <div className={`${tricolorClass} mx-auto mb-5`} aria-hidden />

        <h1 className="text-[26px] font-black leading-[1.5] tracking-[.04em]">
          <small className="mb-1 block text-[13px] font-medium tracking-[.3em] text-sub">
            HOHOEMI LAB
          </small>
          ほほ笑みラボ 授業の記録
        </h1>

        <p className="mt-3 text-[17px] text-sub">
          教室でお伝えした「あいことば」を入力してください
        </p>

        <GateForm />

        <p className="mt-5 text-[14px] text-sub">
          わからないときは、教室で先生に聞いてください。
        </p>
      </div>
    </main>
  );
}
