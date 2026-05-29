import { assessments, commitments, courses, studySessions, taskHistory } from "../data/fixtures.js";

export const initialAppState = {
  view: "Dashboard",
  sidebarCollapsed: false,
  courses,
  assessments,
  commitments,
  studySessions,
  taskHistory,
  planVariant: 0,
  minimumViableMode: false,
  sortBy: "strategy",
};

export function appReducer(state, action) {
  switch (action.type) {
    case "setView":
      return { ...state, view: action.view };
    case "toggleSidebar":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case "setSort":
      return { ...state, sortBy: action.sortBy };
    case "toggleMinimumViable":
      return { ...state, minimumViableMode: !state.minimumViableMode };
    case "regeneratePlan":
      return { ...state, planVariant: state.planVariant + 1 };
    case "addAssessment":
      return {
        ...state,
        assessments: [
          ...state.assessments,
          {
            id: Date.now(),
            course: action.assessment.course || "COSC121",
            title: action.assessment.title || "New assessment",
            type: action.assessment.type || "Assessment",
            dueDate: action.assessment.dueDate,
            weighting: Number(action.assessment.weighting) || 20,
            status: "not started",
            progress: 0,
            estimatedHours: Number(action.assessment.estimatedHours) || 8,
          },
        ],
        planVariant: state.planVariant + 1,
      };
    case "logStudySession": {
      const minutes = action.minutes || 25;
      return {
        ...state,
        studySessions: [...state.studySessions, { id: `session-${Date.now()}`, course: action.course, assessmentId: action.assessmentId, minutes, date: new Date().toISOString().slice(0, 10) }],
        courses: state.courses.map((course) => (course.code === action.course ? { ...course, logged: course.logged + minutes / 60 } : course)),
      };
    }
    case "markBlock": {
      const existing = state.taskHistory[action.assessmentId] || { assessmentId: action.assessmentId, rescheduled: 0, skipped: 0, completedBlocks: 0, blockStatuses: {} };
      return {
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
        planVariant: action.status === "rescheduled" ? state.planVariant + 1 : state.planVariant,
      };
    }
    default:
      return state;
  }
}

