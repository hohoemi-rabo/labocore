// 金額表示（「¥」は数字より一回り小さく muted、数字は tabular-nums）。
//
// muted を色トークンではなく opacity で表すのは、この部品を**白面（v1 の生徒詳細）と
// ダーク面（月次集計）の両方が使う**ため。親の文字色に対して相対的に落ちるので、
// どちらの面でも意図どおりになる（v1 の見た目もほぼ変わらない:
// #1d1d1f の 60% ≒ #7a7a7a = 従来の ink-muted-48）。
export function Yen({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="mr-0.5 text-[0.8em] opacity-60">¥</span>
      <span className="tabular-nums">{amount.toLocaleString("ja-JP")}</span>
    </span>
  );
}
