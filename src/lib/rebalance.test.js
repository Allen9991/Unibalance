import test from "node:test";
import assert from "node:assert/strict";
import { createInitialAppState } from "../state/appReducer.js";
import { assessments, commitments, courses, taskHistory } from "../data/testFixtures.js";
import { buildPlan } from "./planner.js";
import { buildRecoveryPlan } from "./rebalance.js";
import { buildStrategy } from "./strategy.js";

function createPopulatedState() {
  return {
    ...createInitialAppState(),
    courses: structuredClone(courses),
    assessments: structuredClone(assessments),
    commitments: structuredClone(commitments),
    taskHistory: structuredClone(taskHistory),
  };
}

test("recovery plan explains skipped study blocks", () => {
  const state = {
    ...createPopulatedState(),
    recentChange: { type: "markBlock", status: "skipped", assessmentId: 11, blockId: "study-11-Mon-8" },
  };
  const strategy = buildStrategy(state.courses, state.assessments, state.taskHistory);
  const plan = buildPlan({ commitments: state.commitments, scoredAssessments: strategy.scoredAssessments, taskHistory: state.taskHistory });
  const recovery = buildRecoveryPlan({ state, strategy, plan });

  assert.match(recovery.detail, /skipped/i);
  assert.ok(recovery.risk >= 0);
  assert.ok(recovery.nextRecoverySlot);
});

test("recovery plan reports imported timetable blocks", () => {
  const state = {
    ...createPopulatedState(),
    commitments: [
      ...commitments,
      { id: "ics-1", source: "ics", day: "Mon", start: 8, end: 9, type: "course", title: "Imported lecture" },
    ],
    recentChange: { type: "importTimetable", count: 1 },
  };
  const strategy = buildStrategy(state.courses, state.assessments, state.taskHistory);
  const plan = buildPlan({ commitments: state.commitments, scoredAssessments: strategy.scoredAssessments, taskHistory: state.taskHistory });
  const recovery = buildRecoveryPlan({ state, strategy, plan });

  assert.match(recovery.title, /Timetable imported/);
  assert.match(recovery.detail, /1 timetable blocks/);
});
