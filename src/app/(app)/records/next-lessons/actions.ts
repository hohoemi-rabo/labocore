"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors, nullIfEmpty } from "@/lib/form";
import { revalidateRecords } from "@/lib/revalidate";

// 「次回のじゅぎょう」はクラスごとに常に1件なので専用テーブルを持たず、
// classes の next_lesson_* 3列を更新する（REQUIREMENTS_phase2 §10.1）。
//
// FormData ではなく型付きペイロードで受ける。<form> 要素を使わないので
// （React 19 のフォーム自動リセットを避けるため・チケット16 参照）、
// FormData に詰め直す意味がない。
export type NextLessonInput = {
  classId: string;
  date: string;
  theme: string;
  note: string;
};

// 3項目すべて空 = 「未定」。日付だけ決まっていてテーマ未定、という状態は許す。
// 逆にテーマや持ち物だけあって日付がないと生徒向けに出しようがないので弾く。
const schema = z
  .object({
    classId: z.string().uuid(),
    // z.iso.date() は暦としての妥当性まで見る（正規表現だと 2026-13-45 が通ってしまい、
    // Postgres の 22008 が「保存に失敗しました」に化ける）。
    date: z.union([z.iso.date(), z.literal("")]),
    theme: z.string().trim(),
    note: z.string().trim(),
  })
  .refine((d) => d.date !== "" || (d.theme === "" && d.note === ""), {
    message: "テーマや持ち物を入れるときは日付も入れてください",
    // toFieldErrors は issue.path[0] を見るので、日付欄にエラーを出すためここで指定する。
    path: ["date"],
  });

export type NextLessonFormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
  /** 保存できた時刻。親がトーストを出す合図に使う */
  savedAt?: number;
};

export async function saveNextLesson(
  _prevState: NextLessonFormState,
  input: NextLessonInput,
): Promise<NextLessonFormState> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { classId, date, theme, note } = parsed.data;
  const { error } = await write(classId, {
    next_lesson_date: nullIfEmpty(date),
    next_lesson_theme: nullIfEmpty(theme),
    next_lesson_note: nullIfEmpty(note),
  });
  if (error) {
    return { formError: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  // redirect しない（同じ画面に留まって続けて他のクラスも編集できるように）。
  revalidateRecords();
  return { savedAt: Date.now() };
}

/**
 * 「未定に戻す」。3項目を null に戻すだけで検証の必要がないため、
 * 保存とは別のアクションにしてある（検証で弾かれうる経路に通さない）。
 */
export async function clearNextLesson(
  classId: string,
): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(classId).success) {
    return { error: "対象のコマが特定できませんでした。" };
  }

  const { error } = await write(classId, {
    next_lesson_date: null,
    next_lesson_theme: null,
    next_lesson_note: null,
  });
  if (error) {
    return { error: "更新に失敗しました。もう一度お試しください。" };
  }

  revalidateRecords();
  return {};
}

async function write(
  classId: string,
  values: {
    next_lesson_date: string | null;
    next_lesson_theme: string | null;
    next_lesson_note: string | null;
  },
) {
  const supabase = await createClient();
  return supabase.from("classes").update(values).eq("id", classId);
}
