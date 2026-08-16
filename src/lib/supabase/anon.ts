import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// cookie を持たない文脈で使う anon クライアント。
//
// 用途は2つ:
//   1. keepalive cron（`src/app/api/keepalive/route.ts`）— Vercel Cron 実行はセッションを持たない
//   2. 生徒向けページ（`/kiroku` 配下）— Supabase Auth ではなく合言葉 Cookie で守るため、
//      ログインユーザーが存在しない。届く行は RLS の anon ポリシーが決める
//      （classes は is_active / lesson_records は published / announcements は掲載期間内）
//
// `@/lib/supabase/server.ts` は cookie ストア前提なのでここでは使えない。
// persistSession: false — サーバー側にセッションを持ち回る必要がなく、持つと余計な状態になる。
export function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
