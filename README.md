# LaboCore（ラボコア）

シニア向けパソコン・スマホ教室「ほほ笑みラボ」の教室運営システム。
フェーズ1では **出欠記録・月謝計算・生徒台帳** を扱う。利用者は管理者1名のみで、
スマホ（授業中のワンタップ記録）と PC の両方で使うレスポンシブアプリ。

- 機能要件・データモデル・画面構成は [`REQUIREMENTS.md`](./REQUIREMENTS.md)
- デザインシステムは [`DESIGN.md`](./DESIGN.md)
- **実装済み仕様（as-built）は [`SPEC.md`](./SPEC.md)** — DB スキーマ・RLS・画面・Server Action の現状
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
| `R2_ACCOUNT_ID` | Cloudflare アカウント ID（[後述](#写真の保存先cloudflare-r2)） | 写真機能に必須 |
| `R2_ACCESS_KEY_ID` | R2 API トークンのアクセスキー ID | 写真機能に必須 |
| `R2_SECRET_ACCESS_KEY` | R2 API トークンのシークレット | 写真機能に必須 |
| `R2_BUCKET` | バケット名（例 `labocore-kiroku`） | 写真機能に必須 |
| `R2_PUBLIC_BASE_URL` | r2.dev の公開 URL（例 `https://pub-xxxx.r2.dev`） | 写真機能に必須 |
| `KIROKU_PASSWORD` | 生徒向けページ `/kiroku` の合言葉（「ほほえみ」）。[後述](#生徒向けページkiroku) | ✅（ローカル/本番とも） |

> R2 の5変数が未設定でもアプリは起動し、写真を扱わない画面は通常どおり動く。
> 写真のアップロード時にだけ「R2 の環境変数が未設定です」というエラーになる。
>
> `KIROKU_PASSWORD` が未設定でも管理画面は通常どおり動くが、生徒向けページは
> 合言葉画面から先へ進めなくなる（fail-closed）。

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
   - `R2_*` の5変数 — 授業記録の写真用（[後述](#写真の保存先cloudflare-r2)）
   - `KIROKU_PASSWORD` — 生徒向けページの合言葉（[後述](#生徒向けページkiroku)）。**未設定のままだと生徒向けページが開けない**
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

> 補足: 件数が何件になるかは目的ではなく、クエリが Postgres に到達することが目的。

## 写真の保存先（Cloudflare R2）

授業記録の写真は **Cloudflare R2** に置く（無料枠 容量10GB・**配信の帯域課金なし**で、この規模では実質恒久無料）。
アップロード時にサーバー側で**長辺1200px + WebP** に変換してから保存するため、数 MB のスマホ写真も数百 KB に収まる。

### 1. バケットを作る

1. Cloudflare Dashboard → **R2** → **Create bucket**（例: `labocore-kiroku`）
2. 作成したバケット → **Settings** → **Public Development URL** を **Enable** にする
3. 表示される `https://pub-xxxxxxxx.r2.dev` を控える（= `R2_PUBLIC_BASE_URL`）

### 2. API トークンを発行する

1. R2 のトップ → **Manage R2 API Tokens** → **Create API token**
2. 権限は **Object Read & Write**、対象は上で作ったバケットに絞る
3. 発行された **Access Key ID** と **Secret Access Key** を控える（シークレットは再表示できない）
4. アカウント ID は R2 のトップまたは Cloudflare Dashboard の URL から確認できる

### 3. 環境変数を設定する

`.env.local`（ローカル）と Vercel の **Settings → Environment Variables**（Production）の両方に設定する。

```bash
R2_ACCOUNT_ID=<Cloudflare アカウント ID>
R2_ACCESS_KEY_ID=<Access Key ID>
R2_SECRET_ACCESS_KEY=<Secret Access Key>
R2_BUCKET=labocore-kiroku
R2_PUBLIC_BASE_URL=https://pub-xxxxxxxx.r2.dev
```

### 4. 疎通確認

```bash
npm run verify:r2
```

「画像生成 → 変換 → アップロード → 公開 URL で取得 → 複製 → 削除 → 削除後404」を通しで確認する。
バケットを作り直したとき・トークンを更新したとき・写真が表示されないときの切り分けにも使える。

> 掲載前チェックの運用ルール: 写真は**画面・資料のみ**（顔・名前を写さない）。
> メールアドレス等の写り込みも確認する。変換時に EXIF/GPS は自動で削除される。

### 知っておくこと

- **`r2.dev` は本番運用向けではない**とされており、可変のレート制限がかかる。
  秒間数百リクエストを超えると `429` が返り、帯域も絞られることがある。
  生徒20名規模なら実用上問題にならない（要件 §11 の判断）。
  問題が出たら独自ドメインへ移す（DB には完全な URL を保存しているので置換で済む）
- `r2.dev` サブドメインへ **CNAME を向けてはいけない**（サポート外の経路）。
  WAF・キャッシュルール・Access も `r2.dev` では使えない（独自ドメインのみ）
- アップロードは Server Action 経由で、**Vercel のリクエストボディ上限 4.5MB** に収める必要がある。
  そのため送信前にブラウザ側でも縮小している（`src/lib/image-client.ts`）

## 生徒向けページ（`/kiroku`）

生徒さんが授業の記録を見るページ。管理画面とは認証が別で、Supabase のアカウントは配らない。

- URL: https://labocore.vercel.app/kiroku （LINE グループで案内する）
- 入り口は**教室で口頭共有する合言葉**ひとつだけ。`KIROKU_PASSWORD`（= 「ほほえみ」）と照合する
- 一度入れると httpOnly Cookie に記憶され、**約1年は聞かれない**。クラスも記憶するので、次回からは自分のクラスのページが直接開く
- 全ページ `noindex`（検索結果に出ない）

### ホーム画面に追加（PWA）

`/kiroku` は「ホーム画面に追加」で1タップ起動できる（スコープは `/kiroku` のみ。管理画面は含まない）。

- **LINE のアプリ内ブラウザからは追加できない。** iPhone は「Safariで開く」、Android は「Chromeで開く」を先に押してもらう。案内文の冒頭に書くこと
- **iPhone はホーム画面から開いた初回だけ、合言葉をもう一度聞かれる。** iOS は Safari とホーム画面 Web アプリで Cookie の保管庫が分かれているため。Android は引き継がれる
- オフライン閲覧（Service Worker）は入れていない。期限切れのお知らせを確実に消すために毎回サーバーへ問い合わせる設計なので、キャッシュを挟むとその保証が壊れる

**アイコンを差し替えるとき**

1. `public/icons/kiroku-icon.svg` を編集する（librsvg で描くので `<style>`・CSS クラス・`filter`・`mask` は使えない）
2. `npm run icons` で PNG 4種を焼き直す
3. 生成された PNG も一緒にコミットする
4. ⚠️ **iPhone はインストール済みのアイコンを更新しない。** すでに追加した生徒さんには、削除して追加し直してもらう必要がある（Android は数日で自動的に貼り替わる）

**運用メモ**

- `KIROKU_PASSWORD` を変えて再デプロイすると、**配布済みの Cookie は自動的に無効**になる（全員がもう一度入力する）
- ローカルと Vercel Production の両方に設定が要る。未設定だと合言葉画面から先へ進めない（fail-closed）
- 合言葉はアプリ層の「身内向けの目印」で、暗号的な保護ではない。授業記録・お知らせ・コマ情報は anon ロールに読み取りを許可しているため、API を直接叩けば合言葉なしでも読める。**掲載内容は顔なし・個人情報なしに限る**運用でカバーしている（生徒台帳・出欠・支払いは RLS で anon 完全遮断）

## コマンド

- `npm run dev` — 開発サーバー（Turbopack）
- `npm run build` — 本番ビルド（Turbopack）
- `npm run lint` — ESLint
- `npm run icons` — 生徒向けアイコンの PNG を生成（`public/icons/kiroku-icon.svg` から）
