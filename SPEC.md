# LaboCore 実装仕様書（フェーズ1・as-built）

本書は **現在本番稼働中の実装をそのまま記述した仕様書**（as-built）である。フェーズ2の設計・実装の土台として使う。

- 要件の意図・背景は [`REQUIREMENTS.md`](./REQUIREMENTS.md)、デザインの原則は [`DESIGN.md`](./DESIGN.md) が正典。本書は「結局どう実装されているか」を一次情報（コード・DB）と突き合わせて記述する。
- 対象範囲: フェーズ1（チケット `docs/01`〜`12`）。全チケット完了・本番稼働中。
- 本番 URL: https://labocore.vercel.app

---

## 1. プロダクト概要

- **LaboCore（ラボコア）** — シニア向けパソコン・スマホ教室「ほほ笑みラボ」の教室運営システム。
- **利用者は管理者1名のみ**（先生本人）。生徒・家族向けの画面はない。新規登録画面も持たない。
- 授業中のスマホ操作（ワンタップ出欠）と PC 事務作業の両方で使う **レスポンシブ必須**アプリ（スマホ幅 375px〜想定）。
- フェーズ1のスコープ: **出欠記録・月謝（請求額）計算・生徒台帳**。
- スコープ外（フェーズ2候補）: 請求書/領収書PDF、事前欠席連絡、生徒向け出席閲覧、LINE通知、過去データ取込、つまずきカルテ連携。

---

## 2. 技術スタック・構成

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 15.5.21（App Router）+ React 19.1.0 + TypeScript strict |
| スタイリング | Tailwind CSS **v3.4**（意図的に v4 ではない。`tailwind.config.ts` の `theme.extend` + `globals.css` の `@tailwind` ディレクティブ方式） |
| バリデーション | Zod 4.4 |
| BaaS | Supabase（Auth / PostgreSQL / RLS）。`@supabase/ssr` 0.12 + `@supabase/supabase-js` 2.110 |
| デプロイ | Vercel（GitHub 連携・`main` push で自動デプロイ）。ビルドは Turbopack |
| パスエイリアス | `@/*` → `./src/*` |
| テスト | フレームワーク未導入（フェーズ1では手動確認） |

- npm スクリプト: `dev`（`next dev --turbopack`）/ `build`（`next build --turbopack`）/ `start` / `lint`（`eslint`）/ `verify:r2`（R2 疎通確認）/ `icons`（生徒向けアイコンの PNG 生成）。
- `next.config.ts`: `experimental.serverActions.bodySizeLimit = "4mb"`（写真アップロード用・Vercel の実質上限 4.5MB に合わせる）/ `outputFileTracingIncludes` で `/records` 配下に `node_modules/@img/**` を明示的に含める。
  - **⚠️ 後者が無いと本番で `/records` 系が 500 になる。** 既定のトレースは `@img/sharp-libvips-linux-x64`（共有ライブラリ）は拾うのに、**N-API バインディング本体の `@img/sharp-linux-x64`（`.node`）を取りこぼす**ため、`require("sharp")` が「Could not load the "sharp" module using the linux-x64 runtime」で失敗する。ローカルの `npm start` は `node_modules` を直接見るので再現せず、ビルドも成功する。
- Supabase プロジェクト ref: `labocore = hjcctlwaabkogeybqlbi`。PostgREST 14.5 / Postgres。

### 環境変数

| 変数 | 用途 | 必須 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | ✅（ローカル/本番） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon（publishable）キー。保護は RLS が担う | ✅（ローカル/本番） |
| `CRON_SECRET` | keepalive cron の Bearer 認証用 | 本番のみ（Vercel Production に設定済み） |
| `KIROKU_PASSWORD` | 生徒向けページ `/kiroku` の合言葉（「ほほえみ」）。未設定なら合言葉画面から先へ進めない（fail-closed） | ✅（ローカル/本番） |

---

## 3. デプロイ・運用

- **自動デプロイ**: `main` へ push → Vercel が本番ビルド。
- **keepalive cron**（Supabase 無料枠のスリープ防止）:
  - `vercel.json` の `crons` で `/api/keepalive` を `0 3 * * *`（**UTC** = 12:00 JST）に1日1回実行。
  - Supabase は7日間無アクティビティで一時停止するため1日1回で十分（Hobby プランの cron 上限とも一致）。
  - `src/app/api/keepalive/route.ts`: `GET`・`export const dynamic = "force-dynamic"`。`Authorization: Bearer ${CRON_SECRET}` を検証（不一致 401、`CRON_SECRET` 未設定なら 500）。`classes` に `select("id", { head: true, count: "exact" })` の軽量クエリを投げ、成功で `{ ok: true, timestamp }`、失敗で 500 `{ ok: false }`。**200 を返すだけでは DB アクティビティにならない**ため実クエリ必須。
  - cookie を持たない実行なので `@/lib/supabase/server.ts`（cookie 前提）ではなく `src/lib/supabase/anon.ts` の `createAnonClient()`（生徒向け `/kiroku` と共用）を使う。件数が何件かは目的ではなく、クエリが Postgres に到達することが目的。
  - `src/middleware.ts` の matcher で `/api/keepalive` を認証対象から除外済み（除外しないと未認証扱いで `/login` にリダイレクトされ機能しない）。
- **残運用タスク**: Supabase Dashboard の漏洩パスワード保護（HaveIBeenPwned 照合）の有効化のみ（セキュリティアドバイザで WARN 1件）。パフォーマンスアドバイザは指摘ゼロ。

---

## 4. データモデル（PostgreSQL / Supabase）

