# 19. 生徒向け /kiroku 入口（合言葉・クラスえらび・middleware）

**依存**: 13, 14
**参照**: REQUIREMENTS_phase2.md §4・§5・§7（K1/K2） / DESIGN_v2.md §7 / docs/design-sample.html
**マイルストーン**: M1

## 目的

生徒向けエリア `/kiroku` の入口を作る。Supabase Auth とは独立した「合言葉 Cookie」ゲートで、一度入力すれば次回から省略される。

## URL 設計

- `/kiroku` — 合言葉画面（K1）。合言葉 Cookie ありなら記憶クラス or クラスえらびへリダイレクト
- `/kiroku/select` — クラスえらび（K2）。静的セグメントは動的セグメントより優先されるため `[classId]` と共存できる
- `/kiroku/[classId]` — クラスページ（K3）。**19 では仮ページを置き、チケット20 で本文だけを差し替える**（19 の完了条件「再訪問で自分のクラスページが直接開く」を 19 単体で確認できるようにするため）

## Todo

- [x] `src/lib/supabase/anon.ts`: cookie を使わない素の anon クライアントを共通化する（keepalive の実装をここへ寄せ、生徒向けページと共用）
- [x] `(kiroku)` route group + 専用 layout: ダークのアンビエント背景・Noto Sans JP・**metadata `robots: noindex`**・管理シェルなし。タイトルは「ほほ笑みラボ 授業の記録」
- [x] `src/middleware.ts` 改修: `/kiroku` 配下は Supabase Auth の保護対象から外し、合言葉 Cookie の有無で判定する。未通過は `/kiroku`（合言葉画面）へリダイレクト（`/kiroku` 自身は Cookie なしで表示可）。**`/api/keepalive` の除外が壊れていないこと**を必ず確認する
- [x] 合言葉照合の Server Action: env `KIROKU_PASSWORD`（=「ほほえみ」・前後空白 trim）と比較。一致で Cookie（httpOnly・有効期限1年目安）をセット。誤入力は「あいことばが違うようです。もう一度お試しください。」のローズ帯（回数制限なし・要件どおり）
- [x] K1 合言葉画面: 入口ボックス（トリコロール → 英語 small 見出し → 日本語見出し900 → lead 文）・中央揃え 1.35rem 入力・くぼみ影・フォーカスで `--accent-soft` リング・「わからないときは、教室で先生に聞いてください。」のヒント
- [x] K2 クラスえらび: active コマを weekday→start_time 順で2列グリッド表示。各ボタンは左端 5px 縦バー（クラス色→濃色グラデ）・曜日 1.3rem/900（同じ曜日に2コマ以上あるときだけ「午前/午後」をクラス色で併記）・時間帯 sub。選択で Cookie に class_id を保存し `/kiroku/[classId]` へ
- [x] `/kiroku/[classId]` の仮ページ: classId の実在確認（存在しない・廃止済みは `/kiroku/select` へ）＋クラス色の注入＋フッターの「クラスをえらびなおす」。本文は 20 で差し替える
- [x] 記憶済みクラスがあれば `/kiroku` アクセス時にそのクラスページへ直行する。クラスえらびをやり直す導線はクラスページ側フッターに置く
- [x] env: `.env.local` に `KIROKU_PASSWORD` を設定
- [ ] env: Vercel（Production）に `KIROKU_PASSWORD` を設定する（**運用者タスク・未実施**）

## 実装メモ（後から「直され」ないように）

### 判定の置き場所は1か所

合言葉の Server Action は成功しても行き先を計算せず `redirect("/kiroku")` だけ返す。「誰をどこへ送るか」（未通過→K1 / 記憶クラスが生きている→クラスページ / それ以外→クラスえらび）は `/kiroku/page.tsx` が単独で持つ。1ホップ増えるが二重管理にならない。

### Cookie

`kiroku_gate`（合言葉）と `kiroku_class`（記憶クラス）の2本。属性は `src/lib/kiroku/gate.ts` の `kirokuCookieOptions` に集約。

- **`cookies().delete(name)` は `path=/` で消しにいくため `path=/kiroku` の Cookie には効かない**（黙って無視される）。消すときは必ず `set(name, "", { ...kirokuCookieOptions, maxAge: 0 })`
- `sameSite` は **lax 必須**。strict だと LINE のリンクから来た初回遷移で Cookie が送られず毎回合言葉画面に戻る
- `secure` は本番のみ。常時 true にすると Safari が `http://192.168.x.x:3000` で捨て、スマホ実機確認ができなくなる
- `kiroku_gate` の中身は合言葉そのものではなく SHA-256 の導出値。**秘密ではない**（合言葉を知っていれば誰でも計算できる）。狙いは「`KIROKU_PASSWORD` を変えたら配布済み Cookie が自動失効する」こと

### `src/lib/kiroku/gate.ts` は純粋モジュール

Edge の middleware と Node の Server Action の両方から import されるため、`next/headers` も Supabase も入れてはいけない。middleware が import してよいのは `gate.ts` だけ（`classes.ts` は Supabase を Edge バンドルへ引き込む）。ハッシュは Web Crypto (`crypto.subtle`) を使う（`require("crypto")` は Edge ビルドを壊す）。

### `force-dynamic` は `(kiroku)/layout.tsx` の1か所

layout の `dynamic` は配下の **page** に継承される（**route handler には継承されない** ← 21 で manifest を `route.ts` で出す場合は個別指定が要る）。ページごとに書くと必ずどれかが漏れる。

### K1 のフォームは `onSubmit` で `preventDefault` する

入力欄が1つだけのフォームは Enter で HTML の暗黙送信が起きる。v2 既定の「`action` なし + `type="button"`」パターンだとブラウザが素の GET を投げてページがリロードされ、エラー帯が消える（`announcement-form.tsx` は欄が2つ以上あるため発現していないだけ）。`onSubmit` で止めて手動 dispatch に寄せる。結果としてサンプルどおり Enter でも送信できる。

### K2/K3 は `<form action={serverAction}>` を直接使ってよい

v2 の「手動 dispatch」ルールは「`useActionState` の action が `{fieldErrors}` を返すと非制御フィールドがリセットされる」問題への対策。K2/K3 はテキスト入力が無く action は必ず `redirect()` するので、リセットされる対象が存在しない。素の form にすればクライアント JS がゼロになり、古いスマホでも確実に動く（K2 は押された `<button name="class_id" value={id}>` が FormData に入る）。

### K2 の表記は「曜日＋（午前/午後）＋時間帯」でクラス名は出さない

**REQUIREMENTS_phase2 §7 K2 の「クラス名+曜日+時間帯を併記」を上書きする決定**。クラス名は「月曜午前クラス」の形で曜日と重複しており、375px の2列グリッドでは3行になって読みづらい。CLAUDE.md の「色だけでなく見分けられるように」の意図は曜日＋時間帯で満たしている。「午前/午後」は**同じ曜日に active コマが2つ以上あるときだけ**出す（水曜午後クラスを登録すれば自動で出る）。

## 完了条件

- [x] 合言葉なしでは `/kiroku` 配下のどの URL に直接アクセスしても合言葉画面に戻される
- [x] 合言葉+クラス選択後、ブラウザを閉じて再訪問すると自分のクラスページが直接開く
- [x] 管理画面のログイン保護・`/api/keepalive` の動作が変わらない（ローカルで 307→/login と 500=CRON_SECRET 未設定を確認。本番の 401/200 はデプロイ後に確認する）
