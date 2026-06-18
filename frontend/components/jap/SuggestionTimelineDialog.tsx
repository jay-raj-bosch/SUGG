// JaP — Suggestion Timeline Dialog
// Visual phase-by-phase audit trail showing:
// - All 6 workflow phases with status (completed / active / pending)
// - Who approved/rejected at each phase + date
// - Comments, routing info, and evaluation details
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Suggestion } from "@/lib/mockData";
import { JAP_STATUSES, STATUS_TO_PHASE, JAP_STATUS_COLORS, PHASE_SLA } from "@/lib/jap/workflowPipeline";
import {
  FileText, Send, UserCheck, MessageSquare, Wrench,
  BarChart3, Award, CheckCircle2, XCircle, Clock,
  RotateCcw, Forward,
} from "lucide-react";

interface Props {
  suggestion: Suggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimelineStep {
  phase: string;
  label: string;
  labelHi: string;
  icon: React.ReactNode;
  state: "completed" | "active" | "pending" | "rejected" | "skipped";
  approver?: string;
  date?: string;
  comment?: string;
  extra?: string;
}

const IC = "h-4 w-4";

function buildTimeline(s: Suggestion): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const fd = (s.formData ?? {}) as Record<string, unknown>;
  const isRejected = s.status === JAP_STATUSES.REJECTED;
  const isReopened = s.status === JAP_STATUSES.REOPENED;

  // Determine which phase we're currently at
  const PHASE_ORDER = [
    JAP_STATUSES.DRAFT,
    JAP_STATUSES.PENDING_FEASIBILITY,
    JAP_STATUSES.IN_OPINION,
    JAP_STATUSES.IN_IMPLEMENTATION,
    JAP_STATUSES.IN_EVALUATION,
    JAP_STATUSES.IN_AWARD,
    JAP_STATUSES.CLOSED_AWARDED,
  ];
  const currentIdx = PHASE_ORDER.indexOf(s.status as any);

  // ── Phase 1: Submission ──
  steps.push({
    phase: "Phase 1",
    label: "Submission",
    labelHi: "प्रस्तुतीकरण",
    icon: <FileText className={IC} />,
    state: s.status === JAP_STATUSES.DRAFT ? "active" : "completed",
    approver: s.employeeName || s.employeeNo,
    date: s.date,
    comment: s.status === JAP_STATUSES.DRAFT ? "Saved as draft" : "Submitted for review",
  });

  if (s.status === JAP_STATUSES.DRAFT) {
    // If still draft, show remaining phases as pending
    steps.push(
      { phase: "Phase 2", label: "Feasibility Review", labelHi: "व्यवहार्यता समीक्षा", icon: <UserCheck className={IC} />, state: "pending" },
      { phase: "Phase 3", label: "Opinion", labelHi: "राय चरण", icon: <MessageSquare className={IC} />, state: "pending" },
      { phase: "Phase 4", label: "Implementation", labelHi: "क्रियान्वयन", icon: <Wrench className={IC} />, state: "pending" },
      { phase: "Phase 5", label: "Evaluation", labelHi: "मूल्यांकन", icon: <BarChart3 className={IC} />, state: "pending" },
      { phase: "Phase 6", label: "Award", labelHi: "पुरस्कार", icon: <Award className={IC} />, state: "pending" },
    );
    return steps;
  }

  // ── Phase 2: Feasibility Review ──
  const feasDone = !!fd.feasibilityApprovedBy;
  const feasState: TimelineStep["state"] =
    feasDone ? "completed"
    : (isRejected && !feasDone) ? "rejected"
    : s.status === JAP_STATUSES.PENDING_FEASIBILITY ? "active"
    : currentIdx > 1 ? "completed" : "pending";

  steps.push({
    phase: "Phase 2",
    label: "Feasibility Review",
    labelHi: "व्यवहार्यता समीक्षा",
    icon: <UserCheck className={IC} />,
    state: feasState,
    approver: (fd.feasibilityApprovedByName as string) || undefined,
    date: (fd.feasibilityApprovedOn as string) || undefined,
    comment: feasDone ? "Feasibility approved ✓" : s.status === JAP_STATUSES.PENDING_FEASIBILITY ? "Awaiting superior review" : undefined,
  });

