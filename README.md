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

| 変数 | 用途 | 必須 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon（publishable）キー。データ保護は RLS が担う | ✅ |
| `CRON_SECRET` | keepalive cron の認証用（[後述](#supabase-スリープ防止keepalive-cron)）。本番のみ必須で、ローカルでは未設定で良い | 本番のみ |

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
   - `CRON_SECRET` — keepalive cron の認証用（[後述](#supabase-スリープ防止keepalive-cron)）
   - ※ Supabase の2つはローカルの `.env.local` と同じ値。anon（publishable）キーはクライアントに露出する前提のキーで、データ保護は Supabase 側の RLS が担う
3. デプロイ後、本番 URL の `/login` から管理者ユーザーでログインできることを確認する
4. 以降は `main` への push で自動デプロイされる

> セキュリティ: 全テーブルで RLS（認証済みユーザーのみ全操作可）を有効化済み。Supabase Dashboard の **Authentication → Policies** と Advisors で定期的に確認すること。漏洩パスワード保護（HaveIBeenPwned 照合）は Dashboard の Authentication 設定から有効化を推奨。

## Supabase スリープ防止（keepalive cron）

Supabase 無料プランはプロジェクトに一定期間 DB アクティビティがないと一時停止される。
これを防ぐため、Vercel Cron から1日1回 `/api/keepalive` を叩き、**実際に Postgres へ軽量クエリ**を投げてアクティビティを発生させる（単に 200 を返すだけでは DB の活動にならない）。

- スケジュール: `vercel.json` の `0 3 * * *`（**UTC** = 12:00 JST）。Supabase は7日無アクティビティで停止するため1日1回で十分（Hobby プランの cron 上限とも一致）
- クエリ先: `classes` テーブルに `head:true` / `count:'exact'` の最小クエリ
- 認証: Vercel Cron が自動付与する `Authorization: Bearer ${CRON_SECRET}` を検証。不一致は 401
- `src/middleware.ts` の matcher で `/api/keepalive` をセッション認証の対象から除外している（除外しないと未認証扱いで `/login` にリダイレクトされ cron が機能しない）

### CRON_SECRET の設定

```bash
# 1. ランダム値を生成
openssl rand -hex 32

# 2. Vercel に登録（生成値を貼り付ける）
vercel env add CRON_SECRET production

# 3. 反映のため再デプロイ
vercel --prod
```

### 動作確認

```bash
# 認証あり → 200 {"ok":true,"timestamp":"..."}
curl -i -H "Authorization: Bearer $CRON_SECRET" https://<本番URL>/api/keepalive

# 認証なし → 401 {"ok":false}
curl -i https://<本番URL>/api/keepalive
```

登録状況は Vercel Dashboard の **Settings → Cron Jobs** で確認できる（実行履歴もここに出る）。

> 補足: RLS が `authenticated` 限定のため anon キーでの件数は 0 件になるが、クエリ自体は Postgres に到達するのでスリープ防止としては有効。

## コマンド

- `npm run dev` — 開発サーバー（Turbopack）
- `npm run build` — 本番ビルド（Turbopack）
- `npm run lint` — ESLint
