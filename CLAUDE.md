# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

LaboCore（ラボコア）— シニア向けパソコン・スマホ教室「ほほ笑みラボ」の教室運営システム。フェーズ1は出欠記録・月謝計算・生徒台帳を扱う。利用者は管理者1名のみで、スマホ（授業中のワンタップ記録）と PC の両方で使うレスポンシブ必須のアプリ。

- **REQUIREMENTS.md** — 機能要件・データモデル・画面構成の正典。機能実装前に必ず参照する
- **DESIGN.md** — デザインシステムの正典。UI実装時に必ず参照する

**フェーズ1（チケット 01〜12）は実装完了し、Vercel（GitHub 連携・`main` push で自動デプロイ）に本番デプロイ済み**。8画面（今日の出欠 / カレンダー / 月次集計 / 生徒・コマ・休講日管理 / 生徒詳細 / ログイン）が稼働している。残る運用者タスクは Supabase Dashboard での漏洩パスワード保護の有効化のみ。既存コードで確立済みの構成・規約は「ディレクトリ構成と実装パターン」を参照し、フェーズ2の新規実装もそれに合わせる。

## チケット運用（docs/）

実装タスクは `docs/` 配下の連番チケット（`01-*.md` 〜 `12-*.md`）で管理する。

- 番号順が推奨実装順。着手前にチケット冒頭の**依存**と**参照**セクションを確認する
- 各チケットの Todo は `- [ ]` 形式で管理する。**作業が完了した項目は、その都度 `- [x]` に書き換えること**（チケット側の更新を忘れたままコミットしない）
- 実装中に仕様が変わった場合はチケット本文も更新し、実装とチケットの乖離を残さない

## コマンド

- `npm run dev` — 開発サーバー起動（Turbopack）
- `npm run build` — 本番ビルド（Turbopack）
- `npm run lint` — ESLint 実行
- テストフレームワークは未導入

## 技術スタック・構成

- Next.js 15（App Router）+ React 19 + TypeScript strict
- **Tailwind CSS は v3.4 系へ意図的にダウングレード済み（v4 ではない）。** 設定は `tailwind.config.ts` の `theme.extend`、`globals.css` は `@tailwind` ディレクティブ方式。v4 記法（`@theme` 等）を持ち込まないこと
- BaaS: Supabase（Auth / PostgreSQL / RLS）。Supabase MCP サーバーが `.mcp.json`（gitignore 済み）で接続設定されている
- デプロイ: Vercel
- パスエイリアス: `@/*` → `./src/*`

## ディレクトリ構成と実装パターン（01〜11 で確立）

新規実装は以下の既存規約に合わせる。

### ルーティング（route group）

- `src/app/(auth)/login/` — 認証不要側（共通シェルなし）。
- `src/app/(app)/` — 認証必須側。`(app)/layout.tsx` が共通シェル（PC 純黒ヘッダー+サイドバー / モバイル下部タブ、`max-w-[980px]` センターコンテナ）。ナビは `src/components/nav/`。
- route group は URL に出ない。設定配下は `(app)/settings/{students,classes,closed-days}`。

### Supabase クライアント（`src/lib/supabase/`）

- `server.ts` の `createClient()` — Server Component / Server Action 用（cookie ベース・`await` 必須）。
- `client.ts` の `createClient()` — Client Component 用。
- `middleware.ts` の `updateSession()` — `src/middleware.ts` から呼び全ルートを保護。`getClaims()` でセッション更新し未認証は `/login` へ。`getSession()` はサーバーで使わない。
- `database.types.ts` — MCP `generate_typescript_types` の出力。全クライアントに `<Database>` を適用。**スキーマ変更後は必ず再生成**する。
- 接続情報は `.env.local`（gitignore 済み）の `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`。Supabase プロジェクト ref: `labocore = hjcctlwaabkogeybqlbi`。

### 認証

- middleware で全 `(app)` ルートを保護済み。ページ側で個別のリダイレクトは基本不要。
- ログアウトは `src/lib/auth/actions.ts` の `signOut`。管理者は Supabase Dashboard で1名だけ作成（新規登録画面は作らない。手順は README）。

