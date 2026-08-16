# 13. デザイン基盤 v2（トークン・フォント・共通部品）

**依存**: なし（フェーズ1完了が前提）
**参照**: DESIGN_v2.md 全章 / docs/design-sample.html / REQUIREMENTS_phase2.md §12
**マイルストーン**: M1

## 目的

フェーズ2の全画面（生徒向け `/kiroku`・新設管理画面 16〜18・M3 の刷新画面 24〜27）が使うデザイン基盤を整備する。**v1 トークンは M3 完了（チケット28）まで削除せず併存**させる。

## Todo

- [x] `tailwind.config.ts` の `theme.extend` に v2 カラートークンを追加する: 基礎色（`bg` #0b0d12 / `surface` #161b26 / `surface-2` #1d2433 / `text` #f2f4f8 / `text-body` #d6dbe6 / `sub` #9aa3b5 / `line` rgba(255,255,255,.08)）+ 機能色（琥珀・紫 `#8b7cf6`・ローズ・緑の各セット。DESIGN_v2 §2）。既存 v1 トークンは削除しない
  - Tailwind のキー名は `ground` / `fg` / `fg-body` / `news` / `prompt` / `off` / `done` に読み替えた（DESIGN_v2 §2 の対応表を参照）
- [x] `borderRadius` に 12/14/16/20/26px を追加（v1 の 8/18/pill は温存）
- [x] `boxShadow` に影レシピを登録する: 小 `0 10px 24px rgba(0,0,0,.35)` / 中 `0 16px 40px rgba(0,0,0,.42)` / 大 `0 24px 60px rgba(0,0,0,.55)` / 上端ハイライト inset / くぼみ inset（DESIGN_v2 §4 の値のみ・新造禁止）
  - `shadow-*` は box-shadow 全体を置換するため、上端ハイライトとの合成済みトークンとして登録（`elev-1/2/3` + hover 版・`well`・`well-focus`・`glow` 系）
- [x] `backgroundImage` 等にトリコロール・アンビエント背景（radial 2発+bg）・ガラス面グラデーションを登録する
- [x] Noto Sans JP 400/500/700/900 を `next/font` で読み込む（CJK preload 無効・v1 踏襲）。Inter と v1 用構成は M3 完了まで維持する
  - 静的5ウェイトはフォント CSS が 469KB（gzip 165kB）に膨らむため**可変フォント**で読み込む（124KB / gzip 40kB。フェーズ1の2ウェイト構成より軽い）
- [x] クラスカラー注入の仕組みを作る: DB の `theme_color` を `style` 属性で CSS 変数 `--accent`（または要素ローカル `--c`）に注入し、Tailwind 側は `var(--accent)` 参照のユーティリティ（文字色・縁・グラデ塗り・色グロー）を用意する。**動的 hex をクラス名に埋め込まない**
  - `src/lib/accent.ts` の `accentStyle()`。注入するのは `--accent` の1つだけ（サンプルの `--c` は移植しない）
- [x] 濃色端 `color-mix(in srgb, var(--accent) 55%, #000)`・淡い面 `--accent-soft`（16%）の導出をユーティリティ化する（クラスごとに2色目を定義しない）
  - 中間のカスタムプロパティは作らず、`color-mix()` をトークンの値＝実プロパティ側に置く（子孫での `--accent` 上書きを効かせるため）
- [x] v2 共通部品の最小セットを作成する（例: `src/components/v2/`）: トリコロールバー / eyebrow / ガラスカード / 主要ボタン（グラデ+グロー+hover 浮き）/ フォーム入力（くぼみ影+フォーカスリング）/ セクション見出し（右フェード 1px ライン）
  - 既存 `src/components/ui/form.ts` に倣い、React 部品ではなくクラス文字列の定数で提供（`src/components/v2/styles.ts` / `form.ts`）
- [x] CLAUDE.md の「デザインの絶対ルール」セクションを改訂する: v2（DESIGN_v2.md）を正典とし、v1 ルール（第2アクセント禁止・影/グラデ禁止等）は「M3 未刷新画面の保守時のみ適用」と明記する（チケット分割時に先行実施済み。「フェーズ2の実装方針」セクションも追加済み）

### 実装中に確定した追加事項（DESIGN_v2.md に反映済み）

- [x] `html { font-size: 17px }`（DESIGN_v2 §5）は**採用しない**。rem 基準が変わると Tailwind の spacing 体系が全画面で 6.25% ずれるため、本文 17px は従来どおり `body` 側で指定する
- [x] サンプルの rem 値（root 17px 前提）は使えないため、rem→px 換算表を DESIGN_v2 §5 に追加。本文はすべて 17px（サンプルの .92〜.98rem は「16px 以下の本文禁止」に反するため引き上げ）
- [x] `body:has(.v2-canvas)` で body の地色をダークにする仕組みを `globals.css` に追加（iOS のオーバースクロールで白がちらつくのを防ぐ。フェーズ1画面では一致しないため影響ゼロ）

## 完了条件

- サンプル `docs/design-sample.html` と同じ見た目のカード・ボタン・入力欄が、登録したトークンとユーティリティだけで再現できる（検証用の一時ページで目視確認し、確認後に削除する）
- 既存のフェーズ1画面の見た目に変化がない（`npm run build` が通り、主要画面を目視確認）
