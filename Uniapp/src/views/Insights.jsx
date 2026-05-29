import React, { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, Target, Trophy } from "lucide-react";
import { Card } from "../components/ui.jsx";
import { clamp } from "../lib/date.js";

export function Insights({ state, strategy, weeklyIntensity }) {
  const [targetGrade, setTargetGrade] = useState(75);
  const [selectedFinal, setSelectedFinal] = useState("COSC121");
  const course = state.courses.find((item) => item.code === selectedFinal);
  const finalAssessment = state.assessments.find((item) => item.course === selectedFinal && item.type === "Exam");
  const completedWeight = state.assessments.filter((item) => item.course === selectedFinal && item.status === "done").reduce((sum, item) => sum + item.weighting, 0);
  const currentWeighted = completedWeight ? course.gradeSoFar * (completedWeight / 100) : course.gradeSoFar * 0.45;
  const remainingWeight = finalAssessment ? finalAssessment.weighting / 100 : 0.3;
  const neededFinal = clamp((targetGrade - currentWeighted) / remainingWeight, 0, 100);

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
          {state.courses.map((c) => <option key={c.code}>{c.code}</option>)}
        </select>
        <label className="text-sm text-slate-600">Target grade: {targetGrade}%</label>
        <input type="range" min="50" max="95" value={targetGrade} onChange={(e) => setTargetGrade(Number(e.target.value))} className="mb-4 w-full" />
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <div className="text-sm text-blue-700">Needed on final</div>
          <div className="text-4xl font-bold text-blue-900">{neededFinal.toFixed(1)}%</div>
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <h2 className="mb-4 font-semibold">Weekly strategic review</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Review icon={Target} label="Best hour" value={`${strategy.bestNextHour.course}: ${strategy.bestNextHour.title}`} />
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
        <h2 className="mb-4 font-semibold">Energy trend</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={[{ day: "Mon", energy: 76 }, { day: "Tue", energy: 64 }, { day: "Wed", energy: 70 }, { day: "Thu", energy: 58 }, { day: "Fri", energy: 72 }, { day: "Sat", energy: 66 }, { day: "Sun", energy: 80 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="energy" fill="#dbeafe" stroke="#2563eb" strokeWidth={3} />
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

