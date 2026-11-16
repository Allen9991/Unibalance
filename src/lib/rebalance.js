export function buildRecoveryPlan({ state, strategy, plan }) {
  const change = state.recentChange;
  const studyBlocks = plan.filter((event) => event.type === "study");
  const nextBlock = studyBlocks.find((event) => event.status !== "completed" && event.status !== "skipped");
  const affectedAssessment = change?.assessmentId
    ? strategy.scoredAssessments.find((assessment) => assessment.id === change.assessmentId)
    : strategy.bestNextHour;

  if (!change) {
    return {
      title: "Plan is balanced",
      detail: nextBlock
        ? `Next strategic block is ${nextBlock.title} on ${nextBlock.day} at ${formatHour(nextBlock.start)}.`
        : "No study blocks need recovery right now.",
      movedBlocks: [],
      risk: strategy.bestNextHour?.completionRisk || 0,
      nextRecoverySlot: nextBlock || null,
    };
  }

  if (change.type === "importTimetable") {
    const imported = state.commitments.filter((commitment) => commitment.source === "ics");
    return {
      title: "Timetable imported",
      detail: `${imported.length} timetable blocks are now protected. UniBalance regenerated study blocks around those fixed times.`,
      movedBlocks: studyBlocks.slice(0, 4),
      risk: strategy.bestNextHour?.completionRisk || 0,
      nextRecoverySlot: nextBlock || null,
    };
  }

  const action = change.status === "skipped" ? "skipped" : "rescheduled";
  return {
    title: `${affectedAssessment?.course || "Study"} recovery plan`,
    detail: `You ${action} ${affectedAssessment?.title || "a study block"}. The next recovery slot is ${nextBlock ? `${nextBlock.day} ${formatHour(nextBlock.start)}` : "not available yet"}.`,
    movedBlocks: studyBlocks.filter((event) => event.assessmentId === change.assessmentId).slice(0, 3),
    risk: affectedAssessment?.completionRisk || 0,
    nextRecoverySlot: nextBlock || null,
  };
}

function formatHour(value) {
  const hour = Math.floor(value);
  const minute = Math.round((value % 1) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
