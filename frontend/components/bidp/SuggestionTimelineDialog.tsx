import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { statusColors, Suggestion } from "@/lib/mockData";
import { CheckCircle2, Clock, FileText, Send, UserCheck, Award, AlertCircle, XCircle, IndianRupee, ChevronRight, Undo2, Timer } from "lucide-react";
import { getPipeline } from "@/lib/bidp/approvalPipeline";
import { flmOptions, teamMemberOptions } from "@/lib/bidp/suggestionConstants";

// Build a name→empNo lookup from all known options
const buildEmpLookup = (): Record<string, string> => {
  const lookup: Record<string, string> = {
    "Suresh M":  "30698710",
    "Ganesh R":  "30698711",
    "Karthik M": "30698730",
    "Lakshmi P": "30698731",
    "Rajesh V":  "30698732",
  };
  for (const f of flmOptions) {
    if (f.name && f.value) lookup[f.name] = f.value;
  }
  for (const t of teamMemberOptions) {
    if (t.name && t.value) lookup[t.name] = t.value;
  }
  return lookup;
};
const EMP_LOOKUP = buildEmpLookup();

const withEmpNo = (name?: string, empNo?: string): string => {
  if (!name) return "\u2014";
  const no = empNo || EMP_LOOKUP[name] || "";
  return no ? `${name} (${no})` : name;
};

interface Props {
  suggestion: Suggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimelineEvent {
  label: string;
  date: string;
  detail: string;
  icon: React.ReactNode;
  state: "completed" | "active" | "pending" | "rejected" | "sentBack";
  daysTaken?: number;  // days between this step and the previous one
}

/** Calculate calendar days between two ISO date strings */
const daysBetween = (from: string, to: string): number => {
  if (!from || !to || from === "—" || to === "—") return 0;
  const a = new Date(from); a.setHours(0,0,0,0);
  const b = new Date(to);   b.setHours(0,0,0,0);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
};

const daysSinceToday = (from: string): number => {
  if (!from || from === "—") return 0;
  const a = new Date(from); a.setHours(0,0,0,0);
  const b = new Date();      b.setHours(0,0,0,0);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
};

/**
 * Build timeline from the suggestion state + approval pipeline.
 * Before FLM evaluates (no awardAmount), only show up to FLM.
 * After FLM sets amount, show full pipeline based on amount.
 */
const getTimeline = (s: Suggestion): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const ic = "h-4 w-4";
  const isDCIP = s.type === "Daily CIP";
  const isRejected = s.status === "Rejected";

  // ── Step 1: Created ──
  events.push({
    label: "Suggestion Created",
    date: s.date,
    detail: s.status === "Draft" ? "Saved as draft" : "Created by " + withEmpNo(s.employeeName, s.employeeNo),
    icon: <FileText className={ic} />,
    state: "completed",
  });

  // Draft → stop here
  if (s.status === "Draft") {
    events.push({
      label: "Submit",
      date: "—",
      detail: "Awaiting submission by employee",
      icon: <Send className={ic} />,
      state: "pending",
    });
    return events;
  }

  // ── Step 2: Submitted ──
  events.push({
    label: "Submitted",
    date: s.date,
    detail: "Sent for FLM review",
    icon: <Send className={ic} />,
    state: "completed",
    daysTaken: 0,
  });

  // DCIP → auto-closed
  if (isDCIP) {
    events.push({
      label: "Auto-Closed",
      date: s.date,
      detail: "Daily CIP — no approval needed",
      icon: <CheckCircle2 className={ic} />,
      state: s.status === "Approved & Closed" ? "completed" : "pending",
    });
    return events;
  }

  // ── Pipeline steps based on type + award amount ──
  const hasAmount = s.awardAmount != null && s.awardAmount > 0;
  const amount = s.awardAmount ?? 0;

  // Determine which steps are completed by checking approval stamps
  const flmDone = !!s.evaluatedBy;
  const managerDone = !!s.approvedByManager;
  const bpsAdminDone = !!s.approvedByBpsAdmin;
  const bpsDhDone = !!s.approvedByBpsDh;

  // ── FLM Evaluation (always shown) ──
  const flmIsActive = s.status === "Submitted" && !flmDone && !isRejected;
  // Parse pendingWith "Role - Name" to show emp no when active
  const pendingWithDetail = (() => {
    if (!s.pendingWith) return "Pending FLM review";
    const dash = s.pendingWith.indexOf(" - ");
    const name = dash !== -1 ? s.pendingWith.slice(dash + 3).trim() : "";
    const empNo = name ? (EMP_LOOKUP[name] || s.assignedFlm || "") : s.assignedFlm || "";
    return name && empNo ? `${s.pendingWith} (${empNo})` : s.pendingWith;
  })();
  events.push({
    label: "FLM Evaluation",
    date: s.evaluatedOn || "—",
    detail: flmDone
      ? `Evaluated by ${withEmpNo(s.evaluatedByName, s.evaluatedBy)}` + (hasAmount ? ` \u2014 \u20b9${amount}` : "")
      : flmIsActive
        ? pendingWithDetail
        : "Pending FLM review",
    icon: <UserCheck className={ic} />,
    state: flmDone ? "completed" : flmIsActive ? "active" : isRejected && s.rejectedBy && !flmDone ? "rejected" : "pending",
    daysTaken: flmDone && s.evaluatedOn ? daysBetween(s.date, s.evaluatedOn) : flmIsActive ? daysSinceToday(s.date) : undefined,
  });