全テーブル `public` スキーマ。PK は `uuid`（`gen_random_uuid()`）。**全テーブルで RLS 有効**。

### 4.1 `classes`（コマ＝曜日・時間固定のクラス）

| 列 | 型 | 制約・既定 |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `name` | text | NOT NULL |
| `weekday` | int | NOT NULL, **CHECK 0–6**（0=日〜6=土） |
| `start_time` | time | nullable |
| `end_time` | time | nullable |
| `is_active` | bool | 既定 `true`（論理削除フラグ） |
| `created_at` | timestamptz | 既定 `now()` |
| `theme_color` | text | NOT NULL, 既定 `'#38bdf8'`, **CHECK 正規表現 `^#[0-9a-fA-F]{6}$`**（フェーズ2追加。生徒向け画面の差し色。`src/lib/accent.ts` の `accentStyle()` で CSS 変数 `--accent` に注入される） |
| `next_lesson_date` | date | nullable（フェーズ2追加。次回のじゅぎょう） |
| `next_lesson_theme` | text | nullable（同上） |
| `next_lesson_note` | text | nullable（同上・持ち物メモ） |

- インデックス: PK のみ。
- 次回情報はクラスごとに常に1件のため専用テーブルを作らず `classes` に持たせている。

### 4.2 `students`（生徒台帳）

| 列 | 型 | 制約・既定 |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | NOT NULL |
| `kana` | text | NOT NULL（一覧・集計の並び順キー） |
| `class_id` | uuid | NOT NULL, **FK → classes.id** |
| `unit_price` | int | 既定 `2000`（1回あたり単価・円） |
| `phone` / `email` / `address` | text | nullable（任意） |
| `birth_date` | date | nullable |
| `smartphone_os` | text | nullable, **CHECK in ('android','iphone')** |
| `emergency_contact_name` / `_relation` / `_phone` | text | nullable |
| `note` | text | nullable（自由メモ1フィールド） |
| `is_active` | bool | 既定 `true`（論理削除フラグ） |
| `created_at` | timestamptz | 既定 `now()` |

- インデックス: PK, `idx_students_class_id (class_id)`。

### 4.3 `attendance_records`（出欠記録）

| 列 | 型 | 制約・既定 |
|---|---|---|
| `id` | uuid | PK |
| `student_id` | uuid | NOT NULL, **FK → students.id** |
| `lesson_date` | date | NOT NULL |
| `status` | text | NOT NULL, **CHECK in ('present','absent')** |
| `unit_price_at_time` | int | NOT NULL（**記録時点の単価スナップショット**） |
| `memo` | text | nullable（現状 UI からは未使用・将来用） |
| `created_at` | timestamptz | 既定 `now()` |

- **UNIQUE(`student_id`, `lesson_date`)** — 1生徒1日1件。
- インデックス: PK, UNIQUE(student_id, lesson_date), `idx_attendance_lesson_date (lesson_date)`（日/月範囲検索用）。

### 4.4 `closed_days`（休講日）

| 列 | 型 | 制約・既定 |
|---|---|---|
| `id` | uuid | PK |
| `closed_date` | date | **UNIQUE** |
| `reason` | text | nullable（理由メモ） |

- インデックス: PK, UNIQUE(closed_date)。

### 4.5 `payments`（月次支払いチェック）

| 列 | 型 | 制約・既定 |
|---|---|---|
| `id` | uuid | PK |
| `student_id` | uuid | NOT NULL, **FK → students.id** |
| `target_month` | text | NOT NULL, **CHECK 正規表現 `^\d{4}-\d{2}$`**（'YYYY-MM'） |
| `is_paid` | bool | 既定 `false` |
| `paid_at` | timestamptz | nullable（支払い済みにした時刻） |

- **UNIQUE(`student_id`, `target_month`)**。
- インデックス: PK, UNIQUE(student_id, target_month), `idx_payments_target_month (target_month)`（月単独検索用）。

### 4.6 `lesson_records`（記録カード・フェーズ2）

| 列 | 型 | 制約・既定 |
|---|---|---|
| `id` | uuid | PK |
| `class_id` | uuid | NOT NULL, **FK → classes.id** |
| `lesson_date` | date | NOT NULL |
| `theme` | text | NOT NULL（テーマ＝カードの見出し） |
| `memo` | text | NOT NULL（ひとことメモ） |
| `prompt` | text | nullable（その日 AI に送った指示文・コピーボタン用） |
| `image_urls` | text[] | NOT NULL 既定 `'{}'`, **CHECK `cardinality(image_urls) <= 2`**（R2 の公開 URL を完全な形で保存） |
| `status` | text | NOT NULL 既定 `'draft'`, **CHECK in ('draft','published')** |
| `created_at` / `updated_at` | timestamptz | 既定 `now()` |

- **UNIQUE(`class_id`, `lesson_date`)** — 1クラス1日1件。
- インデックス: PK, UNIQUE(class_id, lesson_date), `idx_lesson_records_class_date (class_id, lesson_date DESC)`。
- 削除は**物理削除**（出欠・生徒と違い履歴を残す必要がないため）。
- `updated_at` はトリガを置かず**アプリ側で `now()` をセット**する（既定値は INSERT 時にしか効かない）。

### 4.7 `announcements`（教室からのお知らせ・フェーズ2）

| 列 | 型 | 制約・既定 |
|---|---|---|
| `id` | uuid | PK |
| `title` / `body` | text | NOT NULL |
| `class_id` | uuid | nullable, **FK → classes.id**（**NULL = 全体向け**） |
| `starts_on` / `ends_on` | date | NOT NULL（掲載期間）, **CHECK `starts_on <= ends_on`** |
| `created_at` | timestamptz | 既定 `now()` |

