# LaboCore（ラボコア）

シニア向けパソコン・スマホ教室「ほほ笑みラボ」の教室運営システム。
フェーズ1では **出欠記録・月謝計算・生徒台帳** を扱う。利用者は管理者1名のみで、
スマホ（授業中のワンタップ記録）と PC の両方で使うレスポンシブアプリ。

- 機能要件・データモデル・画面構成は [`REQUIREMENTS.md`](./REQUIREMENTS.md)
- デザインシステムは [`DESIGN.md`](./DESIGN.md)
- 実装タスクは [`docs/`](./docs) の連番チケット（番号順が推奨実装順）

## 技術スタック

- Next.js 15（App Router）+ React 19 + TypeScript strict
- Tailwind CSS v3.4（デザイントークンは `tailwind.config.ts` に登録）
- Supabase（Auth / PostgreSQL / RLS）
- デプロイ: Vercel

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. 環境変数

プロジェクト直下に `.env.local` を作成し、Supabase プロジェクトの値を設定する
（`.env.local` は gitignore 済み）。値は Supabase Dashboard の Project Settings → API Keys で確認できる。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon (publishable) key>
```

### 3. 開発サーバー

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。未ログインの場合は `/login` にリダイレクトされる。

## 管理者ユーザーの作成

本アプリは **管理者1名のみ** が使う想定で、**新規登録画面は用意していない**（設計上の決定）。
初回はログインできる管理者ユーザーを Supabase Dashboard から1名だけ作成する。

1. Supabase Dashboard → 対象プロジェクト（`labocore`）→ **Authentication** → **Users**
2. **Add user** → **Create new user**
3. メールアドレスとパスワードを入力し、**Auto Confirm User**（メール確認をスキップ）を有効にして作成
4. 作成したメール+パスワードで `/login` からログインできる

パスワードを変更・リセットしたい場合も同 Dashboard の Users から行う。

## コマンド

- `npm run dev` — 開発サーバー（Turbopack）
- `npm run build` — 本番ビルド（Turbopack）
- `npm run lint` — ESLint
