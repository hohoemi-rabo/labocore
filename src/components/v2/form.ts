// フォーム入力の共有スタイル（DESIGN.md §4・§8）。
//
// 入力欄は「くぼみ影 + フォーカスでアクセントの縁と 3px リング」。
// 高さは 44px 以上（h-11）を守る。

export const labelClass = "text-[14px] font-bold text-fg";

// ⚠️ base に文字サイズを含めない。含めてしまうと、別サイズが要る画面が
// `${inputClass} text-[23px]` のように後ろへ足すことになるが、これは勝つとは限らない
// （class 属性の並び順は無関係で、Tailwind が出力する CSS の順序で決まる）。
// サイズは各 export が自分で持ち、新しいサイズはここから派生させる。
const fieldBase =
  "w-full rounded-16 border border-line bg-sunken text-fg shadow-well outline-none transition placeholder:text-sub focus:border-accent focus:shadow-well-focus";

export const inputClass = `${fieldBase} h-11 px-4 text-[17px]`;
export const selectClass = `${fieldBase} h-11 px-4 text-[17px]`;
export const textareaClass = `${fieldBase} min-h-[120px] px-4 py-3 text-[17px] leading-jp`;

/**
 * 入口画面（合言葉）の入力欄。DESIGN §7: 中央揃え 1.35rem（=23px）。
 * h-11（44px）では 23px の文字に対して低すぎるため、サンプルの padding 相当で 56px を確保する。
 */
export const entryInputClass = `${fieldBase} min-h-[56px] px-4 py-3 text-center text-[23px]`;

/** フィールド単位のエラー文言（役割色=ローズ） */
export const errorClass = "text-[14px] font-bold text-off";

/** フォーム全体のエラー帯（合言葉の誤入力など） */
export const errorBandClass =
  "rounded-12 border border-off-line bg-off-surface px-4 py-2 text-[17px] text-off";
