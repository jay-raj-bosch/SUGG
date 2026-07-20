// JaP — Reopen Suggestion
// Displays full rejection details for a rejected suggestion and allows it to be reopened.
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import * as apiService from "@/lib/apiService";
import type { Employee } from "@/lib/apiService";
import type { Suggestion } from "@/lib/mockData";
import { toast } from "sonner";
import { RotateCcw, AlertCircle, CheckCircle2, Search, User, CalendarDays, Building2, XCircle, FileText, Eye, XOctagon, UserCheck, ArrowRightLeft, ChevronsUpDown } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandItem,
} from "@/components/ui/command";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { mockEmployees } from "@/lib/mockData";
import {
  addReopenRequest, getReopenRequests,
  getReopenRequestsAwaitingSignature, signReopenSlot,
  rejectReopenRequest, rerouteReopenSlot,
  type ReopenRequest, type ReopenSignSlot,
} from "@/lib/jap/reopenApprovalStore";
import { buildJapReopenUpdate, STATUS_TO_PHASE } from "@/lib/jap/workflowPipeline";

interface ReopenRecord {
  id: string;
  suggestionNo: string;
  subject: string;
  employeeName: string;
  remark: string;
  reopenedOn: string;
  auditId: string;
}

// Helper: format ISO date → DD/MM/YYYY, or return "—"
const fmt = (d?: string) => {
  if (!d) return "—";
  const p = d.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
};

