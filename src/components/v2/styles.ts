// DESIGN_v2 の共通スタイル。既存の src/components/ui/form.ts と同じく
// 「クラス文字列の定数を素の要素に当てる」流儀に合わせている
// （タグを選べる・追加クラスを足せる・"use client" 境界を作らない）。
//
// 文字サイズは px で書く。サンプル docs/design-sample.html の rem 値は
// root 17px 前提で書かれているが、本プロジェクトの root は 16px のままなので
// DESIGN_v2 §5 の rem→px 換算表に従って変換する（html を 17px にしてはいけない）。

// ── 面（キャンバス）─────────────────────────────────────────
// v1 シェルの中でフルブリードのダーク面を敷く（管理画面 16〜18 用）。
// `v2-canvas` は globals.css の body:has(.v2-canvas) が拾うマーカー。
// min-h-screen は v1 の白い地色を見せないための暫定措置で、シェル刷新（24）後に外す。
export const v2CanvasClass =
  "v2-canvas -mx-4 -my-6 min-h-screen bg-ground bg-ambient px-4 py-6 font-jp text-[17px] leading-jp text-fg md:-mx-8 md:px-8";

// 入口画面（合言葉・クラスえらび）の全面キャンバス。アンビエントは強めを使う。
export const entryCanvasClass =
  "v2-canvas flex min-h-screen items-center justify-center bg-ground bg-ambient-strong px-6 py-10 font-jp text-[17px] leading-jp text-fg";

// 生徒向け本体ページ（クラスページ）の全面キャンバス。入口と違い上詰め・アンビエントは通常。
export const kirokuCanvasClass =
  "v2-canvas min-h-screen bg-ground bg-ambient font-jp text-[17px] leading-jp text-fg";

// ── カード ─────────────────────────────────────────────────
/** 入口ボックス（合言葉・クラスえらび）。中央 460px・ガラス面 + blur + 大影 */
export const entryBoxClass =
  "w-full max-w-[460px] rounded-26 border border-line bg-glass px-7 py-9 text-center shadow-elev-3 backdrop-blur-[14px]";

/** 汎用ガラスカード（今月のよてい等） */
export const glassCardClass =
  "rounded-20 border border-line bg-glass shadow-elev-1";

/** 不透明カード（記録カード等の主要カード） */
export const cardClass = "rounded-20 border border-line bg-card shadow-elev-2";

/** アクセントカード（次回のじゅぎょう）。クラス色の縁 + 右上からのグロー */
export const accentCardClass =
  "rounded-20 border border-accent-line bg-card-accent shadow-elev-2";

// ── テキスト ───────────────────────────────────────────────
// eyebrow（DESIGN_v2 §5）。色は役割で固定する
const eyebrowBase = "text-[12px] font-bold uppercase tracking-[.22em]";
export const eyebrowClass = `${eyebrowBase} text-accent`;
export const eyebrowNewsClass = `${eyebrowBase} text-news`;
export const eyebrowPromptClass = `${eyebrowBase} text-prompt`;

/** セクション見出し。右へフェードする 1px ラインを ::after で引く */
export const sectionTitleClass =
  "mb-4 flex items-center gap-3 text-[20px] font-black text-fg after:h-px after:flex-1 after:bg-fade-line after:content-['']";

// ── ブランド ───────────────────────────────────────────────
/** トリコロールバー（入口ボックス・フッター）。装飾なので aria-hidden を付けて使う */
export const tricolorClass = "h-1 w-[76px] rounded-pill bg-tricolor";
/** 同・ページ見出しの横に置く短い版 */
export const tricolorSmClass = "h-1 w-14 rounded-pill bg-tricolor";

// ── ボタン ─────────────────────────────────────────────────
// ⚠️ base に「文字サイズ」と「角丸」を含めない（理由は v2/form.ts の fieldBase のコメントと同じ）。
// 同じプロパティのユーティリティを2つ並べると、どちらが勝つかは class 属性の順序ではなく
// Tailwind が出力する CSS の順序で決まる。コピーボタンだけ rounded-pill が要るので、
// 角丸も各 export が自分で持つ形にしてある。
const buttonBase =
  "flex min-h-[44px] items-center justify-center px-6 font-bold text-white transition active:translate-y-0 active:scale-95";
const skyFill =
  "bg-sky-fill shadow-glow-sky hover:-translate-y-0.5 hover:shadow-glow-sky-hover";

/** 主要ボタン（生徒向け・クラス色で塗る） */
export const accentButtonClass = `${buttonBase} rounded-16 bg-accent-fill shadow-glow-btn hover:-translate-y-0.5 hover:shadow-glow-btn-hover text-[20px]`;

/** 主要ボタン（管理画面・スカイ固定。DESIGN_v2 §8） */
export const skyButtonClass = `${buttonBase} ${skyFill} rounded-16 text-[17px]`;

/** 入口画面の主要ボタン（「開く」）。ボックス幅いっぱい・DESIGN_v2 §5 で 1.15rem = 20px */
export const entryButtonClass = `${buttonBase} ${skyFill} w-full rounded-16 text-[20px]`;

// プロンプトのコピーボタン（DESIGN_v2 §7）。押すと2.5秒だけ完了状態に変わる。
// クラスは連結せず**文字列ごと差し替える**こと（bg-copy-fill と bg-done-fill を
// 同時に当てると、どちらが勝つかが出力順まかせになる）。
// 文言が長く 375px では2行になるため、モバイルは全幅 + 上下パディングで高さを稼ぐ。
const copyBase = `${buttonBase} w-full rounded-pill py-2 text-center text-[17px] sm:w-auto`;
export const copyButtonClass = `${copyBase} bg-copy-fill shadow-glow-copy`;
export const copyDoneButtonClass = `${copyBase} bg-done-fill shadow-glow-done`;

/** 日付ピル（記録カードの日付など。アクセント塗り + 色グロー） */
export const datePillClass =
  "inline-block rounded-pill bg-accent-fill px-4 py-0.5 text-[14px] font-bold tabular-nums text-white shadow-glow";