- インデックス: PK, `idx_announcements_ends_on (ends_on)`。
- 掲載期間を過ぎたものは RLS で自動的に生徒向けから消えるため、消し忘れが事故にならない。

### 4.8 参照整合性・RLS

- 全 FK は **ON DELETE 指定なし（NO ACTION）**。生徒・コマは物理削除せず論理削除（`is_active=false`）運用のため、過去の出欠・請求履歴が守られる。
- **管理操作のポリシー（全7テーブル共通）**: 名前 `authenticated_all`・PERMISSIVE・ロール `authenticated`・コマンド `ALL`・条件 `(SELECT auth.uid()) IS NOT NULL`（USING / WITH CHECK とも）。
  - 管理者1名運用のため所有者スコープ等は持たない。
  - `(SELECT auth.uid())` の initplan キャッシュパターンで記述（行ごとの関数呼び出しを避ける）。
- **anon 読み取りポリシー（フェーズ2・生徒向け `/kiroku` 用）**: `/kiroku` は Supabase Auth を使わず anon ロールで読むため、**RLS がそのままセキュリティ境界**になる。

  | テーブル | ポリシー | 条件 |
  |---|---|---|
  | `classes` | `anon_select_active` | `is_active = true` |
  | `closed_days` | `anon_select_all` | `true`（個人情報なし。ただし `reason` は生徒に見える自由記述） |
  | `lesson_records` | `anon_select_published` | `status = 'published'`（下書きは DB レベルで見えない） |
  | `announcements` | `anon_select_in_period` | `(now() AT TIME ZONE 'Asia/Tokyo')::date BETWEEN starts_on AND ends_on` |
  | `students` / `attendance_records` / `payments` | **なし** | anon 向けポリシーが1本もない = RLS が全拒否 |

  - 日付判定に `current_date` を**使わない**。DB のタイムゾーンは UTC のため、JST の 00:00〜09:00 に1日前を返し掲載期間が1日ずれる。
  - ポリシーはロール `anon` 限定。PERMISSIVE は同一ロール内でのみ OR 合成されるため、`authenticated` の権限は変わらない。
- **⚠️ GRANT について**: `public` スキーマの DEFAULT PRIVILEGES により、**新規テーブルには `anon` へ全権限（SELECT/INSERT/UPDATE/DELETE 等）が自動付与**される。anon を止めているのは GRANT ではなく **RLS だけ**。→ 新テーブルを作るときは `create table` と `enable row level security` を**必ず同一マイグレーションに入れる**（分けるとその間だけ anon から読み書き自由になる）。
  - 補足: anon の DELETE は RLS で0行に絞られるため、PostgREST は **204 を返すが何も消えない**。ステータスコードだけで拒否判定をしないこと。
- 参考データ規模（本番・概数）: classes 5 / students 18 / attendance_records 85 / closed_days 4 / payments 13 / lesson_records 0 / announcements 0。10〜30人規模のためパフォーマンスチューニングは不要方針。

---

## 5. ドメイン不変条件（ビジネスルール）

フェーズ2でも必ず維持すること。

1. **単価スナップショット方式**: 出欠を present で記録するとき、その生徒の**現在単価をサーバで読み取り** `attendance_records.unit_price_at_time` へコピーする。請求額は常に `SUM(unit_price_at_time) WHERE status='present'` で導出。→ **生徒マスタの単価を変更しても過去の請求額は変わらない**。
2. **出欠は1日1件**: `UNIQUE(student_id, lesson_date)`。振替制度なし。締めはカレンダー月。
3. **論理削除**: 生徒・コマの「退会/廃止」は `is_active=false`。過去の出欠・請求履歴は保持。休講日（`closed_days`）と出欠記録の取り消しは**物理削除**。
4. **月次集計は集計テーブルを持たない**: 毎回 `attendance_records` を月範囲取得して **JS で集約**（PostgREST は任意の GROUP BY を組めないため）。月キーは `lesson_date.slice(0,7)`。
5. **休講日は出欠対象外**: 今日/対象日が `closed_days` にあれば出欠 UI を出さず「休講」表示のみ。
6. **単価の通貨**: 円・整数（`int`）。表示は `toLocaleString('ja-JP')`。

---

## 6. 認証・認可

- Supabase Auth（メール+パスワード）。**管理者1名を Supabase Dashboard で手動作成**（新規登録画面なし）。
- **middleware で管理側の全ルートを保護**（`src/middleware.ts` → `src/lib/supabase/middleware.ts` の `updateSession`）:
  - matcher は静的ファイルと `/api/keepalive` を除外し、それ以外全ルートで実行。
  - ただし `/kiroku` 配下だけは `middleware.ts` 側で分岐し、`updateSession` を呼ばずに合言葉 Cookie で判定する（下記「生徒向け `/kiroku` の合言葉ゲート」）。
  - matcher はチケット21 で**拡張子の除外グループに `webmanifest` を1語だけ追加**した（`.*\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$`）。前方一致の枝（`api/keepalive` 等）は無変更で、`/api/keepalive` の除外はそのまま。
  - `supabase.auth.getClaims()` でセッション更新。未認証で `/login` 以外 → `/login` へリダイレクト。認証済みで `/login` → `/` へ。
  - `createServerClient` と `getClaims()` の間にコードを挟まない（セッションがランダム失効する不具合回避）。`getSession()` はサーバーで使わない。
