"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const closedDaySchema = z.object({
  closed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください"),
  reason: z.string().optional(),
});

export type ClosedDayFormState = {
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

// 任意テキストは空文字を null に（DB では未入力を null で持つ）。
const nullIfEmpty = (v: string | undefined) =>
  v && v.trim() !== "" ? v.trim() : null;

// 休講日は登録・削除のみ（編集なし）。変更後はホーム(/)・カレンダー(/calendar)も再検証する。
function revalidateAll() {
  revalidatePath("/settings/closed-days");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function createClosedDay(
  _prevState: ClosedDayFormState,
  formData: FormData,
): Promise<ClosedDayFormState> {
  const parsed = closedDaySchema.safeParse({
    closed_date: formData.get("closed_date"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("closed_days").insert({
    closed_date: parsed.data.closed_date,
    reason: nullIfEmpty(parsed.data.reason),
  });
  if (error) {
    // closed_date UNIQUE 制約違反（23505）は「既に登録済み」として表示する。
    if (error.code === "23505") {
      return { fieldErrors: { closed_date: "この日付は既に登録済みです" } };
    }
    return { formError: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidateAll();
  redirect("/settings/closed-days");
}

// 休講日の削除は物理削除でよい（過去データ保持の対象外）。
export async function deleteClosedDay(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("closed_days").delete().eq("id", id);

  revalidateAll();
  redirect("/settings/closed-days");
}
