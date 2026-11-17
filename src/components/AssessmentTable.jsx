import React from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { shortDate } from "../lib/date.js";
import { Pill } from "./ui.jsx";

export function AssessmentTable({ assessments, courses = [], onUpdate, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="py-3">Course</th>
            <th>Title</th>
            <th>Type</th>
            <th>Due</th>
            <th>Weight</th>
            <th>Hours</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Leverage/hr</th>
            <th>Drop safety</th>
            <th>Signal</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assessments.map((item) => (
            <tr key={item.id} className="align-middle">
              <td className="py-3">
                <select value={item.course} onChange={(event) => onUpdate?.(item.id, { course: event.target.value })} className="w-28 rounded-md border border-slate-200 px-2 py-1 font-semibold outline-none focus:border-blue-500">
                  {courses.map((course) => <option key={course.code} value={course.code}>{course.code}</option>)}
                </select>
              </td>
              <td>
                <input value={item.title} onChange={(event) => onUpdate?.(item.id, { title: event.target.value })} className="w-44 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-blue-500" />
              </td>
              <td>
                <input value={item.type} onChange={(event) => onUpdate?.(item.id, { type: event.target.value })} className="w-28 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-blue-500" />
              </td>
              <td>
                <input type="date" value={item.dueDate} onChange={(event) => onUpdate?.(item.id, { dueDate: event.target.value })} className="w-36 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-blue-500" title={shortDate(item.dueDate)} />
              </td>
              <td>
                <input type="number" min="0" max="100" value={item.weighting} onChange={(event) => onUpdate?.(item.id, { weighting: Number(event.target.value) })} className="w-20 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-blue-500" />
              </td>
              <td>
                <input type="number" min="0" step="0.5" value={item.estimatedHours} onChange={(event) => onUpdate?.(item.id, { estimatedHours: Number(event.target.value) })} className="w-20 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-blue-500" />
              </td>
              <td>
                <select value={item.status} onChange={(event) => onUpdate?.(item.id, { status: event.target.value, progress: event.target.value === "done" ? 100 : item.progress })} className="w-32 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-blue-500">
                  <option value="not started">not started</option>
                  <option value="in progress">in progress</option>
                  <option value="done">done</option>
                </select>
              </td>
              <td>
                <div className="flex w-36 items-center gap-2">
                  <input type="range" min="0" max="100" value={item.progress} onChange={(event) => onUpdate?.(item.id, { progress: Number(event.target.value) })} className="min-w-0 flex-1" />
                  <span className="w-9 text-right text-xs tabular-nums text-slate-500">{Math.round(item.progress)}%</span>
                </div>
              </td>
              <td className="font-semibold">{item.marginalValuePerHour}</td>
              <td>{item.dropSafetyScore}/100</td>
              <td>{item.safeToReduce ? <Pill color="green">safe to reduce</Pill> : <Pill color={item.completionRisk > 60 ? "red" : "amber"}>{item.completionRisk > 60 ? "protect" : "watch"}</Pill>}</td>
              <td>
                <div className="flex gap-1">
                  <button onClick={() => onUpdate?.(item.id, { progress: 100, status: "done" })} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50" title="Mark done">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete?.(item.id)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50" title="Delete assessment">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