- ログイン: `src/app/(auth)/login/actions.ts` の `login`。Zod 検証 → `signInWithPassword` → 失敗は**原因を伏せた汎用メッセージ**（列挙攻撃対策）→ 成功で `revalidatePath("/","layout")` → `redirect("/")`。
- ログアウト: `src/lib/auth/actions.ts` の `signOut` → `/login` へ。

### Supabase クライアントの使い分け（`src/lib/supabase/`）

| ファイル | 用途 |
|---|---|
| `server.ts` `createClient()` | Server Component / Server Action 用（cookie ベース・`await` 必須） |
| `client.ts` `createClient()` | Client Component 用 |
| `anon.ts` `createAnonClient()` | cookie を持たない文脈用（keepalive cron・生徒向け `/kiroku`）。届く行は anon の RLS ポリシーが決める |
| `middleware.ts` `updateSession()` | 管理側ルートの保護・セッション更新 |
| `database.types.ts` | MCP `generate_typescript_types` 出力。全クライアントに `<Database>` 適用。**スキーマ変更後は必ず再生成** |

### 生徒向け `/kiroku` の合言葉ゲート（フェーズ2・チケット19）

生徒さんには Supabase アカウントを配らず、教室で口頭共有する合言葉で仕切る（REQUIREMENTS_phase2 §4）。

- **判定は middleware**（`src/middleware.ts` の `kirokuGate`）。`/kiroku` 自身は Cookie なしで通し、それ以外の `/kiroku/*` は Cookie 不一致なら `/kiroku` へ 307（`?next=` は持たせない）。Server Action の POST もページ URL 宛なのでここを通る。
- **Cookie は2本**（属性は `src/lib/kiroku/gate.ts` の `kirokuCookieOptions` に集約）:

| 名前 | 中身 | 属性 |
|---|---|---|
| `kiroku_gate` | `KIROKU_PASSWORD` から導出した SHA-256 hex | httpOnly / `path=/kiroku` / `sameSite=lax` / `secure` は本番のみ / `maxAge` 1年 |
| `kiroku_class` | 記憶しているクラスの uuid | 同上 |

- トークンは `sha256("labocore:kiroku:v1:" + 合言葉)`。**秘密ではない**（合言葉を知っていれば誰でも計算できる）。狙いは合言葉を変えたときに配布済み Cookie が自動失効すること。
- `KIROKU_PASSWORD` 未設定時は **fail-closed**（トークン null＝常に不一致）。合言葉画面自体は開くのでリダイレクトループにはならず、送信時に設定エラー用の別文言を返す。
- `src/lib/kiroku/gate.ts` は **Edge の middleware と Node の Server Action の両方から import される純粋モジュール**。`next/headers` も Supabase も持ち込まない。ハッシュは Web Crypto（`require("crypto")` は Edge ビルドを壊す）。
- **`cookies().delete(name)` は `path=/` で消しにいくため `path=/kiroku` の Cookie には効かない。** 消すときは `set(name, "", { ...kirokuCookieOptions, maxAge: 0 })`。
- ルーティング: `/kiroku`（合言葉・通過済みなら振り分け）→ `/kiroku/select`（クラスえらび）→ `/kiroku/[classId]`（クラスページ）。振り分けの判断は `/kiroku/page.tsx` だけが持つ。
- **`export const dynamic = "force-dynamic"` は `(kiroku)/layout.tsx` に1か所**。配下の page には継承されるが **route handler には継承されない**。anon で読むためルートキャッシュが効いてしまい、日付をまたいでもミューテーションが起きないので期限切れのお知らせが残り続けるのを防ぐ目的。
- **セキュリティの位置づけ（正直な注記）**: 合言葉はアプリ層のゲートで、授業記録系テーブルは anon に読み取りを許可しているため、API を直接叩けば合言葉なしでも読める。掲載内容を「顔なし・個人情報なしの授業記録」に限る運用でカバーする（生徒台帳・出欠・支払いは anon 完全遮断のまま）。
- **`kirokuCookieOptions.secure` は `NODE_ENV === "production"`。** そのため本番ビルドを平文 http（LAN の IP 等）で開くと Cookie が保存されず合言葉画面から進めない。実機確認は `npm run dev` で行う（本番は常に https なので影響なし）。

### クラスページ `/kiroku/[classId]`（チケット20）

セクション順（サンプル画面3準拠）: ページ見出し → お知らせ ×N → 次回のじゅぎょう → 今月のよてい → 「これまでのじゅぎょう」見出し → 記録カード ×N（0件なら破線の空状態）。`header` / `main` / `footer` は兄弟で、ヘッダーだけ sticky + `backdrop-blur`。

- **取得は `Promise.all` で4本**（すべて `createAnonClient()`）:

| 取得 | 並び順・要点 |
|---|---|
| `listActiveClasses()` | タブ・classId 検証・次回のじゅぎょうを兼ねる（`cache()` 済み） |
| `lesson_records` | `lesson_date` 降順。`class_id` と `status='published'` で絞る（published は RLS でも保証） |
| `announcements` | `starts_on` 降順 → `created_at` 降順（同日タイの並びを固定するため） |
| `closed_days` | 当月レンジ（`shiftMonth` で翌月初を上限にし月末日数を計算しない）・昇順 |

