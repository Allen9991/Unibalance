import React, { useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { Card } from "../components/ui.jsx";
import { CLAUDE_MODEL, sendAnthropicMessage } from "../lib/aiClient.js";
import { buildPacingInsight, calculateCourseGradeSnapshot } from "../lib/gradebook.js";

export function Assistant({ state, strategy, plan }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: strategy.recommendations[0]?.detail || "I can explain the strategy engine's recommendations using your current UniBalance data." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  async function sendChat() {
    if (!chatInput.trim()) return;
    const outgoing = { role: "user", content: chatInput };
    const nextMessages = [...messages, outgoing];
    setMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    try {
      const stateContext = {
        courses: state.courses,
        assessments: state.assessments,
        keyDates: state.keyDates,
        gradeSnapshots: state.courses.map((course) => ({ course: course.code, ...calculateCourseGradeSnapshot(course, state.assessments) })),
        pacingInsight: buildPacingInsight(state.courses, state.assessments, state.studySessions),
        deterministicStrategy: strategy,
        generatedStudyPlan: plan,
        rule: "The strategy object is authoritative. Explain it; do not override rankings.",
      };
      const data = await sendAnthropicMessage({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        system: "You are UniBalance. Explain deterministic recommendations in direct, supportive language. Mention concrete courses, weightings, hours, and tradeoffs. Do not invent new priorities.",
        messages: [
          { role: "user", content: `Current app state JSON:\n${JSON.stringify(stateContext)}` },
          ...nextMessages.map((msg) => ({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content })),
        ],
      });
      const answer = (data.content || []).map((part) => part.text || "").join("").trim();
      setMessages((items) => [...items, { role: "assistant", content: answer || fallback(strategy) }]);
    } catch (err) {
      setMessages((items) => [...items, { role: "assistant", content: fallback(strategy) }]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold">Strategic assistant</h2>
      </div>
      <div className="mb-4 h-[520px] space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
        {messages.map((msg, index) => (
          <div key={index} className={`max-w-[82%] rounded-lg p-3 text-sm ${msg.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-white text-slate-700 shadow-sm"}`}>
            {msg.content}
          </div>
        ))}
        {chatBusy && <div className="inline-flex items-center gap-2 rounded-lg bg-white p-3 text-sm text-slate-500 shadow-sm"><Loader2 className="h-4 w-4 animate-spin" /> Explaining the strategy...</div>}
      </div>
      <div className="flex gap-2">
        <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Can I sacrifice anything this week?" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <button onClick={sendChat} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"><Send className="h-4 w-4" /> Send</button>
      </div>
    </Card>
  );
}

function fallback(strategy) {
  const best = strategy.bestNextHour;
  const drop = strategy.dropCandidates[0];
  const judo = strategy.procrastination[0];
  return [
    best ? `Best next hour: ${best.course} ${best.title}, because it has ${best.marginalValuePerHour} leverage points per hour.` : "",
    drop ? `Permission to reduce: ${drop.course} ${drop.title}; its drop-safety is ${drop.dropSafetyScore}/100.` : "",
    judo ? `Tiny first move: ${judo.firstMove}` : "",
  ].filter(Boolean).join(" ");
}
