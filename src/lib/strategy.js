import { clamp, daysUntil } from "./date.js";

export function getCourse(courses, code) {
  return courses.find((course) => course.code === code);
}

export function estimatedHoursRemaining(assessment) {
  if (!assessment || assessment.status === "done") return 0;
  const remainingRatio = clamp((100 - (assessment.progress || 0)) / 100, 0, 1);
  if (remainingRatio <= 0.02 || !assessment.estimatedHours) return 0;
  return Number(Math.max(0, assessment.estimatedHours * remainingRatio).toFixed(2));
}

export function calculateRequiredAverageForTarget({ course, assessments, targetGrade = course?.targetGrade, fixedAssessmentScores = {} }) {
  if (!course) {
    return { requiredAverage: Infinity, canReachTarget: false, flexibleWeight: 0, fixedPoints: 0, maxReachableGrade: 0 };
  }

  let fixedPoints = 0;
  let flexibleWeight = 0;

  assessments
    .filter((assessment) => assessment.course === course.code)
    .forEach((assessment) => {
      const weight = assessment.weighting / 100;
      const fixedScore = fixedAssessmentScores[assessment.id];

      if (assessment.status === "done") {
        fixedPoints += (assessment.grade ?? course.gradeSoFar) * weight;
      } else if (fixedScore !== undefined) {
        fixedPoints += fixedScore * weight;
      } else {
        flexibleWeight += weight;
      }
    });

  if (flexibleWeight <= 0) {
    const canReachTarget = fixedPoints >= targetGrade;
    return {
      requiredAverage: canReachTarget ? 0 : Infinity,
      canReachTarget,
      flexibleWeight,
      fixedPoints,
      maxReachableGrade: fixedPoints,
    };
  }

  const requiredAverage = (targetGrade - fixedPoints) / flexibleWeight;
  const maxReachableGrade = fixedPoints + flexibleWeight * 100;

  return {
    requiredAverage,
    canReachTarget: maxReachableGrade >= targetGrade && requiredAverage <= 100,
    flexibleWeight,
    fixedPoints,
    maxReachableGrade,
  };
}

export function calculateRequiredAssessmentGrade({ course, assessments, assessmentId, targetGrade = course?.targetGrade, expectedMark }) {
  const assessment = assessments.find((item) => item.id === assessmentId);
  if (!course || !assessment || assessment.weighting <= 0) return Infinity;

  const assumedMark = expectedMark ?? course.gradeSoFar;
  let fixedPoints = 0;

  assessments
    .filter((item) => item.course === course.code && item.id !== assessmentId)
    .forEach((item) => {
      const mark = item.status === "done" ? item.grade ?? course.gradeSoFar : assumedMark;
      fixedPoints += mark * (item.weighting / 100);
    });

  return (targetGrade - fixedPoints) / (assessment.weighting / 100);
}

export function assessDropSafety({ course, assessments, assessment, targetGrade = course?.targetGrade }) {
  if (!course || !assessment || assessment.status === "done") {
    return { dropSafetyScore: 100, canReachTarget: true, requiredAverageWithoutAssessment: 0 };
  }

  const targetPlan = calculateRequiredAverageForTarget({
    course,
    assessments,
    targetGrade,
    fixedAssessmentScores: { [assessment.id]: 0 },
  });
  const difficultyCredit = Number.isFinite(targetPlan.requiredAverage)
    ? clamp((100 - targetPlan.requiredAverage) * 2, 0, 45)
    : 0;
  const progressCredit = clamp((assessment.progress || 0) * 0.25, 0, 25);
  const lowWeightCredit = clamp((22 - assessment.weighting) * 2, 0, 22);
  const reachableCredit = targetPlan.canReachTarget ? 25 : 0;
  const dropSafetyScore = Math.round(clamp(reachableCredit + difficultyCredit + progressCredit + lowWeightCredit, 0, 100));

  return {
    dropSafetyScore,
    canReachTarget: targetPlan.canReachTarget,
    requiredAverageWithoutAssessment: Number.isFinite(targetPlan.requiredAverage) ? Number(targetPlan.requiredAverage.toFixed(1)) : Infinity,
  };
}

