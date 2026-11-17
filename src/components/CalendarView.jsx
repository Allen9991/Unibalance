import React from "react";
import { Upload } from "lucide-react";
import { days, hours, palette } from "../data/fixtures.js";
import { Card, Pill } from "./ui.jsx";

export function CalendarView({ plan, compact = false, onMarkBlock, onImportIcs }) {
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    onImportIcs?.(await file.text());
    event.target.value = "";
  }

  return (
    <Card className={compact ? "border-0 p-0 shadow-none" : ""}>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Unified week calendar</h2>
          {onImportIcs && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              <Upload className="h-4 w-4" />
              Import .ics
              <input type="file" accept=".ics,text/calendar" onChange={importFile} className="sr-only" />
            </label>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1">
            <div />
            {days.map((day) => <div key={day} className="rounded-lg bg-slate-100 p-2 text-center text-sm font-semibold">{day}</div>)}
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div className="pr-2 pt-2 text-right text-xs text-slate-400">{hour}:00</div>
                {days.map((day) => {
                  const event = plan.find((item) => item.day === day && item.start === hour);
                  return (
                    <div key={`${day}-${hour}`} className="h-20 rounded-lg border border-slate-100 bg-white p-1">
                      {event && (
                        <div className={`h-full rounded-md px-2 py-1 text-xs font-medium text-white ${event.status === "skipped" ? "opacity-50" : ""}`} style={{ background: palette[event.course] || palette[event.type] || palette.life }}>
                          <div className="truncate">{event.title}</div>
                          <div className="opacity-80">{event.start}-{event.end}</div>
                          {event.type === "study" && onMarkBlock && (
                            <div className="mt-1 flex gap-1">
                              {["completed", "skipped", "rescheduled"].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => onMarkBlock(event, status)}
                                  className="rounded bg-white/20 px-1 py-0.5 text-[10px] hover:bg-white/30"
                                >
                                  {status[0].toUpperCase()}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      {onMarkBlock && <div className="mt-3 flex gap-2 text-xs text-slate-500"><Pill>Buttons: C complete</Pill><Pill>S skip</Pill><Pill>R reschedule</Pill></div>}
    </Card>
  );
}
