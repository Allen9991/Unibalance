import { days } from "../data/fixtures.js";
import { clamp, daysUntil } from "./date.js";

export function buildFreeSlots(events) {
  const slots = [];
  days.forEach((day) => {
    for (let start = 8; start <= 20; start += 1) {
      const blocked = events.some((event) => event.day === day && start < event.end && start + 1 > event.start);
      const protectsDowntime = (day === "Sat" && start < 17) || (day === "Sun" && start > 18);
      if (!blocked && !protectsDowntime) slots.push({ day, start, end: start + 1 });
    }
  });
  return slots;
}

export function buildPlan({ commitments, scoredAssessments, taskHistory = {}, variant = 0, minimumViable = false, baseDate }) {
  const events = [...commitments];
  const slots = buildFreeSlots(events);
  const work = [...scoredAssessments]
    .filter((item) => item.status !== "done")
    .sort((a, b) => b.strategicScore - a.strategicScore)
    .slice(0, minimumViable ? 5 : 8);
  let cursor = variant % Math.max(1, slots.length);

  work.forEach((item) => {
    const desiredBlocks = minimumViable
      ? item.id === work[0].id
        ? 2
        : 1
      : clamp(Math.ceil(item.estimatedHoursRemaining / Math.max(2.5, daysUntil(item.dueDate, baseDate) / 3)), 1, 3);
    for (let i = 0; i < desiredBlocks; i += 1) {
      const slot = slots.splice((cursor + i * 2) % Math.max(1, slots.length), 1)[0];
      if (slot) {
        const history = taskHistory[item.id] || {};
        events.push({
          ...slot,
          id: `study-${item.id}-${slot.day}-${slot.start}`,
          assessmentId: item.id,
          title: `${item.course}: ${item.title}`,
          course: item.course,
          type: "study",
          status: history.blockStatuses?.[`study-${item.id}-${slot.day}-${slot.start}`] || "planned",
          minimumViable,
        });
      }
    }
    cursor += 2 + variant;
  });
  return events;
}

export function planAvoidsCommitments(plan, commitments) {
  return plan
    .filter((event) => event.type === "study")
    .every((study) => !commitments.some((event) => event.day === study.day && study.start < event.end && study.end > event.start));
}

export function preservesProtectedDowntime(plan) {
  return plan
    .filter((event) => event.type === "study")
    .every((study) => !(study.day === "Sat" && study.start < 17) && !(study.day === "Sun" && study.start > 18));
}

