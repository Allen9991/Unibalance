export function createInitialAppState() {
  return {
    view: "Dashboard",
    sidebarCollapsed: false,
    courses: [],
    assessments: [],
    commitments: [],
    studySessions: [],
    taskHistory: {},
    keyDates: [],
    planVariant: 0,
    minimumViableMode: false,
    sortBy: "strategy",
    timerTarget: null,
    recentChange: null,
  };
}

export const initialAppState = createInitialAppState();

export function appReducer(state, action) {
  switch (action.type) {
    case "hydrateState":
      return action.state || state;
    case "setView":
      return { ...state, view: action.view };
    case "toggleSidebar":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case "setSort":
      return { ...state, sortBy: action.sortBy };
    case "toggleMinimumViable":
      return { ...state, minimumViableMode: !state.minimumViableMode };
    case "regeneratePlan":
      return { ...state, planVariant: state.planVariant + 1, recentChange: { type: "manualRegenerate", at: Date.now() } };
    case "importTimetable":
      return {
        ...state,
        commitments: [
          ...state.commitments.filter((commitment) => commitment.source !== "ics"),
          ...(action.commitments || []),
        ],
        planVariant: state.planVariant + 1,
        recentChange: { type: "importTimetable", count: (action.commitments || []).length, at: Date.now() },
      };
    case "addKeyDates":
      return {
        ...state,
        keyDates: mergeKeyDates(state.keyDates, action.keyDates || []),
      };
    case "addCourse": {
      const code = String(action.course?.code || "").trim().toUpperCase();
      if (!code || state.courses.some((course) => course.code === code)) return state;
      return {
        ...state,
        courses: [
          ...state.courses,
          {
            code,
            name: action.course?.name || "Untitled course",
            contact: {
              lectures: Number(action.course?.contact?.lectures) || 0,
              tutorials: Number(action.course?.contact?.tutorials) || 0,
              labs: Number(action.course?.contact?.labs) || 0,
            },
            recommended: Number(action.course?.recommended) || 5,
            logged: Number(action.course?.logged) || 0,
            gradeSoFar: Number(action.course?.gradeSoFar) || 0,
            targetGrade: Number(action.course?.targetGrade) || 75,
          },
        ],
        planVariant: state.planVariant + 1,
      };
    }
    case "updateCourse":
      return {
        ...state,
        courses: state.courses.map((course) => (course.code === action.courseCode ? normalizeCourseUpdate(course, action.patch) : course)),
        planVariant: state.planVariant + 1,
      };
    case "deleteCourse":
      return {
        ...state,
        courses: state.courses.filter((course) => course.code !== action.courseCode),
        assessments: state.assessments.filter((assessment) => assessment.course !== action.courseCode),
        commitments: state.commitments.filter((commitment) => commitment.course !== action.courseCode),
        studySessions: state.studySessions.filter((session) => session.course !== action.courseCode),
        planVariant: state.planVariant + 1,
      };
    case "addAssessment":
      return {
        ...state,
        assessments: [
          ...state.assessments,
          {
            id: action.assessment.id || Date.now() + Math.floor(Math.random() * 100000),
            course: action.assessment.course || state.courses[0]?.code || "",
            title: action.assessment.title || "New assessment",
            type: action.assessment.type || "Assessment",
            dueDate: action.assessment.dueDate,
            dueTime: action.assessment.dueTime || "",
            dateStatus: action.assessment.dateStatus || "confirmed",
            weighting: Number(action.assessment.weighting) || 20,
            status: "not started",
            progress: 0,
            estimatedHours: Number(action.assessment.estimatedHours) || 8,
            seriesId: action.assessment.seriesId,
            seriesTitle: action.assessment.seriesTitle,
            seriesIndex: action.assessment.seriesIndex,
            seriesCount: action.assessment.seriesCount,
            bestOf: action.assessment.bestOf,
            totalSeriesWeighting: action.assessment.totalSeriesWeighting,
            gradingMode: action.assessment.gradingMode,
            attendanceWeight: action.assessment.attendanceWeight,
            workWeight: action.assessment.workWeight,
            attendanceScore: action.assessment.attendanceScore,
            workScore: action.assessment.workScore,
            notes: action.assessment.notes,
          },
        ],
        planVariant: state.planVariant + 1,
      };
    case "updateAssessment":
      return {
        ...state,
        assessments: state.assessments.map((assessment) => (
          assessment.id === action.assessmentId
            ? normalizeAssessmentUpdate(assessment, action.patch)
            : assessment
        )),
        planVariant: state.planVariant + 1,
      };
    case "deleteAssessment":
      return {
        ...state,
        assessments: state.assessments.filter((assessment) => assessment.id !== action.assessmentId),
        studySessions: state.studySessions.filter((session) => session.assessmentId !== action.assessmentId),
        planVariant: state.planVariant + 1,
      };
    case "startSessionForAssessment": {
      const assessment = state.assessments.find((item) => item.id === action.assessmentId);
      if (!assessment) return state;
      return {
        ...state,
        view: "Planner",
        timerTarget: {
          assessmentId: assessment.id,
          course: assessment.course,
          requestedAt: Date.now(),
        },
      };
    }
    case "logStudySession": {
      return applyStudySession(state, action);
    }
    case "markBlock": {
      const existing = state.taskHistory[action.assessmentId] || { assessmentId: action.assessmentId, rescheduled: 0, skipped: 0, completedBlocks: 0, blockStatuses: {} };
      const nextState = {
        ...state,
        taskHistory: {
          ...state.taskHistory,
          [action.assessmentId]: {
            ...existing,
            completedBlocks: action.status === "completed" ? (existing.completedBlocks || 0) + 1 : existing.completedBlocks || 0,
            skipped: action.status === "skipped" ? (existing.skipped || 0) + 1 : existing.skipped || 0,
            rescheduled: action.status === "rescheduled" ? (existing.rescheduled || 0) + 1 : existing.rescheduled || 0,
            blockStatuses: { ...(existing.blockStatuses || {}), [action.blockId]: action.status },
          },
        },
        planVariant: ["rescheduled", "skipped"].includes(action.status) ? state.planVariant + 1 : state.planVariant,
        recentChange: ["rescheduled", "skipped"].includes(action.status)
          ? { type: "markBlock", status: action.status, assessmentId: action.assessmentId, blockId: action.blockId, at: Date.now() }
          : state.recentChange,
      };
      return action.status === "completed"
        ? applyStudySession(nextState, { assessmentId: action.assessmentId, minutes: action.minutes || 60 })
        : nextState;
    }
    case "resetToDemoData":
    case "resetAppData":
      return createInitialAppState();
    default:
      return state;
  }
}

