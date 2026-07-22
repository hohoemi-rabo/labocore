// 曜日ラベル（0=日〜6=土）。DB の weekday(int) と対応。
export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// Postgres time("HH:MM:SS") を "HH:MM–HH:MM" の表示に整形する。
export const formatTimeRange = (start: string, end: string) =>
  `${start.slice(0, 5)}–${end.slice(0, 5)}`;

// 金額を日本円表記に（DESIGN §2: カンマ区切りは toLocaleString('ja-JP')）。
// ¥ を数字より小さく muted に見せたい表示箇所では <Yen> コンポーネントを使う。
export const formatYen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;

// "2026-07" → "2026年7月"
export const formatMonthJa = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
};

// "1950-03-15" → "1950年3月15日"
export const formatDateJa = (date: string) => {
  const [y, m, d] = date.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
};

// JST の今日を "YYYY-MM-DD" で返す。過去/今後判定・当日判定に使う。
// sv-SE ロケールは ISO 形式（YYYY-MM-DD）を返す。
export const todayJst = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date(),
  );
