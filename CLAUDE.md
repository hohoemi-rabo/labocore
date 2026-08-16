# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

LaboCore（ラボコア）— シニア向けパソコン・スマホ教室「ほほ笑みラボ」の教室運営システム。フェーズ1は出欠記録・月謝計算・生徒台帳を扱う。利用者は管理者1名のみで、スマホ（授業中のワンタップ記録）と PC の両方で使うレスポンシブ必須のアプリ。

- **REQUIREMENTS.md** — フェーズ1の機能要件・データモデル・画面構成の正典
- **REQUIREMENTS_phase2.md** — フェーズ2「授業記録（じゅぎょうのきろく）」の機能要件の正典。フェーズ2実装前に必ず参照する
- **DESIGN.md** — フェーズ1デザインシステム（v1）。**M3 完了まで未刷新のフェーズ1画面を保守するときのみ**参照する
- **DESIGN_v2.md** — フェーズ2以降のデザイン正典（ダーク基調・クラスカラー）。見た目の正典は `docs/design-sample.html`。フェーズ2の新規画面・刷新画面はすべてこちらに従う
- **SPEC.md** — 実装済み仕様書（as-built）。DB スキーマ・RLS・画面・Server Action・共通基盤の現状を一次情報と突き合わせて記述。**§4 の DB はフェーズ2分（`lesson_records` / `announcements` / `classes` の追加列 / anon ポリシー）まで同期済み**。設計時にまず参照する

**フェーズ1（チケット 01〜12）は実装完了し、本番運用中**。URL は https://labocore.vercel.app（Vercel・GitHub 連携で `main` push により自動デプロイ）。8画面（今日の出欠 / カレンダー / 月次集計 / 生徒・コマ・休講日管理 / 生徒詳細 / ログイン）が稼働し、Supabase スリープ防止の keepalive cron も稼働中（下記）。

**フェーズ2「授業記録」はチケット 13〜28 に分割済み。13〜21 が実装完了し（M1 = 生徒向け一式が本番稼働）、次は 22 から着手する。** 現状の詳細は下記「フェーズ2の現状」、横断的な確定事項は「フェーズ2の実装方針」を参照。

**運用者タスクの状況**: R2 のバケット・トークン・env（ローカル + Vercel Production）は設定済み。残るのは (a) Supabase Dashboard での漏洩パスワード保護の有効化（フェーズ1からの積み残し・急ぎでない）、(b) **`KIROKU_PASSWORD`（合言葉「ほほえみ」）を Vercel Production に登録する**（ローカルの `.env.local` は設定済み。**未登録のまま本番デプロイすると生徒向けページが fail-closed で開けない**）。

## チケット運用（docs/）

実装タスクは `docs/` 配下の連番チケットで管理する（`01`〜`12` = フェーズ1・完了 / `13`〜`28` = フェーズ2）。

- 番号順が推奨実装順。着手前にチケット冒頭の**依存**と**参照**セクションを確認する
- 各チケットの Todo は `- [ ]` 形式で管理する。**作業が完了した項目は、その都度 `- [x]` に書き換えること**（チケット側の更新を忘れたままコミットしない）
- 実装中に仕様が変わった場合はチケット本文も更新し、実装とチケットの乖離を残さない

## コマンド

- `npm run dev` — 開発サーバー起動（Turbopack）
- `npm run build` — 本番ビルド（Turbopack）
- `npm run lint` — ESLint 実行
- `npm run verify:r2` — R2 の疎通確認（アップロード→取得→複製→削除→404 を通しで検査）
- `npm run icons` — 生徒向けアイコンの PNG を原本 SVG から焼き直す（`public/icons/kiroku-icon.svg` → 4種）
- テストフレームワークは未導入

**⚠️ `npm run dev` を動かしたまま `npm run build` を実行しない。** `.next` に開発用と本番用の成果物が混ざり、`Failed to load chunk …` の実行時エラーになる。起きたら dev を止めて `rm -rf .next` してから起動し直す。

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
- `anon.ts` の `createAnonClient()` — **cookie を持たない文脈用**（keepalive cron・生徒向け `/kiroku`）。届く行は anon の RLS ポリシーが決める。ここで cookie クライアントを使ってはいけない。
- `middleware.ts` の `updateSession()` — `src/middleware.ts` から呼び管理側ルートを保護。`getClaims()` でセッション更新し未認証は `/login` へ。`getSession()` はサーバーで使わない。**`/kiroku` 配下は `middleware.ts` 側で分岐して `updateSession` を呼ばない**（合言葉 Cookie で判定・下記「認証」）。
- `database.types.ts` — MCP `generate_typescript_types` の出力。全クライアントに `<Database>` を適用。**スキーマ変更後は必ず再生成**する。
- 接続情報は `.env.local`（gitignore 済み）の `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`。Supabase プロジェクト ref: `labocore = hjcctlwaabkogeybqlbi`。`CRON_SECRET`（keepalive cron 用・下記）は本番のみで必要で、Vercel の Production に設定済み。ローカルには不要。`KIROKU_PASSWORD`（生徒向けの合言葉）はローカル・本番とも必要。

