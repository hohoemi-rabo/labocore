import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Supabase 無料プランは一定期間 DB アクティビティがないとプロジェクトが一時停止される。
// Vercel Cron から1日1回ここを叩き、実際に Postgres へ軽量クエリを投げてアクティビティを作る。
// （200 を返すだけのエンドポイントでは「DB の活動」にならずスリープ防止にならない）
export const dynamic = "force-dynamic";

// 常に存在するマスタ系の小さなテーブルを使う。
const KEEPALIVE_TABLE = "classes";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // 未設定のまま `Bearer undefined` と比較すると誰でも通ってしまうため明示的に落とす。
  if (!secret) {
    console.error("[keepalive] CRON_SECRET が未設定です");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Vercel Cron が自動付与する Authorization: Bearer ${CRON_SECRET} を検証する。
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // セッションを持たない cron 実行なので、cookie ベースの server client ではなく
  // 素の anon クライアントを使う（@/lib/supabase/server.ts は cookie 前提のため不適）。
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  // head:true + count:'exact' は行本体を転送しない最小のクエリ。
  // RLS が authenticated 限定のため anon では件数が 0 になるが、
  // クエリ自体は Postgres に到達するのでアクティビティとしては有効（ここが目的）。
  const { error } = await supabase
    .from(KEEPALIVE_TABLE)
    .select("id", { head: true, count: "exact" });

  if (error) {
    console.error("[keepalive] Supabase クエリに失敗しました:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
