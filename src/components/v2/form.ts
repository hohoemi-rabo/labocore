// フォーム入力の共有スタイル v2（DESIGN_v2 §4・§8）。
// v1 の src/components/ui/form.ts と同じ役割で、v2 の画面はこちらを使う
// （v1 側は M3 完了＝チケット28 まで温存する）。
//
// 入力欄は「くぼみ影 + フォーカスでアクセントの縁と 3px リング」。
// 高さは 44px 以上（h-11）を守る。

export const labelClass = "text-[14px] font-bold text-fg";

const fieldBase =
  "w-full rounded-16 border border-line bg-sunken text-[17px] text-fg shadow-well outline-none transition placeholder:text-sub focus:border-accent focus:shadow-well-focus";

export const inputClass = `${fieldBase} h-11 px-4`;
export const selectClass = `${fieldBase} h-11 px-4`;
export const textareaClass = `${fieldBase} min-h-[120px] px-4 py-3 leading-jp`;

/** フィールド単位のエラー文言（役割色=ローズ） */
export const errorClass = "text-[14px] font-bold text-off";

/** フォーム全体のエラー帯（合言葉の誤入力など） */
export const errorBandClass =
  "rounded-12 border border-off-line bg-off-surface px-4 py-2 text-[17px] text-off";