### keepalive cron（Supabase スリープ防止）

- `src/app/api/keepalive/route.ts` — Vercel Cron（`vercel.json` の `0 3 * * *`・**UTC**）が1日1回叩く GET。`Authorization: Bearer ${CRON_SECRET}` を検証し、`classes` に `head:true`/`count:'exact'` の軽量クエリを投げる。**200 を返すだけでは DB アクティビティにならない**ため必ず実クエリを維持すること。
- cookie を持たない実行なので `@/lib/supabase/server.ts` ではなく `createAnonClient()`（`src/lib/supabase/anon.ts`・生徒向け `/kiroku` と共用）を使う。件数が何件かは目的ではなく、クエリが Postgres に到達することが目的（チケット14 で `classes` に anon SELECT ポリシーを足したため件数は 0 ではなくなった）。
- `src/middleware.ts` の matcher で `/api/keepalive` を除外済み。**新しい API ルートを足すときは既定で保護されたまま**にし、認証不要にする場合のみ同様に除外する。
- 本番で稼働確認済み（認証なし → 401 / 認証あり → 200 `{ok:true}`、Vercel Dashboard の Settings → Cron Jobs に登録済み）。実行履歴と失敗の調査は同画面から行う。

### 認証

認証は2系統ある。**管理側 = Supabase Auth / 生徒向け `/kiroku` = 合言葉 Cookie**。

- middleware で全 `(app)` ルートを保護済み。ページ側で個別のリダイレクトは基本不要。
- ログアウトは `src/lib/auth/actions.ts` の `signOut`。管理者は Supabase Dashboard で1名だけ作成（新規登録画面は作らない。手順は README）。
- **生徒向け `/kiroku` の合言葉ゲート（19 で実装）**: `src/middleware.ts` が `/kiroku` 配下を分岐し、`updateSession` を呼ばずに Cookie で判定する。**`config.matcher` は変更していない**（`/api/keepalive` の除外を壊さないため）。
  - `src/lib/kiroku/gate.ts` — Cookie 名・属性・トークン導出。**Edge の middleware と Node の Server Action の両方から import される純粋モジュール。`next/headers` も Supabase も持ち込まないこと**（middleware のバンドルが壊れる。`classes.ts` を middleware から import するのも不可）。ハッシュは Web Crypto（`require("crypto")` は Edge ビルドを壊す）。
  - Cookie は `kiroku_gate`（合言葉の SHA-256 導出値）と `kiroku_class`（記憶クラス）の2本。どちらも httpOnly・`path=/kiroku`・`sameSite=lax`・`maxAge` 1年。**`cookies().delete()` は `path=/` で消しにいくのでこの Cookie には効かない。`set(name, "", { ...kirokuCookieOptions, maxAge: 0 })` を使う。**
  - `KIROKU_PASSWORD` 未設定は fail-closed。合言葉画面自体は開くのでループしない。
  - **`config.matcher` はチケット21 で拡張子除外グループに `webmanifest` を1語だけ追加した**（`.*\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$`）。前方一致の枝（`/api/keepalive` 等）は無変更。⚠️ この結果、**今後 `.webmanifest` で終わるルートは無認証**になる。
  - **iOS のホーム画面 Web アプリは Safari と Cookie の保管庫が別。** iPhone はホーム画面から開いた初回だけ合言葉とクラス選びをやり直す（Android は引き継がれる）。仕様として受け入れ済み。
  - 行き先の判断（K1 / 記憶クラス / クラスえらび）は `/kiroku/page.tsx` だけが持つ。Server Action 側で計算しない。

### CRUD の型（05 コマ・06 生徒で確立。08 休講日等も踏襲）

