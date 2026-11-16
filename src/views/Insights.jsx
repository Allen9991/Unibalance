import React, { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, Target, Trophy } from "lucide-react";
import { Card } from "../components/ui.jsx";
import { clamp } from "../lib/date.js";
import { calculateRequiredAssessmentGrade } from "../lib/strategy.js";

export function Insights({ state, strategy, weeklyIntensity }) {
  const [targetGrade, setTargetGrade] = useState(75);
  const [selectedFinal, setSelectedFinal] = useState(state.courses[0]?.code || "");
  React.useEffect(() => {
    if (!selectedFinal && state.courses[0]) setSelectedFinal(state.courses[0].code);
  }, [selectedFinal, state.courses]);
  const course = state.courses.find((item) => item.code === selectedFinal);
  const finalAssessment = state.assessments.find((item) => item.course === selectedFinal && item.type === "Exam");
  const neededFinal = finalAssessment
    ? clamp(calculateRequiredAssessmentGrade({ course, assessments: state.assessments, assessmentId: finalAssessment.id, targetGrade }), 0, 100)
    : 0;
  const studyTrend = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, hours: 0 }));

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <h2 className="mb-4 font-semibold">Workload heatmap</h2>
        <div className="grid grid-cols-8 gap-2">
          {weeklyIntensity.map((week) => (
            <div key={week.week} className={`rounded-lg p-4 text-center ${week.weight >= 55 ? "bg-rose-600 text-white" : week.weight >= 30 ? "bg-amber-300 text-amber-950" : "bg-emerald-100 text-emerald-800"}`}>
              <div className="text-xs font-medium">{week.week}</div>
              <div className="text-xl font-bold">{week.weight}%</div>
              <div className="text-xs">{week.assessments} due</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Final mark calculator</h2>
        <select value={selectedFinal} onChange={(e) => setSelectedFinal(e.target.value)} className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Select a course</option>
          {state.courses.map((c) => <option key={c.code}>{c.code}</option>)}
        </select>
        <label className="text-sm text-slate-600">Target grade: {targetGrade}%</label>
        <input type="range" min="50" max="95" value={targetGrade} onChange={(e) => setTargetGrade(Number(e.target.value))} className="mb-4 w-full" />
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <div className="text-sm text-blue-700">Needed on final</div>
          <div className="text-4xl font-bold text-blue-900">{neededFinal.toFixed(1)}%</div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Academic key dates</h2>
        <div className="space-y-2 text-sm">
          {(state.keyDates || []).slice(0, 5).map((item) => (
            <div key={item.id} className="rounded-lg bg-slate-50 p-3">
              <div className="font-semibold">{item.title}</div>
              <div className="text-slate-500">{item.date || [item.startDate, item.endDate].filter(Boolean).join(" to ") || "Date to be advised"}</div>
            </div>
          ))}
          {(!state.keyDates || state.keyDates.length === 0) && <p className="text-slate-500">Upload course outlines or academic key dates to populate exam windows and term dates.</p>}
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <h2 className="mb-4 font-semibold">Weekly strategic review</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Review icon={Target} label="Best hour" value={strategy.bestNextHour ? `${strategy.bestNextHour.course}: ${strategy.bestNextHour.title}` : "Add assessments to rank"} />
          <Review icon={Flame} label="Can reduce" value={strategy.dropCandidates[0] ? `${strategy.dropCandidates[0].course}: ${strategy.dropCandidates[0].title}` : "Nothing obvious"} />
          <Review icon={Trophy} label="Tiny move" value={strategy.procrastination[0]?.firstMove || "No stalled tasks"} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Recommended vs actual</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={state.courses}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="code" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="recommended" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="logged" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="xl:col-span-3">
        <h2 className="mb-4 font-semibold">Study trend</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={studyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="hours" fill="#dbeafe" stroke="#2563eb" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Review({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <Icon className="mb-3 h-5 w-5 text-blue-600" />
      <div className="text-sm text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
