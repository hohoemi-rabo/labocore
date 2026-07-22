# 01. 基盤セットアップ（デザイントークン・フォント）

**依存**: なし
**参照**: DESIGN.md §0〜§3・§7 / CLAUDE.md「技術スタック・構成」

## 目的

DESIGN.md のデザインシステムを Tailwind v3 の設定に落とし込み、以降の全チケットがトークン経由でスタイルを書ける土台を作る。scaffold の残骸を除去する。

## Todo

- [ ] `tailwind.config.ts` の `theme.extend.colors` に DESIGN.md §1 のカラートークンを全て登録する（primary / primary-focus / primary-on-dark / ink / ink-muted-80 / ink-muted-48 / body-muted / hairline / divider-soft / canvas / canvas-parchment / surface-pearl / surface-tile-1 / surface-tile-2 / surface-black / on-dark）
- [ ] `theme.extend.borderRadius` に3値のみ登録する（8px / 18px / pill=9999px）。中間値を追加しない
- [ ] `next/font` で Inter（欧文・数字）+ Noto Sans JP（和文）を読み込み、`layout.tsx` に適用する。フォールバックは DESIGN.md §2 のフォントスタック
- [ ] `globals.css` を整理する: 本文 17px / line-height 1.47、antialiased、背景 canvas。scaffold の Geist 変数・ダークモード用 CSS 変数を削除
- [ ] scaffold の `page.tsx` デフォルト内容と不要な public アセット（`vercel.svg` 等）を削除し、仮のホームページに置き換える
- [ ] `layout.tsx` の metadata を設定する（`title: 'LaboCore'`、`<html lang="ja">`）
- [ ] `npm run lint` と `npm run build` が通ることを確認する

## 完了条件

- 任意のコンポーネントで `bg-canvas-parchment` や `text-ink` 等のトークンクラスが使える（インライン hex 不要）
- 画面が Inter + Noto Sans JP・本文17pxで表示される
