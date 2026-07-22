import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

// 認証必須ホーム（middleware で保護済み）。
// 本体の「今日の出欠」は ticket 09 で実装。ここは動作確認とログアウト動線のみ。
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas-parchment px-6">
      <div className="text-center">
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-ink">
          LaboCore
        </h1>
        <p className="mt-2 text-ink-muted-48">ログイン中: {user?.email}</p>
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="flex h-11 items-center justify-center rounded-pill border border-hairline bg-canvas px-6 text-[17px] font-semibold text-ink transition-transform active:scale-95"
        >
          ログアウト
        </button>
      </form>
    </main>
  );
}
