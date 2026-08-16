# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

LaboCore（ラボコア）— シニア向けパソコン・スマホ教室「ほほ笑みラボ」の教室運営システム。フェーズ1は出欠記録・月謝計算・生徒台帳を扱う。利用者は管理者1名のみで、スマホ（授業中のワンタップ記録）と PC の両方で使うレスポンシブ必須のアプリ。

- **REQUIREMENTS.md** — フェーズ1の機能要件・データモデル・画面構成の正典
- **REQUIREMENTS_phase2.md** — フェーズ2「授業記録（じゅぎょうのきろく）」の機能要件の正典。フェーズ2実装前に必ず参照する
- **DESIGN.md** — フェーズ1デザインシステム（v1）。**M3 完了まで未刷新のフェーズ1画面を保守するときのみ**参照する
- **DESIGN_v2.md** — フェーズ2以降のデザイン正典（ダーク基調・クラスカラー）。見た目の正典は `docs/design-sample.html`。フェーズ2の新規画面・刷新画面はすべてこちらに従う
- **SPEC.md** — フェーズ1の実装済み仕様書（as-built）。DB スキーマ・RLS・画面・Server Action・共通基盤の現状を一次情報と突き合わせて記述。フェーズ2の設計時にまず参照する

**フェーズ1（チケット 01〜12）は実装完了し、本番運用中**。URL は https://labocore.vercel.app（Vercel・GitHub 連携で `main` push により自動デプロイ）。8画面（今日の出欠 / カレンダー / 月次集計 / 生徒・コマ・休講日管理 / 生徒詳細 / ログイン）が稼働し、Supabase スリープ防止の keepalive cron も稼働中（下記）。残る運用者タスクは Supabase Dashboard での漏洩パスワード保護の有効化のみ。既存コードで確立済みの構成・規約は「ディレクトリ構成と実装パターン」を参照し、フェーズ2の新規実装もそれに合わせる。

**フェーズ2「授業記録」はチケット 13〜28 に分割済み・実装未着手（13 から着手する）**。横断的な確定事項は下記「フェーズ2の実装方針」を参照。

## チケット運用（docs/）

実装タスクは `docs/` 配下の連番チケットで管理する（`01`〜`12` = フェーズ1・完了 / `13`〜`28` = フェーズ2）。

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
- 接続情報は `.env.local`（gitignore 済み）の `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`。Supabase プロジェクト ref: `labocore = hjcctlwaabkogeybqlbi`。`CRON_SECRET`（keepalive cron 用・下記）は本番のみで必要で、Vercel の Production に設定済み。ローカルには不要。

### keepalive cron（Supabase スリープ防止）

- `src/app/api/keepalive/route.ts` — Vercel Cron（`vercel.json` の `0 3 * * *`・**UTC**）が1日1回叩く GET。`Authorization: Bearer ${CRON_SECRET}` を検証し、`classes` に `head:true`/`count:'exact'` の軽量クエリを投げる。**200 を返すだけでは DB アクティビティにならない**ため必ず実クエリを維持すること。
- cookie を持たない実行なので `@/lib/supabase/server.ts` ではなく `@supabase/supabase-js` の素の anon クライアントを使う。件数が何件かは目的ではなく、クエリが Postgres に到達することが目的（チケット14 で `classes` に anon SELECT ポリシーを足したため件数は 0 ではなくなった）。
- `src/middleware.ts` の matcher で `/api/keepalive` を除外済み。**新しい API ルートを足すときは既定で保護されたまま**にし、認証不要にする場合のみ同様に除外する。
- 本番で稼働確認済み（認証なし → 401 / 認証あり → 200 `{ok:true}`、Vercel Dashboard の Settings → Cron Jobs に登録済み）。実行履歴と失敗の調査は同画面から行う。

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

## フェーズ2の実装方針（チケット 13〜28 分割時に確定済み）

