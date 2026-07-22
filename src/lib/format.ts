// 曜日ラベル（0=日〜6=土）。DB の weekday(int) と対応。
export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// Postgres time("HH:MM:SS") を "HH:MM–HH:MM" の表示に整形する。
export const formatTimeRange = (start: string, end: string) =>
  `${start.slice(0, 5)}–${end.slice(0, 5)}`;

// 金額を日本円表記に（DESIGN §2: カンマ区切りは toLocaleString('ja-JP')）。
export const formatYen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;