  // If FLM hasn't evaluated yet AND not rejected, stop here — don't show further pipeline
  if (!flmDone && !isRejected) {
    events.push({
      label: "Next steps",
      date: "—",
      detail: "Pipeline will be determined after FLM sets award amount",
      icon: <Clock className={ic} />,
      state: "pending",
    });
    return events;
  }

  // ── Rejected at any stage ──
  if (isRejected) {
    events.push({
      label: "Rejected",
      date: s.rejectedOn || "—",
      detail: `By ${withEmpNo(s.rejectedByName, EMP_LOOKUP[s.rejectedByName || ""])}${s.rejectionReason ? ": " + s.rejectionReason : ""}`,
      icon: <XCircle className={ic} />,
      state: "rejected",
    });
    // Show send-back history even on rejected suggestions
    if (s.sendBackHistory?.length) {
      for (const sb of s.sendBackHistory) {
        events.push({
          label: `Sent Back by ${withEmpNo(sb.from, EMP_LOOKUP[sb.from || ""])}`,
          date: sb.date,
          detail: `Returned to ${sb.to} for revision`,
          icon: <Undo2 className={ic} />,
          state: "sentBack",
        });
      }
    }
    return events;
  }

  // ── After FLM: show full pipeline based on amount ──
  const pipeline = getPipeline(s.type, amount);
  // Skip FLM step (already shown above), show remaining steps
  const remainingSteps = pipeline.slice(1); // remove FLM entry

  for (const step of remainingSteps) {
    if (step.level === "Manager") {
      const isActive = s.status === "Pending Manager" && !managerDone;
      events.push({
        label: "Manager Approval",
        date: s.approvedByManagerOn || "\u2014",
        detail: managerDone
          ? `Approved by ${withEmpNo(s.approvedByManagerName, EMP_LOOKUP[s.approvedByManagerName || ""])}`
          : isActive ? "Pending manager approval" : "Awaiting",
        icon: <UserCheck className={ic} />,
        state: managerDone ? "completed" : isActive ? "active" : "pending",
        daysTaken: managerDone && s.approvedByManagerOn && s.evaluatedOn ? daysBetween(s.evaluatedOn, s.approvedByManagerOn) : isActive && s.evaluatedOn ? daysSinceToday(s.evaluatedOn) : undefined,
      });
    } else if (step.level === "BPS Admin") {
      const isActive = s.status === "Pending BPS Admin" && !bpsAdminDone;
      const prevDate = s.approvedByManagerOn || s.evaluatedOn;
      events.push({
        label: "BPS Admin",
        date: s.approvedByBpsAdminOn || "\u2014",
        detail: bpsAdminDone
          ? `Approved by ${withEmpNo(s.approvedByBpsAdminName, EMP_LOOKUP[s.approvedByBpsAdminName || ""])}`
          : isActive ? "Pending BPS Admin approval" : "Awaiting",
        icon: <UserCheck className={ic} />,
        state: bpsAdminDone ? "completed" : isActive ? "active" : "pending",
        daysTaken: bpsAdminDone && s.approvedByBpsAdminOn && prevDate ? daysBetween(prevDate, s.approvedByBpsAdminOn) : isActive && prevDate ? daysSinceToday(prevDate) : undefined,
      });
    } else if (step.level === "BPS DH") {
      const isActive = s.status === "Pending BPS DH" && !bpsDhDone;
      const prevDateDh = s.approvedByBpsAdminOn || s.approvedByManagerOn || s.evaluatedOn;
      events.push({
        label: "BPS DH",
        date: s.approvedByBpsDhOn || "\u2014",
        detail: bpsDhDone
          ? `Approved by ${withEmpNo(s.approvedByBpsDhName, EMP_LOOKUP[s.approvedByBpsDhName || ""])}`
          : isActive ? "Pending BPS DH approval" : "Awaiting",
        icon: <UserCheck className={ic} />,
        state: bpsDhDone ? "completed" : isActive ? "active" : "pending",
        daysTaken: bpsDhDone && s.approvedByBpsDhOn && prevDateDh ? daysBetween(prevDateDh, s.approvedByBpsDhOn) : isActive && prevDateDh ? daysSinceToday(prevDateDh) : undefined,
      });
    }
  }