機能要件は REQUIREMENTS_phase2.md、デザインは DESIGN_v2.md + `docs/design-sample.html`（見た目の正典）。以下はチケット分割時のヒアリングで確定した横断事項（詳細は各チケット）。

- **マイルストーン**: M1=13〜21（生徒向け `/kiroku` 一式+管理入力。ここで先行お披露目）/ M2=22〜23（Gemini AI 下書き・他クラスコピー）/ M3=24〜28（既存管理画面の v2 刷新・v1 撤去）。13→14→15 は並行可
- **サイト名**: 「ほほ笑みラボ 授業の記録」で確定。合言葉は「ほほえみ」= env `KIROKU_PASSWORD`（httpOnly Cookie・有効期限1年目安）。PWA アイコンは実装時にデザインシステム準拠で作成（後日差し替え可）
- **ルーティング**: `(kiroku)` route group・全ページ noindex。`/kiroku`（合言葉）→ `/kiroku/select`（クラスえらび）→ `/kiroku/[classId]`（クラスページ）。middleware は `/kiroku` 配下を Supabase Auth 対象から外し**合言葉 Cookie で判定**する（`/api/keepalive` 除外を壊さないこと）。タブ切替では「自分のクラス」の記憶 Cookie を変更しない（選び直しはフッター導線）
- **anon RLS**: `lesson_records` は published のみ / `announcements` は掲載期間内のみ（日付判定は `(now() AT TIME ZONE 'Asia/Tokyo')::date`。UTC の `current_date` を使わない）/ `classes` は is_active / `closed_days` は全行。**students・attendance_records・payments の anon 完全遮断は変更しない**
- **管理側**: ナビに「記録」を追加し `/records` 配下に集約（記録カード CRUD・`next-lessons`・`announcements`）。**新設管理画面（16〜18）は最初から v2 デザインで実装する**（v1 シェルとの混在は画面単位として許容。ページ側でフルブリードのダーク面 `v2CanvasClass` を敷く）
- **v2 画面のフォーム（16 で確立）**: `<form action={formAction}>` を**使わない**。React 19 は action が throw せずに返ると**非制御フィールドを自動リセット**するため、`{fieldErrors}` を返すと入力が全部消える。`startTransition(() => formAction(fd))` の手動 dispatch にする（送信ボタンは `type="button"` + `form.reportValidity()`）。前例は `src/app/(app)/records/record-form.tsx`
- **写真を扱うフォーム**: ファイル入力に `name` を付けない（原寸が FormData に入る経路を作らない）。`shrinkImageInBrowser` で縮小した File だけを `append` し、**合計バイト数をクライアントで検査**する（Vercel の 413 は Server Action に到達しないため捕捉できない）。共通定数は `src/lib/records.ts`（`"use server"` からは非 async を export できない）
- **共通ヘルパ**: `src/lib/form.ts` の `toFieldErrors` / `nullIfEmpty`、`src/lib/revalidate.ts` の `revalidateRecords()` / `revalidateClasses()` を使う（各 actions.ts に再定義しない）。**`revalidatePath` の第2引数は `"layout"`**。既定の `"page"` はそのパスだけが対象で配下ルートを含まない
- **1画面に複数フォームを置くとき（17 で確立）**: 入力を**制御コンポーネント**にし、サーバー値の署名が変わったときだけ追従させる（React の「レンダー中に state を調整する」パターン）。非制御だと、クリア操作で「触った欄は古い値が残り、触っていない欄だけ消える」（HTML の dirty value flag）。カードの `key` は**行の id 固定**（可変値を混ぜると再マウントして入力が飛ぶ）。並び順も保存で変わらない列を使う。前例は `src/app/(app)/records/next-lessons/`
- **トーストは画面に1つ**。`position: fixed` なので行ごとに持つと重なる
- **画像**（15 で実装済み）: **ブラウザで縮小 → Server Action → サーバーで再変換 → R2** の二段構え。
  - **`src/lib/image-client.ts` の `shrinkImageInBrowser(file)`（長辺2000px）を送信前に必ず通す。** **Vercel のリクエストボディ上限は 4.5MB** でプラットフォーム側が 413 を返すため、`serverActions.bodySizeLimit` では超えられない（4mb 設定）。省くとローカルでは動いて本番だけ壊れる。HEIC 対策も兼ねる（sharp は HEIC を読めないが、canvas を通せば扱える形式になる）
  - `src/lib/image.ts` の `processImage(buffer, { maxEdge, quality })` で長辺 1200px（AI 送信用は `AI_MAX_EDGE`=768）+WebP 化 → `src/lib/r2.ts` の `uploadImage` で R2 へ保存し、DB には**完全な公開 URL** を持つ
  - 削除は `deleteImage`（ベストエフォート・DB 操作を巻き添えにしない）、他クラスコピー（23）は `copyImage` で R2 オブジェクトごと複製する。URL からキーを取る処理は**ホスト非依存**（配信先を移しても既存 URL が壊れない）
  - 表示は **`next/image` ではなく素の `<img loading="lazy">`**（変換済みなので再最適化不要・Vercel の画像変換枠を使わない）。疎通確認は `npm run verify:r2`。env は README 参照（未設定でもアプリは起動し、写真操作時のみ失敗する）
