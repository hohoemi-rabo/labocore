// フォーム入力の共有スタイル（DESIGN §5.5）。CRUD フォーム全体で使い回す。
export const labelClass = "text-[14px] font-semibold text-ink";
export const inputClass =
  "h-11 rounded-pill border border-hairline bg-canvas px-5 text-[17px] text-ink outline-none focus:ring-2 focus:ring-primary-focus";
// 複数行なので pill ではなく 18px 角丸（pill は1行入力用）。
export const textareaClass =
  "min-h-[96px] rounded-lg border border-hairline bg-canvas px-5 py-3 text-[17px] text-ink outline-none focus:ring-2 focus:ring-primary-focus";
// エラーは赤を使わず ink 系（DESIGN §0）。
export const errorClass = "text-[14px] font-semibold text-ink";
