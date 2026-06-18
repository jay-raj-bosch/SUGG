// JaP — Workflow Inbox
// Role-aware inbox for all 6 workflow phases.
// Superior → Phase 2 (Feasibility Review)
// Planner  → Phase 3 (Opinion) + Phase 5 (Evaluation)
// Implementer → Phase 4 (Implementation)
// CTG      → Phase 5 quantifiable items
// BPS      → All active phases
// Coordinator → Read-only view of all open items
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { usePlant } from "@/contexts/PlantContext";
import type { Suggestion } from "@/lib/mockData";
import {
  JAP_STATUSES, JAP_STATUS_COLORS, STATUS_TO_PHASE, PHASE_SLA,
  getInboxStatuses, canActOnSuggestion, buildJapApprovalUpdate, buildJapRejectionUpdate,
  type JapRole,
} from "@/lib/jap/workflowPipeline";
import {
  CheckCircle2, XCircle, ChevronRight, Search, Inbox,
  Clock, User, FileText, Building2, Calendar, IndianRupee,
  AlertTriangle, Eye, Send, RotateCcw, Forward,
} from "lucide-react";
import { toast } from "sonner";
import { teamMemberOptions } from "@/lib/jap/suggestionConstants";
import SuggestionCombobox from "@/components/SuggestionCombobox";

// ─── Role display helpers ────────────────────────────────────────────────────

