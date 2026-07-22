# 02. Supabase セットアップ・DBスキーマ

**依存**: なし（01 と並行可）
**参照**: REQUIREMENTS.md §5・§8 / CLAUDE.md「ドメイン上の不変条件」

## 目的

Supabase プロジェクトに5テーブルのスキーマと RLS を構築し、Next.js から型付きで接続できる状態にする。

## Todo

- [ ] Supabase プロジェクトを用意する（Supabase MCP 使用可。どのプロジェクト/組織を使うかはユーザーに確認する）
- [ ] マイグレーションで5テーブルを作成する: `classes` / `students` / `attendance_records` / `closed_days` / `payments`（カラム定義は REQUIREMENTS.md §5 のとおり）
- [ ] 制約を張る: `attendance_records UNIQUE(student_id, lesson_date)`、`closed_days.closed_date UNIQUE`、`payments UNIQUE(student_id, target_month)`、各 FK、`status` の CHECK（'present' | 'absent'）、`smartphone_os` の CHECK（'android' | 'iphone' | NULL）
- [ ] 全テーブルで RLS を有効化し、「authenticated ロールのみ全操作可」のポリシーを作成する。anon キーからのアクセスが遮断されることを確認する
- [ ] `@supabase/supabase-js` と `@supabase/ssr` をインストールする
- [ ] `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定する（`.env*` が gitignore されていることを確認）
- [ ] Supabase クライアント util を作成する: `src/lib/supabase/server.ts`（Server Components / Server Actions 用・cookies ベース）と `src/lib/supabase/client.ts`（Client Components 用）
- [ ] TypeScript 型を生成して `src/lib/supabase/database.types.ts` に保存し、クライアントに適用する（MCP の generate_typescript_types 使用可）
- [ ] Supabase advisors（security）で RLS 漏れ等の警告がないことを確認する

## 完了条件

- 5テーブルが RLS 有効で存在し、型付き Supabase クライアントがサーバー/クライアント両方から使える
