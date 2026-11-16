import React, { useState } from "react";
import { CheckCircle2, RefreshCw, TimerReset, Wand2 } from "lucide-react";
import { CalendarView } from "../components/CalendarView.jsx";
import { Card, Pill } from "../components/ui.jsx";
import { shortDate } from "../lib/date.js";
import { buildRecoveryPlan } from "../lib/rebalance.js";

export function Planner({ state, strategy, plan, minimumPlan, dispatch }) {
  const [timer, setTimer] = useState({ running: false, seconds: 25 * 60, course: state.courses[0]?.code || "", assessmentId: strategy.bestNextHour?.id || "" });
  const visiblePlan = state.minimumViableMode ? minimumPlan : plan;
  const recovery = buildRecoveryPlan({ state, strategy, plan: visiblePlan });
  const timerAssessments = strategy.rankings.filter((item) => item.course === timer.course);

  React.useEffect(() => {
    if (!state.timerTarget) return;
    setTimer((current) => ({
      ...current,
      running: false,
      seconds: 25 * 60,
      course: state.timerTarget.course,
      assessmentId: state.timerTarget.assessmentId,
    }));
  }, [state.timerTarget]);

  React.useEffect(() => {
    if (!timer.running) return undefined;
    const id = window.setInterval(() => {
      setTimer((current) => {
        if (current.seconds <= 1) {
          dispatch({ type: "logStudySession", course: current.course, assessmentId: current.assessmentId, minutes: 25 });
          return { ...current, running: false, seconds: 25 * 60 };
        }
        return { ...current, seconds: current.seconds - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timer.running, dispatch]);

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Adaptive strategic plan</h2>
              <p className="text-sm text-slate-500">{state.minimumViableMode ? "Only the non-negotiables are shown." : "Full week ranked by strategic score."}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => dispatch({ type: "toggleMinimumViable" })} className={`rounded-lg px-3 py-2 text-sm font-medium ${state.minimumViableMode ? "bg-amber-300 text-slate-950" : "bg-slate-100 text-slate-700"}`}>Minimum viable week</button>
              <button onClick={() => dispatch({ type: "regeneratePlan" })} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                <RefreshCw className="h-4 w-4" /> Regenerate
              </button>
            </div>
          </div>
          <CalendarView
            plan={visiblePlan.filter((event) => ["study", "work", "gym", "social"].includes(event.type))}
            compact
            onMarkBlock={(event, status) => dispatch({ type: "markBlock", assessmentId: event.assessmentId, blockId: event.id, status })}
          />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Minimum viable week non-negotiables</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {strategy.minimumViableAssessments.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-4">
                <div className="mb-2 flex items-center justify-between gap-3"><strong>{item.course}: {item.title}</strong><Pill color="blue">{item.marginalValuePerHour}/hr</Pill></div>
                <p className="text-sm text-slate-500">Do enough to reduce risk. {item.estimatedHoursRemaining}h left, {item.weighting}% weighting.</p>
              </div>
            ))}
          </div>
          {strategy.minimumViableAssessments.length === 0 && <p className="text-sm text-slate-500">No non-negotiables yet. Add assessments to generate a minimum viable week.</p>}
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold">Recovery plan</h2>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950">
            <strong>{recovery.title}</strong>
            <p className="mt-1">{recovery.detail}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-slate-500">Risk after rebalance</div>
              <div className="text-xl font-bold">{recovery.risk}/100</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-slate-500">Moved blocks</div>
              <div className="text-xl font-bold">{recovery.movedBlocks.length}</div>
            </div>
          </div>
          {recovery.movedBlocks.length > 0 && (
            <div className="mt-3 space-y-2">
              {recovery.movedBlocks.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-100 p-2 text-xs text-slate-600">
                  {event.title} {"->"} {event.day} {event.start}:00
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Focus timer</h2>
          <select value={timer.course} onChange={(e) => {
            const course = e.target.value;
            const firstAssessment = strategy.rankings.find((item) => item.course === course);
            setTimer((t) => ({ ...t, course, assessmentId: firstAssessment?.id || "" }));
          }} className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select a course</option>
            {state.courses.map((c) => <option key={c.code}>{c.code}</option>)}
          </select>
          <select value={timer.assessmentId || ""} onChange={(e) => setTimer((t) => ({ ...t, assessmentId: Number(e.target.value) }))} className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Select an assessment</option>
            {timerAssessments.map((item) => <option key={item.id} value={item.id}>{item.course}: {item.title}</option>)}
          </select>
          <div className="mb-4 text-center text-5xl font-bold tabular-nums">{String(Math.floor(timer.seconds / 60)).padStart(2, "0")}:{String(timer.seconds % 60).padStart(2, "0")}</div>
          <div className="flex gap-2">
            <button disabled={!timer.assessmentId} onClick={() => setTimer((t) => ({ ...t, running: !t.running }))} className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{timer.running ? "Pause" : "Start"}</button>
            <button onClick={() => setTimer((t) => ({ ...t, running: false, seconds: 25 * 60 }))} className="rounded-lg bg-slate-100 px-3 py-2"><TimerReset className="h-4 w-4" /></button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Procrastination judo</h2>
          <div className="space-y-3">
            {strategy.procrastination.map((item) => (
              <div key={item.id} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                <strong>{item.course}: {item.title}</strong>
                <p className="mt-1">{item.firstMove}</p>
              </div>
            ))}
          </div>
          {strategy.procrastination.length === 0 && <p className="text-sm text-slate-500">No repeatedly delayed tasks yet.</p>}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Revision scheduler</h2>
          <div className="space-y-3 text-sm">
            {state.assessments.filter((a) => a.type === "Exam").map((exam) => (
              <div key={exam.id} className="rounded-lg border border-slate-100 p-3">
                <div className="font-semibold">{exam.course} exam</div>
                <div className="text-slate-500">Due {shortDate(exam.dueDate)}</div>
                <div className="mt-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 21 / 10 / 3 day revision passes</div>
              </div>
            ))}
          </div>
          {state.assessments.filter((a) => a.type === "Exam").length === 0 && <p className="text-sm text-slate-500">No exams entered yet.</p>}
        </Card>
      </div>
    </div>
  );
}