- **絞り込みの分担**: 掲載期間は **RLS**、「全体向け or このクラス向け」は**アプリ側の JS**。`.or()` は生の PostgREST フィルタ文字列を取るためルートパラメータを埋めない。
- **出し分け**: お知らせ=0件なら丸ごと非表示 / 次回=日付 null・過去日・テーマ空のいずれかで非表示 / 今月のよてい=常時 / これまでのじゅぎょう=見出し常時＋空状態。
- **今月のよていの算出**（`src/lib/kiroku/schedule.ts` の `buildMonthlySchedule`）: 月初から目的の曜日までオフセットして7日ずつ進める純関数。`weekdayOf` / `addDays` は UTC 基準なので tz 非依存。`closed_days` は教室全体だがクラスの曜日で絞る時点で無関係な日は落ちる。`reason` は生徒にそのまま出る（null なら「〜のため」ごと省く）。
- アクセントの注入は**ルート1か所**（`accentStyle(cls.themeColor)`）。タブ・日付ピル・次回カードのグローがすべて `var(--accent)` を参照する。
- クラスタブは `<Link prefetch={false}>`。記憶クラス Cookie は**変更しない**（変えるのはフッターの「クラスをえらびなおす」だけ）。
- **キャッシュの確認は本番ビルドでのみ有効。** `npm run dev` はルートキャッシュを適用しないため、`force-dynamic` が無くても「期限切れのお知らせが出ない」が通ってしまう。`npm run build && npm start` で確認する。

### PWA（チケット21）

生徒向けエリアだけを「ホーム画面に追加」できるようにする。管理画面には一切出さない。

- **マニフェストは `public/manifest.webmanifest`（静的ファイル）**。`(kiroku)/layout.tsx` の `metadata.manifest` から参照するので `<link rel="manifest">` は `/kiroku` 配下にしか出ない。
  - **Next のファイル規約（`app/manifest.ts`）は使えない**。`(kiroku)` 配下に置くと**無言で無視され**（規約はアプリルート限定）、アプリルートに置くと全ルートにマージされて管理画面まで汚染する。
  - **`scope` / `start_url` は末尾スラッシュ無しの `/kiroku`。** `"/kiroku/"` にすると「範囲内」判定（生の文字列前方一致）で `start_url` が範囲外になり、**scope 指定ごと破棄されて既定の `/` に化ける**（＝インストール済みアプリが管理画面まで飲み込む）。警告は出ない。
  - `id: "/kiroku"` を明示する。省くと `start_url` が同一性になり、将来変更したとき Android にアイコンが2つ生える。
  - `display: standalone` / `orientation: portrait` / `background_color`・`theme_color` = `#0b0d12`。
- **middleware**: 拡張子除外グループに `webmanifest` を追加（上記 §6）。マニフェストの取得は仕様上 Cookie を送らず、`metadata.manifest` に `crossOrigin` を指定する手段も無い（Next は Vercel の preview のときだけ自動付与するので**プレビューで通って本番で壊れる**）。したがってゲートの外に出すのが唯一の解。中身は名前・色・アイコンのパスだけ。
- **アイコン**: 原本 `public/icons/kiroku-icon.svg` を `npm run icons`（`scripts/build-icons.mts`・sharp）で PNG 化してコミットする。

| ファイル | 用途 |
|---|---|
| `kiroku-192.png` / `kiroku-512.png` | マニフェスト。`any` と `maskable` に同じファイルを使う（モチーフを中央80%の円内に収めてあるため兼用できる） |
| `kiroku-apple-180.png` | iOS。**アルファチャンネルごと削除して不透明**（透明を黒に潰され、角丸を焼くと二重丸になる） |
| `kiroku-32.png` | SVG ファビコン非対応ブラウザ向け |

- **`metadata.icons` を `(kiroku)/layout.tsx` に置くと、その配下ではファイル規約のアイコンが全部無効になる**（Next は `resolvedMetadata.icons` が falsy のときしか規約アイコンを入れない）。結果として `src/app/icon.svg`（管理用の L マーク）は `/kiroku` から消える——これは意図した挙動。**`apple` だけ書くと `icon` が空になる**ので両方列挙すること。
- **`statusBarStyle: "black"`**。`black-translucent` は Web View がステータスバーの下まで広がり `top:0` の sticky ヘッダーに時計が重なる。同じ理由で **`viewportFit: "cover"` も使わない**（`env(safe-area-inset-*)` を各所に入れるまでは）。
- `themeColor` は `export const viewport` 側（`metadata.themeColor` は Next 14 以降 非推奨）。**`maximumScale` / `userScalable` は入れない**（シニアのピンチズームを殺さない）。
- **Service Worker は入れない**。`/kiroku` の `force-dynamic` は「期限切れのお知らせを消す」ための仕組みで、SW キャッシュはそれを真っ先に壊す（しかも生徒向けはミューテーションが起きないので管理側から消せない）。インストール可否には影響しない。
- **iOS のホーム画面 Web アプリは Safari と Cookie の保管庫が別**。合言葉ゲートの性質として、iPhone は**ホーム画面から開いた初回だけ合言葉とクラス選びをやり直す**（Android は引き継がれる）。仕様として受け入れ、案内文で伝える。

---

## 7. 画面仕様（8画面 / ルーティング）

route group により URL に `(auth)` `(app)` は出ない。`(app)/layout.tsx` が共通シェル（PC=純黒トップバー44px+左サイドバー220px / モバイル=下部タブ、`max-w-[980px]` センターコンテナ、`px-4 py-6 md:px-8`）。ナビ項目は `src/components/nav/nav-items.ts`（今日 `/` / カレンダー `/calendar` / 集計 `/summary` / 設定 `/settings`）。全データ画面は動的レンダリング（`ƒ`）。

### 7.1 ログイン `/login`（`(auth)`・共通シェルなし）
- メール+パスワードのみ。`useActionState` で `login` を呼び、エラーは ink 色テキスト表示。

