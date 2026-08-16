# 16. 管理: 記録カード管理（ナビ「記録」新設・CRUD・写真アップロード）

**依存**: 13, 14, 15
**参照**: REQUIREMENTS_phase2.md §8.1 / DESIGN_v2.md §8 / SPEC.md §8（CRUD の型）
**マイルストーン**: M1

## 目的

記録カード（1授業=1件）を管理画面から手動で作成・公開できるようにする。AI 下書き（22）・他クラスコピー（23）はこのフォームに後付けする。

## 方針

- **新設する管理画面（16〜18）は最初から v2 デザインで実装する**（M3 での作り直しを避ける）。共通シェルが v1 の間は画面単位の新旧混在として許容し、ページ側でフルブリードのダーク背景を敷く（月次集計ヒーローの `-mx-4 -mt-6 md:-mx-8` が前例）
- Server Action・フォームの作りは既存 CRUD の型（Zod `safeParse` → `{fieldErrors|formError}` / 成功時 `revalidatePath`+`redirect` / `useActionState`+非制御入力）を踏襲する

## Todo

- [x] ナビに「記録」を追加する（`/records`。`nav-items.ts` に追記し、PC サイドバー・モバイル下部タブの両方に反映）
- [x] `/records` 一覧: クラス×新しい順で記録カードを表示。下書き/公開の状態が一目で分かる表示。上部に「次回のじゅぎょう」（17）「お知らせ」（18）への導線を置く
  - **日付順フラット + クラス絞り込みタブ**にした（週次の「この前の授業の記録を書く」作業に合う）。導線のボタンは置いたが、**リンク先は 17・18 の実装まで 404**
  - **一覧から下書き↔公開を切り替えられる**ようにした（`setRecordStatus`・楽観的更新）
- [x] `/records/new`・`/records/[id]/edit` + 共有 `RecordForm`: クラス選択（active コマ・テーマカラーのスウォッチ併記）/ 日付（既定=今日 `todayJst()`）/ テーマ / ひとことメモ / プロンプト（任意）/ 状態（下書き・公開）
- [x] 写真アップロード最大2枚: クライアントでプレビュー表示 → Server Action で受け取り `image.ts`（リサイズ+WebP）→ `r2.ts` で保存し URL を `image_urls` へ。既存写真の差し替え・削除も可能にする
- [x] Server Action（create/update）: Zod 検証。`UNIQUE(class_id, lesson_date)` 違反（Postgres `23505`）は「このクラスのこの日付には既に記録があります」と表示する（08 休講日の前例踏襲）
- [x] 更新時は `updated_at = now()` をアプリ側でセットする
- [x] 削除: **物理削除** + `ConfirmDialog`。R2 の画像もベストエフォート削除する（他カードが同じ URL を参照していないことを確認してから消す）
- [x] 任意テキスト（プロンプト）は `nullIfEmpty` で空文字→null 化
- [x] 変更成功時は `/records` 系と `/kiroku` 系を `revalidatePath` する

### 実装中に確定した事項

- [x] **`<form action={formAction}>` を使わない**。React 19 は action が throw せずに返ると**非制御フィールドを自動リセット**するため、`{fieldErrors}` を返した瞬間にテーマ・メモ・写真の選択が全部消える。「同じクラス・同じ日付」は日常的に起きるエラーなので致命的。`startTransition(() => formAction(fd))` の**手動 dispatch** にして回避した（form 送信ではないのでリセットされない）
  - 副作用として送信ボタンが `type="button"` になるため、`form.reportValidity()` を明示的に呼ぶ。「下書き保存」「公開する」の2ボタンに `status` を出し分けられる利点もある
- [x] **ファイル入力に `name` を付けない**。付けると `new FormData(form)` に原寸ファイルが入り、ブラウザ縮小を回避して送る経路ができてしまう。縮小済みの File だけを親が `append` する
- [x] **合計バイト数のクライアント側ガード**（3.5MB）。`shrinkImageInBrowser` は縮小に失敗すると元ファイルを返す仕様で、そのまま送ると **Vercel の 413 は Server Action に到達する前に起きるため捕捉できない**（画面が固まったように見える）
- [x] **送られてきた既存写真 URL を信用しない**。更新時は DB の現在値と突き合わせ、含まれるものだけを残す（細工したフォームから任意 URL を `image_urls` に書き込まれ、生徒向けページに表示されるのを防ぐ）
- [x] **順序は 検証 → 重複の事前チェック → upload → DB**、DB 失敗時は**補償削除**。先に insert して後から画像 URL を update する案は採らない（失敗すると「写真のない公開済みカード」が生徒に見え、孤児より悪い）
- [x] `redirect()` は `try/catch` の外（`NEXT_REDIRECT` を throw するため）
- [x] `src/lib/form.ts` に `toFieldErrors` / `nullIfEmpty` を集約（classes / closed-days / students の3ファイルで重複していた）。`MAX_PHOTOS` は `src/lib/records.ts`（`"use server"` からは非 async を export できないため）
- [x] `src/components/v2/` に `confirm-dialog.tsx` / `toast.tsx` を追加（v1 版はダーク面で読めない。**チケット24 で v1 を撤去する**）
- [x] `records/layout.tsx` に `maxDuration = 60`（Fluid Compute 無効時の既定 10s では画像2枚が超えうる保険）

## 完了条件

- [x] 記録カードを「作成（写真付き）→ 下書き保存 → 公開 → 編集 → 削除」の一連で操作できる
  → ブラウザで確認済み。Server Action 10回すべて成功、エラーログなし。
  **操作後の R2 バケットはオブジェクト0件**（差し替え・削除した画像がすべて回収され、孤児なし）
- [x] 公開分のみが anon で読める（draft が生徒向けに漏れない）ことを確認する
  → anon キーで `lesson_records` を取得: published の1件のみが返り、draft は返らない。`students` は空

## 後続チケットへの申し送り

- **17 / 18**: `/records` の「次回のじゅぎょう」「お知らせ」ボタンのリンク先を実装する（現在 404）
- **22 / 23**: `RecordForm` にボタンを足す形で後付けする。写真は `picked` state に縮小済み File が入っている
- **27**: 既存の `ClassForm` / `ClosedDayForm` / `StudentForm` にも React 19 のフォーム自動リセット問題がある（サーバー側エラーで入力が消える）。v2 刷新のときに `RecordForm` と同じ手動 dispatch へ寄せる
