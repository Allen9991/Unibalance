import React, { useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { CLAUDE_MODEL, sendAnthropicMessage } from "../lib/aiClient.js";
import { iso } from "../lib/date.js";
import { Card } from "./ui.jsx";

export function AICapture({ onAdd, courses = [], compact = false }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await sendAnthropicMessage({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        system: "Return ONLY JSON with shape { course, title, type, dueDate, weighting, estimatedHours }. Use ISO yyyy-mm-dd dates. Infer reasonable values. No markdown.",
        messages: [{ role: "user", content: text }],
      });
      const raw = (data.content || []).map((part) => part.text || "").join("").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
      onAdd(parsed);
      setText("");
    } catch (err) {
      onAdd({ course: courses[0]?.code || "", title: text.slice(0, 42) || "Captured assessment", type: "Assessment", dueDate: iso(14), weighting: 20, estimatedHours: 8 });
      setText("");
      setError("AI parsing was unavailable, so UniBalance added a safe draft you can refine later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={compact ? "p-4" : ""}>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-slate-900">Natural-language assessment input</h3>
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder="Essay due in 3 weeks, worth 30%"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-700">{error}</p>}
    </Card>
  );
}