### 7.2 今日の出欠（ホーム）`/` — 最重要
- **`getDayAttendance(supabase, todayJst())`** で当日データを取得。
- 上部に日付「M月D日（曜）」（`formatDateWithWeekday`）+ サブにコマ名（当日曜日の active コマを `・` 連結）。
- **休講日**なら parchment 面に「本日は休講日」（+reason）のみ表示、生徒リストなし。
- コマ在籍生徒 ∪ 当日記録がある生徒（別コマの飛び入り）を一覧。各行 `min-h-[64px]`、左=氏名17px/600（別コマ生徒はコマ名を muted 副表示）、右=出欠トグル。
- 全員記録済みで「本日の記録完了」（Action Blue チェック）。最下部に「別の日に来た生徒を追加」。
- コマなし & 記録なし → 「本日のコマはありません。」

### 7.3 カレンダー `/calendar`
- `searchParams`: `month`（`YYYY-MM`・既定は今月）、`date`（`YYYY-MM-DD`・パネル対象・当月内のみ有効）。純サーバ描画（Link + searchParams）。
- 月グリッド（`grid-cols-7`）: 各日セルは装飾なし Link。**記録あり=Action Blue ドット / 休講=muted ドット+日番号 line-through / 今日=primary 太字 / 選択中=parchment 面**。
- 月データは `attendance_records` と `closed_days` を月範囲（`gte(monthStart).lt(nextStart)` 等）で取得し日付 Set 化。月送りは `shiftMonth` の Link。
- 日付タップ → **パネル**（モバイル=下シート `rounded-t-lg` / PC=右パネル `w-[440px] border-l`、背景は閉じる Link）。パネル内は `getDayAttendance(date)` で **09 と同じ `AttendanceBoard` を再描画**（`doneLabel="記録完了"` / `addLabel="生徒を追加"`）。**過去日含む任意日の修正・追加が可能**。休講日はパネルも「休講」表示のみ。

### 7.4 月次集計 `/summary`（ヒーロー画面）
- `searchParams`: `month`（`YYYY-MM`・既定は今月）。
- 取得: `attendance_records`（当月範囲）/ `payments`（`target_month=month`）/ `students`（全件・名前引き）を並列。**JS 集約**で生徒別 present/absent 回数・`amount=Σ unit_price_at_time(present)` を算出。対象=当月に記録がある生徒（**退会者含む**・`is_active` で絞らない）。
- **フルブリード ダークタイル ヒーロー**（`-mx-4 -mt-6 md:-mx-8`・`surface-tile-1`）: 上段=白 circular ボタン(44px)で前月/翌月 + 月ラベル（body-muted）、中段=請求額合計 56px（モバイル40px）/白/`tabular-nums`（`¥` は body-muted）、下段=「出席のべ◯回」。
- 直下の白カードリスト（`PaymentTable`・kana 順）: 左=氏名+「出席N・欠席N回」、右=請求額（`Yen`・右揃え）+ **支払いトグル pill**（未払い=ゴースト / 支払済=Action Blue 塗り+チェック）。
- 記録0件 → 「この月の出欠記録はありません。」

### 7.5 設定ハブ `/settings`
- 生徒管理 / コマ管理 / 休講日管理 へのリンクリスト + ログアウトボタン。

### 7.6 コマ管理 `/settings/classes`（CRUD）
- 一覧（active のみ・`weekday`→`start_time` 順）/ `new` / `[id]/edit`。共有 `ClassForm`。
- 項目: コマ名・曜日（0–6 セレクト）・開始/終了時間。Zod 検証（全必須・終了>開始）。廃止=論理削除（`ConfirmDialog`）。

### 7.7 生徒管理 `/settings/students`（CRUD + 検索 + 詳細）
- 一覧（active のみ・kana 順）: `StudentSearchList`（氏名/ふりがな部分一致のクライアント絞り込み）。`new` / `[id]/edit` は共有 `StudentForm`。
- 必須: 氏名・ふりがな・所属コマ（active コマ）・単価（既定2000）。任意: 連絡先・生年月日・スマホOS・緊急連絡先・メモ。
- 単価変更時に過去の `attendance_records` は触らない（スナップショット方式）。退会=論理削除。
- コマ未登録時は `NoClassesNotice`（先にコマ登録を促す）。編集画面で所属コマが廃止済みなら「（廃止済み）」として選択肢に温存（保存時の付け替え防止）。
- **生徒詳細 `/settings/students/[id]`**: 台帳情報（基本/連絡先/緊急連絡先/メモ）+ **出欠履歴（月別 present/absent 回数・請求額）**。履歴は `attendance_records` を JS 月別集約。

### 7.8 休講日管理 `/settings/closed-days`
- 一覧（日付昇順・過去日は muted 減光で区別）+ **埋め込み登録フォーム**（日付+理由メモ）。編集フローなし。
- 重複日付は `closed_date` UNIQUE 違反（Postgres `23505`）を捕捉し「この日付は既に登録済みです」表示。削除=**物理削除**（`ConfirmDialog`）。

---

## 8. Server Actions 一覧

