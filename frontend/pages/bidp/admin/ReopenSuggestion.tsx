// ReopenSuggestion — fetches rejected suggestions from backend API
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusColors, suggestionTypes } from "@/lib/mockData";
import type { Suggestion } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlant } from "@/contexts/PlantContext";
import * as apiService from "@/lib/apiService";
import { toast } from "sonner";
import { RotateCcw, AlertCircle, CheckCircle2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { useNotifications } from "@/contexts/NotificationContext";

// Types that can be reopened — dynamically from suggestionTypes (Daily CIP excluded)
const REOPENABLE_TYPES = suggestionTypes.filter(t => t !== "Daily CIP");
// Types that need FLM assignment (all except Shop Floor CIP and Daily CIP)
const FLM_TYPES = suggestionTypes.filter(t => t !== "Daily CIP" && t !== "Shop Floor CIP");
// Types that need Moderator assignment
const MODERATOR_TYPES = ["Shop Floor CIP"];

const REOPEN_LOG_KEY = "bidp_reopen_log";

interface ReopenRecord {
  id: string;
  suggestionNo: string;
  subject: string;
  employeeName: string;
  type: string;
  assignedTo: string;
  remark: string;
  date: string;
  auditId: string;
}

const ReopenSuggestion = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { plant, plantPrefix } = usePlant();
  const { addNotification } = useNotifications();
  const { suggestions, updateSuggestion } = useSuggestions();
  const { user } = useAuth();
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [selectedFlm, setSelectedFlm] = useState("");
  const [selectedModerator, setSelectedModerator] = useState("");
  const [remark, setRemark] = useState("");
  const [reopened, setReopened] = useState(false);
  const [searchLog, setSearchLog] = useState("");
  const [authorities, setAuthorities] = useState<apiService.AuthorityAssignment[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Persist reopen log to sessionStorage
  const [reopenLog, setReopenLog] = useState<ReopenRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem(REOPEN_LOG_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* */ }
    return [];
  });

  useEffect(() => {
    try { sessionStorage.setItem(REOPEN_LOG_KEY, JSON.stringify(reopenLog)); } catch { /* */ }
  }, [reopenLog]);

  // Load authority assignments from backend for FLM/Moderator dropdowns
  useEffect(() => {
    apiService.fetchAuthority(plant as "bidp" | "jap").then(setAuthorities).catch(() => {
      setAuthorities([
        { id: 110, plant_code: "PLT-01", employee_no: "30698710", name: "Suresh M",     department: "BIDP1/TEF", role: "FLM",       type: "Internal", email: "suresh@company.com",       ntid: "ssuresh" },
        { id: 111, plant_code: "PLT-01", employee_no: "30698711", name: "Ganesh R",     department: "BIDP2/QAL", role: "FLM",       type: "Internal", email: "ganesh@company.com",       ntid: "rganesh" },
        { id: 112, plant_code: "PLT-01", employee_no: "30698712", name: "Priya S",      department: "BIDP1/HRD", role: "FLM",       type: "Internal", email: "priya@company.com",        ntid: "spriya"  },
        { id: 113, plant_code: "PLT-01", employee_no: "30698702", name: "Anita Sharma", department: "BIDP1/MNT", role: "Manager",   type: "Internal", email: "anita.sharma@company.com", ntid: "asharma" },
        { id: 114, plant_code: "PLT-01", employee_no: "30698720", name: "Vijay Sharma", department: "BIDP1/ADM", role: "BPS Admin", type: "Internal", email: "vijay.sharma@company.com", ntid: "vsharma" },
        { id: 115, plant_code: "PLT-01", employee_no: "30698704", name: "Priya Devi",   department: "BIDP1/SAF", role: "BPS DH",    type: "Internal", email: "priya.devi@company.com",   ntid: "pdevi"   },
      ]);
    });
  }, [plant]);

  // Only show rejected suggestions of reopenable types (excludes Daily CIP)
  const rejectedSuggestions = useMemo(
    () => suggestions.filter(
      s => s.status === "Rejected" && REOPENABLE_TYPES.includes(s.type)
    ),
    [suggestions],
  );

  const rejectedOptions = useMemo(() =>
    rejectedSuggestions.map(s => ({
      value: s.suggestionNo,
      label: `${s.suggestionNo} — ${s.subject}`,
      sublabel: `${s.employeeName} • ${s.type} • Rejected`,
    })), [rejectedSuggestions]);

  const suggestion = suggestions.find(s => s.suggestionNo === selectedSuggestion);

  // If the selected suggestion is no longer "Rejected" (was just reopened), clear it
  useEffect(() => {
    if (selectedSuggestion && suggestion && suggestion.status !== "Rejected") {
      setSelectedSuggestion("");
      setReopened(false);
    }
  }, [selectedSuggestion, suggestion]);

  const needsFLM = suggestion && FLM_TYPES.includes(suggestion.type);
  const needsModerator = suggestion && MODERATOR_TYPES.includes(suggestion.type);

  // Dynamic target status based on suggestion type
  const targetStatus = needsModerator ? "Under Evaluation" : "Pending FLM";

  const handleReopen = async () => {
    if (!selectedSuggestion) { toast.error("Please select a suggestion"); return; }
    if (!suggestion || suggestion.status !== "Rejected") {
      toast.error("Selected suggestion is not in Rejected status");
      return;
    }
    if (!remark.trim()) { toast.error("Remark is mandatory"); return; }
    if (needsFLM && !selectedFlm) { toast.error("Please select an FLM"); return; }
    if (needsModerator && !selectedModerator) { toast.error("Please select a Moderator"); return; }

    const auditId = `ROP-${Date.now().toString().slice(-6)}`;
    const assignedTo = needsFLM
      ? (() => {
          const auth = authorities.find(a => a.employee_no === selectedFlm);
          return auth ? `${auth.name} – FLM` : selectedFlm;
        })()
      : needsModerator
        ? (() => {
            const auth = authorities.find(a => a.employee_no === selectedModerator);
            return auth ? `${auth.name} – Moderator` : selectedModerator;
          })()
        : "";

    const today = new Date().toISOString().slice(0, 10);

    // Build audit trail entry
    const auditEntry = {
      id: auditId,
      action: "Reopened",
      performedBy: user?.employeeNo || "Admin",
      performedByName: user?.name || "Admin",
      performedByDept: user?.department || "",
      role: "Admin",
      date: today,
      fromStatus: "Rejected",
      toStatus: targetStatus,
      comments: remark.trim(),
    };

    // Update suggestion via context (updates local state + backend)
    try {
      await updateSuggestion(suggestion.id, {
        status: targetStatus,
        assignedFlm: needsFLM ? selectedFlm : needsModerator ? selectedModerator : suggestion.assignedFlm,
        pendingWith: assignedTo,
        reopenRemark: remark.trim(),
        reopenedOn: today,
        reopenedBy: user?.name || "Admin",
        // Clear previous rejection metadata
        rejectionReason: undefined,
        rejectedBy: undefined,
        rejectedByName: undefined,
        rejectedOn: undefined,
        // Append audit trail
        auditTrail: [...(suggestion.auditTrail || []), auditEntry],
      } as Partial<Suggestion>);

      const record: ReopenRecord = {
        id: String(Date.now()),
        suggestionNo: selectedSuggestion,
        subject: suggestion.subject || "",
        employeeName: suggestion.employeeName || "",
        type: suggestion.type || "",
        assignedTo,
        remark: remark.trim(),
        date: today,
        auditId,
      };
      setReopenLog(prev => [record, ...prev]);
      setReopened(true);
      toast.success(`Suggestion ${selectedSuggestion} reopened → ${targetStatus}`, {
        description: `Assigned to ${assignedTo}`,
      });
      addNotification(`${selectedSuggestion} reopened — assigned to ${assignedTo} for review`, "warning");
    } catch (err) {
      toast.error("Failed to reopen suggestion. Please try again.");
    }
  };

  const handleReset = () => {
    setSelectedSuggestion("");
    setSelectedFlm("");
    setSelectedModerator("");
    setRemark("");
    setReopened(false);
  };

  const filteredLog = reopenLog.filter(r =>
    r.suggestionNo.toLowerCase().includes(searchLog.toLowerCase()) ||
    r.employeeName.toLowerCase().includes(searchLog.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredLog.length / rowsPerPage));

  return (
    <div className="max-w-3xl space-y-5">
      <h2 className="text-xl font-bold text-foreground">Reopen Rejected Suggestion <span className="text-sm font-normal text-muted-foreground">/ {t("Reopen Rejected Suggestion")}</span></h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Suggestion No <span className="text-destructive">*</span> <span className="text-[9px] opacity-70">/ {t("Suggestion No")}</span></Label>
            <SuggestionCombobox
              options={rejectedOptions}
              value={selectedSuggestion}
              onChange={v => { setSelectedSuggestion(v); setReopened(false); setSelectedFlm(""); setSelectedModerator(""); }}
              placeholder={rejectedSuggestions.length > 0 ? "Type suggestion no or keyword..." : "No rejected suggestions available"}
            />
            <p className="text-[10px] text-muted-foreground">Note: Daily CIP suggestions cannot be reopened</p>
          </div>

          {suggestion && suggestion.status === "Rejected" && (
            <>
              <div className="bg-muted/40 border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{suggestion.subject}</p>
                    <p className="text-xs text-muted-foreground">{suggestion.category}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[suggestion.status]}`}>{suggestion.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p><span className="text-muted-foreground">Employee:</span> {suggestion.employeeName} ({suggestion.employeeNo})</p>
                  <p><span className="text-muted-foreground">Date:</span> {suggestion.date}</p>
                  <p><span className="text-muted-foreground">Range:</span> {suggestion.range}</p>
                  <p><span className="text-muted-foreground">Dept:</span> {suggestion.department || "N/A"}</p>
                </div>
                {suggestion.rejectionReason && (
                  <div className="mt-2 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs">
                    <p className="text-[10px] font-semibold text-destructive mb-0.5">Rejection Reason:</p>
                    <p className="text-muted-foreground">{suggestion.rejectionReason}</p>
                    {suggestion.rejectedByName && (
                      <p className="text-[10px] mt-1 text-muted-foreground/70">
                        Rejected by {suggestion.rejectedByName} on {suggestion.rejectedOn}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Suggestion Type — auto-filled, read-only */}
              <div className="space-y-1.5">
                <Label className="text-xs">Suggestion Type <span className="text-[9px] opacity-70">/ {t("Type")}</span></Label>
                <Input value={suggestion.type} readOnly disabled className="bg-muted/50 font-medium" />
              </div>

              {/* Target status — dynamic */}
              <div className="space-y-1.5">
                <Label className="text-xs">Will be reopened as</Label>
                <Input value={targetStatus} readOnly disabled className="bg-primary/5 font-medium text-primary border-primary/30" />
              </div>

              {/* Approver (FLM) Selection — for Simple Suggestion, My Idea Card, Cash The Flash */}
              {needsFLM && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Approver <span className="text-destructive">*</span> <span className="text-[9px] opacity-70">/ {t("Select Approver")}</span></Label>
                  <SuggestionCombobox
                    options={authorities
                      .filter(a => a.role === "FLM" || a.role === "Evaluator")
                      .map(a => ({ value: a.employee_no, label: `${a.name} (${a.employee_no}) · ${a.department || ""}` }))}
                    value={selectedFlm}
                    onChange={setSelectedFlm}
                    placeholder="Search by name or emp no..."
                  />
                </div>
              )}

              {/* Moderator Selection — for Shop Floor CIP */}
              {needsModerator && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Moderator <span className="text-destructive">*</span> <span className="text-[9px] opacity-70">/ {t("Name of Moderator")}</span></Label>
                  <Select value={selectedModerator} onValueChange={setSelectedModerator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Moderator to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {authorities
                        .filter(a => a.role === "Moderator")
                        .map(a => <SelectItem key={a.employee_no} value={a.employee_no}>{a.name} ({a.employee_no}) · {a.department}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Remark <span className="text-destructive">*</span> <span className="text-[9px] opacity-70">/ {t("Other Info")}</span></Label>
            <Textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Enter reason for reopening (mandatory)" rows={3} />
          </div>

          <div className="bg-muted/50 border rounded-md p-2.5 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Admin only</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Rejected → {targetStatus || "Pending FLM / Moderator"}</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Audit entry created</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Daily CIP not eligible for reopen</span>
          </div>

          {reopened && (
            <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-primary">Suggestion Reopened Successfully</p>
                <p className="text-muted-foreground">{selectedSuggestion} status changed: Rejected → {targetStatus}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="gap-1.5"
              onClick={handleReopen}
              disabled={reopened || !selectedSuggestion || !suggestion || suggestion.status !== "Rejected"}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reopen / {t("Reopen Rejected Suggestion")}
            </Button>
            <Button variant="outline" onClick={handleReset}>Reset / {t("Reset")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Reopen History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground">Reopen History <span className="text-xs font-normal text-muted-foreground">({filteredLog.length} record{filteredLog.length !== 1 ? "s" : ""})</span></h3>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search..." value={searchLog} onChange={e => { setSearchLog(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>
        <Card className="card-shadow">
          <CardContent className="pt-3">
            <div className="overflow-auto max-h-[420px] rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b text-left bg-muted/90">
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Suggestion</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Type</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Employee</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Assigned To</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Remark</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Audit ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-muted-foreground text-xs">No records</td></tr>
                  ) : (
                    filteredLog.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-2">
                          <p className="font-mono text-xs">{r.suggestionNo}</p>
                          <p className="text-[10px] text-muted-foreground">{r.subject.slice(0, 30)}</p>
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{r.type}</td>
                        <td className="py-2 px-2 text-xs">{r.employeeName}</td>
                        <td className="py-2 px-2 text-xs">{r.assignedTo}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground max-w-[140px] truncate">{r.remark}</td>
                        <td className="py-2 px-2 text-xs whitespace-nowrap">{r.date}</td>
                        <td className="py-2 px-2 font-mono text-[10px] text-muted-foreground">{r.auditId}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            {filteredLog.length > 0 && (
              <div className="flex items-center justify-between pt-3 border-t mt-2 gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page:</span>
                  <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReopenSuggestion;
