import test from "node:test";
import assert from "node:assert/strict";
import { appReducer, createInitialAppState } from "./appReducer.js";
import { assessments, commitments, courses, studySessions, taskHistory } from "../data/testFixtures.js";

function createPopulatedState() {
  return {
    ...createInitialAppState(),
    courses: structuredClone(courses),
    assessments: structuredClone(assessments),
    commitments: structuredClone(commitments),
    studySessions: structuredClone(studySessions),
    taskHistory: structuredClone(taskHistory),
  };
}

test("logging a study session advances the linked assessment progress", () => {
  const state = createPopulatedState();
  const assessment = state.assessments.find((item) => item.id === 3);
  const next = appReducer(state, {
    type: "logStudySession",
    assessmentId: assessment.id,
    minutes: 60,
  });
  const updated = next.assessments.find((item) => item.id === assessment.id);
  const course = next.courses.find((item) => item.code === assessment.course);

  assert.equal(next.studySessions.at(-1).assessmentId, assessment.id);
  assert.equal(next.studySessions.at(-1).course, assessment.course);
  assert.ok(updated.progress > assessment.progress);
  assert.equal(updated.status, "in progress");
  assert.equal(course.logged, state.courses.find((item) => item.code === assessment.course).logged + 1);
  assert.equal(next.planVariant, state.planVariant + 1);
});

test("completing a study block logs time against that assessment", () => {
  const state = createPopulatedState();
  const next = appReducer(state, {
    type: "markBlock",
    assessmentId: 11,
    blockId: "study-11-Mon-8",
    status: "completed",
    minutes: 60,
  });

  assert.equal(next.taskHistory[11].completedBlocks, (state.taskHistory[11]?.completedBlocks || 0) + 1);
  assert.equal(next.studySessions.at(-1).assessmentId, 11);
  assert.ok(next.assessments.find((item) => item.id === 11).progress > state.assessments.find((item) => item.id === 11).progress);
});

test("skipping a study block triggers automatic rebalancing", () => {
  const state = createPopulatedState();
  const next = appReducer(state, {
    type: "markBlock",
    assessmentId: 11,
    blockId: "study-11-Mon-8",
    status: "skipped",
  });

  assert.equal(next.planVariant, state.planVariant + 1);
  assert.equal(next.recentChange.status, "skipped");
  assert.equal(next.recentChange.assessmentId, 11);
});

test("start session action opens planner with selected assessment target", () => {
  const state = createPopulatedState();
  const next = appReducer(state, { type: "startSessionForAssessment", assessmentId: 6 });

  assert.equal(next.view, "Planner");
  assert.equal(next.timerTarget.assessmentId, 6);
  assert.equal(next.timerTarget.course, "MATH103");
});

test("assessment update can edit fields, nudge progress, and mark done", () => {
  const state = createPopulatedState();
  const next = appReducer(state, {
    type: "updateAssessment",
    assessmentId: 2,
    patch: { title: "Midterm test revised", weighting: 30, progress: 100, status: "done" },
  });
  const updated = next.assessments.find((item) => item.id === 2);

  assert.equal(updated.title, "Midterm test revised");
  assert.equal(updated.weighting, 30);
  assert.equal(updated.progress, 100);
  assert.equal(updated.status, "done");
  assert.equal(next.planVariant, state.planVariant + 1);
});

test("assessment delete removes assessment and linked sessions", () => {
  const state = createPopulatedState();
  const next = appReducer(state, { type: "deleteAssessment", assessmentId: 3 });

  assert.equal(next.assessments.some((item) => item.id === 3), false);
  assert.equal(next.studySessions.some((session) => session.assessmentId === 3), false);
  assert.equal(next.planVariant, state.planVariant + 1);
});

test("timetable import replaces previous imported calendar commitments", () => {
  const state = createPopulatedState();
  const first = appReducer(state, {
    type: "importTimetable",
    commitments: [{ id: "ics-old", day: "Mon", start: 8, end: 9, title: "Old", type: "course", source: "ics" }],
  });
  const second = appReducer(first, {
    type: "importTimetable",
    commitments: [{ id: "ics-new", day: "Tue", start: 10, end: 11, title: "New", type: "course", source: "ics" }],
  });

  assert.equal(second.commitments.some((item) => item.id === "ics-old"), false);
  assert.equal(second.commitments.some((item) => item.id === "ics-new"), true);
  assert.equal(second.commitments.some((item) => item.id === "work-tue"), true);
  assert.equal(second.planVariant, first.planVariant + 1);
  assert.equal(second.recentChange.type, "importTimetable");
});

test("initial app state starts without prototype data", () => {
  const state = createInitialAppState();

  assert.deepEqual(state.courses, []);
  assert.deepEqual(state.assessments, []);
  assert.deepEqual(state.commitments, []);
});

test("course creation adds a real user-owned course", () => {
  const state = createInitialAppState();
  const next = appReducer(state, {
    type: "addCourse",
    course: { code: "bio101", name: "Biology", recommended: 6, contact: { lectures: 2, tutorials: 1, labs: 1 } },
  });

  assert.equal(next.courses[0].code, "BIO101");
  assert.equal(next.courses[0].name, "Biology");
  assert.equal(next.courses[0].recommended, 6);
});

test("recurring split-mark assessment updates grade from attendance and work", () => {
  const state = {
    ...createInitialAppState(),
    courses: [{ code: "EMTH210", name: "Engineering Mathematics 2", contact: {}, recommended: 10, logged: 0, gradeSoFar: 0, targetGrade: 75 }],
  };
  const added = appReducer(state, {
    type: "addAssessment",
    assessment: {
      course: "EMTH210",
      title: "Tutorial 1",
      type: "Tutorial",
      dueDate: "2026-02-20",
      weighting: 1,
      gradingMode: "attendance-work",
      attendanceWeight: 50,
      workWeight: 50,
    },
  });
  const assessmentId = added.assessments[0].id;
  const updated = appReducer(added, {
    type: "updateAssessment",
    assessmentId,
    patch: { attendanceScore: 100, workScore: 0 },
  });

  assert.equal(updated.assessments[0].grade, 50);
  assert.equal(updated.assessments[0].status, "done");
});

test("academic key dates merge into reducer state", () => {
  const state = createInitialAppState();
  const next = appReducer(state, {
    type: "addKeyDates",
    keyDates: [{ id: "exam-window-2026", title: "Exam period", startDate: "2026-06-08", endDate: "2026-06-20" }],
  });

  assert.equal(next.keyDates[0].title, "Exam period");
  assert.equal(next.keyDates[0].endDate, "2026-06-20");
});
