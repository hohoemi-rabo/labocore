import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[360px]">
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-ink">
          LaboCore
        </h1>
        <p className="mt-1 text-[14px] text-ink-muted-48">管理者ログイン</p>
        <LoginForm />
      </div>
    </main>
  );
}