1リソースにつき: `page.tsx`（一覧・Server Component）/ `actions.ts`（`'use server'`）/ `*-form.tsx`（`'use client'` の登録・編集共有フォーム）/ `new/page.tsx` / `[id]/edit/page.tsx`。

- Server Action は Zod `safeParse` → 失敗時 `issue.path[0]` でフィールド別に集約して early return（`{ fieldErrors, formError }`）。成功時 `revalidatePath` → `redirect`。
- 任意テキストは保存前に空文字→null 化（`nullIfEmpty`）。
- 削除は論理削除（`is_active=false`）＋ 確認ダイアログ必須。v1 画面は `src/components/confirm-dialog.tsx`、**v2 画面は `src/components/v2/confirm-dialog.tsx`**。
- **⚠️ フォームの送信方法は v1 画面と v2 画面で異なる**。v1 画面（未刷新のフェーズ1画面）は `<form action={formAction}>` + `useActionState(action, {})` の非制御入力。**v2 画面は手動 dispatch**（下記「フェーズ2の実装方針」）。
  - v1 画面にも React 19 の「action が返ると非制御フィールドがリセットされる」問題は潜在的にあるが、`required` がほとんどを弾きサーバー側エラーが稀なので表面化していない。**チケット27 で v2 と同じ手動 dispatch に寄せる予定**（27 の Todo に記載済み）。

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

## フェーズ2の現状（13〜21 実装済み・22 から着手）

### 追加済みの DB（14）

- `classes` に列追加: `theme_color`（NOT NULL 既定 `#38bdf8`・CHECK `^#[0-9a-fA-F]{6}$`・**小文字で保存**）/ `next_lesson_date` / `next_lesson_theme` / `next_lesson_note`
- `lesson_records`（記録カード・`UNIQUE(class_id, lesson_date)`・`image_urls` は `cardinality <= 2` の CHECK・`status` は draft/published）
- `announcements`（`class_id` NULL = 全体向け・`starts_on <= ends_on` の CHECK）
- anon SELECT ポリシー: `classes`(is_active) / `closed_days`(全行) / `lesson_records`(published) / `announcements`(JST で掲載期間内)。**students・attendance_records・payments には付けない**
- **⚠️ 新テーブルを足すときは `create table` と `enable row level security` を同一マイグレーションに入れる**。`public` の DEFAULT PRIVILEGES が anon に全権限を自動付与するため、分けるとその間だけ読み書き自由になる（SPEC.md §4.8）

### 追加済みのライブラリ（13・15・16・17・19・20）

| ファイル | 中身 |
|---|---|
| `src/lib/accent.ts` | `accentStyle(color)`（`--accent` を style 属性で注入）/ `CLASS_THEME_COLORS`（6色）/ `DEFAULT_ACCENT` |
| `src/lib/supabase/anon.ts` | `createAnonClient()`（cookie を持たない文脈用・keepalive と `/kiroku` が共用） |
| `src/lib/kiroku/gate.ts` | Cookie 名/属性 `kirokuCookieOptions` / `kirokuToken` / `isKirokuUnlocked` / `matchesKirokuPassword`。**純粋モジュール（Edge から import される）** |
| `src/lib/kiroku/classes.ts` | `listActiveClasses()`（`cache()` 済み・`next_lesson_*` 込み）/ `findActiveClass()` / `periodLabels()`（午前・午後を出すかの判定。K2 と K3 で共通） |
| `src/lib/kiroku/schedule.ts` | `buildMonthlySchedule()`（今月のよてい・純関数） |
| `src/lib/form.ts` | `toFieldErrors` / `nullIfEmpty` |
| `src/lib/revalidate.ts` | `revalidateRecords()` / `revalidateClasses()`（どちらも `"layout"` 指定） |
| `src/lib/records.ts` | `MAX_PHOTOS`（サーバー・クライアント共用の定数置き場） |
| `src/lib/image.ts` | `processImage` / `PUBLISH_MAX_EDGE`(1200) / `AI_MAX_EDGE`(768)（server-only） |
| `src/lib/image-client.ts` | `shrinkImageInBrowser`（ブラウザ側の事前縮小） |
| `src/lib/r2.ts` | `uploadImage` / `deleteImage` / `copyImage`（server-only） |
| `src/lib/format.ts` | 既存に加え `addDays` を追加 |
| `src/components/v2/styles.ts` | `v2CanvasClass` / `entryCanvasClass` / `kirokuCanvasClass` / `entryBoxClass` / `glassCardClass` / `cardClass` / `accentCardClass` / `eyebrowClass`(+News/Prompt) / `sectionTitleClass` / `tricolorClass`(+Sm) / `accentButtonClass` / `skyButtonClass` / `entryButtonClass` / `copyButtonClass`(+Done) / `datePillClass` |
| `src/components/v2/form.ts` | `labelClass` / `inputClass` / `selectClass` / `textareaClass` / `entryInputClass` / `errorClass` / `errorBandClass` |
| `src/components/v2/confirm-dialog.tsx`・`toast.tsx` | v2 版（v1 版はダーク面で読めない。**v2 画面では必ず v2 版を import する**） |
| `public/manifest.webmanifest` | 生徒向け PWA のマニフェスト（`(kiroku)/layout.tsx` の `metadata.manifest` から参照） |
| `public/icons/` | `kiroku-icon.svg`（原本）+ 生成 PNG 4種。`scripts/build-icons.mts`（`npm run icons`）で焼く |

