# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

LaboCore（ラボコア）— シニア向けパソコン・スマホ教室「ほほ笑みラボ」の教室運営システム。フェーズ1は出欠記録・月謝計算・生徒台帳を扱う。利用者は管理者1名のみで、スマホ（授業中のワンタップ記録）と PC の両方で使うレスポンシブ必須のアプリ。

- **REQUIREMENTS.md** — 機能要件・データモデル・画面構成の正典。機能実装前に必ず参照する
- **DESIGN.md** — デザインシステムの正典。UI実装時に必ず参照する

現状は create-next-app のスキャフォールドに上記2文書を加えた段階で、アプリ本体は未実装。

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
- 月次集計は集計テーブルを持たず、ビュー/クエリで毎回導出する
- 認証は Supabase Auth の管理者1名のみ。新規登録画面は作らない。生徒の個人情報を扱うため、全テーブルで RLS（認証済みユーザーのみ全操作可）を必ず有効化する

## デザインの絶対ルール（詳細は DESIGN.md）

- アクセントは Action Blue `#0066cc` の1色のみ。赤・緑などのセマンティックカラー禁止。出欠は「出席=Action Blue 塗りピル / 欠席=ink 塗りピル / 未記録=ゴーストピル」で表現する
- box-shadow・グラデーション禁止。階層は面の色の切り替え（白 ↔ `#f5f5f7` ↔ ダークタイル）と 1px ヘアラインで作る
- 角丸は 8px（ユーティリティ）/ 18px（カード）/ pill（アクション）の3値のみ
- 数字・金額は `tabular-nums` 必須。フォントウェイトは 400 / 600 のみ、本文は 17px
- カラーは DESIGN.md のトークンを `tailwind.config.ts` に登録して使い、インライン hex を書かない
- タップ要素は `active:scale-95`・最小 44×44px。出欠タップは楽観的更新（即時反映 → 失敗時トースト+ロールバック）