| Action | ファイル | 入力 | 挙動・戻り |
|---|---|---|---|
| `login` | `(auth)/login/actions.ts` | FormData(email,password) | Zod→`signInWithPassword`→`redirect("/")`。失敗 `{error}` |
| `signOut` | `lib/auth/actions.ts` | — | `signOut`→`redirect("/login")` |
| `createClass`/`updateClass` | `settings/classes/actions.ts` | FormData | Zod `safeParse`→`{fieldErrors\|formError}` or `revalidatePath`+`redirect` |
| `deactivateClass` | 同上 | FormData(id) | `is_active=false`→`revalidatePath`+`redirect` |
| `createStudent`/`updateStudent`/`deactivateStudent` | `settings/students/actions.ts` | FormData | 同上パターン。任意テキストは `nullIfEmpty` |
| `createClosedDay` | `settings/closed-days/actions.ts` | FormData(closed_date,reason) | Zod→insert。`23505` は日付重複エラー。成功で `revalidatePath("/")`/`"/calendar"`/`"/settings/closed-days"`+`redirect` |
| `deleteClosedDay` | 同上 | FormData(id) | **物理削除**→revalidate+redirect |
| **`recordAttendance`** | `(app)/actions.ts` | `{studentId,lessonDate,status}` | **redirect せず `{error?}`**（楽観的更新用）。`status=null`で削除、他は**現在単価をサーバ取得**して upsert（`onConflict:"student_id,lesson_date"`）。成功で `revalidatePath("/")`/`"/calendar"`/`"/summary"` |
| **`setPayment`** | `summary/payment-actions.ts` | `{studentId,month,isPaid}` | **redirect せず `{error?}`**。`payments` upsert（`onConflict:"student_id,target_month"`、`paid_at`=isPaid?now:null）。`revalidatePath("/summary")` |

- CRUD 系の共通型: 失敗時 `{ fieldErrors, formError }`（Zod issues を `issue.path[0]` で手動集約）、成功時 `revalidatePath`→`redirect`。フォームは `useActionState(action, {})`、非制御入力（`defaultValue`）で検証エラー再表示でも値保持。
- **インライン系**（`recordAttendance`/`setPayment`）は redirect せず結果を返す＝楽観的更新の基盤。

---

## 9. 出欠・楽観的更新の共通基盤（フェーズ2でも再利用）

| ファイル | 役割 |
|---|---|
| `src/lib/attendance.ts` | 型の単一定義元（`AttendanceStatus`/`AttendanceRow`/`AttendanceCandidate`/`DayAttendance`）+ `getDayAttendance(supabase, date)`。「その日のコマ在籍生徒 ∪ 当日記録がある生徒」を組み立てる。supabase client を引数で受ける isomorphic 設計（`import type` はクライアントで消える） |
| `src/app/(app)/attendance-board.tsx` | `useOptimistic`+`useTransition`+`useToast` の中心。行リスト・完了表示・追加・トーストを統合。`doneLabel`/`addLabel` で文言差し替え |
| `src/app/(app)/attendance-toggle.tsx` | 出席｜欠席の2セグメント pill（純粋 UI・状態は board 保持） |
| `src/app/(app)/add-student.tsx` | 別日来訪の生徒追加（検索ピッカー） |

- **楽観的更新の流れ**: タップ即時に `useOptimistic` で反転 → `recordAttendance`/`setPayment` 実行 → 成功時は `revalidatePath` で base 更新（フリッカーなし）/ 失敗時は自動ロールバック + トースト。
- ホーム（`/`）とカレンダー（`/calendar`）が `AttendanceBoard` を共用。月次集計は同じ「redirect せず `{error?}`・楽観的更新」パターンを `setPayment` で踏襲。

---

## 10. 共通コンポーネント / ユーティリティ

| パス | 内容 |
|---|---|
| `src/lib/format.ts` | `WEEKDAY_LABELS` / `formatTimeRange` / `formatYen` / `formatMonthJa`（「2026年7月」）/ `formatDateJa`（「1950年3月15日」）/ `todayJst`（JST の今日 `YYYY-MM-DD`）/ `weekdayOf`（曜日番号・UTC 基準で tz 非依存）/ `formatDateWithWeekday`（「7月22日（水）」）/ `shiftMonth`（月を N ヶ月送り）。**日付・月キーは必ずこれ経由**（`new Date()` 直書きの tz 依存を持ち込まない） |
| `src/components/yen.tsx` | `<Yen amount>`（`¥` を小さく muted・数字 `tabular-nums`）。ダークタイルの巨大数値には流用せず手書き |
| `src/components/ui/form.ts` | フォーム共有クラス（`labelClass` 14px/600・`inputClass` 44px pill+ring・`textareaClass`・`errorClass` は ink） |
| `src/components/confirm-dialog.tsx` | 破壊的操作の確認（ネイティブ `<dialog>`・確定は ink 塗り）。論理削除・物理削除で使用 |
| `src/components/toast.tsx` | `useToast()` + `<Toast message>`（ink 塗り pill・下部中央・3秒自動消去）。楽観的更新の失敗通知 |
| `src/components/nav/` | `sidebar.tsx`（PC）/ `bottom-tabs.tsx`（モバイル・フロストガラス `backdrop-blur`）/ `nav-items.ts` |

---

## 11. デザインシステム（要約・正典は DESIGN.md）

`tailwind.config.ts` の `theme.extend` にトークン登録。**インライン hex 禁止**。

### カラートークン
| トークン | 値 | 用途 |
|---|---|---|
| `primary` | #0066cc | 唯一のアクセント（Action Blue・出席塗り・支払済） |
| `primary-focus` | #0071e3 | フォーカスリング |
| `primary-on-dark` | #2997ff | ダークタイル上のアクセント |
| `ink` | #1d1d1f | 見出し・本文・欠席塗り |
| `ink-muted-80` / `ink-muted-48` | #333333 / #7a7a7a | 補助テキスト |
| `body-muted` | #cccccc | ダークタイル上のセカンダリ文字 |
| `hairline` / `divider-soft` | #e0e0e0 / #f0f0f0 | カード枠1px / 行区切り |
| `canvas` / `canvas-parchment` | #ffffff / #f5f5f7 | 基本背景 / セカンダリ面 |
| `surface-tile-1` / `-2` | #272729 / #2a2a2c | ダークタイル（集計ヒーロー） |
| `surface-black` | #000000 | PC トップバーのみ |
| `on-dark` | #ffffff | ダーク上の文字 |