`scripts/verify-r2.mts`（`npm run verify:r2`）は R2 の疎通確認ツール（常設）。

### 追加済みの画面（16〜21・すべて v2 デザイン）

管理側（16〜18）:

- `/records` — 記録カード一覧（日付順フラット + クラス絞り込みタブ + 下書き↔公開のインライン切替）
- `/records/new`・`/records/[id]/edit` — `RecordForm` + `PhotoPicker`
- `/records/next-lessons` — 全 active コマの「次回のじゅぎょう」をカード単位で編集
- `/records/announcements`（+ `new`・`[id]/edit`）— 掲載中/掲載予定/期限切れの3セクション
- ナビ（`src/components/nav/nav-items.ts`）に「記録」を追加済み
- `src/app/(app)/records/layout.tsx` に `maxDuration = 60`

生徒向け（19・`src/app/(kiroku)/`）:

- `/kiroku` — K1 合言葉。通過済みなら記憶クラス or クラスえらびへ振り分ける（判断はここだけが持つ）
- `/kiroku/select` — K2 クラスえらび。**クライアント JS ゼロ**（素の `<form action>` + `<button name="class_id">`）
- `/kiroku/[classId]` — K3 クラスページ（20）。sticky ヘッダー + クラスタブ + お知らせ + 次回のじゅぎょう + 今月のよてい + 記録カード。`copy-prompt-button.tsx` が生徒向け唯一のクライアント部品
- `(kiroku)/layout.tsx` — `metadata`（`robots: noindex` / `title.template` / `manifest` / `icons` / `appleWebApp`）と `viewport`（`themeColor` / `colorScheme`）と `dynamic = "force-dynamic"` だけの pass-through。**面は各ページが `entryCanvasClass` / `kirokuCanvasClass` で敷く**
- PWA（21）— `/kiroku` をホーム画面に追加できる。マニフェストとアイコンは `public/` 配下（下記「PWA まわりの落とし穴」）

### 22 以降で必ず踏まえること

19〜21 で済んだこと: anon クライアントの共通化 / middleware の合言葉分岐 / `(kiroku)` layout と `force-dynamic` / クラスページ本体 / PWA 一式。

- **`force-dynamic` は `(kiroku)/layout.tsx` の1か所で配下の page に効く**（18 からの申し送り。生徒向けは anon で読むため**ルートキャッシュが効いてしまい**、日付をまたいでも何のミューテーションも起きないので期限切れのお知らせが出続ける）。**⚠️ route handler には継承されない**
- **⚠️ キャッシュの確認は本番ビルドでしかできない。** `npm run dev` はルートキャッシュを適用しないので、`force-dynamic` が無くても「期限切れのお知らせが出ない」が通ってしまう。`rm -rf .next && npm run build && npm start` で確認する
- **⚠️ LAN の IP（`http://192.168.x.x:3000`）で実機確認するときは `npm run dev` を使う。** 本番ビルドだと合言葉 Cookie が `Secure` 付きになり、平文 http では保存されず合言葉画面から進めない（`secure: NODE_ENV === "production"`）。あわせて `navigator.clipboard` も非 secure context では undefined になる。**`http://localhost:3000` はこの制約に当てはまらない**（trustworthy origin 扱いなので本番ビルドでもゲートを通しで歩ける）
- **⚠️ 開発環境（WSL）に絵文字フォントが無い。** 📢 📅 📋 😊 は豆腐（□）で表示されるので、絵文字の見た目はヘッドレスでは確認できない（**実機では正しく出ることを 21 で確認済み**。豆腐を見ても製品の不具合ではない）
- **クラスタブは水曜午後クラスを足すと6個になり横スクロールする。** 実測で溢れ13px・アクティブタブは画面内・body は横スクロールしない（21 で DOM 複製により検証済み）。クライアント JS を持たないので自動スクロールはしない

