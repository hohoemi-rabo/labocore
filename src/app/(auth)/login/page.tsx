import {
  entryBoxClass,
  entryCanvasClass,
  tricolorClass,
} from "@/components/v2/styles";
import { LoginForm } from "./login-form";

// 管理者ログイン（24 で v2 の入口ボックス文法へ刷新）。
// 生徒向けの合言葉画面（/kiroku）と同じ構成: トリコロール → 英語 small → 見出し → lead。
export default function LoginPage() {
  return (
    <main className={entryCanvasClass}>
      <div className={entryBoxClass}>
        <div className={`${tricolorClass} mx-auto mb-5`} aria-hidden />

        <h1 className="text-[26px] font-black leading-[1.5] tracking-[.04em]">
          <small className="mb-1 block text-[13px] font-medium tracking-[.3em] text-sub">
            LABOCORE
          </small>
          教室運営システム
        </h1>

        <p className="mt-3 text-[17px] text-sub">
          管理者アカウントでログインしてください
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
