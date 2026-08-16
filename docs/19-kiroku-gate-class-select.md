# 19. 生徒向け /kiroku 入口（合言葉・クラスえらび・middleware）

**依存**: 13, 14
**参照**: REQUIREMENTS_phase2.md §4・§5・§7（K1/K2） / DESIGN_v2.md §7 / docs/design-sample.html
**マイルストーン**: M1

## 目的

生徒向けエリア `/kiroku` の入口を作る。Supabase Auth とは独立した「合言葉 Cookie」ゲートで、一度入力すれば次回から省略される。

## URL 設計

- `/kiroku` — 合言葉画面（K1）。合言葉 Cookie ありなら記憶クラス or クラスえらびへリダイレクト
- `/kiroku/select` — クラスえらび（K2）。静的セグメントは動的セグメントより優先されるため `[classId]` と共存できる
- `/kiroku/[classId]` — クラスページ（K3・チケット20）

## Todo

- [ ] `src/lib/supabase/anon.ts`: cookie を使わない素の anon クライアントを共通化する（keepalive の実装をここへ寄せ、生徒向けページと共用）
- [ ] `(kiroku)` route group + 専用 layout: ダークのアンビエント背景・Noto Sans JP・**metadata `robots: noindex`**・管理シェルなし。タイトルは「ほほ笑みラボ 授業の記録」
- [ ] `src/middleware.ts` 改修: `/kiroku` 配下は Supabase Auth の保護対象から外し、合言葉 Cookie の有無で判定する。未通過は `/kiroku`（合言葉画面）へリダイレクト（`/kiroku` 自身は Cookie なしで表示可）。**`/api/keepalive` の除外が壊れていないこと**を必ず確認する
- [ ] 合言葉照合の Server Action: env `KIROKU_PASSWORD`（=「ほほえみ」・前後空白 trim）と比較。一致で Cookie（httpOnly・有効期限1年目安）をセット。誤入力は「あいことばが違うようです。もう一度お試しください。」のローズ帯（回数制限なし・要件どおり）
- [ ] K1 合言葉画面: 入口ボックス（トリコロール → 英語 small 見出し → 日本語見出し900 → lead 文）・中央揃え 1.35rem 入力・くぼみ影・フォーカスで `--accent-soft` リング・「わからないときは、教室で先生に聞いてください。」のヒント
- [ ] K2 クラスえらび: active コマを weekday→start_time 順で2列グリッド表示。各ボタンは左端 5px 縦バー（クラス色→濃色グラデ）・曜日 1.3rem/900（水曜は「午前/午後」をクラス色で併記）・時間帯 sub。選択で Cookie に class_id を保存し `/kiroku/[classId]` へ
- [ ] 記憶済みクラスがあれば `/kiroku` アクセス時にそのクラスページへ直行する。クラスえらびをやり直す導線はクラスページ側フッターに置く（実装は 20 と調整）
- [ ] env: `.env.local` と Vercel（Production）に `KIROKU_PASSWORD` を設定する（運用者タスク）

## 完了条件

- 合言葉なしでは `/kiroku` 配下のどの URL に直接アクセスしても合言葉画面に戻される
- 合言葉+クラス選択後、ブラウザを閉じて再訪問すると自分のクラスページが直接開く
- 管理画面のログイン保護・`/api/keepalive`（認証なし401/あり200）の動作が変わらない