### PWA まわりの落とし穴（21 で判明）

- **`app/manifest.ts` を作らない。** `public/manifest.webmanifest` と URL が衝突する。そもそも `(kiroku)` 配下に置いても**無言で無視され**（規約はアプリルート限定）、ルートに置くと管理画面まで `<link rel="manifest">` が付く
- **`(kiroku)` 配下で `icon.*` / `apple-icon.*` のファイル規約は効かない。** `(kiroku)/layout.tsx` に `metadata.icons` があると規約アイコンが全部無効になるため。アイコンは `public/icons/` + `metadata.icons` で一元管理する
- **`app/favicon.ico` を足さない。** `metadata.icons` があっても抑制されず、全ルート（`/kiroku` を含む）に入ってしまう
- **マニフェストの `scope` / `start_url` に末尾スラッシュを付けない。** `"/kiroku/"` にすると scope 指定ごと破棄されて `/` に化け、インストール済みアプリが管理画面まで飲み込む。警告は出ない
- **アイコンの差し替えは `public/icons/kiroku-icon.svg` を置き換えて `npm run icons` → PNG をコミット。** ただし **iOS はインストール済みのアイコンを更新しない**（生徒さんが削除して追加し直す必要がある）ので、配布前に絵柄を確定させる
- 「午前/午後」を出すかの判定は `src/lib/kiroku/classes.ts` の `periodLabels()` が単一の情報源。クラスえらび（K2）とクラスタブ（K3）で共用しているので、片方だけ書き換えない
- クラス色の**重複は許容される仕様**。色だけに頼らず見分けられるようにする。**クラスえらびは「曜日＋（同曜日に2コマ以上あるときだけ午前/午後）＋時間帯」で、クラス名は出さない**（REQUIREMENTS_phase2 §7 K2 の「クラス名を併記」を上書きする決定。19 のチケットに理由あり）

## フェーズ2の実装方針（チケット 13〜28 分割時に確定済み）

機能要件は REQUIREMENTS_phase2.md、デザインは DESIGN_v2.md + `docs/design-sample.html`（見た目の正典）。以下はチケット分割時のヒアリングで確定した横断事項（詳細は各チケット）。

- **マイルストーン**: M1=13〜21（生徒向け `/kiroku` 一式+管理入力。ここで先行お披露目）/ M2=22〜23（Gemini AI 下書き・他クラスコピー）/ M3=24〜28（既存管理画面の v2 刷新・v1 撤去）。13→14→15 は並行可
- **サイト名**: 「ほほ笑みラボ 授業の記録」で確定。合言葉は「ほほえみ」= env `KIROKU_PASSWORD`（httpOnly Cookie・有効期限1年目安）。PWA アイコンは実装時にデザインシステム準拠で作成（後日差し替え可）
- **ルーティング**: `(kiroku)` route group・全ページ noindex。`/kiroku`（合言葉）→ `/kiroku/select`（クラスえらび）→ `/kiroku/[classId]`（クラスページ）。middleware は `/kiroku` 配下を Supabase Auth 対象から外し**合言葉 Cookie で判定**する（`/api/keepalive` 除外を壊さないこと）。タブ切替では「自分のクラス」の記憶 Cookie を変更しない（選び直しはフッター導線）
- **anon RLS**: `lesson_records` は published のみ / `announcements` は掲載期間内のみ（日付判定は `(now() AT TIME ZONE 'Asia/Tokyo')::date`。UTC の `current_date` を使わない）/ `classes` は is_active / `closed_days` は全行。**students・attendance_records・payments の anon 完全遮断は変更しない**
- **管理側**: ナビに「記録」を追加し `/records` 配下に集約（記録カード CRUD・`next-lessons`・`announcements`）。**新設管理画面（16〜18）は最初から v2 デザインで実装する**（v1 シェルとの混在は画面単位として許容。ページ側でフルブリードのダーク面 `v2CanvasClass` を敷く）
- **v2 画面のフォーム（16 で確立）**: `<form action={formAction}>` を**使わない**。React 19 は action が throw せずに返ると**非制御フィールドを自動リセット**するため、`{fieldErrors}` を返すと入力が全部消える。`startTransition(() => formAction(fd))` の手動 dispatch にする（送信ボタンは `type="button"` + `form.reportValidity()`）。前例は `src/app/(app)/records/record-form.tsx`
  - **⚠️ 入力欄が1つだけのフォームは `onSubmit` で `preventDefault` する（19 で判明）**。1つだと Enter で HTML の暗黙送信が起きるが、このパターンには `action` も submit ボタンも無いのでブラウザが素の GET を投げ、ページがリロードされてエラー表示が消える。欄が2つ以上あると暗黙送信が抑止されるため既存画面では発現していない。前例は `src/app/(kiroku)/kiroku/gate-form.tsx`
  - **入力欄が無く action が必ず `redirect()` するフォームは、素の `<form action={serverAction}>` でよい**（リセットされる対象が無い）。クライアント JS がゼロになる。前例は `src/app/(kiroku)/kiroku/select/page.tsx`（押された `<button name="..." value="...">` は FormData に入る）
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

