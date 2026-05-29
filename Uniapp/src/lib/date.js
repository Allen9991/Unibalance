export const DAY = 24 * 60 * 60 * 1000;

export function today() {
  return new Date();
}

export function iso(offset, base = today()) {
  return new Date(base.getTime() + offset * DAY).toISOString().slice(0, 10);
}

export function shortDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function daysUntil(date, base = today()) {
  return Math.ceil((new Date(`${date}T23:59:00`) - base) / DAY);
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