const JaPReopenSuggestion = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [remark, setRemark] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>(() =>
    mockEmployees.filter(e => e.plantCode === "PLT-02").map(e => ({
      employee_no: e.employeeNo, name: e.name, department: e.department,
      plant_code: e.plantCode, role: "employee", ntid: e.ntid, email: e.email,
    }))
  );
  const [searchLog, setSearchLog] = useState("");
  const [reopenLog, setReopenLog] = useState<ReopenRecord[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Action dialog state for pending signature items
  type DialogMode = "view" | "reject" | "reroute";
  const [actionDialog, setActionDialog] = useState<{ open: boolean; request: ReopenRequest | null; mode: DialogMode }>({
    open: false, request: null, mode: "view",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [rerouteEmpNo, setRerouteEmpNo] = useState("");
  const [rerouteOpen, setRerouteOpen] = useState(false);

  const { suggestions: contextSuggestions, updateSuggestion } = useSuggestions();

  useEffect(() => {
    const ctx = contextSuggestions.filter(s => s.plantCode === "PLT-02");
    setAllSuggestions(ctx);
    apiService.fetchSuggestions("jap", { limit: 2000 })
      .then(r => {
        if (r.data?.length) {
          const japOnly = r.data.filter(s => s.plantCode === "PLT-02");
          if (japOnly.length) setAllSuggestions(japOnly);
        }
      })
      .catch(() => {});
    apiService.fetchEmployees("jap")
      .then(list => {
        const jap = list.filter(e => e.plant_code === "PLT-02");
        if (jap.length) setAllEmployees(jap);
      })
      .catch(() => {});
  }, []);

  const rejectedSuggestions = allSuggestions.filter(s => s.status === "Rejected");

  const rejectedOptions = useMemo(() =>
    rejectedSuggestions.map(s => ({
      value: s.suggestionNo,
      label: `${s.suggestionNo} — ${s.subject}`,
      sublabel: `${s.employeeName} • ${s.department || ""}`,
    })), [rejectedSuggestions]);

  const suggestion = allSuggestions.find(s => s.suggestionNo === selectedSuggestion);

  // Check whether a pending reopen request already exists for this suggestion
  const existingRequest = getReopenRequests().find(
    r => r.suggNo === selectedSuggestion && !r.fullyApproved,
  );

  const pendingMySignatures = useMemo(() => {
    if (!user?.employeeNo) return [];
    return getReopenRequestsAwaitingSignature(user.employeeNo);
  }, [user?.employeeNo, refreshTick]);

  // Load reopen history from persisted request store so records survive refresh/navigation.
  useEffect(() => {
    const history: ReopenRecord[] = getReopenRequests().map(r => ({
      id: r.id,
      suggestionNo: r.suggNo,
      subject: r.subject,
      employeeName: r.suggesterName,
      remark: r.reopenReason,
      reopenedOn: r.requestedAt,
      auditId: r.auditId,
    }));
    setReopenLog(history);
  }, [refreshTick]);

  const closeActionDialog = () => {
    setActionDialog({ open: false, request: null, mode: "view" });
    setRejectReason("");
    setRerouteEmpNo("");
    setRerouteOpen(false);
  };

  const handleSignReopenRequest = async (request: ReopenRequest) => {
    if (!user?.employeeNo) return;
    const signed = signReopenSlot(request.id, user.employeeNo);
    if (!signed) {
      toast.error("Unable to sign reopen request");
      return;
    }

    const { updated, allSigned } = signed;
    if (allSigned) {
      const target = allSuggestions.find(s => s.id === updated.suggestionId || s.suggestionNo === updated.suggNo);
      if (target) {
        const reopenReason = updated.reopenReason || "Reopen approved by signatories";
        const reopenUpdate = buildJapReopenUpdate(target, reopenReason, user.employeeNo, user.name ?? "");
        try {
          await updateSuggestion(target.id, reopenUpdate);
          setAllSuggestions(prev =>
            prev.map(s => s.id === target.id ? { ...s, ...reopenUpdate } : s),
          );
          const nextPhaseLabel = STATUS_TO_PHASE[reopenUpdate.status as string] ?? reopenUpdate.status;
          toast.success(`${updated.suggNo} fully approved and reopened → ${nextPhaseLabel}`);
          addNotification(`${updated.suggNo} reopen approved and moved to ${nextPhaseLabel}`, "success");
        } catch {
          toast.error(`Failed to reopen ${updated.suggNo} — please try again`);
        }
      } else {
        toast.error(`Could not find suggestion ${updated.suggNo} to reopen`);
      }
    } else {
      toast.success(`Signature recorded for ${updated.suggNo}`);
      addNotification(`Reopen signature added for ${updated.suggNo}`, "info");
    }
    closeActionDialog();
    setRefreshTick(t => t + 1);
  };

  const handleRejectReopenRequest = (request: ReopenRequest) => {
    if (!user?.employeeNo || !rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    rejectReopenRequest(request.id, user.employeeNo, user.name ?? "", rejectReason.trim());
    toast.success(`Reopen request for ${request.suggNo} rejected`);
    addNotification(`Reopen request ${request.suggNo} rejected by you`, "error");
    closeActionDialog();
    setRefreshTick(t => t + 1);
  };

  const handleRerouteReopenSlot = (request: ReopenRequest) => {
    if (!user?.employeeNo || !rerouteEmpNo.trim()) {
      toast.error("Please select a delegate authority");
      return;
    }
    const toEmp = allEmployees.find(e => e.employee_no === rerouteEmpNo);
    if (!toEmp) { toast.error("Employee not found"); return; }
    rerouteReopenSlot(request.id, user.employeeNo, rerouteEmpNo, toEmp.name);
    toast.success(`Approval delegated to ${toEmp.name} for ${request.suggNo}`);
    addNotification(`Reopen approval for ${request.suggNo} delegated to ${toEmp.name}`, "info");
    closeActionDialog();
    setRefreshTick(t => t + 1);
  };

  const handleSubmitReopenRequest = () => {
    if (!selectedSuggestion) { toast.error("Please select a suggestion"); return; }
    if (!remark.trim()) { toast.error("Remark is mandatory / टिप्पणी अनिवार्य है"); return; }
    if (existingRequest) {
      toast.error("A reopen request for this suggestion is already awaiting authority signatures");
      return;
    }

    const auditId = `JAP-ROP-${Date.now().toString().slice(-6)}`;
    const lookupName = (empNo: string) =>
      allEmployees.find(e => e.employee_no === empNo)?.name ?? "";

    const plannerEmpNo = suggestion?.formData?.procPlanSign?.empNo
      ?? suggestion?.formData?.processPlanner ?? "";
    const rangeHeadEmpNo = suggestion?.formData?.fcmHead?.empNo
      ?? suggestion?.formData?.rangeHead ?? "";

    const slots: ReopenSignSlot[] = [
      suggestion?.rejectedBy ? {
        role: "rejector",
        label: "Rejector / अस्वीकर्ता",
        empNo: suggestion.rejectedBy,
        empName: suggestion.rejectedByName || lookupName(suggestion.rejectedBy),
        signed: false,
        signedAt: null,
      } : null,
      plannerEmpNo ? {
        role: "planner",
        label: "Planner / योजनाकार",
        empNo: plannerEmpNo,
        empName: suggestion?.formData?.procPlanSign?.empName || lookupName(plannerEmpNo),
        signed: false,
        signedAt: null,
      } : null,
      rangeHeadEmpNo ? {
        role: "rangeHead",
        label: "Range Head / रेंज प्रमुख",
        empNo: rangeHeadEmpNo,
        empName: suggestion?.formData?.fcmHead?.empName || lookupName(rangeHeadEmpNo),
        signed: false,
        signedAt: null,
      } : null,
    ].filter((s): s is ReopenSignSlot => s !== null);

    if (slots.length === 0) {
      toast.error("No authority signatories found. Ensure rejection metadata and evaluator form data are available.");
      return;
    }

    const request: ReopenRequest = {
      id: auditId,
      auditId,
      suggNo: selectedSuggestion,
      suggestionId: suggestion?.id ?? "",
      subject: suggestion?.subject || "",
      suggesterName: suggestion?.employeeName || "",
      dept: suggestion?.department || "",
      requestedBy: user ? `${user.name} (${user.employeeNo})` : "Unknown",
      requestedAt: new Date().toISOString(),
      reopenReason: remark.trim(),
      slots,
      fullyApproved: false,
      approvedAt: null,
    };
    addReopenRequest(request);

    setRequestSubmitted(true);
    setRefreshTick(t => t + 1);
    toast.success(`Reopen request submitted — ${slots.length} signator${slots.length > 1 ? "ies" : "y"} notified`);
    addNotification(
      `Reopen request for ${selectedSuggestion} submitted — ${slots.length} authority signature${slots.length > 1 ? "s" : ""} required`,
      "info",
    );
  };

  const handleReset = () => {
    setSelectedSuggestion("");
    setRemark("");
    setRequestSubmitted(false);
  };

  const filteredLog = reopenLog.filter(r =>
    r.suggestionNo.toLowerCase().includes(searchLog.toLowerCase()) ||
    r.employeeName.toLowerCase().includes(searchLog.toLowerCase())
  );

  // ── Info row helper ───────────────────────────────────────────────────────
  const InfoRow = ({ icon: Icon, label, labelHi, value }: {
    icon: React.ElementType; label: string; labelHi: string; value: React.ReactNode;
  }) => (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">
          {label} <span className="opacity-60">/ {labelHi}</span>
        </p>
        <p className="text-sm font-medium text-foreground truncate">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <RotateCcw className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Reopen Suggestion <span className="text-sm font-normal text-muted-foreground">/ सुझाव पुनः खोलें</span>
          </h2>
          <p className="text-xs text-muted-foreground">Reopen a rejected suggestion and return it to the Opinion stage</p>
        </div>
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-5">

          {/* Suggestion selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Suggestion No <span className="text-[10px] text-muted-foreground font-normal">/ सुझाव संख्या</span>
              <Badge className="ml-2 text-[9px] bg-red-100 text-red-700 border-red-200">Rejected only</Badge>
            </Label>
            <SuggestionCombobox
              options={rejectedOptions}
              value={selectedSuggestion}
              onChange={v => { setSelectedSuggestion(v); setRequestSubmitted(false); setRemark(""); }}
              placeholder="Type suggestion no or employee name..."
            />
          </div>

          {/* Suggestion details — structured display */}
          {suggestion && (
            <>
              {/* Subject + type */}
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground leading-snug">{suggestion.subject}</p>
                  <Badge className="shrink-0 text-[10px] bg-red-100 text-red-700 border-red-200">Rejected</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{suggestion.category}</p>
              </div>

              {/* Employee info block */}
              <div className="border rounded-lg divide-y">
                <InfoRow
                  icon={User}
                  label="Employee Name"        labelHi="कर्मचारी का नाम"
                  value={`${suggestion.employeeName ?? "—"}${suggestion.employeeNo ? ` (${suggestion.employeeNo})` : ""}`}
                />
                <InfoRow
                  icon={Building2}
                  label="Department"           labelHi="विभाग"
                  value={suggestion.department || "N/A"}
                />
                <InfoRow
                  icon={CalendarDays}
                  label="Date of Application"  labelHi="आवेदन की तिथि"
                  value={fmt(suggestion.date)}
                />
                <InfoRow
                  icon={XCircle}
                  label="Rejected By"          labelHi="अस्वीकृत करने वाले"
                  value={
                    suggestion.rejectedByName
                      ? `${suggestion.rejectedByName}${suggestion.rejectedBy ? ` (${suggestion.rejectedBy})` : ""}`
                      : suggestion.rejectedBy || "—"
                  }
                />
                <InfoRow
                  icon={CalendarDays}
                  label="Rejected On"          labelHi="अस्वीकृति की तिथि"
                  value={fmt(suggestion.rejectedOn)}
                />
                <InfoRow
                  icon={CalendarDays}
                  label="Implemented On"       labelHi="क्रियान्वयन की तिथि"
                  value={fmt(suggestion.implementedOn ?? suggestion.awardDate)}
                />
              </div>

              {/* Reason for rejection — auto-filled */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Reason for Rejection <span className="text-[10px] text-muted-foreground font-normal">/ अस्वीकृति का कारण</span>
                </Label>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground">
                  {suggestion.rejectionReason
                    ? suggestion.rejectionReason
                    : <span className="text-muted-foreground italic text-xs">No reason was recorded at time of rejection</span>
                  }
                </div>
              </div>

              {/* ── Co-suggestors + Authority Signatories ─────────────────── */}
              {(() => {
                // Extract co-suggestor employee nos from current and legacy shapes
                const rawCoSuggestors =
                  (suggestion.formData as any)?.coSuggestors ??
                  (suggestion.formData as any)?.teamMembers ??
                  [];
                const members: string[] = (rawCoSuggestors as any[])
                  .map((m) => (typeof m === "string" ? m : (m?.empNo ?? "")))
                  .filter(Boolean);
                // Rows = at least 3 to match the 3 authority slots on the right
                const rowCount = Math.max(members.length, 3);
                const rows = Array.from({ length: rowCount }, (_, i) => members[i] ?? "");

                const lookupEmp = (empNo: string) =>
                  allEmployees.find(e => e.employee_no === empNo);

                // Authority signatories in right column (3 stacked cells)
                const authorities = [
                  {
                    role: "Rejector",
                    roleHi: "अस्वीकर्ता",
                    empNo:  suggestion.rejectedBy || "",
                    name:   suggestion.rejectedByName || "",
                  },
                  {
                    role: "Planner",
                    roleHi: "योजनाकार",
                    empNo: suggestion.formData?.procPlanSign?.empNo
                      ?? suggestion.formData?.processPlanner ?? "",
                    name:  suggestion.formData?.procPlanSign?.empName
                      ?? (lookupEmp(suggestion.formData?.processPlanner)?.name ?? ""),
                  },
                  {
                    role: "Range Head",
                    roleHi: "रेंज प्रमुख",
                    empNo: suggestion.formData?.fcmHead?.empNo
                      ?? suggestion.formData?.rangeHead ?? "",
                    name:  suggestion.formData?.fcmHead?.empName
                      ?? (lookupEmp(suggestion.formData?.rangeHead)?.name ?? ""),
                  },
                ];

                return (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-primary">
                      Co-suggestors &amp; Authority Signatories
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">/ सह-सुझावकर्ता एवं प्राधिकरण हस्ताक्षर</span>
                    </p>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-r border-b w-8">#</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-r border-b">Name / नाम</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-r border-b w-28">Emp No / कर्मचारी क्र.</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-r border-b w-32">Mob No / मोबाइल</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground border-r border-b w-28">Signature / हस्ताक्षर</th>
                            <th className="px-3 py-2 text-center font-semibold text-muted-foreground border-b">Authority Signatories / प्राधिकरण हस्ताक्षर</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((empNo, idx) => {
                            const emp = lookupEmp(empNo);
                            const auth = authorities[idx]; // align authority to same row
                            return (
                              <tr key={idx} className="border-t hover:bg-muted/20 transition-colors">
                                {/* Serial */}
                                <td className="px-3 py-2.5 text-muted-foreground border-r text-center">{idx + 1}</td>
                                {/* Name */}
                                <td className="px-3 py-2.5 border-r">
                                  {emp ? (
                                    <span className="font-medium">{emp.name}</span>
                                  ) : empNo ? (
                                    <span className="font-mono text-[10px] text-muted-foreground">{empNo}</span>
                                  ) : (
                                    <span className="text-muted-foreground/40 italic">—</span>
                                  )}
                                </td>
                                {/* Emp No */}
                                <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground border-r">
                                  {empNo || <span className="opacity-30">—</span>}
                                </td>
                                {/* Mobile */}
                                <td className="px-3 py-2.5 text-muted-foreground border-r">
                                  <span className="opacity-30 italic">—</span>
                                </td>
                                {/* Signature */}
                                <td className="px-3 py-2.5 border-r">
                                  <div className="h-6 border-b border-dashed border-muted-foreground/30 w-20" />
                                </td>
                                {/* Authority — one per row, matching authority index */}
                                <td className="px-3 py-2.5">
                                  {auth ? (
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-semibold text-primary">
                                        {auth.role}
                                        <span className="font-normal text-muted-foreground ml-1">/ {auth.roleHi}</span>
                                      </p>
                                      <p className="font-medium">{auth.name || <span className="opacity-40 italic">—</span>}</p>
                                      {auth.empNo && (
                                        <p className="font-mono text-[10px] text-muted-foreground">{auth.empNo}</p>
                                      )}
                                      <div className="h-6 border-b border-dashed border-muted-foreground/30 w-24 mt-1" />
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              <Separator />
            </>
          )}

          {/* Remark for reopening */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Remark / Reason for Reopening <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ पुनः खोलने का कारण (अनिवार्य)</span>
            </Label>
            <Textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Enter the reason for reopening this suggestion (mandatory)..."
              rows={3}
            />
          </div>

          {/* Info pills */}
          <div className="bg-muted/50 border rounded-md px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Admin only action</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Status: Rejected → Reopened / पुनः खोला गया</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Audit entry will be created</span>
          </div>

          {/* Pending-signatures banner */}
          {existingRequest && !requestSubmitted && (
            <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-amber-800">Reopen Request Pending / पुनः खोलने की प्रतीक्षा</p>
                <p className="text-amber-700">
                  A reopen request (#{existingRequest.auditId}) is already awaiting{" "}
                  {existingRequest.slots.filter(s => !s.signed).length} of{" "}
                  {existingRequest.slots.length} authority signature{existingRequest.slots.length > 1 ? "s" : ""}.
                </p>
              </div>
            </div>
          )}

          {/* Submitted banner */}
          {requestSubmitted && (
            <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-amber-800">Reopen Request Submitted — Awaiting Signatures / हस्ताक्षर प्रतीक्षित</p>
                <p className="text-amber-700">
                  {selectedSuggestion} — authority signatories have been notified and must accept before the suggestion is reopened.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              className="gap-1.5"
              onClick={handleSubmitReopenRequest}
              disabled={requestSubmitted || !!existingRequest || !selectedSuggestion}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Submit Reopen Request / पुनः खोलने का अनुरोध
            </Button>
            <Button variant="outline" onClick={handleReset}>Reset / {t("Reset")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending approvals for current signatory */}
      {user?.employeeNo && (
        <Card className="card-shadow">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Reopen Requests Awaiting My Signature / मेरे हस्ताक्षर लंबित
              </h3>
              <Badge variant="outline" className="text-xs">{pendingMySignatures.length}</Badge>
            </div>

            {pendingMySignatures.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending reopen approvals for your employee number.</p>
            ) : (
              <div className="space-y-2">
                {pendingMySignatures.map(req => {
                  const mySlot = req.slots.find(s => s.empNo === user.employeeNo && !s.signed);
                  const signed = req.slots.filter(s => s.signed).length;
                  return (
                    <div key={req.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-mono font-semibold text-primary">{req.suggNo}</p>
                          <Badge variant="outline" className="text-[10px]">{signed}/{req.slots.length} signed</Badge>
                        </div>
                        <p className="text-sm font-medium truncate mt-0.5">{req.subject}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Your role: <span className="font-medium">{mySlot?.label ?? "Authority"}</span> • Requested by {req.requestedBy}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">Reason: {req.reopenReason}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1"
                        onClick={() => setActionDialog({ open: true, request: req, mode: "view" })}
                      >
                        <Eye className="h-3.5 w-3.5" /> View & Act
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Action Dialog for signing / rejecting / rerouting ──────────────── */}
      <Dialog open={actionDialog.open} onOpenChange={open => !open && closeActionDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4 text-primary" />
              Reopen Approval — {actionDialog.request?.suggNo}
            </DialogTitle>
          </DialogHeader>

          {actionDialog.request && (() => {
            const req = actionDialog.request;
            const suggFull = allSuggestions.find(s => s.suggestionNo === req.suggNo || s.id === req.suggestionId);
            const mySlot = req.slots.find(s => s.empNo === user?.employeeNo && !s.signed);
            const rerouteOptions = allEmployees
              .filter(e => e.employee_no !== user?.employeeNo)
              .sort((a, b) => a.name.localeCompare(b.name));

            return (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4 py-1">

                  {/* Suggestion details */}
                  <div className="bg-muted/40 border rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggestion Details</p>
                    <p className="text-sm font-semibold">{req.subject}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Suggester</span>
                      <span className="font-medium">{req.suggesterName || "—"}</span>
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{req.dept || "—"}</span>
                      {suggFull && (
                        <>
                          <span className="text-muted-foreground">Category</span>
                          <span className="font-medium">{suggFull.category || "—"}</span>
                          <span className="text-muted-foreground">Submitted On</span>
                          <span className="font-medium">{fmt(suggFull.date)}</span>
                          <span className="text-muted-foreground">Rejected By</span>
                          <span className="font-medium">
                            {suggFull.rejectedByName || suggFull.rejectedBy || "—"}
                          </span>
                          <span className="text-muted-foreground">Rejected On</span>
                          <span className="font-medium">{fmt(suggFull.rejectedOn)}</span>
                        </>
                      )}
                    </div>
                    {suggFull?.rejectionReason && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                        <span className="font-semibold">Rejection reason: </span>{suggFull.rejectionReason}
                      </div>
                    )}
                    {suggFull?.subject && (
                      <div className="text-xs text-muted-foreground border-t pt-2 mt-1">
                        <span className="font-semibold text-foreground">Suggestion: </span>{suggFull.subject}
                      </div>
                    )}
                  </div>

                  {/* Reopen reason */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-blue-800 mb-1">Reason for Reopen Request</p>
                    <p className="text-blue-700">{req.reopenReason}</p>
                    <p className="text-blue-600 mt-1 opacity-70">Requested by {req.requestedBy} on {fmt(req.requestedAt?.slice(0, 10))}</p>
                  </div>

                  {/* Signatory status */}
                  <div className="border rounded-lg overflow-hidden">
                    <p className="px-3 py-2 text-[11px] font-semibold text-muted-foreground bg-muted/40 border-b">Signatory Status</p>
                    {req.slots.map((slot, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 border-b last:border-0">
                        <div>
                          <p className="text-xs font-medium">{slot.empName || slot.empNo}</p>
                          <p className="text-[10px] text-muted-foreground">{slot.label}</p>
                        </div>
                        {slot.signed ? (
                          <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Signed {fmt(slot.signedAt?.slice(0,10))}
                          </Badge>
                        ) : slot.empNo === user?.employeeNo ? (
                          <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Awaiting your signature</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Pending</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mode: reject */}
                  {actionDialog.mode === "reject" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-destructive">Rejection Reason <span className="text-destructive">*</span></Label>
                      <Textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Explain why you are rejecting this reopen request..."
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Mode: delegate */}
                  {actionDialog.mode === "reroute" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Delegate Authority</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Your signatory slot (<span className="font-medium">{mySlot?.label}</span>) will be reassigned to the selected authority.
                      </p>
                      <Popover open={rerouteOpen} onOpenChange={setRerouteOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={rerouteOpen}
                            className="w-full justify-between h-9 text-xs font-normal"
                          >
                            {rerouteEmpNo
                              ? (() => { const e = rerouteOptions.find(x => x.employee_no === rerouteEmpNo); return e ? `${e.name} (${e.employee_no})` : rerouteEmpNo; })()
                              : <span className="text-muted-foreground">Search by name or employee no...</span>
                            }
                            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[420px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search name or employee no..." className="h-9 text-xs" />
                            <CommandList className="max-h-52">
                              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">No employee found.</CommandEmpty>
                              {rerouteOptions.map(e => (
                                <CommandItem
                                  key={e.employee_no}
                                  value={`${e.name} ${e.employee_no}`}
                                  onSelect={() => { setRerouteEmpNo(e.employee_no); setRerouteOpen(false); }}
                                  className="text-xs"
                                >
                                  <span className="font-medium">{e.name}</span>
                                  <span className="text-muted-foreground ml-2">({e.employee_no})</span>
                                  {e.department && <span className="text-muted-foreground ml-1">— {e.department}</span>}
                                  {rerouteEmpNo === e.employee_no && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                                </CommandItem>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                </div>
              </ScrollArea>
            );
          })()}

          <DialogFooter className="flex-wrap gap-2 pt-2">
            {actionDialog.mode === "view" && (
              <>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setActionDialog(d => ({ ...d, mode: "reroute" }))}>
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Delegate Authority
                </Button>
                <Button variant="destructive" size="sm" className="gap-1" onClick={() => setActionDialog(d => ({ ...d, mode: "reject" }))}>
                  <XOctagon className="h-3.5 w-3.5" /> Reject
                </Button>
                <Button size="sm" className="gap-1" onClick={() => actionDialog.request && handleSignReopenRequest(actionDialog.request)}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Sign Approval
                </Button>
              </>
            )}
            {actionDialog.mode === "reject" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setActionDialog(d => ({ ...d, mode: "view" }))} className="gap-1">Back</Button>
                <Button variant="destructive" size="sm" className="gap-1"
                  onClick={() => actionDialog.request && handleRejectReopenRequest(actionDialog.request)}
                  disabled={!rejectReason.trim()}
                >
                  <XOctagon className="h-3.5 w-3.5" /> Confirm Rejection
                </Button>
              </>
            )}
            {actionDialog.mode === "reroute" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setActionDialog(d => ({ ...d, mode: "view" }))} className="gap-1">Back</Button>
                <Button size="sm" className="gap-1"
                  onClick={() => actionDialog.request && handleRerouteReopenSlot(actionDialog.request)}
                  disabled={!rerouteEmpNo}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Confirm Delegation
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={closeActionDialog}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Reopen History / पुनः खोलने का इतिहास</h3>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search..." value={searchLog} onChange={e => setSearchLog(e.target.value)} />
          </div>
        </div>
        <Card className="card-shadow">
          <CardContent className="pt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Suggestion</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Employee / कर्मचारी</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Remark / टिप्पणी</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Reopened On</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Audit ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">No records yet</td></tr>
                ) : filteredLog.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2">
                      <p className="font-mono text-xs">{r.suggestionNo}</p>
                      <p className="text-[10px] text-muted-foreground">{r.subject.slice(0, 30)}</p>
                    </td>
                    <td className="py-2 px-2 text-xs">{r.employeeName}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground max-w-[180px] truncate" title={r.remark}>{r.remark}</td>
                    <td className="py-2 px-2 text-xs">{fmt(r.reopenedOn)}</td>
                    <td className="py-2 px-2 font-mono text-[10px] text-muted-foreground">{r.auditId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JaPReopenSuggestion;
