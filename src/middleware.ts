import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { KIROKU_COOKIE, isKirokuUnlocked } from "@/lib/kiroku/gate";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 生徒向けの /kiroku 配下は Supabase Auth の対象外。合言葉 Cookie で判定する。
  // startsWith("/kiroku") 単独にしないこと（将来の /kirokuXX まで飲み込む）。
  if (pathname === "/kiroku" || pathname.startsWith("/kiroku/")) {
    return kirokuGate(request, pathname);
  }

  return await updateSession(request);
}

/**
 * 合言葉ゲート。/kiroku（合言葉画面）だけは Cookie なしで開けなければならない。
 * それ以外の /kiroku 配下は、Cookie がいまの KIROKU_PASSWORD と対応していなければ弾く。
 *
 * Server Action の POST もページ URL 宛に飛ぶのでここを通る。結果として
 * chooseClass / forgetClass は自動的にゲート内、enterKiroku はゲート外になる。
 *
 * なお /kiroku 配下では updateSession が走らないため、管理者がこのページに留まっている間は
 * Supabase セッションが更新されない。管理業務は別タブの管理画面で行うので実害はない。
 */
async function kirokuGate(request: NextRequest, pathname: string) {
  if (pathname === "/kiroku") return NextResponse.next();

  const cookie = request.cookies.get(KIROKU_COOKIE)?.value;
  if (await isKirokuUnlocked(cookie)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/kiroku";
  // ?_rsc= などを持ち越さない。元 URL へ戻す ?next= も持たせない
  // （生徒が受け取る URL は素の /kiroku だけで、オープンリダイレクトの面を増やす意味がない）。
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Supabase にアクセスしない静的ファイルでは実行しない。
    // /api/keepalive は Vercel Cron が CRON_SECRET の Bearer で叩くため、
    // セッション認証（未認証は /login へリダイレクト）の対象から除外する。
    // ※ 他の API ルートは既定どおり保護されたままにする（個人情報を扱うため）
    //
    // `webmanifest` はチケット21 で追加（PWA のマニフェスト用）。
    // マニフェストの取得は仕様上 Cookie を送らず、Next の metadata API では
    // crossOrigin も付けられないため、ゲートの内側に置くと未ログインの生徒が
    // 永久に取得できない。中身は名前・色・アイコンのパスだけなので外に出す。
    // ⚠️ この結果、**今後 `.webmanifest` で終わるルートは無認証になる**。
    // ⚠️ 前方一致の枝（api/keepalive 等）と、この `$` 終端の拡張子グループは別物。
    //    枝の構造は触らないこと（触ると keepalive の除外が壊れる）。
    "/((?!api/keepalive|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
