"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const studentSchema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください"),
  kana: z.string().trim().min(1, "ふりがなを入力してください"),
  class_id: z.string().uuid("所属コマを選択してください"),
  unit_price: z.coerce.number().int().min(0, "単価は0以上で入力してください"),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z
    .union([z.literal(""), z.email("メールアドレスの形式が正しくありません")])
    .optional(),
  birth_date: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional(),
  smartphone_os: z.union([z.literal(""), z.enum(["android", "iphone"])]).optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  note: z.string().optional(),
});

export type StudentFormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
};

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

function parseForm(formData: FormData) {
  return studentSchema.safeParse({
    name: formData.get("name"),
    kana: formData.get("kana"),
    class_id: formData.get("class_id"),
    unit_price: formData.get("unit_price"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    email: formData.get("email"),
    birth_date: formData.get("birth_date"),
    smartphone_os: formData.get("smartphone_os"),
    emergency_contact_name: formData.get("emergency_contact_name"),
    emergency_contact_relation: formData.get("emergency_contact_relation"),
    emergency_contact_phone: formData.get("emergency_contact_phone"),
    note: formData.get("note"),
  });
}

function toPayload(data: z.infer<typeof studentSchema>) {
  return {
    name: data.name,
    kana: data.kana,
    class_id: data.class_id,
    unit_price: data.unit_price,
    phone: nullIfEmpty(data.phone),
    email: nullIfEmpty(data.email),
    address: nullIfEmpty(data.address),
    birth_date: nullIfEmpty(data.birth_date),
    smartphone_os: nullIfEmpty(data.smartphone_os),
    emergency_contact_name: nullIfEmpty(data.emergency_contact_name),
    emergency_contact_relation: nullIfEmpty(data.emergency_contact_relation),
    emergency_contact_phone: nullIfEmpty(data.emergency_contact_phone),
    note: nullIfEmpty(data.note),
  };
}

export async function createStudent(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("students").insert(toPayload(parsed.data));
  if (error) {
    return { formError: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath("/settings/students");
  redirect("/settings/students");
}

export async function updateStudent(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { formError: "対象の生徒が特定できませんでした。" };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  // students 行のみ更新する。単価を変えても過去の attendance_records は触らない
  // （単価スナップショット方式のため、過去の請求額は不変）。
  const { error } = await supabase
    .from("students")
    .update(toPayload(parsed.data))
    .eq("id", id);
  if (error) {
    return { formError: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath("/settings/students");
  redirect("/settings/students");
}

// 退会 = 論理削除。過去の出欠・請求履歴は保持する。
export async function deactivateStudent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("students").update({ is_active: false }).eq("id", id);

  revalidatePath("/settings/students");
  redirect("/settings/students");
}
