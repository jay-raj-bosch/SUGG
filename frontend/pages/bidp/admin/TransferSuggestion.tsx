// TransferSuggestion — fetches suggestions and employees from backend API
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { statusColors } from "@/lib/mockData";
import type { Suggestion } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlant } from "@/contexts/PlantContext";
import { toast } from "sonner";
import { ArrowRightLeft, AlertCircle, CheckCircle2, Search, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { calculateDaysPending } from "@/lib/bidp/approvalPipeline";
import { useNotifications } from "@/contexts/NotificationContext";

interface TransferRecord {
  id: string;
  suggestionNo: string;
  subject: string;
  fromName: string;
  fromEmpNo: string;
  toName: string;
  toEmpNo: string;
  reason: string;
  date: string;
  auditId: string;
}

const TransferSuggestion = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { plantPrefix } = usePlant();
  const { addNotification } = useNotifications();
  const { suggestions, updateSuggestion } = useSuggestions();
  const { user } = useAuth();
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [newEmployeeNo, setNewEmployeeNo] = useState("");
  const [reason, setReason] = useState("");
  const [transferred, setTransferred] = useState(false);
  const [transferLog, setTransferLog] = useState<TransferRecord[]>([]);
  const [searchLog, setSearchLog] = useState("");
  const [allEmployees, setAllEmployees] = useState<apiService.Employee[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Load employees from backend on mount
  useEffect(() => {
    apiService.fetchEmployees().then(setAllEmployees).catch(() => {});
  }, []);

  const transferableSuggestions = suggestions.filter(s =>
    ["Submitted", "Under Evaluation", "Pending FLM", "Pending Manager", "Pending BPS Admin", "Pending BPS DH"].includes(s.status)
  );

  const suggestionOptions = useMemo(() =>
    transferableSuggestions.map(s => ({
      value: s.suggestionNo,
      label: `${s.suggestionNo} — ${s.subject}`,
      sublabel: `${s.employeeName} • ${s.status}`,
    })), [transferableSuggestions]);

  const suggestion = suggestions.find(s => s.suggestionNo === selectedSuggestion);
  const oldEmployee = suggestion ? allEmployees.find(e => e.employee_no === suggestion.employeeNo) : null;
  const newEmployee = allEmployees.find(e => e.employee_no === newEmployeeNo);

  const employeeOptions = useMemo(() =>
    allEmployees
      .filter(e => e.employee_no !== suggestion?.employeeNo)
      .map(e => ({
        value: e.employee_no,
        label: `${e.employee_no} — ${e.name}`,
        sublabel: e.department,
      })), [allEmployees, suggestion?.employeeNo]);

  const handleTransfer = async () => {
    if (!selectedSuggestion) { toast.error("Please select a suggestion"); return; }
    if (!newEmployeeNo) { toast.error("Please select new employee"); return; }
    if (!reason.trim()) { toast.error("Please enter a reason for transfer"); return; }
    if (suggestion?.employeeNo === newEmployeeNo) { toast.error("Cannot transfer to the same employee"); return; }

    const today = new Date().toISOString().slice(0, 10);
    const auditId = `TRF-${Date.now().toString().slice(-6)}`;

    // Build transfer history entry
    const transferEntry = {
      fromEmpNo: suggestion?.employeeNo || "",
      fromName: suggestion?.employeeName || oldEmployee?.name || "",
      toEmpNo: newEmployeeNo,
      toName: newEmployee?.name || "",
      reason: reason.trim(),
      date: today,
      transferredBy: user?.name || "Admin",
    };

    // Update suggestion via context (updates local state + backend)
    if (suggestion) {
      updateSuggestion(suggestion.id, {
        employeeNo: newEmployeeNo,
        employeeName: newEmployee?.name || "",
        department: newEmployee?.department || suggestion.department,
        originalEmployeeNo: suggestion.originalEmployeeNo || suggestion.employeeNo,
        originalEmployeeName: suggestion.originalEmployeeName || suggestion.employeeName,
        transferHistory: [...(suggestion.transferHistory || []), transferEntry],
      });
    }

    const record: TransferRecord = {
      id: String(Date.now()),
      suggestionNo: selectedSuggestion,
      subject: suggestion?.subject || "",
      fromName: oldEmployee?.name || suggestion?.employeeName || "",
      fromEmpNo: oldEmployee?.employee_no || suggestion?.employeeNo || "",
      toName: newEmployee?.name || "",
      toEmpNo: newEmployee?.employee_no || "",
      reason: reason.trim(),
      date: today,
      auditId,
    };
    setTransferLog(prev => [record, ...prev]);
    setTransferred(true);
    toast.success(`Suggestion ${selectedSuggestion} transferred to ${newEmployee?.name}`, {
      description: "Redirecting to Pending Approvals…",
    });
    addNotification(`${selectedSuggestion} transferred from ${oldEmployee?.name || suggestion?.employeeName} to ${newEmployee?.name}`, "success");
    // Req #28: after a successful transfer, take the admin straight to the
    // pending approvals list so they don’t have to navigate manually.
    setTimeout(() => navigate(`${plantPrefix}/employee/my-approvals`), 600);
  };

  const handleReset = () => {
    setSelectedSuggestion("");
    setNewEmployeeNo("");
    setReason("");
    setTransferred(false);
  };

  const filteredLog = transferLog.filter(r =>
    r.suggestionNo.toLowerCase().includes(searchLog.toLowerCase()) ||
    r.fromName.toLowerCase().includes(searchLog.toLowerCase()) ||
    r.toName.toLowerCase().includes(searchLog.toLowerCase())
  );

  return (
    <div className="max-w-4xl space-y-5">
      <h2 className="text-xl font-bold text-foreground">Transfer Suggestion <span className="text-sm font-normal text-muted-foreground">/ {t("Transfer Suggestion")}</span></h2>

      {/* Step 1: Select Suggestion */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
            <span className="text-sm font-semibold">Select Suggestion <span className="text-[10px] font-normal text-muted-foreground">/ {t("Suggestion No")}</span></span>
          </div>
          <SuggestionCombobox
            options={suggestionOptions}
            value={selectedSuggestion}
            onChange={v => { setSelectedSuggestion(v); setTransferred(false); }}
            placeholder="Type suggestion no or keyword..."
          />
          {suggestion && (
            <div className="bg-muted/40 border rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{suggestion.subject}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.type} • {suggestion.category}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusColors[suggestion.status]}`}>{suggestion.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <p><span className="text-muted-foreground">Employee:</span> {suggestion.employeeName}</p>
                <p><span className="text-muted-foreground">Emp No:</span> {suggestion.employeeNo}</p>
                <p><span className="text-muted-foreground">Department:</span> {suggestion.department || "N/A"}</p>
              </div>
              {suggestion.pendingWith && (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Pending with: {suggestion.pendingWith} ({calculateDaysPending(suggestion)} days)</p>
              )}
              {suggestion.transferHistory && suggestion.transferHistory.length > 0 && (
                <div className="border-t pt-1.5 mt-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Previous Transfers</p>
                  {suggestion.transferHistory.map((tr, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">
                      {tr.date}: {tr.fromName} → {tr.toName} <span className="italic">({tr.reason})</span>
                    </p>
                  ))}
                </div>
              )}
              {suggestion.originalEmployeeName && suggestion.originalEmployeeName !== suggestion.employeeName && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                  Original suggestor: {suggestion.originalEmployeeName} ({suggestion.originalEmployeeNo})
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Transfer To */}
      {suggestion && (
        <Card className="card-shadow">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
              <span className="text-sm font-semibold">Transfer To <span className="text-[10px] font-normal text-muted-foreground">/ {t("Employee No")}</span></span>
            </div>

            {/* New Owner Search — prominent full-width */}
            <div className="space-y-1.5 border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
              <Label className="text-xs font-semibold">Search New Owner <span className="text-destructive">*</span></Label>
              <SuggestionCombobox
                options={employeeOptions}
                value={newEmployeeNo}
                onChange={v => { setNewEmployeeNo(v); setTransferred(false); }}
                placeholder="Type employee number or name to search..."
              />
            </div>

            {/* From → To comparison */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive inline-block" /> Current Owner
                </p>
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-sm">{oldEmployee?.name}</p>
                  <p className="text-muted-foreground">{oldEmployee?.employee_no} • {oldEmployee?.department}</p>
                  <p className="text-muted-foreground">{oldEmployee?.email}</p>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
              </div>

              <div className="border rounded-lg p-3 bg-primary/5">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> New Owner
                </p>
                {newEmployee ? (
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-sm">{newEmployee.name}</p>
                    <p className="text-muted-foreground">{newEmployee.employee_no} • {newEmployee.department}</p>
                    <p className="text-muted-foreground">{newEmployee.email}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Select an employee above</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason for Transfer <span className="text-destructive">*</span></Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Employee transferred to new department" rows={2} />
            </div>

            <div className="bg-muted/50 border rounded-md p-2.5 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Only pending suggestions</span>
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Level-based validation</span>
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Full audit log</span>
            </div>

            {transferred && (
              <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-medium text-primary">Transfer Completed</p>
                  <p className="text-muted-foreground">
                    {selectedSuggestion}: {oldEmployee?.name} → {newEmployee?.name}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="gap-1.5" onClick={handleTransfer} disabled={transferred || !newEmployeeNo}>
                <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer / {t("Transfer Suggestion")}
              </Button>
              <Button variant="outline" onClick={handleReset}>Reset / {t("Reset")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer History Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground">Transfer History <span className="text-xs font-normal text-muted-foreground">({filteredLog.length} record{filteredLog.length !== 1 ? "s" : ""})</span></h3>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search history..." value={searchLog} onChange={e => { setSearchLog(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>
        <Card className="card-shadow">
          <CardContent className="pt-3">
            <div className="overflow-auto max-h-[420px] rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b text-left bg-muted/90">
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Suggestion</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">From</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">To</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Reason</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="pb-2 pt-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Audit ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-muted-foreground text-xs">No transfer records</td></tr>
                  ) : (
                    filteredLog.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((r, i) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-2">
                          <p className="font-mono text-xs">{r.suggestionNo}</p>
                          <p className="text-[10px] text-muted-foreground">{r.subject.slice(0, 30)}</p>
                        </td>
                        <td className="py-2 px-2 text-xs">
                          <p>{r.fromName}</p>
                          <p className="text-muted-foreground">{r.fromEmpNo}</p>
                        </td>
                        <td className="py-2 px-2 text-xs">
                          <p>{r.toName}</p>
                          <p className="text-muted-foreground">{r.toEmpNo}</p>
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground max-w-[150px] truncate">{r.reason}</td>
                        <td className="py-2 px-2 text-xs whitespace-nowrap">{r.date}</td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Completed</Badge>
                        </td>
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
                  <span className="text-muted-foreground">Page {currentPage} of {Math.max(1, Math.ceil(filteredLog.length / rowsPerPage))}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLog.length / rowsPerPage), p + 1))} disabled={currentPage >= Math.ceil(filteredLog.length / rowsPerPage)}>
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

export default TransferSuggestion;
