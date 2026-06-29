// JaP — Chatbot Widget
// Floating chatbot accessible from every phase of the JaP workflow.
// Provides contextual guidance on suggestion workflow, status queries, and FAQ.
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, User, ChevronDown } from "lucide-react";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { JAP_STATUSES, STATUS_TO_PHASE, PHASE_SLA, STATUS_PENDING_WITH } from "@/lib/jap/workflowPipeline";
import { PLANT_CODE_JAP } from "@/lib/constants";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

const FAQ: Array<{ q: string; a: string }> = [
  { q: "How do I submit a suggestion?", a: "Go to New Suggestion from the sidebar, fill in Present Method, Proposed Method, and Expected Benefits, then click Submit. You can also save as Draft first." },
  { q: "What are the workflow phases?", a: "Phase 1: Submission → Phase 2: Feasibility Review (Superior) → Phase 3: Opinion (Planner, 7d SLA) → Phase 4: Implementation (Implementer, 30d SLA) → Phase 5: Evaluation (Planner/CTG, 10d SLA) → Phase 6: Award (BPS, 3d SLA) → Closed/Awarded." },
  { q: "How do I check my suggestion status?", a: "Go to My Suggestions from the sidebar. You can filter by Draft, Active, Closed, or Rejected status." },
  { q: "What is a theme-based suggestion?", a: "A theme-based suggestion is aligned with a predefined improvement theme (Safety, Quality, Cost Reduction, etc.). Check the 'Theme Based' checkbox and select a theme." },
  { q: "Can I add co-suggestors?", a: "Yes! Enable 'Group / Team Suggestion' in the form and search for co-suggestors from the employee list." },
  { q: "What happens if my suggestion is rejected?", a: "You'll be notified with the rejection reason. You can request to reopen the suggestion after addressing the concerns." },
  { q: "What are the SLA timelines?", a: "Opinion Phase: 7 days, Implementation: 30 days, Evaluation: 10 days, Award: 3 days. Overdue items are flagged in the Workflow Inbox." },
  { q: "How are awards decided?", a: "Quantifiable suggestions are evaluated by CTG for savings calculation. Non-quantifiable suggestions receive a score-based evaluation. Awards can be cash or certificate." },
];

function matchFaq(input: string): string | null {
  const lower = input.toLowerCase();
  for (const { q, a } of FAQ) {
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hits = words.filter(w => lower.includes(w)).length;
    if (hits >= 2 || (words.length <= 3 && hits >= 1)) return a;
  }
  return null;
}

function generateResponse(input: string, suggestions: any[]): string {
  const lower = input.toLowerCase();

  // Track suggestion by number
  const suggMatch = lower.match(/(?:sugg|suggestion|track|status).*?(jap-sugg-\d{4}-\d+)/i)
    ?? lower.match(/(jap-sugg-\d{4}-\d+)/i);
  if (suggMatch) {
    const no = suggMatch[1].toUpperCase();
    const s = suggestions.find(s => s.plantCode === PLANT_CODE_JAP && s.suggestionNo?.toUpperCase() === no);
    if (s) {
      const phase = STATUS_TO_PHASE[s.status] || s.status;
      const sla = PHASE_SLA[s.status];
      const pending = STATUS_PENDING_WITH[s.status];
      return `📋 **${s.suggestionNo}** — "${s.subject}"\nStatus: ${phase}\n${pending ? `Pending with: ${pending}` : ""}${sla ? `\nSLA: ${sla} days` : ""}\nDays pending: ${s.daysPending ?? 0}`;
    }
    return `I couldn't find suggestion ${no}. Please check the suggestion number and try again.`;
  }

  // FAQ match
  const faqAnswer = matchFaq(input);
  if (faqAnswer) return faqAnswer;

  // Stats
  if (lower.includes("how many") || lower.includes("count") || lower.includes("total")) {
    const japSuggs = suggestions.filter(s => s.plantCode === PLANT_CODE_JAP);
    const active = japSuggs.filter(s => !["Draft", "Closed / Awarded", "Rejected"].includes(s.status)).length;
    const drafted = japSuggs.filter(s => s.status === "Draft").length;
    const closed = japSuggs.filter(s => s.status === JAP_STATUSES.CLOSED_AWARDED).length;
    return `📊 JaP Suggestion Stats:\n• Total: ${japSuggs.length}\n• Active: ${active}\n• Drafts: ${drafted}\n• Closed/Awarded: ${closed}\n• Rejected: ${japSuggs.filter(s => s.status === "Rejected").length}`;
  }

  // Overdue
  if (lower.includes("overdue") || lower.includes("late") || lower.includes("delay")) {
    const overdue = suggestions.filter(s => {
      const sla = PHASE_SLA[s.status];
      return sla && (s.daysPending ?? 0) > sla && s.plantCode === PLANT_CODE_JAP;
    });
    if (overdue.length === 0) return "✅ No overdue suggestions right now!";
    return `⚠️ ${overdue.length} overdue suggestion(s):\n${overdue.slice(0, 5).map(s => `• ${s.suggestionNo} — ${STATUS_TO_PHASE[s.status]} (${s.daysPending}d)`).join("\n")}`;
  }

  return "I can help with:\n• Track a suggestion — type its number (e.g. JAP-SUGG-2026-1001)\n• Workflow phases & SLA timelines\n• How to submit, draft, or reopen suggestions\n• Suggestion statistics & overdue items\n\nTry asking one of these!";
}

const QUICK_PROMPTS = [
  "What are the workflow phases?",
  "How do I submit a suggestion?",
  "Show overdue suggestions",
  "How many suggestions total?",
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "bot", text: "👋 Namaste! I'm the JaP Suggestion Assistant. Ask me about workflow phases, track a suggestion, or get help submitting one." },
  ]);
  const [input, setInput] = useState("");
  const { suggestions } = useSuggestions();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: text.trim() };
    const response = generateResponse(text.trim(), suggestions);
    const botMsg: Message = { id: `b-${Date.now()}`, role: "bot", text: response };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
          title="JaP Chatbot"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-h-[520px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="text-sm font-semibold">JaP Assistant</span>
              <span className="text-[10px] opacity-70">/ सुझाव सहायक</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded p-1 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[280px] max-h-[360px]">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  {m.text}
                </div>
                {m.role === "user" && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick prompts */}
          <div className="px-3 pb-1 flex flex-wrap gap-1">
            {QUICK_PROMPTS.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-[10px] px-2 py-1 rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask about workflow, track a suggestion…"
              className="text-xs h-8"
            />
            <Button size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => send(input)}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