- ダーク基調 `#0b0d12` + クラス別アクセント。DB の `classes.theme_color` を **`accentStyle()`（`src/lib/accent.ts`）で CSS 変数 `--accent` に注入**し、Tailwind は `var(--accent)` 参照トークンを使う（動的 hex をクラス名に埋め込まない）。濃色端は `color-mix(in srgb, var(--accent) 55%, #000)` で導出
- 影・グラデーションは DESIGN_v2 §4 のレシピ内のみ（レシピ外の新造禁止）。角丸は 12/14/16/20/26/999 の段階制
- 役割色は固定: お知らせ=琥珀 / プロンプト=紫 / 休み・エラー=ローズ / 完了=緑。役割外への流用禁止
- フォントは Noto Sans JP（**可変フォント**で読み込み済み）。管理画面の基本アクセントはスカイ `#38bdf8` 固定・生徒向けは選択中クラスの色
- **トークン名は DESIGN_v2 §2 の対応表を見る**（仕様書の名前と Tailwind のキー名が一部異なる）。主なもの: 面 `bg-ground` / `bg-surface` / `bg-surface-2` / `bg-sunken`、文字 `text-fg` / `text-fg-body` / `text-sub`、枠 `border-line`、アクセント `accent` / `accent-soft` / `accent-deep` / `accent-line`、役割色は**色名ではなく役割名** `news` / `prompt` / `off` / `done`、影 `shadow-elev-1〜3` / `shadow-well` / `shadow-glow*`、塗り `bg-accent-fill` / `bg-sky-fill` / `bg-card` / `bg-glass` / `bg-tricolor`
- **`accent` 系トークンに opacity modifier（`bg-accent-soft/50`）を使わない。** Tailwind が `color-mix()` をパースできず、**CSS が1行も出力されずに黙って消える**。透明度は `color-mix` の % 側で表現する
- **同じプロパティのユーティリティを2つ並べない（19 で判明・20 で角丸にも拡大）。** `${inputClass} text-[23px]` のように後ろへ足しても勝つとは限らない（class 属性の並び順は無関係で、Tailwind が出力する CSS の順序で決まる）。`src/components/v2/{styles,form}.ts` の private な base（`fieldBase` / `buttonBase`）は**文字サイズも角丸も持たない**設計にしてあるので、別サイズ・別角丸が要る画面はそこから新しい定数を派生させる（`entryInputClass` / `entryButtonClass` / `copyButtonClass` が前例）
- **`<pre>` には `font-jp` を明示する（20 で判明）。** Tailwind の preflight が `code, kbd, samp, pre` に `fontFamily.mono` を当てるため、指定しないと日本語が等幅フォールバックで崩れる。あわせて `whitespace-pre-wrap break-words`（375px で長い URL が溢れない）
- **hover の動きは押せる要素だけに付ける（20 で判明）。** Tailwind 3.4 は `hoverOnlyWhenSupported` が既定オフ（v4 で既定になった）なので、`hover:-translate-y-*` はタップでも発火して貼り付く。カードなど押せない要素に付けない（DESIGN_v2 §6）

### v1（DESIGN.md — 未刷新画面の保守のみ）

- アクセントは Action Blue `#0066cc` の1色のみ・セマンティックカラー禁止 / box-shadow・グラデーション禁止（階層は面の色替え+1px ヘアライン）/ 角丸 8/18/pill の3値 / ウェイト 400/600 のみ
