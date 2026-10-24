import type { TimeTag } from "./db";

const TIME_LABELS: Record<TimeTag, string> = { "15m": "15 min", "1h": "1 hour", half_day: "Half day" };
export function timeLabel(tag: TimeTag | string | null | undefined): string {
  if (!tag) return "Any time";
  return TIME_LABELS[tag as TimeTag] ?? tag;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const DAY = 86_400_000;
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatDeadline(deadline: string | null | undefined, now = new Date()): string {
  if (!deadline) return "No deadline";
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return "No deadline";
  const days = Math.round((startOfDay(d) - startOfDay(now)) / DAY);
  if (days < 0) return days === -1 ? "Overdue by 1 day" : `Overdue by ${-days} days`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 7) return `Due in ${days} days`;
  return `Due ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

export function relativeTime(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.round((now.getTime() - t) / 1000);
  const future = s < 0;
  const a = Math.abs(s);
  let v: string;
  if (a < 45) return "just now";
  if (a < 3600) v = pluralize(Math.round(a / 60), "min");
  else if (a < 86400) v = pluralize(Math.round(a / 3600), "hour");
  else if (a < 7 * 86400) v = pluralize(Math.round(a / 86400), "day");
  else if (a < 30 * 86400) v = pluralize(Math.round(a / (7 * 86400)), "week");
  else v = pluralize(Math.round(a / (30 * 86400)), "month");
  return future ? `in ${v}` : `${v} ago`;
}
