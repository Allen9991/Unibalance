import test from "node:test";
import assert from "node:assert/strict";
import { assessments } from "../data/testFixtures.js";
import { buildNotificationRequests } from "./notifications.js";

test("builds deadline and study-block notification requests", () => {
  const notifications = buildNotificationRequests({
    assessments,
    plan: [{ id: "study-1", day: "Mon", start: 10, end: 11, type: "study", title: "COSC121: Assignment 2" }],
    now: new Date("2026-05-25T08:00:00"),
  });

  assert.ok(notifications.some((item) => item.title.includes("COSC121")));
  assert.ok(notifications.some((item) => item.title === "Study block soon"));
  assert.equal(notifications.every((item) => item.schedule.at instanceof Date), true);
});

test("does not schedule notifications for completed or skipped work", () => {
  const notifications = buildNotificationRequests({
    assessments: [{ ...assessments[0], status: "done" }],
    plan: [{ id: "study-1", day: "Mon", start: 10, end: 11, type: "study", status: "skipped", title: "Skip me" }],
    now: new Date("2026-05-25T08:00:00"),
  });

  assert.equal(notifications.length, 0);
});