- **AI 下書き**: Gemini Flash 系・無料枠運用。env `GEMINI_API_KEY` / `GEMINI_MODEL`（モデル ID のハードコード禁止・env で世代交代）。送信前に画像縮小、出力は必ず人が確認して公開、API 障害時も手動入力で完結できること。個人情報を含む素材を AI に送らない
- **M3 の段階刷新**: 画面単位で v2 へ置き換え・**1画面内の新旧混在は禁止**。シェル刷新（24）後、未刷新画面は暫定白面ラッパーで可読性を維持し 25〜27 で順次外す。28 で v1 トークン撤去・`DESIGN_v2.md` → `DESIGN.md` リネーム・SPEC.md / CLAUDE.md をフェーズ2 as-built に同期

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

## デザインルール

**フェーズ2以降の新規・刷新画面は DESIGN_v2.md が正典**。v1 ルールは **M3 完了までの未刷新フェーズ1画面を保守するときのみ**適用する（1画面内の新旧混在は禁止・画面単位の混在は移行期間中のみ許容）。

### 両世代共通の不変ルール

- タップ要素は最小 44×44px・`active:scale-95`。出欠タップ等は楽観的更新（即時反映 → 失敗時トースト+ロールバック）
- 本文は 17px 基準・16px 以下の本文禁止。数字・金額・日付は `tabular-nums` 必須
- カラー・影・角丸はトークンを `tailwind.config.ts` の `theme.extend` に登録して使い、**インライン hex 禁止**
- レスポンシブ（375px〜）

### v2（DESIGN_v2.md — 新規/刷新画面）

- ダーク基調 `#0b0d12` + クラス別アクセント。DB の `classes.theme_color` を CSS 変数 `--accent` として style 属性で注入し、Tailwind は `var(--accent)` 参照ユーティリティを使う（動的 hex をクラス名に埋め込まない）。濃色端は `color-mix(in srgb, var(--accent) 55%, #000)` で導出
- 影・グラデーションは DESIGN_v2 §4 のレシピ内のみ（レシピ外の新造禁止）。角丸は 12/14/16/20/26/999 の段階制
- 役割色は固定: お知らせ=琥珀 / プロンプト=紫 / 休み・エラー=ローズ / 完了=緑。役割外への流用禁止
- フォントは Noto Sans JP 400/500/700/900。管理画面の基本アクセントはスカイ `#38bdf8` 固定・生徒向けは選択中クラスの色

### v1（DESIGN.md — 未刷新画面の保守のみ）

- アクセントは Action Blue `#0066cc` の1色のみ・セマンティックカラー禁止 / box-shadow・グラデーション禁止（階層は面の色替え+1px ヘアライン）/ 角丸 8/18/pill の3値 / ウェイト 400/600 のみ
