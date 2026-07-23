import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Supabase にアクセスしない静的ファイルでは実行しない。
    // /api/keepalive は Vercel Cron が CRON_SECRET の Bearer で叩くため、
    // セッション認証（未認証は /login へリダイレクト）の対象から除外する。
    // ※ 他の API ルートは既定どおり保護されたままにする（個人情報を扱うため）
    "/((?!api/keepalive|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
