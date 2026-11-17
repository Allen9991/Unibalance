import test from "node:test";
import assert from "node:assert/strict";
import { buildPacingInsight, calculateCourseGradeSnapshot } from "./gradebook.js";

test("course grade snapshot counts best-of recurring items only", () => {
  const course = { code: "EMTH210", gradeSoFar: 70 };
  const assessments = [
    { id: 1, course: "EMTH210", title: "Tutorial 1", seriesId: "tutorials", bestOf: 2, weighting: 1, status: "done", grade: 100 },
    { id: 2, course: "EMTH210", title: "Tutorial 2", seriesId: "tutorials", bestOf: 2, weighting: 1, status: "done", grade: 50 },
    { id: 3, course: "EMTH210", title: "Tutorial 3", seriesId: "tutorials", bestOf: 2, weighting: 1, status: "done", grade: 0 },
    { id: 4, course: "EMTH210", title: "Mid-course Test", weighting: 35, status: "done", grade: 80 },
  ];

  const snapshot = calculateCourseGradeSnapshot(course, assessments);

  assert.equal(snapshot.completedWeight, 37);
  assert.equal(snapshot.currentGrade, 79.7);
});

test("pacing insight warns when logged work takes longer than estimate progress", () => {
  const result = buildPacingInsight(
    [{ code: "SENG201" }],
    [{ id: 1, course: "SENG201", estimatedHours: 4, progress: 50, status: "in progress" }],
    [{ course: "SENG201", minutes: 240 }],
  );

  assert.equal(result.warnings[0].course, "SENG201");
  assert.match(result.warnings[0].message, /longer than planned/);
});
