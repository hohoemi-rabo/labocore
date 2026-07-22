// 曜日ラベル（0=日〜6=土）。DB の weekday(int) と対応。
export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// Postgres time("HH:MM:SS") を "HH:MM–HH:MM" の表示に整形する。
export const formatTimeRange = (start: string, end: string) =>
  `${start.slice(0, 5)}–${end.slice(0, 5)}`;