  // ── Final: Closed ──
  const isClosed = s.status === "Approved & Closed" || s.status === "Closed";
  events.push({
    label: "Closed",
    date: isClosed ? (s.approvedByBpsDhOn || s.approvedByBpsAdminOn || s.evaluatedOn || "—") : "—",
    detail: isClosed ? "Suggestion approved & closed" : "Awaiting closure",
    icon: <CheckCircle2 className={ic} />,
    state: isClosed ? "completed" : "pending",
  });

  // Award info
  if (hasAmount && isClosed) {
    events.push({
      label: `Award: ₹${amount}`,
      date: s.awardDate || "—",
      detail: s.awardCategory ? `Category: ${s.awardCategory}` : "Award granted",
      icon: <Award className={ic} />,
      state: "completed",
    });
  }

  // ── Send-back history (shown at the end for context) ──
  if (s.sendBackHistory?.length) {
    for (const sb of s.sendBackHistory) {
      events.push({
        label: `Sent Back by ${withEmpNo(sb.from, EMP_LOOKUP[sb.from || ""])}`,
        date: sb.date,
        detail: `Returned to ${sb.to} for revision`,
        icon: <Undo2 className={ic} />,
        state: "sentBack",
      });
    }
  }

  return events;
};

const stateStyles = {
  completed: {
    dot: "bg-emerald-500 border-emerald-500 text-white",
    line: "bg-emerald-500",
    label: "text-foreground",
  },
  active: {
    dot: "bg-primary border-primary text-primary-foreground animate-pulse",
    line: "bg-border",
    label: "text-foreground font-semibold",
  },
  pending: {
    dot: "bg-background border-border text-muted-foreground",
    line: "bg-border",
    label: "text-muted-foreground",
  },
  rejected: {
    dot: "bg-destructive border-destructive text-white",
    line: "bg-destructive/30",
    label: "text-destructive",
  },
  sentBack: {
    dot: "bg-amber-500 border-amber-500 text-white",
    line: "bg-amber-300",
    label: "text-amber-700 dark:text-amber-400",
  },
};

const SuggestionTimelineDialog = ({ suggestion, open, onOpenChange }: Props) => {
  if (!suggestion) return null;

  const timeline = getTimeline(suggestion);

  // Mini pipeline summary bar
  const amount = suggestion.awardAmount ?? 0;
  const isDCIP = suggestion.type === "Daily CIP";
  const pipelineSummary = isDCIP
    ? ["Emp", "Close"]
    : amount > 0
      ? (() => {
          const steps = getPipeline(suggestion.type, amount);
          return ["Emp", ...steps.map(s => s.level), "Close"];
        })()
      : ["Emp", "FLM", "..."];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Timeline
            <Badge variant="outline" className={`text-[10px] ${statusColors[suggestion.status]}`}>
              {suggestion.status}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs space-y-0.5">
            <span className="font-mono">{suggestion.suggestionNo} — {suggestion.subject}</span>
            <br />
            <span className="text-muted-foreground">
              {suggestion.employeeName
                ? `${suggestion.employeeName}${suggestion.employeeNo ? ` (${suggestion.employeeNo})` : ""}`
                : suggestion.employeeNo || ""}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Pipeline summary bar */}
        <div className="flex items-center gap-0.5 flex-wrap pb-2 border-b">
          {pipelineSummary.map((step, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                step === "..." ? "bg-muted text-muted-foreground italic" :
                i === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                "bg-muted text-muted-foreground"
              }`}>{step}</span>
              {i < pipelineSummary.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/50" />}
            </div>
          ))}
          {amount > 0 && (
            <Badge variant="secondary" className="text-[9px] ml-auto gap-0.5">
              <IndianRupee className="h-2.5 w-2.5" />{amount}
            </Badge>
          )}
        </div>

        {/* Timeline */}
        <div className="relative pl-6 space-y-0">
          {timeline.map((event, i) => {
            const styles = stateStyles[event.state];
            return (
              <div key={i} className="relative pb-6 last:pb-0">
                {/* Vertical line */}
                {i < timeline.length - 1 && (
                  <div className={`absolute left-[-16px] top-6 w-0.5 h-full ${styles.line}`} />
                )}
                {/* Dot */}
                <div className={`absolute left-[-22px] top-1 flex items-center justify-center w-5 h-5 rounded-full border-2 ${styles.dot}`}>
                  {event.icon}
                </div>
                {/* Content */}
                <div className="ml-2">
                  <p className={`text-sm ${styles.label}`}>
                    {event.label}
                    {event.daysTaken != null && event.daysTaken >= 0 && (
                      <span className={`ml-2 inline-flex items-center gap-0.5 text-[10px] font-normal ${
                        event.state === "active" ? "text-primary" : "text-muted-foreground"
                      }`}>
                        <Timer className="h-2.5 w-2.5" />{event.daysTaken}d
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{event.detail}</p>
                  {event.date !== "—" && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{event.date}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestionTimelineDialog;
