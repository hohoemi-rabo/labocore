// 金額表示（DESIGN §2: 「¥」は数字より一回り小さく muted、数字は tabular-nums）。
export function Yen({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="mr-0.5 text-[0.8em] text-ink-muted-48">¥</span>
      <span className="tabular-nums">{amount.toLocaleString("ja-JP")}</span>
    </span>
  );
}
