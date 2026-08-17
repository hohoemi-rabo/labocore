"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors, nullIfEmpty } from "@/lib/form";
import {
  GeminiDraftError,
  MAX_NOTE_LENGTH,
  generateRecordDraft,
} from "@/lib/gemini";
import { processImage } from "@/lib/image";
import { deleteImage, uploadImage } from "@/lib/r2";
import { MAX_PHOTOS } from "@/lib/records";
import { revalidateRecords } from "@/lib/revalidate";

const recordSchema = z.object({
  class_id: z.string().uuid("クラスを選んでください"),
  lesson_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください"),
  theme: z.string().trim().min(1, "テーマを入力してください"),
  memo: z.string().trim().min(1, "ひとことメモを入力してください"),
  prompt: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

export type RecordFormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
};

const SAVE_FAILED = "保存に失敗しました。時間をおいて再度お試しください。";
const DUPLICATE = "このクラスのこの日付には既に記録があります";
const TOO_MANY_PHOTOS = `写真は${MAX_PHOTOS}枚までです`;

function parseForm(formData: FormData) {
  return recordSchema.safeParse({
    class_id: formData.get("class_id"),
    lesson_date: formData.get("lesson_date"),
    theme: formData.get("theme"),
    memo: formData.get("memo"),
    prompt: formData.get("prompt"),
    status: formData.get("status"),
  });
}

// 添付された写真を縮小 + WebP 化して R2 へ置き、公開 URL の配列を返す。
// ブラウザ側でも縮小済み（src/lib/image-client.ts）だが、掲載サイズへの仕上げはサーバーで行う。
async function uploadPhotos(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()));
    urls.push(await uploadImage(processed));
  }
  return urls;
}

function photoFilesFrom(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);
}

// DB 書き込みに失敗したら、直前にアップロードした分を捨てる（孤児を残さない）。
// deleteImage 自体がベストエフォートなので、ここで失敗しても呼び出し元には影響しない。
async function rollbackUploads(urls: string[]) {
  await Promise.all(urls.map((url) => deleteImage(url)));
}

export async function createRecord(
  _prevState: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const files = photoFilesFrom(formData);
  if (files.length > MAX_PHOTOS) {
    return { formError: TOO_MANY_PHOTOS };
  }

  const supabase = await createClient();

  // 重複は UNIQUE 制約でも弾けるが、先に見ておく。
  // そうしないと写真を数秒かけてアップロードした後に「既にあります」と言うことになる。
  const { data: existing } = await supabase
    .from("lesson_records")
    .select("id")
    .eq("class_id", parsed.data.class_id)
    .eq("lesson_date", parsed.data.lesson_date)
    .maybeSingle();
  if (existing) {
    return { fieldErrors: { lesson_date: DUPLICATE } };
  }

  let uploaded: string[] = [];
  try {
    uploaded = await uploadPhotos(files);
  } catch (error) {
    console.error("[records] 写真の保存に失敗しました:", error);
    await rollbackUploads(uploaded);
    return {
      formError:
        error instanceof Error ? error.message : "写真の保存に失敗しました。",
    };
  }

  const { error } = await supabase.from("lesson_records").insert({
    ...parsed.data,
    prompt: nullIfEmpty(parsed.data.prompt),
    image_urls: uploaded,
  });
  if (error) {
    await rollbackUploads(uploaded);
    if (error.code === "23505") {
      return { fieldErrors: { lesson_date: DUPLICATE } };
    }
    if (error.code === "23514") {
      return { formError: TOO_MANY_PHOTOS };
    }
    return { formError: SAVE_FAILED };
  }

  // redirect は NEXT_REDIRECT を throw するので try/catch の外で呼ぶ。
  revalidateRecords();
  redirect("/records");
}

export async function updateRecord(
  _prevState: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { formError: "対象の記録が特定できませんでした。" };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("lesson_records")
    .select("image_urls")
    .eq("id", id)
    .single();
  if (fetchError || !current) {
    return { formError: "対象の記録が見つかりませんでした。" };
  }

  // フォームから送られてきた「残す写真」は信用せず、現在 DB にある URL に含まれるものだけを採る。
  // でないと細工したフォームから任意の URL を image_urls に書き込め、生徒向けページに表示されてしまう。
  const submitted = formData.getAll("existing_image_urls").map(String);
  const kept = submitted.filter((url) => current.image_urls.includes(url));
  const files = photoFilesFrom(formData);

  if (kept.length + files.length > MAX_PHOTOS) {
    return { formError: TOO_MANY_PHOTOS };
  }

  let uploaded: string[] = [];
  try {
    uploaded = await uploadPhotos(files);
  } catch (error) {
    console.error("[records] 写真の保存に失敗しました:", error);
    await rollbackUploads(uploaded);
    return {
      formError:
        error instanceof Error ? error.message : "写真の保存に失敗しました。",
    };
  }

  const { error } = await supabase
    .from("lesson_records")
    .update({
      ...parsed.data,
      prompt: nullIfEmpty(parsed.data.prompt),
      image_urls: [...kept, ...uploaded],
      // DB にトリガはないので更新時刻はアプリ側で入れる。
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    await rollbackUploads(uploaded);
    if (error.code === "23505") {
      return { fieldErrors: { lesson_date: DUPLICATE } };
    }
    if (error.code === "23514") {
      return { formError: TOO_MANY_PHOTOS };
    }
    return { formError: SAVE_FAILED };
  }

  // 更新が確定してから、外された写真の実体を消す（先に消すと失敗時に取り返せない）。
  const removed = current.image_urls.filter((url) => !kept.includes(url));
  await deleteUnreferenced(removed, id);

  revalidateRecords();
  redirect("/records");
}

// 記録は物理削除する（出欠・生徒と違い履歴を残す必要がない）。
export async function deleteRecord(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  // 行を消す前に URL を控える。消した後では取得できない。
  const { data: target } = await supabase
    .from("lesson_records")
    .select("image_urls")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("lesson_records").delete().eq("id", id);
  if (error) {
    console.error("[records] 記録の削除に失敗しました:", error);
    return;
  }

  if (target) await deleteUnreferenced(target.image_urls, id);

  revalidateRecords();
  redirect("/records");
}

// 一覧からの下書き↔公開の切り替え。楽観的更新から呼ぶので redirect せず結果を返す。
const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "published"]),
});