  // ── Phase 3: Opinion ──
  const opDone = !!fd.opinionApprovedBy;
  const opState: TimelineStep["state"] =
    opDone ? "completed"
    : (isRejected && feasDone && !opDone) ? "rejected"
    : s.status === JAP_STATUSES.IN_OPINION ? "active"
    : currentIdx > 2 ? "completed" : "pending";

  const routeInfo = fd.routedToReviewer
    ? `Routed to ${fd.routedToReviewer}${fd.routedToReviewerDept ? ` (${fd.routedToReviewerDept})` : ""} by ${fd.routedBy}`
    : undefined;

  steps.push({
    phase: "Phase 3",
    label: "Opinion",
    labelHi: "राय चरण",
    icon: <MessageSquare className={IC} />,
    state: opState,
    approver: (fd.opinionApprovedByName as string) || undefined,
    date: (fd.opinionApprovedOn as string) || undefined,
    comment: fd.opinionComment as string || (opDone ? "Opinion completed ✓" : s.status === JAP_STATUSES.IN_OPINION ? "Under planner review" : undefined),
    extra: routeInfo,
  });

  // ── Phase 4: Implementation ──
  const implDone = !!fd.implementedBy;
  const implState: TimelineStep["state"] =
    implDone ? "completed"
    : (isRejected && opDone && !implDone) ? "rejected"
    : s.status === JAP_STATUSES.IN_IMPLEMENTATION ? "active"
    : currentIdx > 3 ? "completed" : "pending";

  steps.push({
    phase: "Phase 4",
    label: "Implementation",
    labelHi: "क्रियान्वयन",
    icon: <Wrench className={IC} />,
    state: implState,
    approver: (fd.implementedByName as string) || undefined,
    date: s.implementedOn || undefined,
    comment: implDone ? "Implementation completed ✓" : s.status === JAP_STATUSES.IN_IMPLEMENTATION ? "Being implemented" : undefined,
  });

  // ── Phase 5: Evaluation ──
  const evalDone = !!fd.evaluatedBy;
  const evalState: TimelineStep["state"] =
    evalDone ? "completed"
    : (isRejected && implDone && !evalDone) ? "rejected"
    : s.status === JAP_STATUSES.IN_EVALUATION ? "active"
    : currentIdx > 4 ? "completed" : "pending";

  const evalType = fd.evaluationType as string;
  const evalExtra = evalDone
    ? evalType === "quantifiable"
      ? `Quantifiable — Savings: ₹${fd.savingsAmount ?? "—"}`
      : `Non-Quantifiable — Score: ${fd.recommendedScore ?? "—"}/10`
    : undefined;

  steps.push({
    phase: "Phase 5",
    label: "Evaluation",
    labelHi: "मूल्यांकन",
    icon: <BarChart3 className={IC} />,
    state: evalState,
    approver: (fd.evaluatedByName as string) || undefined,
    date: (fd.evaluatedOn as string) || undefined,
    comment: evalDone ? "Evaluation completed ✓" : s.status === JAP_STATUSES.IN_EVALUATION ? "Under evaluation" : undefined,
    extra: evalExtra,
  });

  // ── Phase 6: Award ──
  const awardDone = !!fd.awardApprovedBy || s.status === JAP_STATUSES.CLOSED_AWARDED;
  const awardState: TimelineStep["state"] =
    awardDone ? "completed"
    : (isRejected && evalDone && !awardDone) ? "rejected"
    : s.status === JAP_STATUSES.IN_AWARD ? "active"
    : "pending";

  const awardExtra = s.awardAmount ? `Award: ₹${s.awardAmount.toLocaleString("en-IN")}` : undefined;

  steps.push({
    phase: "Phase 6",
    label: "Award",
    labelHi: "पुरस्कार",
    icon: <Award className={IC} />,
    state: awardState,
    approver: (fd.awardApprovedByName as string) || undefined,
    date: s.awardDate || (fd.awardApprovedOn as string) || undefined,
    comment: awardDone ? "Award processed ✓" : s.status === JAP_STATUSES.IN_AWARD ? "Pending award decision" : undefined,
    extra: awardExtra,
  });

