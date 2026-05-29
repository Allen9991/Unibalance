import test from "node:test";
import assert from "node:assert/strict";
import { assessments, commitments, courses, taskHistory } from "../data/fixtures.js";
import { buildPlan, planAvoidsCommitments, preservesProtectedDowntime } from "./planner.js";
import { buildStrategy } from "./strategy.js";

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