### CRUD の型（05 コマ・06 生徒で確立。08 休講日等も踏襲）

1リソースにつき: `page.tsx`（一覧・Server Component）/ `actions.ts`（`'use server'`）/ `*-form.tsx`（`'use client'` の登録・編集共有フォーム）/ `new/page.tsx` / `[id]/edit/page.tsx`。

- Server Action は Zod `safeParse` → 失敗時 `issue.path[0]` でフィールド別に集約して early return（`{ fieldErrors, formError }`）。成功時 `revalidatePath` → `redirect`。
- フォームは `useActionState(action, {})`。非制御入力（`defaultValue`）なので検証エラー再表示でも入力値は保持される。
- 任意テキストは保存前に空文字→null 化（`nullIfEmpty`）。
- 削除は論理削除（`is_active=false`）＋ `src/components/confirm-dialog.tsx`（ネイティブ `<dialog>`・確定は ink 塗り）で確認必須。

### 共有ユーティリティ / コンポーネント

- `src/lib/format.ts` — `WEEKDAY_LABELS` / `formatTimeRange` / `formatYen` / `formatMonthJa` / `formatDateJa` / `todayJst`（JST の今日 `YYYY-MM-DD`）/ `weekdayOf`（日付の曜日番号・UTC 基準で tz 非依存）/ `formatDateWithWeekday`（「7月22日（水）」）/ `shiftMonth`（`YYYY-MM` を N ヶ月送り）。日付・月キーは必ずこれらを経由し、`new Date()` 直書きの tz 依存を持ち込まない。
- `src/components/yen.tsx` — `<Yen amount>`。プロミネントな金額表示用（`¥` を一回り小さく muted・数字は `tabular-nums`）。素の文字列が要る箇所は `formatYen`。ダークタイル上の巨大数値は `¥`=body-muted・数字=白で手書きする（Yen は ink-muted 前提のため流用しない）。
- `src/components/ui/form.ts` — フォーム入力の共有クラス（`labelClass` 14px/600・`inputClass` 44px pill+ring・`textareaClass`・`errorClass` は ink）。新規フォームはこれを使い、hex やスタイルを重複させない。
- `src/components/confirm-dialog.tsx` — 破壊的操作の確認（論理削除で使用）。
- `src/components/toast.tsx` — `useToast()` フック＋`<Toast message>`（ink 塗り pill・下部中央・3秒自動消去）。楽観的更新の失敗通知に使う。

### 出欠・楽観的更新の共通基盤（09〜11 で確立）

出欠 UI とインライン Server Action は重複実装せず共通化する。

- `src/lib/attendance.ts` — 型の単一定義元（`AttendanceStatus` / `AttendanceRow` / `AttendanceCandidate` / `DayAttendance`）＋ `getDayAttendance(supabase, date)`。指定日の「その日のコマ在籍生徒 ∪ 当日記録がある生徒」を組み立てて返す。ホーム（`/`・今日）とカレンダー（`/calendar`・任意日パネル）が共用。supabase client は引数で受ける isomorphic 設計（`import type` はクライアントでも消える）。
- `src/app/(app)/actions.ts` の `recordAttendance({ studentId, lessonDate, status })` — 出欠記録のインラインアクション（**redirect せず `{ error? }` を返す**＝楽観的更新用）。`status=null` で削除、それ以外は `unit_price_at_time` に**サーバで読んだ現在単価をスナップショット**して upsert（`onConflict: "student_id,lesson_date"`）。ホーム・カレンダーで共用。
- `src/app/(app)/attendance-board.tsx`（`useOptimistic`+`useTransition`+`useToast` の中心）/ `attendance-toggle.tsx`（出席｜欠席の2セグメント pill）/ `add-student.tsx`（別日来訪の追加）。`doneLabel`/`addLabel` で文言を差し替えて再利用する。
- `src/app/(app)/summary/` — 月次集計。`setPayment` も同じ「redirect せず `{ error? }`・楽観的更新」パターン（`payments` を `onConflict: "student_id,target_month"` で upsert）。集計は `attendance_records` を月範囲取得し **JS 集約**（`unit_price_at_time` を合計＝スナップショット）。