  // ── Rejection / Reopen overlay (append at end) ──
  if (isRejected) {
    steps.push({
      phase: "—",
      label: "Rejected",
      labelHi: "अस्वीकृत",
      icon: <XCircle className={IC} />,
      state: "rejected",
      approver: s.rejectedByName || undefined,
      date: s.rejectedOn || undefined,
      comment: s.rejectionReason || "Rejected",
    });
  }

  if (isReopened) {
    steps.push({
      phase: "—",
      label: "Reopened",
      labelHi: "पुनः खोला गया",
      icon: <RotateCcw className={IC} />,
      state: "active",
      date: (fd.reopenedOn as string) || undefined,
      comment: (fd.reopenReason as string) || "Suggestion reopened for reconsideration",
    });
  }

  return steps;
}

const STATE_STYLES: Record<TimelineStep["state"], { dot: string; line: string; text: string }> = {
  completed: { dot: "bg-emerald-500 border-emerald-500", line: "bg-emerald-300", text: "text-foreground" },
  active:    { dot: "bg-primary border-primary animate-pulse", line: "bg-border", text: "text-primary font-semibold" },
  pending:   { dot: "bg-muted border-muted-foreground/30", line: "bg-border", text: "text-muted-foreground" },
  rejected:  { dot: "bg-red-500 border-red-500", line: "bg-red-200", text: "text-red-700" },
  skipped:   { dot: "bg-muted border-dashed border-muted-foreground/30", line: "bg-border", text: "text-muted-foreground line-through" },
};

export default function SuggestionTimelineDialog({ suggestion, open, onOpenChange }: Props) {
  if (!suggestion) return null;

  const steps = buildTimeline(suggestion);
  const sla = PHASE_SLA[suggestion.status] ?? 0;
  const overdue = sla > 0 && (suggestion.daysPending ?? 0) > sla;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Suggestion Timeline / सुझाव समयरेखा
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs font-semibold">{suggestion.suggestionNo}</span>
            <Badge variant="outline" className={`text-[10px] ${JAP_STATUS_COLORS[suggestion.status] ?? ""}`}>
              {STATUS_TO_PHASE[suggestion.status] ?? suggestion.status}
            </Badge>
            {overdue && (
              <Badge variant="destructive" className="text-[10px]">Overdue ({suggestion.daysPending}d / {sla}d SLA)</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="py-2">
          <p className="text-xs text-muted-foreground mb-3 truncate">
            {suggestion.subject}
          </p>

          {/* Timeline */}
          <div className="relative ml-3">
            {steps.map((step, idx) => {
              const style = STATE_STYLES[step.state];
              const isLast = idx === steps.length - 1;
              return (
                <div key={idx} className="relative flex gap-3 pb-5 last:pb-0">
                  {/* Vertical line */}
                  {!isLast && (
                    <div className={`absolute left-[7px] top-5 bottom-0 w-0.5 ${style.line}`} />
                  )}
                  {/* Dot */}
                  <div className={`relative z-10 w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${style.dot}`}>
                    {step.state === "completed" && (
                      <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                    )}
                    {step.state === "rejected" && (
                      <XCircle className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${style.text}`}>
                        {step.phase !== "—" && <span className="text-[10px] text-muted-foreground mr-1">{step.phase}</span>}
                        {step.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground opacity-70">{step.labelHi}</span>
                    </div>
                    {(step.approver || step.date) && (
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        {step.approver && <span>👤 {step.approver}</span>}
                        {step.date && <span>📅 {step.date}</span>}
                      </div>
                    )}
                    {step.comment && (
                      <p className={`text-[11px] mt-0.5 ${step.state === "rejected" ? "text-red-600" : "text-muted-foreground"}`}>
                        {step.comment}
                      </p>
                    )}
                    {step.extra && (
                      <p className="text-[10px] mt-0.5 text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 w-fit">
                        {step.extra}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" /> Current</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted border border-muted-foreground/30" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Rejected</span>
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
