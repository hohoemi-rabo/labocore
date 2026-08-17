import type { Config } from "tailwindcss";

// ─────────────────────────────────────────────────────────────
// デザイントークンの正典は DESIGN.md（ダーク基調・クラス別アクセント）。
// フェーズ1のライト基調（Action Blue 単色）のトークンは、全画面の刷新が終わった
// チケット28 で撤去した（履歴は git log を参照）。
//
// 命名の落とし穴（Tailwind はユーティリティ接頭辞を複数セクションで共有する）:
//   bg-*     … colors / backgroundImage を共有 → 同名キーは1クラスが両方を設定してしまう
//   text-*   … colors / fontSize を共有       → colors に base / sm / lg 等を作らない
//   shadow-* … boxShadow / colors を共有      → colors と boxShadow で同名キーを作らない
//                                              （色が勝ち、影のレシピが無効化される）
// ─────────────────────────────────────────────────────────────

// v2 のアクセントは「選択中クラスの色」で動的に変わるため、CSS 変数 --accent を
// style 属性で注入する（src/lib/accent.ts）。
//
// 派生色は中間のカスタムプロパティを作らず、color-mix() を実プロパティ側（=このトークンの値）
// に直接置く。カスタムプロパティは「宣言された要素」で置換されるため、
// :root で --accent-soft を定義しても子孫での --accent 上書きが反映されないのに対し、
// background-color 等の実プロパティなら各要素が継承中の --accent で解決される。
// これによりクラスタブのように1画面に複数のクラス色が並ぶ場合も正しく動く。
//
// 制約: これらのトークンには opacity modifier（bg-accent-soft/50 等）が使えない。
// Tailwind が色をパースできず、CSS が1行も出力されずに黙って消える。
// 透明度は必ず color-mix の % 側で表現すること。
const accentMix = (percent: number, base: string) =>
  `color-mix(in srgb, var(--accent) ${percent}%, ${base})`;

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── 基礎色（DESIGN.md §2）─────────────────────
        // 仕様書の名前 → ここでの名前: bg→ground / text→fg / text-body→fg-body
        // （`base` は Tailwind 既定の text-base(font-size) と衝突するため使わない）
        ground: "#0b0d12", // ページ最下層の背景
        surface: "#161b26", // カード面（暗端）
        "surface-2": "#1d2433", // カード面（明端・グラデの起点）
        sunken: "rgba(0,0,0,.35)", // くぼんだ面（入力欄・pre ブロック）
        fg: "#f2f4f8", // 見出し・本文
        "fg-body": "#d6dbe6", // カード内本文（記録カードのメモ等）
        sub: "#9aa3b5", // 補助テキスト・キャプション（本文には使わない）
        line: "rgba(255,255,255,.08)", // 枠線・区切り（1px）

        // ── アクセント（動的・DESIGN.md §2）───────────
        accent: "var(--accent)",
        "accent-soft": accentMix(16, "transparent"), // フォーカスリング・淡い面
        "accent-deep": accentMix(55, "#000"), // グラデーションの濃色端（§2 の必須式）
        "accent-line": accentMix(45, "transparent"), // 次回カードの縁

        // ── 機能色（DESIGN.md §2）─────────────────────
        // 役割で命名する（琥珀/紫/ローズではなく news/prompt/off）。
        // 色名にすると Tailwind 既定パレット（amber-500 等）と見分けがつかず、
        // 「役割外への流用禁止」が守れなくなるため。
        news: "#fbbf24", // お知らせ（琥珀）
        "news-line": "rgba(251,191,36,.35)",
        "news-body": "#e6d9bd",
        prompt: "#8b7cf6", // プロンプト（紫）
        "prompt-line": "rgba(139,124,246,.4)",
        "prompt-pre": "#e8e4ff",
        "prompt-pre-line": "rgba(139,124,246,.25)",
        off: "#fda4af", // 休み・エラー（ローズ）
        "off-surface": "rgba(225,29,72,.12)",
        "off-line": "rgba(225,29,72,.35)",
        done: "#34d399", // 完了（緑）
      },

      borderRadius: {
        pill: "9999px", // ピル（アクション・日付ピル・トリコロール）
        // 段階制（DESIGN.md §6）— 中間値を新造しない
        "12": "12px", // タブ・小要素・エラー帯
        "14": "14px", // 写真フレーム
        "16": "16px", // 入力欄・主要ボタン・プロンプト枠
        "20": "20px", // カード標準
        "26": "26px", // 入口ボックス
      },

      boxShadow: {
        // Tailwind の shadow-* は box-shadow 全体を置換するため、
        // 「落ち影 + 上端インセットハイライト」は合成済みトークンとして登録する。
        // DESIGN.md §4 のレシピ外の値は新造しない
        // （サンプルの中間値 14/34・18/44・12/30・10/26 はこの3段階に丸める）。
        "elev-1": "0 10px 24px rgba(0,0,0,.35)", // ボタン・小カード
        "elev-1-hover": "0 16px 32px rgba(0,0,0,.45)",
        "elev-2":
          "0 16px 40px rgba(0,0,0,.42), 0 1px 0 rgba(255,255,255,.05) inset", // 記録カード等の主要カード
        "elev-2-hover":
          "0 22px 52px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.05) inset",
        "elev-3":
          "0 24px 60px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.05) inset", // 入口ボックス・ヒーロー
        // くぼみ（入力欄・pre）とそのフォーカス時
        well: "0 2px 8px rgba(0,0,0,.4) inset",
        "well-focus": `0 0 0 3px ${accentMix(16, "transparent")}, 0 2px 8px rgba(0,0,0,.4) inset`,
        // 色付きグロー（アクセント塗りの要素）
        glow: `0 8px 20px ${accentMix(40, "transparent")}`, // 日付ピル・ブランドマーク・アクティブタブ
        "glow-btn": `0 10px 24px ${accentMix(45, "transparent")}, 0 1px 0 rgba(255,255,255,.25) inset`,
        "glow-btn-hover": `0 14px 30px ${accentMix(45, "transparent")}, 0 1px 0 rgba(255,255,255,.25) inset`,
        // 管理画面の主要ボタン（スカイ固定・DESIGN §8）
        "glow-sky":
          "0 10px 24px rgba(37,99,235,.4), 0 1px 0 rgba(255,255,255,.25) inset",
        "glow-sky-hover":
          "0 14px 30px rgba(37,99,235,.5), 0 1px 0 rgba(255,255,255,.25) inset",
        // 役割色のボタン（プロンプトのコピー / コピー完了）
        "glow-copy":
          "0 8px 20px rgba(109,40,217,.4), 0 1px 0 rgba(255,255,255,.2) inset",
        "glow-done": "0 8px 20px rgba(5,150,105,.4)",
      },

      backgroundImage: {
        // DESIGN.md §2・§4。レシピ外のグラデーションを新造しない。
        // ブランドモチーフ（全画面共通）
        tricolor:
          "linear-gradient(90deg, #4fc3f7 0 33%, #1e5bd6 33% 66%, #e11d48 66% 100%)",
        // ページ背景のアンビエント（bg-ground と併用する。入口画面は -strong）
        ambient:
          "radial-gradient(900px 500px at 85% -10%, rgba(37,99,235,.20), transparent 60%), radial-gradient(700px 420px at -10% 100%, rgba(225,29,72,.12), transparent 60%)",
        "ambient-strong":
          "radial-gradient(900px 500px at 85% -10%, rgba(37,99,235,.25), transparent 60%), radial-gradient(700px 420px at -10% 110%, rgba(225,29,72,.16), transparent 60%)",
        // ガラス面（汎用カード・入口ボックス。入口とヘッダーは backdrop-blur を併用）
        glass:
          "linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.014))",
        // 不透明カード面（記録カード）と、アクセントのグローを載せた版（次回のじゅぎょう）
        card: "linear-gradient(165deg, #1d2433, #161b26)",
        "card-accent": `radial-gradient(420px 200px at 100% 0%, ${accentMix(22, "transparent")}, transparent 70%), linear-gradient(160deg, #1d2433, #161b26)`,
        // アクセント塗り（ボタン・日付ピル・アクティブタブ / bar はクラス選択の左端 5px）
        "accent-fill": `linear-gradient(135deg, var(--accent), ${accentMix(55, "#000")})`,
        "accent-bar": `linear-gradient(180deg, var(--accent), ${accentMix(55, "#000")})`,
        // 固定色の塗り（管理画面の主要ボタン / コピーボタン / コピー完了 / 破壊的操作の確定）
        "sky-fill": "linear-gradient(135deg, #38bdf8, #2563eb)",
        "copy-fill": "linear-gradient(135deg, #8b7cf6, #6d28d9)",
        "done-fill": "linear-gradient(135deg, #34d399, #059669)",
        // DESIGN §8: 破壊的操作の確定ボタン。濃色端は accent と同じ 55% の式で導出する
        "off-fill":
          "linear-gradient(135deg, #e11d48, color-mix(in srgb, #e11d48 55%, #000))",
        // 役割色の面
        "news-panel":
          "linear-gradient(150deg, rgba(251,191,36,.14), rgba(251,146,60,.05))",
        "prompt-panel":
          "linear-gradient(150deg, rgba(139,124,246,.16), rgba(139,124,246,.05))",
        // セクション見出しの右へフェードする 1px ライン
        "fade-line":
          "linear-gradient(90deg, rgba(255,255,255,.08), transparent)",
      },

      fontFamily: {
        // DESIGN.md §5: Noto Sans JP を欧文・和文とも主役にする。
        // フェーズ1の混成スタック（Apple ネイティブ + Inter）は 28 で撤去した。
        jp: [
          "var(--font-noto-sans-jp)",
          '"Hiragino Sans"',
          '"Yu Gothic"',
          '"Meiryo"',
          "sans-serif",
        ],
      },

      lineHeight: {
        // カード本文の行間（DESIGN.md §5）
        jp: "1.85",
      },
    },
  },
  plugins: [],
} satisfies Config;
