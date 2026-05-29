import React from "react";
import { Brain, CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Card, Metric, Pill } from "./ui.jsx";

export function StrategicPanel({ strategy, minimumViableMode, onToggleMinimum }) {
  const best = strategy.bestNextHour;
  const drop = strategy.dropCandidates[0];
  const judo = strategy.procrastination[0];

  return (
    <Card className="!bg-slate-900 text-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-blue-200">
          <Brain className="h-5 w-5" />
          <span className="text-sm font-semibold">Strategic AI engine</span>
        </div>
        <button onClick={onToggleMinimum} className={`rounded-lg px-3 py-2 text-xs font-semibold ${minimumViableMode ? "bg-amber-300 text-slate-950" : "bg-white/10 text-white hover:bg-white/20"}`}>
          Minimum viable week
        </button>
      </div>

      {best && (
        <div>
          <Pill color="blue">Best next hour</Pill>
          <h2 className="mt-3 text-xl font-bold">{best.course}: {best.title}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {best.marginalValuePerHour} grade-leverage points/hour. Worth {best.weighting}%, due soon, with {Math.round(100 - best.progress)}% still open.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Leverage/hr" value={best.marginalValuePerHour} tone="blue" />
            <Metric label="Risk" value={`${best.completionRisk}/100`} tone={best.completionRisk > 60 ? "red" : "amber"} />
            <Metric label="Hours left" value={`${best.estimatedHoursRemaining}h`} tone="green" />
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {drop && (
          <div className="rounded-lg bg-white/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Permission to drop</div>
            <p className="text-sm text-slate-300">Reduce {drop.course}: {drop.title}. Drop-safety {drop.dropSafetyScore}/100, so protect higher-leverage work first.</p>
          </div>
        )}
        {judo && (
          <div className="rounded-lg bg-white/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-amber-300" /> Procrastination judo</div>
            <p className="text-sm text-slate-300">{judo.firstMove}</p>
          </div>
        )}
        {minimumViableMode && (
          <div className="rounded-lg bg-amber-300 p-3 text-slate-950">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold"><Zap className="h-4 w-4" /> Triage mode active</div>
            <p className="text-sm">The planner is showing only non-negotiables. Protected rest stays protected.</p>
          </div>
        )}
      </div>
    </Card>
  );
}

