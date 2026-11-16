export function calculateCourseGradeSnapshot(course, assessments = []) {
  if (!course) return { currentGrade: 0, completedWeight: 0, projectedGrade: 0 };

  const courseAssessments = assessments.filter((assessment) => assessment.course === course.code);
  const regular = courseAssessments.filter((assessment) => !assessment.seriesId);
  const seriesGroups = groupBySeries(courseAssessments.filter((assessment) => assessment.seriesId));
  let earnedPoints = 0;
  let completedWeight = 0;

  regular.forEach((assessment) => {
    if (assessment.status !== "done" || assessment.grade === undefined) return;
    earnedPoints += Number(assessment.grade) * (Number(assessment.weighting) || 0) / 100;
    completedWeight += Number(assessment.weighting) || 0;
  });

  seriesGroups.forEach((items) => {
    const bestOf = Number(items[0]?.bestOf) || items.length;
    const scored = items
      .filter((item) => item.status === "done" || item.grade !== undefined)
      .map((item) => ({ ...item, grade: Number(item.grade) || 0 }))
      .sort((a, b) => b.grade - a.grade)
      .slice(0, bestOf);

    scored.forEach((item) => {
      earnedPoints += item.grade * (Number(item.weighting) || 0) / 100;
      completedWeight += Number(item.weighting) || 0;
    });
  });

  const currentGrade = completedWeight > 0 ? earnedPoints / (completedWeight / 100) : Number(course.gradeSoFar) || 0;
  const projectedGrade = earnedPoints + Math.max(0, 100 - completedWeight) * (Number(course.gradeSoFar) || currentGrade) / 100;

  return {
    currentGrade: Number(currentGrade.toFixed(1)),
    completedWeight: Number(completedWeight.toFixed(1)),
    projectedGrade: Number(projectedGrade.toFixed(1)),
  };
}

export function buildPacingInsight(courses = [], assessments = [], studySessions = []) {
  const courseInsights = courses.map((course) => {
    const courseAssessments = assessments.filter((assessment) => assessment.course === course.code);
    const activeAssessments = courseAssessments.filter((assessment) => assessment.status !== "done");
    const loggedHours = studySessions
      .filter((session) => session.course === course.code)
      .reduce((sum, session) => sum + (Number(session.minutes) || 0) / 60, 0);
    const expectedCompletedHours = courseAssessments.reduce((sum, assessment) => (
      sum + (Number(assessment.estimatedHours) || 0) * ((Number(assessment.progress) || 0) / 100)
    ), 0);
    const paceRatio = expectedCompletedHours > 0 ? loggedHours / expectedCompletedHours : 1;
    const shouldStartEarlier = paceRatio > 1.25 && activeAssessments.length > 0;

    return {
      course: course.code,
      paceRatio: Number(paceRatio.toFixed(2)),
      shouldStartEarlier,
      message: shouldStartEarlier
        ? `${course.code} is taking about ${Math.round((paceRatio - 1) * 100)}% longer than planned. Start the next task earlier.`
        : `${course.code} pacing looks close to plan.`,
    };
  });

  return {
    courseInsights,
    warnings: courseInsights.filter((item) => item.shouldStartEarlier),
  };
}

function groupBySeries(items) {
  return Object.values(items.reduce((groups, item) => {
    groups[item.seriesId] = groups[item.seriesId] || [];
    groups[item.seriesId].push(item);
    return groups;
  }, {}));
}
