import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN.md §1 カラートークン（インライン hex を書かず必ずここ経由で使う）
        primary: "#0066cc", // Action Blue — 唯一のアクセント
        "primary-focus": "#0071e3", // フォーカスリング
        "primary-on-dark": "#2997ff", // ダークタイル上のリンク/アクセント
        ink: "#1d1d1f", // 見出し・本文（near-black）
        "ink-muted-80": "#333333",
        "ink-muted-48": "#7a7a7a", // 補助テキスト・disabled
        "body-muted": "#cccccc", // ダークタイル上のセカンダリ文字
        hairline: "#e0e0e0", // カード枠線（1px）
        "divider-soft": "#f0f0f0", // さらに薄い区切り
        canvas: "#ffffff", // 基本背景
        "canvas-parchment": "#f5f5f7", // セカンダリ背景・sticky バー
        "surface-pearl": "#fafafc",
        "surface-tile-1": "#272729", // ダークタイル（集計ヒーロー等）
        "surface-tile-2": "#2a2a2c",
        "surface-black": "#000000", // グローバルヘッダーのみ
        "on-dark": "#ffffff",
      },
      borderRadius: {
        // DESIGN.md §3: この3値のみ。中間値を混ぜない
        sm: "8px", // ユーティリティボタン
        lg: "18px", // カード
        pill: "9999px", // アクション
      },
      fontFamily: {
        // DESIGN.md §2: Apple はネイティブ（SF Pro + ヒラギノ）、
        // 非 Apple は next/font の Inter + Noto Sans JP に解決させる
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Hiragino Sans"',
          "var(--font-inter)",
          "var(--font-noto-sans-jp)",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
