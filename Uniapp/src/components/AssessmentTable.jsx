import React from "react";
import { shortDate } from "../lib/date.js";
import { Pill } from "./ui.jsx";

export function AssessmentTable({ assessments }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="py-3">Course</th>
            <th>Title</th>
            <th>Due</th>
            <th>Weight</th>
            <th>Status</th>
            <th>Leverage/hr</th>
            <th>Drop safety</th>
            <th>Signal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assessments.map((item) => (
            <tr key={item.id}>
              <td className="py-3 font-semibold">{item.course}</td>
              <td>{item.title}</td>
              <td>{shortDate(item.dueDate)}</td>
              <td>{item.weighting}%</td>
              <td><Pill color={item.status === "done" ? "green" : item.status === "in progress" ? "blue" : "slate"}>{item.status}</Pill></td>
              <td className="font-semibold">{item.marginalValuePerHour}</td>
              <td>{item.dropSafetyScore}/100</td>
              <td>{item.safeToReduce ? <Pill color="green">safe to reduce</Pill> : <Pill color={item.completionRisk > 60 ? "red" : "amber"}>{item.completionRisk > 60 ? "protect" : "watch"}</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

