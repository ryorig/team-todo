// 日付はすべて日本時間（Asia/Tokyo）で扱う
export const TZ = "Asia/Tokyo";

export function todayStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDue(ymd: string | null, today = todayStr()): string {
  if (!ymd) return "";
  if (ymd === today) return "今日";
  if (ymd === addDays(today, 1)) return "明日";
  if (ymd === addDays(today, -1)) return "昨日";
  const [y, m, d] = ymd.split("-").map(Number);
  const w = WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const ty = Number(today.slice(0, 4));
  return y === ty ? `${m}月${d}日(${w})` : `${y}年${m}月${d}日(${w})`;
}
