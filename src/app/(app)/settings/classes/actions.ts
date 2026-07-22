"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const classSchema = z
  .object({
    name: z.string().trim().min(1, "コマ名を入力してください"),
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "開始時間を入力してください"),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "終了時間を入力してください"),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "終了時間は開始時間より後にしてください",
    path: ["end_time"],
  });

export type ClassFormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
};

// Zod の issues をフィールド別（最初の1件）に集約する。
// error.flatten() のバージョン差異を避けるため path[0] で手動集約する。
function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function parseForm(formData: FormData) {
  return classSchema.safeParse({
    name: formData.get("name"),
    weekday: formData.get("weekday"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
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

  revalidatePath("/settings/classes");
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

  revalidatePath("/settings/classes");
  redirect("/settings/classes");
}

// 廃止 = 論理削除。過去の出欠・請求履歴は保持する。
export async function deactivateClass(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("classes").update({ is_active: false }).eq("id", id);

  revalidatePath("/settings/classes");
  redirect("/settings/classes");
}