## Next.js 15 App Router ベストプラクティス

（Context7 経由で取得した Next.js 15 公式ドキュメントに基づく。本プロジェクトは 15.5.21）

### Server / Client Components の境界

- コンポーネントはデフォルトで Server Component。`"use client"` は state・イベントハンドラ・ブラウザ API が必要な**境界にのみ**付ける。境界ファイルに import されたモジュールはすべてクライアントバンドルに入るため、末端の対話的コンポーネント（出欠トグル、検索入力など）だけをクライアント化する
- データ取得・静的表示は Server Component に置き、対話部分だけを Client Component として切り出す
- **Client Component に Server Component を import してはいけない**。`children` や props のスロットとして Server Component を渡す（例: `<ClientWrapper><ServerList /></ClientWrapper>`）

### Next.js 15 固有の変更点（旧バージョンの記法を書かない）

- `params` / `searchParams` は **Promise**。`const { id } = await params` のように必ず `await` する
- `cookies()` / `headers()` も非同期 API。`await cookies()` とする
- **`fetch` はデフォルトで非キャッシュ**（`no-store` 相当）。キャッシュしたい場合のみ `cache: 'force-cache'` や `next: { revalidate: N }` を明示する。本プロジェクトは Supabase クライアント経由の毎リクエスト取得が基本なので、fetch キャッシュへの依存は作らない

### データ変更（ミューテーション）

- 書き込みは Server Actions（`'use server'`）で行い、成功後に `revalidatePath` / `revalidateTag` でキャッシュを無効化する
- Server Action 内では入力を Zod 等で `safeParse` 検証し、失敗時はフィールド別エラーを早期リターンする（クライアント側の検証だけに頼らない）
- 出欠タップ・支払いチェックの楽観的更新は `useOptimistic` を使う: タップ即時に UI 反映 → Server Action 実行 → 失敗時はトーストでロールバック通知（REQUIREMENTS.md §8 の要件と対応）

## ドメイン上の不変条件（詳細は REQUIREMENTS.md）

- **単価スナップショット方式**: 出欠記録時に生徒の現在単価を `attendance_records.unit_price_at_time` へコピーする。請求額は常に `SUM(unit_price_at_time) WHERE status='present'` で導出。生徒マスタの単価変更が過去の請求額を変えてはならない
- 出欠は `UNIQUE(student_id, lesson_date)` で1日1件。振替制度なし、締めはカレンダー月
- 生徒・コマの削除は論理削除（`is_active = false`）。過去の出欠・請求履歴は保持する
- 月次集計は集計テーブルを持たず、毎回導出する。PostgREST は任意の GROUP BY を組めないため、対象レコードを取得して **JS で月別集約**する（07 生徒詳細で確立。09/11 も同方式。月キーは `lesson_date.slice(0,7)`）
- 認証は Supabase Auth の管理者1名のみ。新規登録画面は作らない。生徒の個人情報を扱うため、全テーブルで RLS（認証済みユーザーのみ全操作可）を必ず有効化する

## デザインの絶対ルール（詳細は DESIGN.md）

- アクセントは Action Blue `#0066cc` の1色のみ。赤・緑などのセマンティックカラー禁止。出欠は「出席=Action Blue 塗りピル / 欠席=ink 塗りピル / 未記録=ゴーストピル」で表現する
- box-shadow・グラデーション禁止。階層は面の色の切り替え（白 ↔ `#f5f5f7` ↔ ダークタイル）と 1px ヘアラインで作る
- 角丸は 8px（ユーティリティ）/ 18px（カード）/ pill（アクション）の3値のみ
- 数字・金額は `tabular-nums` 必須。フォントウェイトは 400 / 600 のみ、本文は 17px
- カラーは DESIGN.md のトークンを `tailwind.config.ts` に登録して使い、インライン hex を書かない
- タップ要素は `active:scale-95`・最小 44×44px。出欠タップは楽観的更新（即時反映 → 失敗時トースト+ロールバック）
