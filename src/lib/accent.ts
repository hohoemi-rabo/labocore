import type { CSSProperties } from "react";

// DESIGN_v2 §3・§9: 生徒向け画面の差し色は「選択中クラスの theme_color」。
// 動的な hex をクラス名に埋め込むと Tailwind が拾えないため、CSS 変数 --accent を
// style 属性で注入し、Tailwind 側は var(--accent) 参照のトークン
// （accent / accent-soft / accent-deep / accent-line、bg-accent-fill、shadow-glow 等）を使う。
//
// 注入するのは --accent 1つだけでよい。派生色は tailwind.config.ts 側で
// color-mix() を実プロパティの値に直接置いているため、各要素が継承している
// --accent に対して解決される（1画面に複数クラスの色が並ぶタブ・クラス選択でも正しく動く）。

/** 管理画面の基本アクセント（DESIGN_v2 §8）。globals.css の :root と同値。 */
export const DEFAULT_ACCENT = "#38bdf8";

/**
 * クラスのテーマカラー（DESIGN_v2 §3）。
 * 「明るく彩度の高い、ダーク背景で映える」帯から選ぶ。コマ管理の色選択はここから候補提示する。
 */
export const CLASS_THEME_COLORS = [
  { value: "#f43f5e", label: "ローズ" },
  { value: "#fb923c", label: "オレンジ" },
  { value: "#38bdf8", label: "スカイ" },
  { value: "#818cf8", label: "インディゴ" },
  { value: "#34d399", label: "エメラルド" },
  { value: "#e879f9", label: "フクシア" },
] as const;

// style 属性へ渡す前に形を検証する。DB 由来の値をそのまま CSS 変数に流さない。
const HEX6 = /^#[0-9a-fA-F]{6}$/;

/**
 * `style={accentStyle(cls.theme_color)}` の形で使う。
 * theme_color が未設定・不正な値のときは既定色にフォールバックする。
 */
export function accentStyle(color?: string | null): CSSProperties {
  return {
    "--accent": color && HEX6.test(color) ? color : DEFAULT_ACCENT,
  } as CSSProperties;
}