function normalizeCourseUpdate(course, patch = {}) {
  return {
    ...course,
    ...patch,
    code: course.code,
    name: patch.name !== undefined ? patch.name : course.name,
    contact: {
      lectures: patch.contact?.lectures !== undefined ? Number(patch.contact.lectures) || 0 : course.contact?.lectures || 0,
      tutorials: patch.contact?.tutorials !== undefined ? Number(patch.contact.tutorials) || 0 : course.contact?.tutorials || 0,
      labs: patch.contact?.labs !== undefined ? Number(patch.contact.labs) || 0 : course.contact?.labs || 0,
    },
    recommended: patch.recommended !== undefined ? Number(patch.recommended) || 0 : course.recommended,
    logged: patch.logged !== undefined ? Number(patch.logged) || 0 : course.logged,
    gradeSoFar: patch.gradeSoFar !== undefined ? Number(patch.gradeSoFar) || 0 : course.gradeSoFar,
    targetGrade: patch.targetGrade !== undefined ? Number(patch.targetGrade) || 0 : course.targetGrade,
  };
}

function normalizeAssessmentUpdate(assessment, patch) {
  const progress = patch.progress !== undefined ? clampNumber(Number(patch.progress), 0, 100) : assessment.progress;
  const grade = patch.grade !== undefined ? clampNumber(Number(patch.grade), 0, 100) : assessment.grade;
  const attendanceScore = patch.attendanceScore !== undefined ? clampNumber(Number(patch.attendanceScore), 0, 100) : assessment.attendanceScore;
  const workScore = patch.workScore !== undefined ? clampNumber(Number(patch.workScore), 0, 100) : assessment.workScore;
  const splitGrade = assessment.gradingMode === "attendance-work" || patch.gradingMode === "attendance-work"
    ? clampNumber((attendanceScore || 0) * ((assessment.attendanceWeight || patch.attendanceWeight || 50) / 100) + (workScore || 0) * ((assessment.workWeight || patch.workWeight || 50) / 100), 0, 100)
    : grade;
  const status = patch.status || (progress >= 100 || splitGrade !== undefined ? "done" : progress > 0 ? "in progress" : assessment.status);
  return {
    ...assessment,
    ...patch,
    weighting: patch.weighting !== undefined ? Number(patch.weighting) || 0 : assessment.weighting,
    estimatedHours: patch.estimatedHours !== undefined ? Number(patch.estimatedHours) || 0 : assessment.estimatedHours,
    progress,
    grade: splitGrade,
    attendanceScore,
    workScore,
    status,
  };
}

function applyStudySession(state, action) {
  const minutes = action.minutes || 25;
  const assessment = state.assessments.find((item) => item.id === action.assessmentId);
  const courseCode = assessment?.course || action.course;
  if (!courseCode) return state;

  return {
    ...state,
    studySessions: [
      ...state.studySessions,
      {
        id: `session-${Date.now()}`,
        course: courseCode,
        assessmentId: assessment?.id,
        minutes,
        date: new Date().toISOString().slice(0, 10),
      },
    ],
    courses: state.courses.map((course) => (course.code === courseCode ? { ...course, logged: course.logged + minutes / 60 } : course)),
    assessments: state.assessments.map((item) => {
      if (item.id !== assessment?.id) return item;
      const progressGain = item.estimatedHours > 0 ? (minutes / 60 / item.estimatedHours) * 100 : 0;
      const progress = clampNumber(item.progress + progressGain, 0, 100);
      return {
        ...item,
        progress: Number(progress.toFixed(1)),
        status: progress >= 100 ? "done" : "in progress",
      };
    }),
    planVariant: state.planVariant + 1,
  };
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function mergeKeyDates(existing, incoming) {
  const byId = new Map((existing || []).map((item) => [item.id || `${item.title}-${item.date}`, item]));
  incoming.forEach((item) => {
    const id = item.id || `${item.title}-${item.date || item.startDate}`;
    byId.set(id, { ...item, id });
  });
  return [...byId.values()];
}
