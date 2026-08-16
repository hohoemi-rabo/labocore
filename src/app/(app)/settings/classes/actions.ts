"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/form";
import { CLASS_THEME_COLORS } from "@/lib/accent";
import { revalidateClasses } from "@/lib/revalidate";

const classSchema = z
  .object({
    name: z.string().trim().min(1, "コマ名を入力してください"),
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "開始時間を入力してください"),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "終了時間を入力してください"),
    // 生徒向け画面の差し色（DESIGN_v2 §3）。CSS 変数へ注入される値なので形を検証する。
    // DB の CHECK は大文字も通すが、CLASS_THEME_COLORS との照合は大小文字を区別するため
    // ここで小文字に正規化しておく。
    theme_color: z
      .string({ error: "テーマカラーを選んでください" })
      // DB の CHECK は大文字も通すが、パレットとの照合は大小文字を区別するので先に揃える。
      .transform((v) => v.toLowerCase())
      .pipe(
        z.enum(
          CLASS_THEME_COLORS.map((c) => c.value) as [string, ...string[]],
          { error: "テーマカラーを選んでください" },
        ),
      ),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "終了時間は開始時間より後にしてください",
    path: ["end_time"],
  });

export type ClassFormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
};

function parseForm(formData: FormData) {
  return classSchema.safeParse({
    name: formData.get("name"),
    weekday: formData.get("weekday"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    theme_color: formData.get("theme_color"),
  });
}

export async function createClass(
  _prevState: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert(parsed.data);
  if (error) {
    return { formError: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidateClasses();
  redirect("/settings/classes");
}

export async function updateClass(
  _prevState: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { formError: "対象のコマが特定できませんでした。" };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    return { formError: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  // テーマカラーが変わると生徒向けページの差し色が変わる。
  revalidateClasses();
  redirect("/settings/classes");
}

// 廃止 = 論理削除。過去の出欠・請求履歴は保持する。
export async function deactivateClass(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("classes").update({ is_active: false }).eq("id", id);

  // 廃止したコマは生徒向けのクラスタブ・クラスえらびからも消える必要がある。
  revalidateClasses();
  redirect("/settings/classes");
}
