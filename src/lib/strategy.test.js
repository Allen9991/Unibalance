import test from "node:test";
import assert from "node:assert/strict";
import { assessments, commitments, courses, taskHistory } from "../data/testFixtures.js";
import { buildPlan, planAvoidsCommitments, preservesProtectedDowntime } from "./planner.js";
import { assessDropSafety, buildStrategy, calculateRequiredAverageForTarget, estimatedHoursRemaining, scoreAssessment } from "./strategy.js";

test("high-weight near-due assessment outranks lower-leverage work", () => {
  const strategy = buildStrategy(courses, assessments, taskHistory);
  assert.equal(strategy.bestNextHour.course, "MATH103");
  assert.equal(strategy.bestNextHour.title, "Calculus test");
  assert.ok(strategy.bestNextHour.marginalValuePerHour > strategy.scoredAssessments.find((item) => item.id === 5).marginalValuePerHour);
});

test("low-value quiz can be marked safe to reduce when leverage is low", () => {
  const strategy = buildStrategy(courses, assessments, taskHistory);
  const quiz = strategy.scoredAssessments.find((item) => item.id === 5);
  assert.equal(quiz.safeToReduce, true);
  assert.ok(strategy.dropCandidates.some((item) => item.id === quiz.id));
});

test("minimum viable week returns only non-negotiable tasks", () => {
  const strategy = buildStrategy(courses, assessments, taskHistory);
  assert.ok(strategy.minimumViableAssessments.length <= 5);
  assert.equal(strategy.minimumViableAssessments[0].id, strategy.bestNextHour.id);
  assert.ok(strategy.minimumViableAssessments.every((item) => item.status !== "done"));
});

test("repeatedly rescheduled task generates a two-minute starter action", () => {
  const strategy = buildStrategy(courses, assessments, taskHistory);
  const judo = strategy.procrastination.find((item) => item.assessmentId === 9);
  assert.ok(judo);
  assert.match(judo.firstMove, /Open|Create|write|solve/i);
});

test("generated study blocks avoid fixed commitments", () => {
  const strategy = buildStrategy(courses, assessments, taskHistory);
  const plan = buildPlan({ commitments, scoredAssessments: strategy.scoredAssessments, taskHistory });
  assert.equal(planAvoidsCommitments(plan, commitments), true);
});

test("minimum viable week preserves protected downtime", () => {
  const strategy = buildStrategy(courses, assessments, taskHistory);
  const plan = buildPlan({ commitments, scoredAssessments: strategy.scoredAssessments, taskHistory, minimumViable: true });
  assert.equal(preservesProtectedDowntime(plan), true);
});

test("near-complete assessments do not create absurd marginal value", () => {
  const nearDone = {
    id: "near-done",
    course: "STAT101",
    title: "Almost finished worksheet",
    type: "Assignment",
    dueDate: assessments.find((item) => item.id === 11).dueDate,
    weighting: 20,
    status: "in progress",
    progress: 99,
    estimatedHours: 10,
  };
  const exam = {
    id: "barely-started-exam",
    course: "STAT101",
    title: "Barely started exam",
    type: "Exam",
    dueDate: assessments.find((item) => item.id === 13).dueDate,
    weighting: 50,
    status: "not started",
    progress: 5,
    estimatedHours: 20,
  };

  assert.equal(estimatedHoursRemaining(nearDone), 0);
  const strategy = buildStrategy(courses, [nearDone, exam], {});
  assert.equal(strategy.scoredAssessments.find((item) => item.id === nearDone.id).marginalValuePerHour, 0);
  assert.equal(strategy.bestNextHour.id, exam.id);
});

test("done assessments return neutral strategy values", () => {
  const done = scoreAssessment({ ...assessments[0], status: "done", progress: 100 }, courses);

  assert.equal(done.urgencyScore, 0);
  assert.equal(done.gradeLeverageScore, 0);
  assert.equal(done.completionRisk, 0);
  assert.equal(done.estimatedHoursRemaining, 0);
  assert.equal(done.marginalValuePerHour, 0);
  assert.equal(done.strategicScore, 0);
  assert.equal(done.safeToReduce, false);
});

test("drop-safety agrees with target-grade reachability", () => {
  const strategy = buildStrategy(courses, assessments, taskHistory);

  strategy.scoredAssessments
    .filter((assessment) => assessment.status !== "done")
    .forEach((assessment) => {
      const course = courses.find((item) => item.code === assessment.course);
      const gradePlan = calculateRequiredAverageForTarget({
        course,
        assessments,
        fixedAssessmentScores: { [assessment.id]: 0 },
      });
      const dropSafety = assessDropSafety({ course, assessments, assessment });

      assert.equal(dropSafety.canReachTarget, gradePlan.canReachTarget);
      if (assessment.safeToReduce) {
        assert.equal(gradePlan.canReachTarget, true);
      }
    });
});