export async function setRecordStatus(
  input: z.input<typeof statusSchema>,
): Promise<{ error?: string }> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "入力が不正です。" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_records")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) {
    return { error: "状態の更新に失敗しました。" };
  }

  // 公開状態が変わると anon から見えるかどうかが変わるので、生徒向けも再検証する。
  revalidateRecords();
  return {};
}

// ── AI 下書き（チケット22）─────────────────────────────────
// 走り書きメモ + 写真から「テーマ」「ひとことメモ」の下書きを作る。
// **DB は一切書き換えない**（フォームに反映するだけ・公開は人の操作）。
// 失敗しても手入力での作成・公開が妨げられないよう、redirect せず結果を返す。

const draftSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "走り書きメモを入力してください")
    .max(MAX_NOTE_LENGTH, "走り書きメモが長すぎます"),
});

export type DraftResult = { theme?: string; memo?: string; error?: string };

export async function generateDraft(formData: FormData): Promise<DraftResult> {
  const supabase = await createClient();

  // このアクションは DB を書かないので RLS の後ろ盾が無く、middleware だけが唯一のゲートになる。
  // 外部 API（無料枠）を叩くため、ここでも認証を確かめておく。
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return { error: "ログインが切れています。読み込み直してください。" };
  }

  const parsed = draftSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力が不正です。" };
  }

  const images = await collectDraftImages(formData, supabase);

  try {
    const draft = await generateRecordDraft({ note: parsed.data.note, images });
    return draft;
  } catch (error) {
    if (error instanceof GeminiDraftError) {
      return { error: error.message };
    }
    console.error("[records] AI 下書きの生成に失敗しました:", error);
    return { error: "AI の下書きを作れませんでした。もう一度お試しください。" };
  }
}

/**
 * AI へ送る画像を集める（最大 MAX_PHOTOS 枚）。
 *
 * 保存済みの写真は**フォームの URL をそのまま取りに行かない**。細工したフォームで
 * 任意の URL を取得させられるため、`updateRecord` と同じく「DB にある URL との積集合」を採る。
 * 写真は任意なので、取得に失敗した1枚は落として続行する（メモだけでも下書きは作れる）。
 */
async function collectDraftImages(
  formData: FormData,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Buffer[]> {
  const images: Buffer[] = [];

  const recordId = String(formData.get("id") ?? "");
  const submitted = formData.getAll("existing_image_urls").map(String);
  if (recordId && submitted.length > 0) {
    const { data: current } = await supabase
      .from("lesson_records")
      .select("image_urls")
      .eq("id", recordId)
      .maybeSingle();

    for (const url of submitted.filter((u) =>
      current?.image_urls.includes(u),
    )) {
      const buffer = await fetchImage(url);
      if (buffer) images.push(buffer);
    }
  }

  for (const file of photoFilesFrom(formData)) {
    images.push(Buffer.from(await file.arrayBuffer()));
  }

  return images.slice(0, MAX_PHOTOS);
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    // タイムアウトを必ず付ける。R2 が応答しないと生成そのものが道連れになるため。
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error("[records] 保存済み写真を取得できませんでした:", url, error);
    return null;
  }
}

/**
 * R2 の画像を削除する。ただし**他の記録カードが同じ URL を参照していれば残す**。
 * copyImage はオブジェクトごと複製するので通常は共有されないが、念のための保険
 * （チケット23 以前に作られた行が URL を共有している可能性がある）。
 */
async function deleteUnreferenced(urls: string[], excludeRecordId: string) {
  if (urls.length === 0) return;

  const supabase = await createClient();
  const { data: others } = await supabase
    .from("lesson_records")
    .select("image_urls")
    .overlaps("image_urls", urls)
    .neq("id", excludeRecordId);

  const stillUsed = new Set((others ?? []).flatMap((r) => r.image_urls));
  await Promise.all(
    urls.filter((url) => !stillUsed.has(url)).map((url) => deleteImage(url)),
  );
}
