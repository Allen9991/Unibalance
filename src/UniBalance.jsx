import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AlertTriangle, BarChart3, BookOpen, Bot, CalendarDays, ChevronLeft, ChevronRight, GraduationCap, LayoutDashboard, ListChecks, Moon, RotateCcw, UserRound } from "lucide-react";
import { CalendarView } from "./components/CalendarView.jsx";
import { Dashboard } from "./views/Dashboard.jsx";
import { Courses } from "./views/Courses.jsx";
import { Planner } from "./views/Planner.jsx";
import { Assistant } from "./views/Assistant.jsx";
import { Insights } from "./views/Insights.jsx";
import { buildPlan } from "./lib/planner.js";
import { parseIcsTimetable } from "./lib/ics.js";
import { configureNativeShell } from "./lib/nativeShell.js";
import { syncNativeNotifications } from "./lib/notifications.js";
import { buildStrategy, buildWeeklyIntensity } from "./lib/strategy.js";
import { buildPacingInsight } from "./lib/gradebook.js";
import { appReducer } from "./state/appReducer.js";
import { clearPersistedState, clearPersistedStateAsync, hydrateAppState, hydrateAppStateAsync, saveAppStateAsync } from "./state/persistence.js";

export default function UniBalance() {
  const [state, dispatch] = useReducer(appReducer, undefined, hydrateAppState);
  const [storageWarning, setStorageWarning] = useState("");
  const hasHydrated = useRef(false);
  const strategy = useMemo(() => buildStrategy(state.courses, state.assessments, state.taskHistory), [state.courses, state.assessments, state.taskHistory]);
  const pacingInsight = useMemo(() => buildPacingInsight(state.courses, state.assessments, state.studySessions), [state.courses, state.assessments, state.studySessions]);
  const weeklyIntensity = useMemo(() => buildWeeklyIntensity(state.assessments), [state.assessments]);
  const plan = useMemo(
    () => buildPlan({ commitments: state.commitments, scoredAssessments: strategy.scoredAssessments, taskHistory: state.taskHistory, variant: state.planVariant, minimumViable: false }),
    [state.commitments, strategy.scoredAssessments, state.taskHistory, state.planVariant],
  );
  const minimumPlan = useMemo(
    () => buildPlan({ commitments: state.commitments, scoredAssessments: strategy.scoredAssessments, taskHistory: state.taskHistory, variant: state.planVariant, minimumViable: true }),
    [state.commitments, strategy.scoredAssessments, state.taskHistory, state.planVariant],
  );
  const activePlan = state.minimumViableMode ? minimumPlan : plan;
  const nav = [
    ["Dashboard", LayoutDashboard],
    ["Courses", BookOpen],
    ["Calendar", CalendarDays],
    ["Planner", ListChecks],
    ["Assistant", Bot],
    ["Insights", BarChart3],
  ];

  useEffect(() => {
    void configureNativeShell();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void syncNativeNotifications({ assessments: state.assessments, plan: activePlan });
    }, 900);
    return () => window.clearTimeout(id);
  }, [state.assessments, activePlan]);

  useEffect(() => {
    let cancelled = false;
    hydrateAppStateAsync().then((result) => {
      if (!cancelled && result.source === "native") {
        dispatch({ type: "hydrateState", state: result.state });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return undefined;
    }
    const save = async () => {
      const saved = await saveAppStateAsync(state);
      setStorageWarning(saved ? "" : "Not saving changes: browser storage is unavailable or full.");
    };
    const timerId = window.setTimeout(save, 350);
    return () => window.clearTimeout(timerId);
  }, [state]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (storageWarning) setStorageWarning("");
    }, 7000);
    return () => window.clearTimeout(id);
  }, [storageWarning]);

  function resetAppData() {
    if (!window.confirm("Clear all UniBalance data on this device? This removes saved courses, assessments, timetable items, sessions, and chat state.")) return;
    clearPersistedState();
    void clearPersistedStateAsync();
    dispatch({ type: "resetAppData" });
  }

  function importIcsTimetable(text) {
    const commitments = parseIcsTimetable(text, state.courses);
    dispatch({ type: "importTimetable", commitments });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className={`${state.sidebarCollapsed ? "w-20" : "w-72"} sticky top-0 h-screen border-r border-slate-200 bg-white p-4 transition-all duration-300`}>
          <div className="mb-7 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white"><GraduationCap className="h-5 w-5" /></div>
              {!state.sidebarCollapsed && <div><div className="font-bold">UniBalance</div><div className="text-xs text-slate-500">Study with a life</div></div>}
            </div>
            <button onClick={() => dispatch({ type: "toggleSidebar" })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              {state.sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white"><UserRound className="h-5 w-5" /></div>
            {!state.sidebarCollapsed && <div><div className="text-sm font-semibold">Your workspace</div><div className="text-xs text-slate-500">Local first</div></div>}
          </div>
          <nav className="space-y-1">
            {nav.map(([label, Icon]) => (
              <button key={label} onClick={() => dispatch({ type: "setView", view: label })} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${state.view === label ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="h-5 w-5" />
                {!state.sidebarCollapsed && label}
              </button>
            ))}
          </nav>
          <button onClick={resetAppData} className="mt-6 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700">
            <RotateCcw className="h-5 w-5" />
            {!state.sidebarCollapsed && "Clear local data"}
          </button>
        </aside>

        <main className="min-w-0 flex-1 p-6 lg:p-8">
          {storageWarning && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              {storageWarning}
            </div>
          )}
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-700">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
              <h1 className="text-3xl font-bold tracking-normal">{state.view}</h1>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
              <Moon className="h-4 w-4 text-slate-500" />
              Sleep target protected: 8h
            </div>
          </header>

          {state.view === "Dashboard" && <Dashboard state={state} strategy={strategy} plan={activePlan} weeklyIntensity={weeklyIntensity} pacingInsight={pacingInsight} dispatch={dispatch} />}
          {state.view === "Courses" && <Courses state={state} strategy={strategy} dispatch={dispatch} />}
          {state.view === "Calendar" && <CalendarView plan={activePlan} onImportIcs={importIcsTimetable} />}
          {state.view === "Planner" && <Planner state={state} strategy={strategy} plan={plan} minimumPlan={minimumPlan} dispatch={dispatch} />}
          {state.view === "Assistant" && <Assistant state={state} strategy={strategy} plan={activePlan} />}
          {state.view === "Insights" && <Insights state={state} strategy={strategy} weeklyIntensity={weeklyIntensity} />}
        </main>
      </div>
    </div>
  );
}
