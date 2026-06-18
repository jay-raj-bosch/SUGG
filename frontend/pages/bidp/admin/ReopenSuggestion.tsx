// ReopenSuggestion — fetches rejected suggestions from backend API
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusColors } from "@/lib/mockData";
import type { Suggestion } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlant } from "@/contexts/PlantContext";
import { toast } from "sonner";
import { RotateCcw, AlertCircle, CheckCircle2, Search } from "lucide-react";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { useNotifications } from "@/contexts/NotificationContext";
import { flmOptions, moderatorOptions } from "@/lib/bidp/suggestionConstants";

// Types that can be reopened (Daily CIP cannot be reopened)
const REOPENABLE_TYPES = ["Simple Suggestion Scheme", "My Idea Card", "Cash The Flash", "Shop Floor CIP"];
// Types that need FLM assignment
const FLM_TYPES = ["Simple Suggestion Scheme", "My Idea Card", "Cash The Flash"];
// Types that need Moderator assignment
const MODERATOR_TYPES = ["Shop Floor CIP"];

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
  const { plantPrefix } = usePlant();
  const { addNotification } = useNotifications();
  const { suggestions, updateSuggestion } = useSuggestions();
  const { user } = useAuth();
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [selectedFlm, setSelectedFlm] = useState("");
  const [selectedModerator, setSelectedModerator] = useState("");
  const [remark, setRemark] = useState("");
  const [reopened, setReopened] = useState(false);
  const [reopenLog, setReopenLog] = useState<ReopenRecord[]>([
    { id: "1", suggestionNo: "SSS-2026-005", subject: "Noise Reduction in Unit 3", employeeName: "Anil Kumar", type: "Simple Suggestion Scheme", assignedTo: "Suresh M – FLM", remark: "Reconsidered after new evidence", date: "2026-02-20", auditId: "ROP-001122" },
  ]);
  const [searchLog, setSearchLog] = useState("");

  // Only show rejected suggestions of reopenable types (excludes Daily CIP)
  const rejectedSuggestions = suggestions.filter(
    s => s.status === "Rejected" && REOPENABLE_TYPES.includes(s.type)
  );

  const rejectedOptions = useMemo(() =>
    rejectedSuggestions.map(s => ({
      value: s.suggestionNo,
      label: `${s.suggestionNo} — ${s.subject}`,
      sublabel: `${s.employeeName} • ${s.type}`,
    })), [rejectedSuggestions]);

  const suggestion = suggestions.find(s => s.suggestionNo === selectedSuggestion);

  const needsFLM = suggestion && FLM_TYPES.includes(suggestion.type);
  const needsModerator = suggestion && MODERATOR_TYPES.includes(suggestion.type);

  const handleReopen = async () => {
    if (!selectedSuggestion) { toast.error("Please select a suggestion"); return; }
    if (!remark.trim()) { toast.error("Remark is mandatory"); return; }
    if (needsFLM && !selectedFlm) { toast.error("Please select an FLM"); return; }
    if (needsModerator && !selectedModerator) { toast.error("Please select a Moderator"); return; }

    const auditId = `ROP-${Date.now().toString().slice(-6)}`;
    const assignedTo = needsFLM
      ? (flmOptions.find(f => f.value === selectedFlm)?.label || selectedFlm)
      : needsModerator
        ? (moderatorOptions.find(m => m.value === selectedModerator)?.label || selectedModerator)
        : "";

    // Update suggestion via context (updates local state + backend)
    if (suggestion) {
      const today = new Date().toISOString().slice(0, 10);
      updateSuggestion(suggestion.id, {
        status: "Pending FLM",
        assignedFlm: needsFLM ? selectedFlm : needsModerator ? selectedModerator : suggestion.assignedFlm,
        pendingWith: assignedTo,
        pendingSince: today,
        reopenRemark: remark.trim(),
        reopenedOn: today,
        reopenedBy: user?.name || "Admin",
        // Clear previous rejection metadata
        rejectionReason: undefined,
        rejectedBy: undefined,
        rejectedByName: undefined,
        rejectedOn: undefined,
      });
    }

    const record: ReopenRecord = {
      id: String(Date.now()),
      suggestionNo: selectedSuggestion,
      subject: suggestion?.subject || "",
      employeeName: suggestion?.employeeName || "",
      type: suggestion?.type || "",
      assignedTo,
      remark: remark.trim(),
      date: new Date().toISOString().slice(0, 10),
      auditId,
    };
    setReopenLog(prev => [record, ...prev]);
    setReopened(true);
    toast.success(`Suggestion ${selectedSuggestion} reopened and assigned to ${assignedTo}`, {
      description: "Redirecting to Pending Approvals…",
    });
    addNotification(`${selectedSuggestion} reopened — assigned to ${assignedTo} for review`, "warning");
    // Req #28: after a successful reopen, navigate to the pending approvals list.
    setTimeout(() => navigate(`${plantPrefix}/employee/my-approvals`), 600);
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

  return (
    <div className="max-w-3xl space-y-5">
      <h2 className="text-xl font-bold text-foreground">Reopen Rejected Suggestion <span className="text-sm font-normal text-muted-foreground">/ {t("Reopen Rejected Suggestion")}</span></h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Suggestion No <span className="text-[9px] opacity-70">/ {t("Suggestion No")}</span></Label>
            <SuggestionCombobox
              options={rejectedOptions}
              value={selectedSuggestion}
              onChange={v => { setSelectedSuggestion(v); setReopened(false); setSelectedFlm(""); setSelectedModerator(""); }}
              placeholder="Type suggestion no or keyword..."
            />
            <p className="text-[10px] text-muted-foreground">Note: Daily CIP suggestions cannot be reopened</p>
          </div>

          {suggestion && (
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
              </div>

              {/* Suggestion Type — auto-filled, read-only */}
              <div className="space-y-1.5">
                <Label className="text-xs">Suggestion Type <span className="text-[9px] opacity-70">/ {t("Type")}</span></Label>
                <Input value={suggestion.type} readOnly disabled className="bg-muted/50 font-medium" />
              </div>

              {/* FLM Selection — for Simple Suggestion, My Idea Card, Cash The Flash */}
              {needsFLM && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Select FLM <span className="text-destructive">*</span> <span className="text-[9px] opacity-70">/ {t("Select FLM")}</span></Label>
                  <Select value={selectedFlm} onValueChange={setSelectedFlm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select FLM to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {flmOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                      {moderatorOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
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
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Rejected → Pending FLM / Moderator</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Audit entry created</span>
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Daily CIP not eligible for reopen</span>
          </div>

          {reopened && (
            <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-primary">Suggestion Reopened Successfully</p>
                <p className="text-muted-foreground">{selectedSuggestion} status changed: Rejected → Pending FLM</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button className="gap-1.5" onClick={handleReopen} disabled={reopened || !selectedSuggestion}>
              <RotateCcw className="h-3.5 w-3.5" /> Reopen / {t("Reopen Rejected Suggestion")}
            </Button>
            <Button variant="outline" onClick={handleReset}>Reset / {t("Reset")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Reopen History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Reopen History</h3>
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
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Employee</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Assigned To</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Remark</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Audit ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-muted-foreground text-xs">No records</td></tr>
                ) : (
                  filteredLog.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2">
                        <p className="font-mono text-xs">{r.suggestionNo}</p>
                        <p className="text-[10px] text-muted-foreground">{r.subject.slice(0, 30)}</p>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{r.type}</td>
                      <td className="py-2 px-2 text-xs">{r.employeeName}</td>
                      <td className="py-2 px-2 text-xs">{r.assignedTo}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground max-w-[140px] truncate">{r.remark}</td>
                      <td className="py-2 px-2 text-xs">{r.date}</td>
                      <td className="py-2 px-2 font-mono text-[10px] text-muted-foreground">{r.auditId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReopenSuggestion;
