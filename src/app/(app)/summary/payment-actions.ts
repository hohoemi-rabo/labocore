"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 月次の支払い済みフラグ。楽観的更新から呼ぶため redirect せず結果を返す。
const schema = z.object({
  studentId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  isPaid: z.boolean(),
});

export type SetPaymentInput = z.input<typeof schema>;

export async function setPayment(
  input: SetPaymentInput,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: "入力が不正です。" };
  }
  const { studentId, month, isPaid } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("payments").upsert(
    {
      student_id: studentId,
      target_month: month,
      is_paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null,
    },
    { onConflict: "student_id,target_month" },
  );
  if (error) {
    return { error: "支払い状態の更新に失敗しました。" };
  }

  revalidatePath("/summary");
  return {};
}
