import React from "react";
import { clamp } from "../lib/date.js";

export function Card({ children, className = "" }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Pill({ children, color = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[color]}`}>{children}</span>;
}

export function Progress({ value, tone = "blue" }) {
  const tones = { blue: "bg-blue-600", green: "bg-emerald-600", amber: "bg-amber-500", red: "bg-rose-500", violet: "bg-violet-600" };
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100">
      <div className={`h-2.5 rounded-full ${tones[tone]}`} style={{ width: `${clamp(value, 4, 100)}%` }} />
    </div>
  );
}

export function Metric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-900",
    blue: "bg-blue-50 text-blue-900",
    green: "bg-emerald-50 text-emerald-900",
    amber: "bg-amber-50 text-amber-900",
    red: "bg-rose-50 text-rose-900",
  };
  return (
    <div className={`rounded-lg p-3 ${tones[tone]}`}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

