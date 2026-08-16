"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  KIROKU_CLASS_COOKIE,
  KIROKU_COOKIE,
  kirokuCookieOptions,
  kirokuToken,
  matchesKirokuPassword,
} from "@/lib/kiroku/gate";
import { findActiveClass, listActiveClasses } from "@/lib/kiroku/classes";

export type GateState = { formError?: string };

const WRONG_PASSWORD = "あいことばが違うようです。もう一度お試しください。";
// env 未設定は運用ミス。打ち間違いと同じ文言にすると原因にたどり着けないので分ける。
const NOT_CONFIGURED = "いま合言葉を確認できません。教室におたずねください。";

const passwordSchema = z.object({
  // formData.get は File を返しうるので、型の担保も兼ねて Zod を通す。
  password: z.string().trim().min(1, "あいことばを入力してください"),
});

const classIdSchema = z.string().uuid();

/**
 * K1 合言葉の照合。回数制限は設けない（REQUIREMENTS_phase2 §7）。
 *
 * 成功しても行き先は計算せず /kiroku へ戻すだけにしている。
 * 「誰をどこへ送るか」の判断は /kiroku/page.tsx が単独で持つ（二重管理にしない）。
 */
export async function enterKiroku(
  _prevState: GateState,
  formData: FormData,
): Promise<GateState> {
  const parsed = passwordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { formError: parsed.error.issues[0]?.message ?? WRONG_PASSWORD };
  }

  const token = await kirokuToken();
  if (token === null) {
    console.error("[kiroku] KIROKU_PASSWORD が未設定です");
    return { formError: NOT_CONFIGURED };
  }

  if (!matchesKirokuPassword(parsed.data.password)) {
    return { formError: WRONG_PASSWORD };
  }

  const cookieStore = await cookies();
  cookieStore.set(KIROKU_COOKIE, token, kirokuCookieOptions);

  redirect("/kiroku");
}

/**
 * K2 クラスえらび。押されたボタンの name="class_id" が FormData に入る。
 * 記憶した先のクラスページへ送る。
 */
export async function chooseClass(formData: FormData) {
  const parsed = classIdSchema.safeParse(formData.get("class_id"));
  // 偽装された id を Cookie に残さないよう、実在する active クラスかまで確認する。
  const classes = parsed.success ? await listActiveClasses() : [];
  const target = parsed.success
    ? findActiveClass(classes, parsed.data)
    : undefined;

  if (!target) {
    redirect("/kiroku/select");
  }

  const cookieStore = await cookies();
  cookieStore.set(KIROKU_CLASS_COOKIE, target.id, kirokuCookieOptions);

  redirect(`/kiroku/${target.id}`);
}

/** クラスページのフッター「クラスをえらびなおす」。記憶だけ消す（合言葉は保持）。 */
export async function forgetClass() {
  const cookieStore = await cookies();
  // ⚠️ delete() は path=/ で消しにいくため path=/kiroku の Cookie には効かない。
  // set と同じ属性で maxAge: 0 を書くこと。
  cookieStore.set(KIROKU_CLASS_COOKIE, "", {
    ...kirokuCookieOptions,
    maxAge: 0,
  });

  redirect("/kiroku/select");
}
