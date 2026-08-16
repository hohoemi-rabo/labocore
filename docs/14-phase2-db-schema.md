# 14. フェーズ2 DB スキーマ（テーブル追加・RLS・型再生成）

**依存**: なし
**参照**: REQUIREMENTS_phase2.md §6・§10 / SPEC.md §4・§13 / DESIGN_v2.md §3
**マイルストーン**: M1

## 目的

授業記録機能のデータモデルを Supabase に追加する。生徒向け閲覧（anon）と管理操作（authenticated）を RLS で分離し、既存の個人情報テーブルの anon 遮断は一切変更しない。

## Todo

- [ ] `classes` に列追加: `theme_color` text NOT NULL DEFAULT '#38bdf8' / `next_lesson_date` date NULL / `next_lesson_theme` text NULL / `next_lesson_note` text NULL
- [ ] 既存コマに DESIGN_v2.md §3 の対応表どおり `theme_color` を投入する（月=#f43f5e / 火=#fb923c / 水午前=#38bdf8 / 水午後=#818cf8 / 木=#34d399 / 金=#e879f9）
- [ ] `lesson_records` を作成: id uuid PK / class_id uuid NOT NULL FK→classes / lesson_date date NOT NULL / theme text NOT NULL / memo text NOT NULL / prompt text NULL / image_urls text[] DEFAULT '{}' / status text NOT NULL CHECK in ('draft','published') DEFAULT 'draft' / created_at・updated_at timestamptz DEFAULT now()
- [ ] `lesson_records` に **UNIQUE(class_id, lesson_date)** と `idx_lesson_records_class_date (class_id, lesson_date DESC)` を付与
- [ ] `announcements` を作成: id uuid PK / title text NOT NULL / body text NOT NULL / class_id uuid NULL FK→classes（**NULL=全体向け**）/ starts_on・ends_on date NOT NULL / created_at timestamptz DEFAULT now()。`idx_announcements_ends_on (ends_on)` を付与
- [ ] 両新テーブルで RLS を有効化し、既存と同型の `authenticated_all`（`(SELECT auth.uid()) IS NOT NULL`・initplan パターン）を付与する
- [ ] anon SELECT ポリシーを追加する:
  - `classes`: `is_active = true` の行のみ
  - `lesson_records`: `status = 'published'` の行のみ（下書きは DB レベルで見えない）
  - `announcements`: 掲載期間内のみ。**日付判定は `(now() AT TIME ZONE 'Asia/Tokyo')::date` を使う**（`current_date` は UTC のため朝9時まで前日扱いになるズレを避ける）
  - `closed_days`: 全行 SELECT 可（個人情報なし・今月のよてい表示用）
- [ ] `students` / `attendance_records` / `payments` には anon ポリシーを**付けない**（現状の完全遮断を維持）ことを確認する
- [ ] `database.types.ts` を MCP `generate_typescript_types` で再生成する
- [ ] Supabase セキュリティアドバイザで新規 WARN が出ていないことを確認する

## 完了条件

- anon キーで published の `lesson_records`・期間内の `announcements`・active の `classes`・`closed_days` が読める
- anon キーで draft の記録・期間外のお知らせ・`students` / `attendance_records` / `payments` が読めない
- 既存機能（出欠・集計・keepalive）に影響がない
