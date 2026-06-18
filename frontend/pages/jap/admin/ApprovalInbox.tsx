// JaP — Approval Inbox
// Role-aware inbox that shows all JaP suggestions pending action from the
// logged-in authority role. Supports Approve, Reject, and phase-specific
// actions (opinion comments, evaluation type, award amount).
//
// WorkflowInbox focuses on phase-tab browsing; ApprovalInbox focuses on a
// flat "items YOU must act on right now" list, sorted by urgency.
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { usePlant } from "@/contexts/PlantContext";
import type { Suggestion } from "@/lib/mockData";
import {
  JAP_STATUSES, JAP_STATUS_COLORS, STATUS_TO_PHASE, PHASE_SLA,
  STATUS_PENDING_WITH, NEXT_STATUS,
  getInboxStatuses, canActOnSuggestion,
  buildJapApprovalUpdate, buildJapRejectionUpdate,
  type JapRole,
} from "@/lib/jap/workflowPipeline";
import {
  Inbox, Search, CheckCircle2, XCircle, Clock, User, Building2,
  Calendar, AlertTriangle, Eye, ChevronRight, Filter,
} from "lucide-react";
import { toast } from "sonner";

// ─── Role label helpers ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<JapRole, string> = {
  employee:    "Employee",
  superior:    "Superior",
  planner:     "Planner",
  implementer: "Implementer",
  ctg:         "CTG",
  bps:         "BPS Admin",
  coordinator: "Suggestion Coordinator",
};

// ─── Suggestion detail panel ─────────────────────────────────────────────────

