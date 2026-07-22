# LaboCore（ラボコア）

シニア向けパソコン・スマホ教室「ほほ笑みラボ」の教室運営システム。
フェーズ1では **出欠記録・月謝計算・生徒台帳** を扱う。利用者は管理者1名のみで、
スマホ（授業中のワンタップ記録）と PC の両方で使うレスポンシブアプリ。

- 機能要件・データモデル・画面構成は [`REQUIREMENTS.md`](./REQUIREMENTS.md)
- デザインシステムは [`DESIGN.md`](./DESIGN.md)
- 実装タスクは [`docs/`](./docs) の連番チケット（番号順が推奨実装順）

## 主な機能（フェーズ1）

- **今日の出欠（ホーム `/`）** — 今日のコマの生徒をワンタップで出席/欠席記録。楽観的更新で即時反映、休講日表示、別の日に来た生徒の追加に対応
- **カレンダー（`/calendar`）** — 月表示で記録状況を俯瞰し、過去日を含む任意の日の出欠を修正
- **月次集計（`/summary`）** — 月を選ぶと生徒別の出席回数・請求額・月合計を表示し、支払い済みチェックを管理
- **設定（`/settings`）** — 生徒台帳・コマ・休講日の管理（CRUD）

請求額は「出席記録時点の単価」を保存（スナップショット方式）して算出するため、生徒の単価を変更しても過去月の請求額は変わらない。生徒・コマの削除は論理削除で過去データを保持する。

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

## デプロイ（Vercel）

1. GitHub リポジトリを Vercel にインポート（Framework Preset は自動で **Next.js** になる）
2. **Settings → Environment Variables** に以下を設定（Production / Preview / Development すべてに）:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ※ ローカルの `.env.local` と同じ値。anon（publishable）キーはクライアントに露出する前提のキーで、データ保護は Supabase 側の RLS が担う
3. デプロイ後、本番 URL の `/login` から管理者ユーザーでログインできることを確認する
4. 以降は `main` への push で自動デプロイされる

> セキュリティ: 全テーブルで RLS（認証済みユーザーのみ全操作可）を有効化済み。Supabase Dashboard の **Authentication → Policies** と Advisors で定期的に確認すること。漏洩パスワード保護（HaveIBeenPwned 照合）は Dashboard の Authentication 設定から有効化を推奨。

## コマンド

- `npm run dev` — 開発サーバー（Turbopack）
- `npm run build` — 本番ビルド（Turbopack）
- `npm run lint` — ESLint