export function scoreAssessment(assessment, courses, baseDate, allAssessments = []) {
  if (assessment.status === "done") {
    return {
      ...assessment,
      urgencyScore: 0,
      gradeLeverageScore: 0,
      completionRisk: 0,
      estimatedHoursRemaining: 0,
      marginalValuePerHour: 0,
      dropSafetyScore: 100,
      requiredAverageWithoutAssessment: 0,
      canReachTargetAfterDrop: true,
      strategicScore: 0,
      safeToReduce: false,
    };
  }

  const course = getCourse(courses, assessment.course);
  const courseAssessments = allAssessments.length ? allAssessments : course?.assessments || [];
  const dueDays = Math.max(1, daysUntil(assessment.dueDate, baseDate));
  const remainingRatio = clamp((100 - assessment.progress) / 100, 0, 1);
  const hoursRemaining = estimatedHoursRemaining(assessment);
  const urgencyScore = clamp(120 / dueDays, 0, 100);
  const planningWindowFactor = clamp(1.2 - dueDays / 80, 0.45, 1.15);
  const gradeLeverageScore = clamp(assessment.weighting * remainingRatio * 2.4, 0, 100);
  const completionRisk = clamp(urgencyScore * remainingRatio + assessment.weighting * 0.35, 0, 100);
  const targetPressure = course ? clamp(course.targetGrade - course.gradeSoFar + 8, 0, 20) / 20 : 0.4;
  const marginalValuePerHour = hoursRemaining <= 0
    ? 0
    : Number(
      clamp((assessment.weighting * remainingRatio * planningWindowFactor * (1 + urgencyScore / 160) * (0.85 + targetPressure)) / Math.sqrt(Math.max(hoursRemaining, 1)), 0, 25).toFixed(2),
    );
  const dropSafety = assessDropSafety({ course, assessments: courseAssessments, assessment });
  const strategicScore = Math.round(marginalValuePerHour * 10 + completionRisk * 0.55 + gradeLeverageScore * 0.65);

  return {
    ...assessment,
    urgencyScore: Math.round(urgencyScore),
    gradeLeverageScore: Math.round(gradeLeverageScore),
    completionRisk: Math.round(completionRisk),
    estimatedHoursRemaining: Number(hoursRemaining.toFixed(1)),
    marginalValuePerHour,
    dropSafetyScore: dropSafety.dropSafetyScore,
    requiredAverageWithoutAssessment: dropSafety.requiredAverageWithoutAssessment,
    canReachTargetAfterDrop: dropSafety.canReachTarget,
    strategicScore,
    safeToReduce: dropSafety.canReachTarget && dropSafety.dropSafetyScore >= 58 && marginalValuePerHour <= 8,
  };
}

export function buildStrategy(courses, assessments, taskHistory = {}, baseDate) {
  const coursesWithAssessments = courses.map((course) => ({
    ...course,
    assessments: assessments.filter((assessment) => assessment.course === course.code),
  }));
  const scored = assessments.map((assessment) => scoreAssessment(assessment, coursesWithAssessments, baseDate, assessments));
  const active = scored.filter((assessment) => assessment.status !== "done");
  const rankings = [...active].sort((a, b) => b.marginalValuePerHour - a.marginalValuePerHour || b.strategicScore - a.strategicScore);
  const bestNextHour = rankings[0];
  const dropCandidates = [...active]
    .filter((assessment) => assessment.safeToReduce)
    .sort((a, b) => b.dropSafetyScore - a.dropSafetyScore)
    .slice(0, 3);
  const minimumViableAssessments = [...active]
    .sort((a, b) => b.marginalValuePerHour - a.marginalValuePerHour || b.strategicScore - a.strategicScore)
    .slice(0, 5);
  const procrastination = active
    .map((assessment) => ({ assessment, history: taskHistory[assessment.id] || { rescheduled: 0, skipped: 0, completedBlocks: 0 } }))
    .filter(({ history }) => history.rescheduled + history.skipped >= 2)
    .map(({ assessment, history }) => ({
      id: `judo-${assessment.id}`,
      assessmentId: assessment.id,
      course: assessment.course,
      title: assessment.title,
      attempts: history.rescheduled + history.skipped,
      firstMove: makeFirstMove(assessment),
    }));

  return {
    scoredAssessments: scored,
    rankings,
    bestNextHour,
    dropCandidates,
    minimumViableAssessments,
    procrastination,
    recommendations: [
      bestNextHour && {
        id: "best-next-hour",
        type: "marginal-value",
        title: `Spend the next hour on ${bestNextHour.course}: ${bestNextHour.title}`,
        detail: `Estimated payoff is ${bestNextHour.marginalValuePerHour} grade-leverage points per hour because it is worth ${bestNextHour.weighting}% and ${Math.round(100 - bestNextHour.progress)}% remains.`,
        assessmentId: bestNextHour.id,
      },
      dropCandidates[0] && {
        id: "permission-to-drop",
        type: "drop",
        title: `Permission to reduce ${dropCandidates[0].course}: ${dropCandidates[0].title}`,
        detail: `Drop-safety is ${dropCandidates[0].dropSafetyScore}/100, so this is a better sacrifice than high-weight tests or projects.`,
        assessmentId: dropCandidates[0].id,
      },
      procrastination[0] && {
        id: "procrastination-judo",
        type: "judo",
        title: `Shrink ${procrastination[0].course}: ${procrastination[0].title}`,
        detail: procrastination[0].firstMove,
        assessmentId: procrastination[0].assessmentId,
      },
    ].filter(Boolean),
  };
}

function makeFirstMove(assessment) {
  const type = assessment.type.toLowerCase();
  if (type.includes("essay")) return "Open the document and write only the title plus one ugly bullet.";
  if (type.includes("test") || type.includes("exam")) return "Open the topic list and solve one example question with notes beside it.";
  if (type.includes("project")) return "Create the file or outline and name the first section. Stop after two minutes if needed.";
  return "Open the task, write the next physical action, and do just that one action.";
}

export function buildWeeklyIntensity(assessments, baseDate) {
  return Array.from({ length: 8 }, (_, week) => {
    const start = week * 7;
    const items = assessments.filter((item) => {
      const d = daysUntil(item.dueDate, baseDate);
      return d >= start && d < start + 7 && item.status !== "done";
    });
    return { week: `W${week + 1}`, assessments: items.length, weight: items.reduce((sum, item) => sum + item.weighting, 0) };
  });
}