function SuggDetail({ s }: { s: Suggestion }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Suggestion No</p>
          <p className="font-mono font-semibold">{s.suggestionNo}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Date</p>
          <p>{s.date}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Submitted by</p>
          <p>{s.employeeName || s.employeeNo}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Department</p>
          <p>{s.department}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Category</p>
          <p>{s.category}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant="outline" className={`text-[10px] ${JAP_STATUS_COLORS[s.status] ?? ""}`}>
            {STATUS_TO_PHASE[s.status] ?? s.status}
          </Badge>
        </div>
      </div>
      <Separator />
      <div>
        <p className="text-xs text-muted-foreground mb-1">Present Method</p>
        <p className="bg-muted/40 rounded p-2 text-xs leading-relaxed">{s.presentMethod || "—"}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Proposed Method</p>
        <p className="bg-muted/40 rounded p-2 text-xs leading-relaxed">{s.proposedMethod || "—"}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Expected Benefits</p>
        <p className="bg-muted/40 rounded p-2 text-xs leading-relaxed">{s.benefits || "—"}</p>
      </div>
      {/* Audit trail */}
      {s.formData?.feasibilityApprovedByName && (
        <p className="text-[10px] text-muted-foreground">
          ✓ Feasibility: {s.formData.feasibilityApprovedByName as string} ({s.formData.feasibilityApprovedOn as string})
        </p>
      )}
      {s.formData?.opinionApprovedByName && (
        <p className="text-[10px] text-muted-foreground">
          ✓ Opinion: {s.formData.opinionApprovedByName as string} ({s.formData.opinionApprovedOn as string})
        </p>
      )}
      {s.formData?.implementedByName && (
        <p className="text-[10px] text-muted-foreground">
          ✓ Implemented: {s.formData.implementedByName as string}
        </p>
      )}
      {s.formData?.evaluatedByName && (
        <p className="text-[10px] text-muted-foreground">
          ✓ Evaluated: {s.formData.evaluatedByName as string} ({s.formData.evaluatedOn as string})
        </p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ApprovalInbox = () => {
  const { user } = useAuth();
  const { suggestions, updateSuggestion } = useSuggestions();
  const { addNotification } = useNotifications();
  const { plantPrefix } = usePlant();
  const navigate = useNavigate();

  const japRole = user?.japRole as JapRole | undefined;
  const empNo = user?.employeeNo ?? "";
  const empName = user?.name ?? "";

  // All JaP suggestions that this role must act on
  const inboxStatuses = useMemo(
    () => (japRole ? getInboxStatuses(japRole) : []),
    [japRole],
  );

  const canAct = useCallback(
    (status: string) => japRole ? canActOnSuggestion(japRole, status) : false,
    [japRole],
  );

  const pendingItems = useMemo(() => {
    let items = suggestions.filter(
      s => s.plantCode === "PLT-02" && inboxStatuses.includes(s.status),
    );
    // CTG only sees quantifiable evaluations
    if (japRole === "ctg") {
      items = items.filter(
        s => s.status === JAP_STATUSES.IN_EVALUATION &&
          s.formData?.evaluationType === "quantifiable",
      );
    }
    // Sort: overdue first, then by days pending desc
    return [...items].sort((a, b) => {
      const slaA = PHASE_SLA[a.status] ?? 0;
      const slaB = PHASE_SLA[b.status] ?? 0;
      const overdueA = slaA > 0 && (a.daysPending ?? 0) > slaA ? 1 : 0;
      const overdueB = slaB > 0 && (b.daysPending ?? 0) > slaB ? 1 : 0;
      if (overdueA !== overdueB) return overdueB - overdueA;
      return (b.daysPending ?? 0) - (a.daysPending ?? 0);
    });
  }, [suggestions, inboxStatuses, japRole]);

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  const departments = useMemo(() => {
    const depts = new Set<string>();
    for (const s of pendingItems) {
      if (s.department) depts.add(s.department);
    }
    return [...depts].sort();
  }, [pendingItems]);

  const stageOptions = useMemo(() => {
    const phases = new Set<string>();
    for (const s of pendingItems) phases.add(s.status);
    return [...phases].map(st => ({ value: st, label: STATUS_TO_PHASE[st] ?? st }));
  }, [pendingItems]);

  const filtered = useMemo(() => {
    let items = pendingItems;
    if (stageFilter !== "all") items = items.filter(s => s.status === stageFilter);
    if (deptFilter !== "all") items = items.filter(s => s.department === deptFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(s =>
        s.suggestionNo.toLowerCase().includes(q) ||
        (s.subject ?? "").toLowerCase().includes(q) ||
        (s.employeeName ?? "").toLowerCase().includes(q) ||
        (s.department ?? "").toLowerCase().includes(q),
      );
    }
    return items;
  }, [pendingItems, search, stageFilter, deptFilter]);

  // Dialog states
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  // Action form state
  const [rejectReason, setRejectReason] = useState("");
  const [opinionComment, setOpinionComment] = useState("");
  const [awardAmount, setAwardAmount] = useState("");
  const [evaluationType, setEvaluationType] = useState<"quantifiable" | "non-quantifiable">("non-quantifiable");
  const [savingsAmount, setSavingsAmount] = useState("");
  const [recommendedScore, setRecommendedScore] = useState("");

  const resetForms = () => {
    setRejectReason(""); setOpinionComment(""); setAwardAmount("");
    setSavingsAmount(""); setRecommendedScore("");
    setEvaluationType("non-quantifiable");
  };

  // ─── Actions ───────────────────────────────────────────────────────────

  const handleApprove = () => {
    if (!selected || !empNo) return;

    const extra: Record<string, unknown> = {};
    if (selected.status === JAP_STATUSES.IN_OPINION && opinionComment) {
      extra.opinionComment = opinionComment;
    }
    if (selected.status === JAP_STATUSES.IN_EVALUATION) {
      // Tag evaluationType on formData and navigate to the eval form
      const evalType = evaluationType;
      updateSuggestion(selected.id, {
        formData: {
          ...(selected.formData ?? {}),
          evaluationType: evalType,
          classifiedBy: empNo,
          classifiedByName: empName,
          classifiedOn: new Date().toISOString().split("T")[0],
        },
      });
      toast.success(`${selected.suggestionNo} classified as ${evalType} — opening evaluation form`);
      addNotification(`${selected.suggestionNo} classified: ${evalType}`, "info");
      setApproveOpen(false);
      const route = evalType === "quantifiable"
        ? `${plantPrefix}/admin/eval-quantifiable?sugg=${encodeURIComponent(selected.suggestionNo)}`
        : `${plantPrefix}/admin/eval-non-quantifiable?sugg=${encodeURIComponent(selected.suggestionNo)}`;
      navigate(route);
      return;
    }
    if (selected.status === JAP_STATUSES.IN_AWARD) {
      extra.awardAmount = Number(awardAmount);
    }

    const update = buildJapApprovalUpdate(selected.status, empNo, empName, extra);
    updateSuggestion(selected.id, {
      ...update,
      formData: { ...(selected.formData ?? {}), ...(update.formData as Record<string, unknown> ?? {}) },
    });

    if (selected.status === JAP_STATUSES.IN_AWARD && awardAmount) {
      updateSuggestion(selected.id, {
        awardAmount: Number(awardAmount),
        awardCategory: Number(awardAmount) >= 5000 ? "Gold" : Number(awardAmount) >= 3000 ? "Silver" : "Bronze",
      });
    }

    const nextPhase = STATUS_TO_PHASE[update.status as string] ?? update.status;
    toast.success(`${selected.suggestionNo} → ${nextPhase}`);
    addNotification(
      `${selected.suggestionNo} approved by ${empName} and moved to ${nextPhase}`,
      "success",
    );

    setApproveOpen(false);
    setSelected(null);
    resetForms();
  };

  const handleReject = () => {
    if (!selected || !rejectReason.trim() || !empNo) return;
    const update = buildJapRejectionUpdate(empNo, empName, rejectReason.trim());
    updateSuggestion(selected.id, update);
    toast.success(`${selected.suggestionNo} rejected`);
    addNotification(
      `${selected.suggestionNo} rejected by ${empName}: "${rejectReason.trim()}"`,
      "error",
    );
    setRejectOpen(false);
    setSelected(null);
    resetForms();
  };

  // ─── Summary stats ────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const byPhase: Record<string, number> = {};
    let overdue = 0;
    for (const s of pendingItems) {
      const phase = STATUS_TO_PHASE[s.status] ?? s.status;
      byPhase[phase] = (byPhase[phase] ?? 0) + 1;
      const sla = PHASE_SLA[s.status] ?? 0;
      if (sla > 0 && (s.daysPending ?? 0) > sla) overdue++;
    }
    return { total: pendingItems.length, overdue, byPhase };
  }, [pendingItems]);

  // ─── Guard — no role ──────────────────────────────────────────────────

  if (!japRole || japRole === "employee") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Approval Inbox is not available for the Employee role.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Inbox className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">
              Approval Inbox{" "}
              <span className="text-sm font-normal text-muted-foreground">/ अनुमोदन इनबॉक्स</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {ROLE_LABELS[japRole]} · {empName} — items awaiting your action
            </p>
          </div>
        </div>
        {stats.total > 0 && (
          <div className="flex gap-2">
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              {stats.total} Pending
            </Badge>
            {stats.overdue > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {stats.overdue} Overdue
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Phase summary cards */}
      {Object.keys(stats.byPhase).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(stats.byPhase).map(([phase, count]) => (
            <Card key={phase}>
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  {phase}
                </p>
                <p className="text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by suggestion no, subject, employee…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stageOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm">
            <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Active filter badges */}
      {(stageFilter !== "all" || deptFilter !== "all") && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {stageFilter !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setStageFilter("all")}>
              {STATUS_TO_PHASE[stageFilter] ?? stageFilter} ✕
            </Badge>
          )}
          {deptFilter !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setDeptFilter("all")}>
              {deptFilter} ✕
            </Badge>
          )}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs">No suggestions are waiting for your approval right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const sla = PHASE_SLA[s.status] ?? 0;
            const overdue = sla > 0 && (s.daysPending ?? 0) > sla;
            const phaseLabel = STATUS_TO_PHASE[s.status] ?? s.status;
            const pendingWith = STATUS_PENDING_WITH[s.status] ?? "—";

            return (
              <Card key={s.id} className={`transition-all hover:shadow-md ${overdue ? "border-red-200" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {s.suggestionNo}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${JAP_STATUS_COLORS[s.status] ?? ""}`}
                        >
                          {phaseLabel}
                        </Badge>
                        {overdue && (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" /> Overdue
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          Pending with: <span className="font-medium">{pendingWith}</span>
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{s.subject}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {s.employeeName || s.employeeNo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {s.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {s.date}
                        </span>
                        {(s.daysPending ?? 0) > 0 && (
                          <span className={`flex items-center gap-1 ${overdue ? "text-red-600 font-semibold" : ""}`}>
                            <Clock className="h-3 w-3" />
                            {s.daysPending}d pending
                            {sla > 0 && ` / ${sla}d SLA`}
                          </span>
                        )}
                        {s.category && (
                          <span className="text-muted-foreground/70">{s.category}</span>
                        )}
                      </div>

                      {/* Audit trail */}
                      <div className="mt-1.5 space-y-0.5">
                        {s.formData?.feasibilityApprovedByName && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Feasibility: {s.formData.feasibilityApprovedByName as string} ({s.formData.feasibilityApprovedOn as string})
                          </p>
                        )}
                        {s.formData?.opinionApprovedByName && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Opinion: {s.formData.opinionApprovedByName as string} ({s.formData.opinionApprovedOn as string})
                          </p>
                        )}
                        {s.formData?.implementedByName && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Implemented: {s.formData.implementedByName as string}
                          </p>
                        )}
                        {s.formData?.evaluatedByName && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Evaluated: {s.formData.evaluatedByName as string} ({s.formData.evaluatedOn as string})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => { setSelected(s); setDetailOpen(true); }}
                      >
                        <Eye className="h-3 w-3" /> View
                      </Button>
                      {canAct(s.status) && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => { setSelected(s); resetForms(); setApproveOpen(true); }}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {s.status === JAP_STATUSES.IN_IMPLEMENTATION ? "Mark Done" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => { setSelected(s); resetForms(); setRejectOpen(true); }}
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Detail Dialog ───────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{selected?.suggestionNo} — Detail</DialogTitle>
          </DialogHeader>
          {selected && <SuggDetail s={selected} />}
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve Dialog ──────────────────────────────────────────────── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {selected?.status === JAP_STATUSES.IN_IMPLEMENTATION
                ? "Mark Implementation Done"
                : selected?.status === JAP_STATUSES.IN_EVALUATION
                  ? "Classify & Evaluate"
                  : "Approve & Advance"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selected?.suggestionNo} · {selected?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Phase 2 — Feasibility: confirm */}
            {selected?.status === JAP_STATUSES.PENDING_FEASIBILITY && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-800">
                <p className="font-medium mb-1">Feasibility Review / व्यवहार्यता समीक्षा</p>
                <p>Confirm that this suggestion is technically feasible and should proceed to opinion phase.</p>
              </div>
            )}

            {/* Phase 3 — Opinion: optional comment */}
            {selected?.status === JAP_STATUSES.IN_OPINION && (
              <div>
                <Label className="text-xs">Opinion / Comments (optional)</Label>
                <Textarea
                  value={opinionComment}
                  onChange={e => setOpinionComment(e.target.value)}
                  placeholder="Add your opinion or validation notes…"
                  rows={3}
                  className="text-sm mt-1"
                />
              </div>
            )}

            {/* Phase 4 — Implementation: confirm done */}
            {selected?.status === JAP_STATUSES.IN_IMPLEMENTATION && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                <p className="font-medium mb-1">Mark as Implemented / कार्यान्वित</p>
                <p>Confirm that the suggested improvement has been physically implemented on the shop floor.</p>
              </div>
            )}

            {/* Phase 5 — Evaluation */}
            {selected?.status === JAP_STATUSES.IN_EVALUATION && (
              <>
                <div>
                  <Label className="text-xs">Classification Type / वर्गीकरण प्रकार</Label>
                  <Select
                    value={evaluationType}
                    onValueChange={v => setEvaluationType(v as typeof evaluationType)}
                  >
                    <SelectTrigger className="text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non-quantifiable">Non-Quantifiable / गैर-मापनीय</SelectItem>
                      <SelectItem value="quantifiable">Quantifiable / मापनीय</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 rounded-md p-2.5 text-xs text-blue-700 border border-blue-200">
                  Selecting a type will open the detailed evaluation form where you can fill in all required fields.
                </div>
              </>
            )}

            {/* Phase 6 — Award disbursement */}
            {selected?.status === JAP_STATUSES.IN_AWARD && (
              <div>
                <Label className="text-xs">Award Amount to Disburse (₹)</Label>
                <Input
                  type="number"
                  value={awardAmount}
                  onChange={e => setAwardAmount(e.target.value)}
                  placeholder={String(selected?.formData?.recommendedAward ?? selected?.awardAmount ?? "")}
                  className="text-sm mt-1"
                />
                {(selected?.formData?.recommendedAward || selected?.awardAmount) && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Recommended: ₹{(Number(selected?.formData?.recommendedAward) || selected?.awardAmount || 0).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Next phase indicator */}
            {selected && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  This will advance the suggestion to{" "}
                  <span className="font-semibold text-foreground">
                    {STATUS_TO_PHASE[NEXT_STATUS[selected.status] ?? JAP_STATUSES.CLOSED_AWARDED] ?? "Closed"}
                  </span>
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4" />
              {selected?.status === JAP_STATUSES.IN_IMPLEMENTATION
                ? "Mark Done"
                : selected?.status === JAP_STATUSES.IN_EVALUATION
                  ? "Classify & Open Form"
                  : "Approve & Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ───────────────────────────────────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-red-600">
              Reject Suggestion / सुझाव अस्वीकार
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selected?.suggestionNo} · {selected?.subject}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">
              Rejection Reason <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ अस्वीकार कारण</span>
            </Label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Provide a clear reason for rejection…"
              rows={4}
              className="text-sm mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              The suggestor will be notified and can request a reopen if the issue is resolved.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={handleReject}
              className="gap-1"
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalInbox;
