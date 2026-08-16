"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors, nullIfEmpty } from "@/lib/form";
import { revalidateRecords } from "@/lib/revalidate";

// 教室からのお知らせ（REQUIREMENTS_phase2 §8.3）。
// class_id が null なら全体向け。掲載期間を過ぎたものは RLS が anon から自動的に隠すので、
// 管理者は消さなくてよい（消し忘れが事故にならない）。
// z.iso.date() は暦としての妥当性まで見る（正規表現だと 2026-13-45 や 2026-02-30 が通り、
// Postgres の 22008 が「保存に失敗しました」に化ける）。既定メッセージが英語なので必ず指定する。
const startDate = z.iso.date("掲載開始日を入力してください");
const endDate = z.iso.date("掲載終了日を入力してください");
const isValidDate = (v: unknown) => startDate.safeParse(v).success;

const schema = z
  .object({
    title: z.string().trim().min(1, "タイトルを入力してください"),
    body: z.string().trim().min(1, "本文を入力してください"),
    // 空文字 = 全体向け
    class_id: z.union([z.string().uuid(), z.literal("")]),
    starts_on: startDate,
    ends_on: endDate,
  })
  // オブジェクト単位の refine は、フィールド単位の検証が落ちても実行される。
  // 素の比較だと starts_on が不正なとき（例 "2026-13-45"）に辞書順比較が成立してしまい、
  // 正しく入力できている終了日の側に誤ったエラーが出る。両方が妥当なときだけ比較する。
  .refine(
    (d) =>
      !isValidDate(d.starts_on) ||
      !isValidDate(d.ends_on) ||
      d.ends_on >= d.starts_on,
    {
      message: "掲載終了日は開始日以降にしてください",
      // toFieldErrors は issue.path[0] を見るので、終了日欄に出すためここで指定する。
      path: ["ends_on"],
    },
  );

export type AnnouncementFormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
};

const SAVE_FAILED = "保存に失敗しました。時間をおいて再度お試しください。";
const BAD_PERIOD = "掲載終了日は開始日以降にしてください";

function parseForm(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    class_id: formData.get("class_id"),
    starts_on: formData.get("starts_on"),
    ends_on: formData.get("ends_on"),
  });
}

function toRow(data: z.infer<typeof schema>) {
  return {
    title: data.title,
    body: data.body,
    class_id: nullIfEmpty(data.class_id),
    starts_on: data.starts_on,
    ends_on: data.ends_on,
  };
}

export async function createAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert(toRow(parsed.data));
  if (error) {
    // Zod で先に弾いているが、DB の CHECK 違反も同じ文言に寄せておく。
    if (error.code === "23514") {
      return { fieldErrors: { ends_on: BAD_PERIOD } };
    }
    return { formError: SAVE_FAILED };
  }

  revalidateRecords();
  redirect("/records/announcements");
}

export async function updateAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { formError: "対象のお知らせが特定できませんでした。" };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update(toRow(parsed.data))
    .eq("id", id);
  if (error) {
    if (error.code === "23514") {
      return { fieldErrors: { ends_on: BAD_PERIOD } };
    }
    return { formError: SAVE_FAILED };
  }

  revalidateRecords();
  redirect("/records/announcements");
}

// お知らせは物理削除でよい（履歴として残す必要がない）。
export async function deleteAnnouncement(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    console.error("[announcements] 削除に失敗しました:", error);
    return;
  }

  revalidateRecords();
  redirect("/records/announcements");
}
