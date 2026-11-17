import React from "react";
import { AlertTriangle, Gauge, Moon } from "lucide-react";
import { AICapture } from "../components/AICapture.jsx";
import { StrategicPanel } from "../components/StrategicPanel.jsx";
import { Card, Pill, Progress } from "../components/ui.jsx";
import { palette } from "../data/fixtures.js";
import { clamp, daysUntil, shortDate } from "../lib/date.js";

export function Dashboard({ state, strategy, plan, weeklyIntensity, pacingInsight, dispatch }) {
  const totalRecommended = state.courses.reduce((sum, course) => sum + course.recommended, 0);
  const totalLogged = state.courses.reduce((sum, course) => sum + course.logged, 0);
  const upcoming = strategy.scoredAssessments.filter((item) => item.status !== "done").sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate)).slice(0, 3);
  const crunch = weeklyIntensity.find((week) => week.assessments >= 2 && week.weight >= 55);
  const todayItems = plan.filter((event) => event.day === "Fri").slice(0, 6);
  const workHours = state.commitments.filter((item) => item.type === "work").reduce((sum, item) => sum + (item.end - item.start), 0);
  const gymSessions = state.commitments.filter((item) => item.type === "gym").length;
  const studyPct = totalRecommended > 0 ? clamp((totalLogged / totalRecommended) * 100, 0, 100) : 0;

  return (
    <div>
      {crunch && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
          <div>
            <div className="font-semibold">Crunch warning: {crunch.week} has {crunch.assessments} clustered assessments worth {crunch.weight}% combined.</div>
            <div className="text-sm">Strategic mode is ranking by grade leverage, not just calendar urgency.</div>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Today at a glance</h2>
              <Pill color={state.minimumViableMode ? "amber" : "blue"}>{state.minimumViableMode ? "minimum viable week" : `${plan.filter((event) => event.type === "study").length} generated study blocks`}</Pill>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {todayItems.map((event, index) => (
                <div key={`${event.title}-${index}`} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                  <div className="h-10 w-1.5 rounded-full" style={{ background: palette[event.course] || palette[event.type] || palette.life }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{event.title}</div>
                    <div className="text-xs text-slate-500">{event.start}:00-{event.end}:00</div>
                  </div>
                </div>
              ))}
            </div>
            {todayItems.length === 0 && <p className="text-sm text-slate-500">No timetable or study blocks yet. Add courses and assessments to generate a plan.</p>}
          </Card>

          <div className="grid gap-5 md:grid-cols-3">
            {upcoming.map((item) => (
              <Card key={item.id}>
                <div className="mb-3 flex items-center justify-between">
                  <Pill color={daysUntil(item.dueDate) <= 7 ? "red" : "amber"}>{daysUntil(item.dueDate)} days</Pill>
                  <span className="text-sm font-bold">{item.weighting}%</span>
                </div>
                <div className="font-semibold">{item.title}</div>
                <div className="mb-3 text-sm text-slate-500">{item.course} due {shortDate(item.dueDate)}</div>
                <Progress value={item.progress} tone={item.progress > 50 ? "green" : "amber"} />
                <div className="mt-3 text-xs text-slate-500">Leverage/hr: <strong>{item.marginalValuePerHour}</strong></div>
              </Card>
            ))}
          </div>
          {upcoming.length === 0 && (
            <Card>
              <h2 className="font-semibold">No deadlines yet</h2>
              <p className="mt-1 text-sm text-slate-500">Add assessments here or from Courses. UniBalance will rank them once they exist.</p>
            </Card>
          )}
          <AICapture courses={state.courses} onAdd={(assessment) => dispatch({ type: "addAssessment", assessment })} />
        </div>

        <div className="space-y-5">
          <StrategicPanel
            strategy={strategy}
            minimumViableMode={state.minimumViableMode}
            onToggleMinimum={() => dispatch({ type: "toggleMinimumViable" })}
            onStartSession={(assessmentId) => dispatch({ type: "startSessionForAssessment", assessmentId })}
          />
          <Card>
            <h2 className="mb-4 font-semibold">Study-hours target</h2>
            <div className="grid h-40 place-items-center">
              <div className="grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(#2563eb ${studyPct}%, #e2e8f0 0)` }}>
                <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center"><Gauge className="h-6 w-6 text-blue-600" /></div>
              </div>
            </div>
            <div className="text-center text-2xl font-bold">{totalLogged.toFixed(1)} / {totalRecommended}h</div>
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold">Balance defended</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Work</span><strong>{workHours}h</strong></div>
              <div className="flex justify-between"><span>Gym</span><strong>{gymSessions} sessions</strong></div>
              <div className="flex justify-between"><span>Commitments</span><strong>{state.commitments.length}</strong></div>
              <div className="flex justify-between"><span className="inline-flex items-center gap-1"><Moon className="h-4 w-4" /> Sleep</span><strong>Protected</strong></div>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold">Planning calibration</h2>
            {pacingInsight.warnings.length > 0 ? (
              <div className="space-y-2">
                {pacingInsight.warnings.slice(0, 2).map((warning) => (
                  <div key={warning.course} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{warning.message}</div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">UniBalance will learn from your logged sessions and warn when a course is taking longer than planned.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