const ROLE_DISPLAY: Record<JapRole, { label: string; desc: string }> = {
  employee:    { label: "Employee",              desc: "Your submitted suggestions" },
  superior:    { label: "Superior",              desc: "Phase 2 — Feasibility Review inbox" },
  planner:     { label: "Planner",               desc: "Phase 3 — Opinion & Phase 5 — Evaluation inbox" },
  implementer: { label: "Implementer",            desc: "Phase 4 — Implementation inbox" },
  ctg:         { label: "CTG",                   desc: "Phase 5 — Quantifiable savings inbox" },
  bps:         { label: "BPS Admin",             desc: "Full workflow — all active phases" },
  coordinator: { label: "Suggestion Coordinator", desc: "Read-only view of all open suggestions" },
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
      {s.formData?.teamMembers?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Co-Suggestors</p>
          <p className="text-xs">{(s.formData.teamMembers as string[]).join(", ")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const WorkflowInbox = () => {
  const { user } = useAuth();
  const { suggestions, updateSuggestion } = useSuggestions();
  const { addNotification } = useNotifications();
  const { plantPrefix } = usePlant();
  const navigate = useNavigate();

  const japRole = user?.japRole as JapRole | undefined;
  const empNo = user?.employeeNo ?? "";
  const empName = user?.name ?? "";

  // Inbox statuses for this role
  const inboxStatuses = useMemo(
    () => (japRole ? getInboxStatuses(japRole) : []),
    [japRole],
  );

  const canAct = useCallback(
    (status: string) => japRole ? canActOnSuggestion(japRole, status) : false,
    [japRole],
  );

  // All JJAP PLT-02 suggestions in this role's inbox
  const inboxItems = useMemo(() =>
    suggestions.filter(
      s => s.plantCode === "PLT-02" && inboxStatuses.includes(s.status)
    ),
    [suggestions, inboxStatuses],
  );

  // CTG: only quantifiable items in evaluation
  const visibleItems = useMemo(() => {
    if (japRole === "ctg") {
      return inboxItems.filter(
        s => s.status === JAP_STATUSES.IN_EVALUATION &&
          s.formData?.evaluationType === "quantifiable"
      );
    }
    return inboxItems;
  }, [inboxItems, japRole]);

  // Tab state (active phase)
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (inboxStatuses.length > 0 && !activeTab) {
      setActiveTab(inboxStatuses[0]);
    }
  }, [inboxStatuses, activeTab]);

  // Search
  const [search, setSearch] = useState("");

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

  // Route-to-reviewer state (Opinion phase)
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeReviewerEmpNo, setRouteReviewerEmpNo] = useState("");
  const [routeReviewerDept, setRouteReviewerDept] = useState("");
  const [routeComment, setRouteComment] = useState("");

  // Build employee dropdown options for routing (exclude self)
  const routeEmployeeOptions = useMemo(() =>
    teamMemberOptions
      .filter(m => m.value !== empNo)
      .map(m => ({
        value: m.value,
        label: m.label,
        sublabel: m.department,
      })),
    [empNo],
  );

  // Auto-fill department when reviewer is selected
  const handleRouteReviewerChange = (empNoVal: string) => {
    setRouteReviewerEmpNo(empNoVal);
    const match = teamMemberOptions.find(m => m.value === empNoVal);
    setRouteReviewerDept(match?.department ?? "");
  };

  const routeReviewerName = useMemo(() => {
    const match = teamMemberOptions.find(m => m.value === routeReviewerEmpNo);
    return match?.label.split(" – ")[0] ?? routeReviewerEmpNo;
  }, [routeReviewerEmpNo]);

  const handleRoute = () => {
    if (!selected || !routeReviewerEmpNo.trim()) return;
    updateSuggestion(selected.id, {
      formData: {
        ...(selected.formData ?? {}),
        routedToReviewer: routeReviewerName,
        routedToReviewerEmpNo: routeReviewerEmpNo,
        routedToReviewerDept: routeReviewerDept,
        routeComment: routeComment.trim(),
        routedOn: new Date().toISOString().split("T")[0],
        routedBy: empName,
      },
    });
    addNotification(
      `${selected.suggestionNo} routed to ${routeReviewerName} (${routeReviewerDept}) for additional opinion`,
      "info",
    );
    toast.success(`Routed to ${routeReviewerName} for opinion`);
    setRouteOpen(false);
    setSelected(null);
    setRouteReviewerEmpNo("");
    setRouteReviewerDept("");
    setRouteComment("");
  };

  const filteredByTab = useMemo(() => {
    const base = visibleItems.filter(s => s.status === activeTab);
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(s =>
      s.suggestionNo.toLowerCase().includes(q) ||
      (s.subject ?? "").toLowerCase().includes(q) ||
      (s.employeeName ?? "").toLowerCase().includes(q) ||
      (s.department ?? "").toLowerCase().includes(q)
    );
  }, [visibleItems, activeTab, search]);

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
      updateSuggestion(selected.id, { awardAmount: Number(awardAmount) });
    }

    const nextPhase = update.status ? (STATUS_TO_PHASE[update.status] || update.status) : "next phase";
    toast.success(`${selected.suggestionNo} advanced to ${nextPhase}`);
    addNotification(
      `${selected.suggestionNo} (${selected.employeeName}) moved to ${nextPhase} by ${empName}`,
      "success",
    );
    // Notify suggestor about the transition
    addNotification(
      `Your suggestion ${selected.suggestionNo} has advanced to ${nextPhase}`,
      "info",
    );

    setApproveOpen(false);
    setSelected(null);
    setOpinionComment("");
    setAwardAmount("");
    setSavingsAmount("");
    setRecommendedScore("");
  };

  const handleReject = () => {
    if (!selected || !rejectReason.trim() || !empNo) return;
    const update = buildJapRejectionUpdate(empNo, empName, rejectReason.trim());
    updateSuggestion(selected.id, update);
    toast.success(`${selected.suggestionNo} rejected`);
    addNotification(
      `${selected.suggestionNo} was rejected by ${empName}: "${rejectReason.trim()}"`,
      "error",
    );
    // Notify suggestor about rejection
    addNotification(
      `Your suggestion ${selected.suggestionNo} was rejected. Reason: ${rejectReason.trim()}. You may reopen after addressing concerns.`,
      "warning",
    );
    setRejectOpen(false);
    setSelected(null);
    setRejectReason("");
  };

  if (!japRole || japRole === "employee") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No inbox available for your role.</p>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_DISPLAY[japRole];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          Workflow Inbox
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {roleInfo.label} · {roleInfo.desc}
        </p>
        <p className="text-xs text-muted-foreground">
          कार्यप्रवाह इनबॉक्स — {user?.name} ({user?.department})
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {inboxStatuses.map(status => {
          const count = visibleItems.filter(s => s.status === status).length;
          const sla = PHASE_SLA[status];
          const colorCls = JAP_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
          return (
            <Card
              key={status}
              className={`cursor-pointer border-2 transition-all ${activeTab === status ? "border-primary" : "border-transparent"}`}
              onClick={() => setActiveTab(status)}
            >
              <CardContent className="p-3">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${colorCls}`}>
                  {STATUS_TO_PHASE[status]}
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">
                  {sla ? `SLA: ${sla}d` : "No SLA"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by suggestion no, subject, employee…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Tabs by phase */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto">
          {inboxStatuses.map(status => {
            const count = visibleItems.filter(s => s.status === status).length;
            return (
              <TabsTrigger key={status} value={status} className="text-xs gap-1">
                {STATUS_TO_PHASE[status]}
                {count > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-[10px]">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {inboxStatuses.map(status => (
          <TabsContent key={status} value={status} className="mt-3">
            {filteredByTab.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No pending items in this phase
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredByTab.map(s => {
                  const sla = PHASE_SLA[s.status];
                  const overdue = sla > 0 && (s.daysPending ?? 0) > sla;
                  return (
                    <Card key={s.id} className={`transition-all hover:shadow-md ${overdue ? "border-red-200" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-xs font-semibold text-primary">
                                {s.suggestionNo}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${JAP_STATUS_COLORS[s.status]}`}
                              >
                                {STATUS_TO_PHASE[s.status]}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
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
                            </div>
                            {/* Phase audit trail */}
                            {s.formData?.feasibilityApprovedBy && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                ✓ Feasibility: {s.formData.feasibilityApprovedByName as string} ({s.formData.feasibilityApprovedOn as string})
                              </p>
                            )}
                            {s.formData?.opinionApprovedBy && (
                              <p className="text-[10px] text-muted-foreground">
                                ✓ Opinion: {s.formData.opinionApprovedByName as string} ({s.formData.opinionApprovedOn as string})
                              </p>
                            )}
                            {s.formData?.implementedBy && (
                              <p className="text-[10px] text-muted-foreground">
                                ✓ Implemented by: {s.formData.implementedByName as string}
                              </p>
                            )}
                            {s.formData?.routedToReviewer && (
                              <p className="text-[10px] text-blue-600">
                                → Routed to: {s.formData.routedToReviewer as string}{s.formData.routedToReviewerDept ? ` (${s.formData.routedToReviewerDept})` : ""} by {s.formData.routedBy as string}
                              </p>
                            )}
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
                                  onClick={() => { setSelected(s); setApproveOpen(true); }}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  {s.status === JAP_STATUSES.IN_IMPLEMENTATION ? "Mark Done" : "Approve"}
                                </Button>
                                {s.status === JAP_STATUSES.IN_OPINION && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                                    onClick={() => { setSelected(s); setRouteOpen(true); }}
                                  >
                                    <Forward className="h-3 w-3" /> Route
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => { setSelected(s); setRejectOpen(true); }}
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
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Detail Dialog ───────────────────────────────────────────────────── */}
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

      {/* ── Approve Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {selected?.status === JAP_STATUSES.IN_IMPLEMENTATION
                ? "Mark Implementation Done"
                : "Approve & Advance"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selected?.suggestionNo} · {selected?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Opinion phase — optional comment */}
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

            {/* Evaluation phase — classify and redirect to eval form */}
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

            {/* Award phase */}
            {selected?.status === JAP_STATUSES.IN_AWARD && (
              <div>
                <Label className="text-xs">Award Amount to Disburse (₹)</Label>
                <Input
                  type="number"
                  value={awardAmount}
                  onChange={e => setAwardAmount(e.target.value)}
                  placeholder={String(selected?.awardAmount ?? "")}
                  className="text-sm mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Recommended: ₹{selected?.awardAmount ?? "—"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {selected?.status === JAP_STATUSES.IN_IMPLEMENTATION
                ? "Mark Done"
                : selected?.status === JAP_STATUSES.IN_EVALUATION
                  ? "Classify & Open Form"
                  : "Approve & Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-red-600">Reject Suggestion</DialogTitle>
            <DialogDescription className="text-xs">
              {selected?.suggestionNo} · {selected?.subject}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Rejection Reason *</Label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Provide a clear reason for rejection…"
              rows={4}
              className="text-sm mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              The suggestor will be notified and can reopen if the issue is addressed.
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
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Route to Reviewer Dialog (Opinion Phase) ────────────────────────── */}
      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Route for Additional Opinion</DialogTitle>
            <DialogDescription className="text-xs">
              {selected?.suggestionNo} — Route to another person for expert review
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Route To (Employee) *</Label>
              <div className="mt-1">
                <SuggestionCombobox
                  options={routeEmployeeOptions}
                  value={routeReviewerEmpNo}
                  onChange={handleRouteReviewerChange}
                  placeholder="Search employee by name or ID…"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Department <span className="text-[10px] text-muted-foreground">(auto-filled)</span></Label>
              <Input
                value={routeReviewerDept}
                readOnly
                className="text-sm mt-1 bg-muted/50 text-muted-foreground cursor-default"
                placeholder="Select an employee above"
              />
            </div>
            <div>
              <Label className="text-xs">Routing Comment</Label>
              <Textarea
                value={routeComment}
                onChange={e => setRouteComment(e.target.value)}
                placeholder="Why is this being routed for additional opinion?"
                rows={2}
                className="text-sm mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setRouteOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!routeReviewerEmpNo.trim()} onClick={handleRoute} className="gap-1">
              <Forward className="h-4 w-4" /> Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowInbox;
