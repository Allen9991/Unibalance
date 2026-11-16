import { days } from "../data/fixtures.js";

const dayCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function parseIcsTimetable(text, courses = [], baseDate = new Date()) {
  return unfoldIcsLines(text)
    .reduce(toEvents, [])
    .flatMap((event, index) => expandEvent(event, index, courses, baseDate));
}

function unfoldIcsLines(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .reduce((lines, line) => {
      if (/^[ \t]/.test(line) && lines.length) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line.trim());
      }
      return lines;
    }, []);
}

function toEvents(events, line) {
  if (line === "BEGIN:VEVENT") return [...events, {}];
  if (line === "END:VEVENT" || !events.length) return events;

  const separator = line.indexOf(":");
  if (separator === -1) return events;

  const rawKey = line.slice(0, separator);
  const value = decodeIcsText(line.slice(separator + 1));
  const key = rawKey.split(";")[0];
  const current = events[events.length - 1];

  if (key === "SUMMARY") current.summary = value;
  if (key === "LOCATION") current.location = value;
  if (key === "DTSTART") current.start = parseIcsDate(value);
  if (key === "DTEND") current.end = parseIcsDate(value);
  if (key === "RRULE") current.rrule = parseRRule(value);

  return events;
}

function expandEvent(event, index, courses, baseDate) {
  if (!event.start || !event.end || !event.summary) return [];

  const weekDays = event.rrule?.byday?.length
    ? event.rrule.byday.map((code) => dayCodes.indexOf(code)).filter((day) => day > 0 && day < 6)
    : [event.start.getDay()];

  return weekDays
    .map((weekday, occurrenceIndex) => buildCommitment(event, index, occurrenceIndex, weekday, courses, baseDate))
    .filter(Boolean);
}

function buildCommitment(event, index, occurrenceIndex, weekday, courses) {
  const day = days[weekday - 1];
  if (!day) return null;

  const course = courses.find((item) => event.summary.toUpperCase().includes(item.code));
  const lower = event.summary.toLowerCase();
  const classKind = lower.includes("lab") ? "lab" : lower.includes("tutorial") || lower.includes("tut") ? "tutorial" : "lecture";

  return {
    id: `ics-${index}-${occurrenceIndex}-${slug(event.summary)}`,
    day,
    start: toDecimalHour(event.start),
    end: toDecimalHour(event.end),
    title: event.location ? `${event.summary} (${event.location})` : event.summary,
    type: course ? "course" : "life",
    source: "ics",
    course: course?.code,
    classKind,
  };
}

function parseIcsDate(value) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
  if (!match) return null;
  const [, year, month, day, hour = "00", minute = "00"] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function parseRRule(value) {
  return value.split(";").reduce((rule, part) => {
    const [key, raw] = part.split("=");
    if (key === "BYDAY") rule.byday = raw.split(",");
    return rule;
  }, {});
}

function toDecimalHour(date) {
  return Number((date.getHours() + date.getMinutes() / 60).toFixed(2));
}

function decodeIcsText(value) {
  return value.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").trim();
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32);
}
