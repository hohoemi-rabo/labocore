# 14. フェーズ2 DB スキーマ（テーブル追加・RLS・型再生成）

**依存**: なし
**参照**: REQUIREMENTS_phase2.md §6・§10 / SPEC.md §4・§13 / DESIGN_v2.md §3
**マイルストーン**: M1

## 目的

授業記録機能のデータモデルを Supabase に追加する。生徒向け閲覧（anon）と管理操作（authenticated）を RLS で分離し、既存の個人情報テーブルの anon 遮断は一切変更しない。

## Todo

- [x] `classes` に列追加: `theme_color` text NOT NULL DEFAULT '#38bdf8' / `next_lesson_date` date NULL / `next_lesson_theme` text NULL / `next_lesson_note` text NULL
  - `theme_color` には `^#[0-9a-fA-F]{6}$` の CHECK も付けた（この値は `accentStyle()` 経由で CSS 変数 `--accent` に直接入るため）
- [x] 既存コマに DESIGN_v2.md §3 の対応表どおり `theme_color` を投入する（月=#f43f5e / 火=#fb923c / 水午前=#38bdf8 / 水午後=#818cf8 / 木=#34d399 / 金=#e879f9）
  - **実際のコマは月〜金の午前5件のみで「水曜午後クラス」は未登録**。#818cf8 は将来枠として予約した（開講したらコマ管理画面から登録する。要件 §6 のとおり新規開発不要）。投入 SQL は weekday + start_time で振り分けているので、後から水曜午後が増えても正しい色が当たる
- [x] `lesson_records` を作成: id uuid PK / class_id uuid NOT NULL FK→classes / lesson_date date NOT NULL / theme text NOT NULL / memo text NOT NULL / prompt text NULL / image_urls text[] DEFAULT '{}' / status text NOT NULL CHECK in ('draft','published') DEFAULT 'draft' / created_at・updated_at timestamptz DEFAULT now()
  - `image_urls` に `cardinality(image_urls) <= 2` の CHECK を追加（要件の「最大2枚」を DB でも担保。`array_length` は空配列で NULL を返すため使わない）
- [x] `lesson_records` に **UNIQUE(class_id, lesson_date)** と `idx_lesson_records_class_date (class_id, lesson_date DESC)` を付与
- [x] `announcements` を作成: id uuid PK / title text NOT NULL / body text NOT NULL / class_id uuid NULL FK→classes（**NULL=全体向け**）/ starts_on・ends_on date NOT NULL / created_at timestamptz DEFAULT now()。`idx_announcements_ends_on (ends_on)` を付与
  - `starts_on <= ends_on` の CHECK を追加（逆転して登録すると anon ポリシーの between に一生かからず、エラーも出ないまま「登録したのに表示されない」状態になるため）
- [x] 両新テーブルで RLS を有効化し、既存と同型の `authenticated_all`（`(SELECT auth.uid()) IS NOT NULL`・initplan パターン）を付与する
- [x] anon SELECT ポリシーを追加する:
  - `classes`: `is_active = true` の行のみ
  - `lesson_records`: `status = 'published'` の行のみ（下書きは DB レベルで見えない）
  - `announcements`: 掲載期間内のみ。**日付判定は `(now() AT TIME ZONE 'Asia/Tokyo')::date` を使う**（`current_date` は UTC のため朝9時まで前日扱いになるズレを避ける）
  - `closed_days`: 全行 SELECT 可（個人情報なし・今月のよてい表示用）
- [x] `students` / `attendance_records` / `payments` には anon ポリシーを**付けない**（現状の完全遮断を維持）ことを確認する
- [x] `database.types.ts` を MCP `generate_typescript_types` で再生成する
- [x] Supabase セキュリティアドバイザで新規 WARN が出ていないことを確認する

### 実装中に判明した重要事項（SPEC.md §4.8・§13 に反映済み）

- [x] **`public` の DEFAULT PRIVILEGES は新規テーブルに anon の全権限（SELECT/INSERT/UPDATE/DELETE 等）を自動付与する**。anon を止めているのは GRANT ではなく **RLS だけ**。→ `create table` と `enable row level security` は**必ず同一マイグレーションに入れる**（分けるとその間だけ anon から読み書き自由になる）。`grant select` を明示する必要はない
- [x] anon の DELETE は RLS で0行に絞られるため、PostgREST は **204 を返すが何も消えない**。ステータスコードだけで拒否判定をしないこと（実測確認済み）
- [x] `src/app/api/keepalive/route.ts` と CLAUDE.md のコメントを更新（`classes` に anon SELECT を足したので、keepalive の件数が 0 ではなくなった。動作には影響なし）

### 後続チケットへの申し送り

- **16**: `updated_at` はトリガを置いていないので、更新の Server Action で必ず `now()` をセットする。`image_urls` の CHECK 違反は `23514`（UNIQUE 違反 `23505` と同じ場所で拾う）
- **17**: コマ管理フォームで `theme_color` を**必須選択**にする。新規コマは既定値 `#38bdf8` になるため、水曜午後を追加すると水曜午前と色が衝突する。Zod は `^#[0-9a-f]{6}$` で検証し**小文字に正規化**する（DB の CHECK は大文字も通すが、`CLASS_THEME_COLORS` との突き合わせは大小文字を区別するため）
- **18**: `starts_on <= ends_on` は DB にも CHECK があるが、ユーザーに見せるエラーは Zod 側で出す（DB の `23514` を見せない）
- **運用**: `closed_days.reason` は生徒向けページに**そのまま表示される**。内部メモを書かないこと

## 完了条件

- anon キーで published の `lesson_records`・期間内の `announcements`・active の `classes`・`closed_days` が読める
- anon キーで draft の記録・期間外のお知らせ・`students` / `attendance_records` / `payments` が読めない
- 既存機能（出欠・集計・keepalive）に影響がない
