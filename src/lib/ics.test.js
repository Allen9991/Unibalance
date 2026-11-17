import test from "node:test";
import assert from "node:assert/strict";
import { courses } from "../data/testFixtures.js";
import { parseIcsTimetable } from "./ics.js";

test("parses single timetable event into a calendar commitment", () => {
  const events = parseIcsTimetable(`
BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:COSC121 Lecture
LOCATION:Room 101
DTSTART:20260525T090000
DTEND:20260525T100000
END:VEVENT
END:VCALENDAR
`, courses);

  assert.equal(events.length, 1);
  assert.equal(events[0].day, "Mon");
  assert.equal(events[0].start, 9);
  assert.equal(events[0].end, 10);
  assert.equal(events[0].course, "COSC121");
  assert.equal(events[0].source, "ics");
});

test("expands weekly BYDAY rules for course timetable imports", () => {
  const events = parseIcsTimetable(`
BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:MATH103 Tutorial
DTSTART:20260526T123000
DTEND:20260526T133000
RRULE:FREQ=WEEKLY;BYDAY=TU,TH
END:VEVENT
END:VCALENDAR
`, courses);

  assert.deepEqual(events.map((event) => event.day), ["Tue", "Thu"]);
  assert.equal(events[0].start, 12.5);
  assert.equal(events.every((event) => event.course === "MATH103"), true);
});
