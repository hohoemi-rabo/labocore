import type { z } from "zod";

// Server Action で使うフォーム関連の共通ヘルパ。
// classes / closed-days / students / records の actions.ts で同じものを重複させないための単一の置き場。

/**
 * Zod の issues をフィールド別（最初の1件）に集約する。
 * `error.flatten()` はバージョン差異があるため path[0] で手動集約する。
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** 任意テキストは空文字を null に（DB では未入力を null で持つ）。 */
export const nullIfEmpty = (v: string | undefined | null) =>
  v && v.trim() !== "" ? v.trim() : null;