- **角丸は3値のみ**: `sm`=8px / `lg`=18px / `pill`=9999px（中間値禁止）。
- タイポ: ヒーロー56px（モバイル40px）/ タイトル34px（モバイル28px）/ セクション21px / 本文17px / キャプション14px / 微細12px。**ウェイトは 400/600 のみ**。数字・金額は必ず `tabular-nums`。フォントは `next/font` の Inter + Noto Sans JP（`layout.tsx`、CJK は preload 無効）。
- **絶対ルール**: 第2アクセント・box-shadow・グラデーション・出欠の赤/緑・16px以下の本文 は禁止（フェーズ1で全体 grep 監査済み・違反なし）。階層は面の色替え + 1px ヘアラインで作る。
- **出欠の表現**: 出席=Action Blue 塗り+白+チェック / 欠席=ink 塗り+白 / 未記録=ゴースト（透明+hairline 枠+muted 文字）。
- タップ要素は最小 44×44px（`h-11`/`min-h-[44px]`・カレンダーセル `min-h-[56px]`）+ `active:scale-95`。

---

## 12. ディレクトリ構成

```
src/
  app/
    (auth)/login/          … page / login-form(client) / actions
    (app)/                 … 認証必須（layout=共通シェル）
      page.tsx             … 今日の出欠（ホーム）
      actions.ts           … recordAttendance（共通・インライン）
      attendance-board.tsx / attendance-toggle.tsx / add-student.tsx
      calendar/page.tsx    … カレンダー + 日付パネル
      summary/             … page / payment-table(client) / payment-actions
      settings/
        page.tsx           … 設定ハブ
        classes/           … page / new / [id]/edit / class-form / actions
        students/          … page / new / [id]/edit / [id](詳細) / student-form / student-search-list / no-classes-notice / actions
        closed-days/       … page / closed-day-form / actions
      records/             … 授業記録の管理（フェーズ2・16〜18）
        page.tsx / record-list / record-form / photo-picker / actions / new / [id]/edit
        next-lessons/      … 次回のじゅぎょう（page / list / card / actions）
        announcements/     … お知らせ（page / new / [id]/edit / form / actions）
    (kiroku)/              … 生徒向け（フェーズ2・19〜）。合言葉 Cookie で保護・noindex
      layout.tsx           … metadata + force-dynamic のみ（面は各ページが敷く）
      kiroku/              … page(K1) / gate-form(client) / actions / select(K2)
        [classId]/         … page(K3) / kiroku-header / record-card / copy-prompt-button(client)
    api/keepalive/route.ts … Vercel Cron
    layout.tsx / globals.css / icon.svg（管理画面のファビコン）
  components/              … confirm-dialog / toast / yen / ui/form / nav/* / v2/*
  lib/
    attendance.ts          … getDayAttendance + 出欠型
    format.ts              … 日付・金額フォーマッタ
    accent.ts / form.ts / revalidate.ts / records.ts / image*.ts / r2.ts
    auth/actions.ts        … signOut
    kiroku/                … gate（合言葉・純粋モジュール）/ classes（anon のクラス一覧 + periodLabels）/ schedule（今月のよてい）
    supabase/              … server / client / anon / middleware / database.types
  middleware.ts
public/
  manifest.webmanifest     … 生徒向け PWA のマニフェスト（middleware の拡張子除外で素通し）
  icons/                   … kiroku-icon.svg（原本）+ 生成 PNG 4種
scripts/
  verify-r2.mts            … R2 疎通確認（npm run verify:r2）
  build-icons.mts          … アイコン生成（npm run icons）
vercel.json                … cron 設定
tailwind.config.ts         … デザイントークン
```

---

## 13. フェーズ2に向けた拡張ポイント・注意

- **新テーブル追加時**: **`create table` と `enable row level security` + ポリシー付与を同一マイグレーションに入れる**。`public` の DEFAULT PRIVILEGES で新テーブルには anon の全権限が自動付与されるため、RLS を別マイグレーションに分けるとその間だけ anon から読み書き自由になる（§4.8 参照）。適用後は `database.types.ts` を MCP `generate_typescript_types` で**再生成**。よく検索する列にはインデックスを付ける（例: 月キー単独検索は複合 UNIQUE では効かない → 専用インデックス。`idx_payments_target_month` が前例）。
- **新 API ルート**: middleware matcher は既定で全ルート保護。認証不要にする場合のみ `/api/keepalive` と同様に matcher から除外する。
- **出欠・支払い以外の楽観的更新 UI**: `useOptimistic` + `useToast` + 「redirect せず `{error?}` を返す Server Action」の型（§9）を踏襲。
- **集計系の新機能**: 集計テーブルを作らず、対象レコードを取得して JS 集約する方針（§5-4）。請求額は必ず `unit_price_at_time`（スナップショット）を合計し、`students.unit_price` を遡って使わない。
- **`attendance_records.memo`** 列は確保済みだが UI 未使用 → 授業メモ等で活用可能。
- **つまずきカルテ連携**（フェーズ2候補）: 生徒マスタの共通化が論点。現状 `students` は単一テーブルで RLS も単純なため、別プロダクトと共有する場合は認可設計の見直しが必要。
- **既知の割り切り**: PK は UUIDv4、同一曜日に複数コマがある場合ホームは kana 順フラットリスト（グループ分けなし）、テスト自動化なし。いずれも現規模では許容。
```
