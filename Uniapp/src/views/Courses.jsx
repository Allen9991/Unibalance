import React from "react";
import { AICapture } from "../components/AICapture.jsx";
import { AssessmentTable } from "../components/AssessmentTable.jsx";
import { Card, Pill, Progress } from "../components/ui.jsx";

export function Courses({ state, strategy, dispatch }) {
  const sorted = [...strategy.scoredAssessments].sort((a, b) => {
    if (state.sortBy === "due") return new Date(a.dueDate) - new Date(b.dueDate);
    if (state.sortBy === "drop") return b.dropSafetyScore - a.dropSafetyScore;
    return b.marginalValuePerHour - a.marginalValuePerHour;
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {state.courses.map((course) => {
          const pct = (course.logged / course.recommended) * 100;
          const tone = pct < 85 ? "amber" : pct > 115 ? "violet" : "green";
          return (
            <Card key={course.code}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-bold">{course.code}</h2>
                  <p className="text-sm text-slate-500">{course.name}</p>
                </div>
                <Pill color={pct < 85 ? "amber" : pct > 115 ? "blue" : "green"}>{pct < 85 ? "under" : pct > 115 ? "over" : "on track"}</Pill>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg bg-slate-50 p-3"><strong>{course.contact.lectures}</strong><br />Lectures</div>
                <div className="rounded-lg bg-slate-50 p-3"><strong>{course.contact.tutorials}</strong><br />Tutorials</div>
                <div className="rounded-lg bg-slate-50 p-3"><strong>{course.contact.labs}</strong><br />Labs</div>
              </div>
              <div className="mb-2 flex justify-between text-sm"><span>Logged this week</span><strong>{course.logged.toFixed(1)} / {course.recommended}h</strong></div>
              <Progress value={pct} tone={tone} />
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Assessments with strategic scoring</h2>
          <div className="flex gap-2">
            {[
              ["strategy", "Leverage"],
              ["drop", "Drop safety"],
              ["due", "Due date"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => dispatch({ type: "setSort", sortBy: key })} className={`rounded-lg px-3 py-2 text-sm ${state.sortBy === key ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{label}</button>
            ))}
          </div>
        </div>
        <AssessmentTable assessments={sorted} />
      </Card>
      <AICapture onAdd={(assessment) => dispatch({ type: "addAssessment", assessment })} compact />
    </div>
  );
}

