// JaP — View Suggestions (General Enquiry)
// Full search + workflow stage management: Opinion → Implementation → Evaluation → Award
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { usePlant } from "@/contexts/PlantContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as apiService from "@/lib/apiService";
import type { Suggestion } from "@/lib/mockData";
import { Search, Download, ChevronLeft, ChevronRight, AlertCircle, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV, downloadTablePDF } from "@/lib/pdfUtils";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import SuggestionTimelineDialog from "@/components/jap/SuggestionTimelineDialog";
import { mockEmployees } from "@/lib/mockData";
import {
  JAP_STATUSES, JAP_STATUS_COLORS, STATUS_TO_PHASE,
  NEXT_STATUS as JAP_NEXT_STATUS,
  buildJapHoldUpdate, buildJapResumeUpdate,
} from "@/lib/jap/workflowPipeline";

// Stage filter options for the dropdown
const JAP_STAGE_FILTERS = [
  { value: JAP_STATUSES.PENDING_FEASIBILITY, label: "Feasibility Review", hindi: "व्यवहार्यता समीक्षा" },
  { value: JAP_STATUSES.IN_OPINION,          label: "Opinion Phase",      hindi: "राय चरण" },
  { value: JAP_STATUSES.IN_IMPLEMENTATION,   label: "Implementation",     hindi: "क्रियान्वयन में" },
  { value: JAP_STATUSES.IN_EVALUATION,       label: "Evaluation",         hindi: "मूल्यांकन में" },
  { value: JAP_STATUSES.IN_AWARD,            label: "Award Phase",        hindi: "पुरस्कार चरण" },
  { value: JAP_STATUSES.CLOSED_AWARDED,      label: "Closed / Awarded",   hindi: "बंद / पुरस्कृत" },
  { value: JAP_STATUSES.REJECTED,            label: "Rejected",           hindi: "अस्वीकृत" },
  { value: JAP_STATUSES.ON_HOLD,              label: "On Hold",            hindi: "होल्ड पर" },
];

const JaPViewSuggestions = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const { suggestions: contextSuggestions, updateSuggestion } = useSuggestions();
  const { plantPrefix } = usePlant();
  const navigate = useNavigate();
  const isBps = user?.japRole === "bps";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [suggestionNo, setSuggestionNo] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [empNo, setEmpNo] = useState("");
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [allEmployees, setAllEmployees] = useState<apiService.Employee[]>(() =>
    mockEmployees.filter(e => e.plantCode === "PLT-02").map(e => ({
      employee_no: e.employeeNo, name: e.name, department: e.department,
      plant_code: e.plantCode, role: "employee", ntid: e.ntid, email: e.email,
    }))
  );
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"advance" | "reject" | "classify" | "hold" | "resume">("advance");
  const [selectedSugg, setSelectedSugg] = useState<Suggestion | null>(null);
  const [classifyAs, setClassifyAs] = useState("Quantifiable");
  const [remarks, setRemarks] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSugg, setDetailSugg] = useState<Suggestion | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Load from context (instant) then try backend upgrade

  useEffect(() => {
    const ctx = contextSuggestions.filter(s => s.plantCode === "PLT-02");
    setAllSuggestions(ctx);
    setResults(ctx);
    apiService.fetchSuggestions("jap", { limit: 2000 }).then(r => {
      if (r.data?.length) {
        const japOnly = r.data.filter(s => s.plantCode === "PLT-02");
        if (japOnly.length) { setAllSuggestions(japOnly); setResults(japOnly); }
      }
    }).catch(() => {});
    apiService.fetchEmployees("jap").then(list => {
      const jap = list.filter(e => e.plant_code === "PLT-02");
      if (jap.length) setAllEmployees(jap);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestionOptions = useMemo(() =>
    allSuggestions.map(s => ({
      value: s.suggestionNo,
      label: `${s.suggestionNo} — ${s.subject.slice(0, 40)}`,
      sublabel: `${s.employeeName} • ${s.department || ""}`,
    })), [allSuggestions]);

  const employeeOptions = useMemo(() =>
    allEmployees.map(e => ({
      value: e.employee_no,
      label: `${e.employee_no} — ${e.name}`,
      sublabel: e.department,
    })), [allEmployees]);

  const totalPages = Math.max(1, Math.ceil(results.length / rowsPerPage));
  const pageRows   = results.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSearch = () => {
    let filtered = [...allSuggestions];
    if (fromDate) filtered = filtered.filter(s => s.date >= fromDate);
    if (toDate)   filtered = filtered.filter(s => s.date <= toDate);
    if (suggestionNo.trim()) filtered = filtered.filter(s => s.suggestionNo.toLowerCase().includes(suggestionNo.toLowerCase()));
    if (empNo.trim())        filtered = filtered.filter(s => s.employeeNo?.toLowerCase().includes(empNo.toLowerCase()));
    if (stageFilter !== "all")    filtered = filtered.filter(s => s.status === stageFilter);
    if (categoryFilter !== "all") filtered = filtered.filter(s => s.category === categoryFilter);
    setResults(filtered);
    setSearched(true);
    setCurrentPage(1);
    toast.success(`Found ${filtered.length} record(s)`);
  };

  const handleReset = () => {
    setFromDate(""); setToDate(""); setSuggestionNo(""); setEmpNo("");
    setStageFilter("all"); setCategoryFilter("all");
    setResults(allSuggestions); setSearched(false); setCurrentPage(1);
  };

  const openAction = (s: Suggestion, type: "advance" | "reject" | "classify" | "hold" | "resume") => {
    setSelectedSugg(s); setActionType(type); setRemarks(""); setClassifyAs("Quantifiable");
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedSugg) return;
    if (actionType === "reject" && !remarks.trim()) {
      toast.error("Rejection reason is mandatory / अस्वीकृति का कारण अनिवार्य है");
      return;
    }
    if (actionType === "hold" && !remarks.trim()) {
      toast.error("Hold reason is mandatory / होल्ड का कारण अनिवार्य है");
      return;
    }

    let patchedFields: Partial<Suggestion> & Record<string, unknown>;

    if (actionType === "hold") {
      patchedFields = buildJapHoldUpdate(
        selectedSugg.status,
        user?.employeeNo || "",
        user?.name || "",
        remarks.trim(),
      );
    } else if (actionType === "resume") {
      const statusBeforeHold = (selectedSugg.formData as any)?.statusBeforeHold || JAP_STATUSES.PENDING_FEASIBILITY;
      patchedFields = buildJapResumeUpdate(
        user?.employeeNo || "",
        user?.name || "",
        statusBeforeHold,
      );
    } else if (actionType === "classify") {
      // Tag evaluationType on formData, keep status as "In Evaluation"
      const evalType = classifyAs === "Quantifiable" ? "quantifiable" : "non-quantifiable";
      patchedFields = {
        status: selectedSugg.status, // keep current status
        formData: { evaluationType: evalType, classifiedBy: user?.employeeNo || "", classifiedByName: user?.name || "", classifiedOn: new Date().toISOString().split("T")[0] },
      };
    } else {
      const nextStatus = actionType === "reject" ? "Rejected" : JAP_NEXT_STATUS[selectedSugg.status] || selectedSugg.status;
      const rejectionMeta = actionType === "reject" ? {
        rejectionReason: remarks.trim(),
        rejectedBy:     user?.employeeNo || "",
        rejectedByName: user?.name || "",
        rejectedOn:     new Date().toISOString().slice(0, 10),
      } : undefined;
      patchedFields = { status: nextStatus, ...rejectionMeta };
    }

    try {
      await apiService.patchSuggestionStatus("jap", selectedSugg.id, patchedFields.status as string);
    } catch { /* local fallback */ }

    // Merge formData so we preserve statusBeforeHold, etc.
    const mergedFormData = { ...(selectedSugg.formData as any), ...(patchedFields.formData as any) };
    const merged = { ...patchedFields, formData: mergedFormData };

    const updated = allSuggestions.map(s => s.id === selectedSugg.id ? { ...s, ...merged } : s);
    setAllSuggestions(updated);
    setResults(results.map(s => s.id === selectedSugg.id ? { ...s, ...merged } : s));
    updateSuggestion(selectedSugg.id, merged as Partial<Suggestion>);

    const msg = actionType === "hold"
      ? `${selectedSugg.suggestionNo} placed on hold`
      : actionType === "resume"
        ? `${selectedSugg.suggestionNo} resumed from hold`
        : actionType === "reject"
          ? `${selectedSugg.suggestionNo} rejected`
          : actionType === "classify"
            ? `${selectedSugg.suggestionNo} classified as ${classifyAs}`
            : `${selectedSugg.suggestionNo} advanced to ${patchedFields.status}`;
    toast.success(msg);
    addNotification(msg, "info");
    setActionDialogOpen(false);

    // After classify, navigate to the correct eval form with the suggestion pre-selected
    if (actionType === "classify" && selectedSugg) {
      const route = classifyAs === "Quantifiable"
        ? `${plantPrefix}/admin/eval-quantifiable?sugg=${encodeURIComponent(selectedSugg.suggestionNo)}`
        : `${plantPrefix}/admin/eval-non-quantifiable?sugg=${encodeURIComponent(selectedSugg.suggestionNo)}`;
      navigate(route);
    }
  };

  const getExportData = () => ({
    headers: ["Serial No", "Sugg No", "Employee No", "Employee Name", "Department", "Subject", "Category", "Status", "Stage", "Date"],
    rows: results.map((s, i) => [
      String(i + 1), s.suggestionNo, s.employeeNo || "", s.employeeName || "",
      s.department || "", s.subject, s.category || "", s.status, STATUS_TO_PHASE[s.status] || s.status, s.date,
    ]),
  });

  const handleExportCSV = () => {
    const { headers, rows } = getExportData();
    downloadCSV(headers, rows, `JaP_Suggestions_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("CSV exported!");
  };

  const handleExportPDF = () => {
    const { headers, rows } = getExportData();
    downloadTablePDF("JaP — View Suggestions", headers, rows, `JaP_Suggestions_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exported!");
  };

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="max-w-6xl flex flex-col h-full gap-4">
      <h2 className="text-xl font-bold text-foreground">View Suggestions <span className="text-sm font-normal text-muted-foreground">/ {t("General Enquiry")}</span></h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date <span className="text-[10px] text-muted-foreground font-normal">/ {t("From Date")}</span></Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date <span className="text-[10px] text-muted-foreground font-normal">/ {t("To Date")}</span></Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Suggestion No <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion No")}</span></Label>
              <SuggestionCombobox options={suggestionOptions} value={suggestionNo} onChange={setSuggestionNo} placeholder="Type suggestion no..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee No <span className="text-[10px] text-muted-foreground font-normal">/ {t("Employee No")}</span></Label>
              <SuggestionCombobox options={employeeOptions} value={empNo} onChange={setEmpNo} placeholder="Type emp no..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stage / चरण</Label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger><SelectValue placeholder="All Stages" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {JAP_STAGE_FILTERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label} / {s.hindi}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category / श्रेणी</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {["Quality","Safety","Cost Reduction","Productivity","Energy Saving","5S / Housekeeping","Environment","Innovation"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="gap-1.5" onClick={handleSearch}><Search className="h-3.5 w-3.5" /> Search / {t("Search")}</Button>
            <Button variant="outline" onClick={handleReset}>Reset / {t("Reset")}</Button>
            {searched && (
              <>
                <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={handleExportCSV}><Download className="h-3.5 w-3.5" /> CSV</Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPDF}><Download className="h-3.5 w-3.5" /> PDF</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow flex-1">
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">#</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Suggestion No" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Employee No" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Name" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Department" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Subject / विषय</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Category / श्रेणी</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Stage / चरण</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Date" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={10} className="py-6 text-center text-muted-foreground text-xs">
                    {searched ? "No suggestions found" : "Use search above to load suggestions"}
                  </td></tr>
                ) : pageRows.map((s, i) => {
                  const phase = STATUS_TO_PHASE[s.status] || s.status;
                  const colorCls = JAP_STATUS_COLORS[s.status] || "";
                  const canAdvance = !!JAP_NEXT_STATUS[s.status];
                  const inEval = s.status === "In Evaluation";
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 text-xs text-muted-foreground">{(currentPage - 1) * rowsPerPage + i + 1}</td>
                      <td className="py-2 px-2 cursor-pointer text-primary underline underline-offset-2 font-mono text-xs"
                          onClick={() => { setDetailSugg(s); setDetailOpen(true); }}>{s.suggestionNo}</td>
                      <td className="py-2 px-2 font-mono text-xs">{s.employeeNo || "—"}</td>
                      <td className="py-2 px-2 text-xs">{s.employeeName || "—"}</td>
                      <td className="py-2 px-2 text-xs">{s.department || "—"}</td>
                      <td className="py-2 px-2 text-xs max-w-[160px] truncate" title={s.subject}>{s.subject}</td>
                      <td className="py-2 px-2 text-xs">
                        <Badge variant="outline" className="text-[10px]">{s.category || "—"}</Badge>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorCls}`}>{phase}</span>
                      </td>
                      <td className="py-2 px-2 text-xs whitespace-nowrap">{s.date}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          {inEval && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" onClick={() => openAction(s, "classify")}>Classify</Button>
                          )}
                          {canAdvance && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 text-green-600 border-green-400" onClick={() => openAction(s, "advance")}>Advance</Button>
                          )}
                          {s.status !== "Rejected" && s.status !== "Closed / Awarded" && s.status !== "On Hold" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 text-destructive border-destructive/40" onClick={() => openAction(s, "reject")}>Reject</Button>
                          )}
                          {isBps && s.status !== "Rejected" && s.status !== "Closed / Awarded" && s.status !== "Draft" && s.status !== "On Hold" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 text-yellow-600 border-yellow-400" onClick={() => openAction(s, "hold")}>
                              <PauseCircle className="h-3 w-3 mr-0.5" />Hold
                            </Button>
                          )}
                          {isBps && s.status === "On Hold" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 text-blue-600 border-blue-400" onClick={() => openAction(s, "resume")}>
                              <PlayCircle className="h-3 w-3 mr-0.5" />Resume
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>{results.length} result(s)</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span>Page {currentPage} / {totalPages}</span>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {actionType === "advance"  && `Advance: ${selectedSugg?.suggestionNo}`}
              {actionType === "reject"   && `Reject: ${selectedSugg?.suggestionNo}`}
              {actionType === "classify" && `Classify: ${selectedSugg?.suggestionNo}`}
              {actionType === "hold"     && `Hold: ${selectedSugg?.suggestionNo}`}
              {actionType === "resume"   && `Resume: ${selectedSugg?.suggestionNo}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {selectedSugg && <p className="text-xs text-muted-foreground">{selectedSugg.subject}</p>}
            {actionType === "classify" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Classification Type / वर्गीकरण प्रकार</Label>
                <Select value={classifyAs} onValueChange={setClassifyAs}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quantifiable">Quantifiable / मापनीय</SelectItem>
                    <SelectItem value="Non-Quantifiable">Non-Quantifiable / गैर-मापनीय</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionType === "advance" && selectedSugg && (
              <div className="bg-muted/50 rounded-md p-2.5 text-xs flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                {selectedSugg.status} → {JAP_NEXT_STATUS[selectedSugg.status] || "Next Stage"}
              </div>
            )}
            {actionType === "hold" && selectedSugg && (
              <div className="bg-yellow-50 rounded-md p-2.5 text-xs flex items-center gap-1.5 border border-yellow-200">
                <PauseCircle className="h-3.5 w-3.5 text-yellow-600" />
                This will pause the SLA timer. The suggestion will remain on hold until manually resumed.
              </div>
            )}
            {actionType === "resume" && selectedSugg && (
              <div className="bg-blue-50 rounded-md p-2.5 text-xs flex items-center gap-1.5 border border-blue-200">
                <PlayCircle className="h-3.5 w-3.5 text-blue-600" />
                Will resume to: {(selectedSugg.formData as any)?.statusBeforeHold || "Previous Status"}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">
                {actionType === "reject" ? (
                  <>Reason for Rejection <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] text-muted-foreground">/ अस्वीकृति का कारण (अनिवार्य)</span>
                  </>
                ) : actionType === "hold" ? (
                  <>Reason for Hold <span className="text-destructive">*</span>{" "}
                    <span className="text-[10px] text-muted-foreground">/ होल्ड का कारण (अनिवार्य)</span>
                  </>
                ) : (
                  <>Remarks / टिप्पणी <span className="text-[10px] text-muted-foreground">(optional)</span></>
                )}
              </Label>
              <Textarea rows={3} placeholder={actionType === "reject" ? "Enter reason for rejection (mandatory)..." : actionType === "hold" ? "Enter reason for holding (mandatory)..." : "Add remarks..."} value={remarks} onChange={e => setRemarks(e.target.value)} className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmAction} variant={actionType === "reject" ? "destructive" : actionType === "hold" ? "secondary" : "default"}>
              Confirm / {t("Submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-base">{detailSugg?.suggestionNo}</DialogTitle></DialogHeader>
          {detailSugg && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["Employee", `${detailSugg.employeeName} (${detailSugg.employeeNo})`],
                  ["Department", detailSugg.department || "—"],
                  ["Date", detailSugg.date],
                  ["Status", detailSugg.status],
                  ["Stage", STATUS_TO_PHASE[detailSugg.status] || detailSugg.status],
                  ["Category", detailSugg.category || "—"],
                ] as [string,string][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-muted-foreground">Subject</p>
                <p className="font-medium">{detailSugg.subject}</p>
              </div>
              {(detailSugg.presentMethod || detailSugg.benefits) && (
                <div>
                  <p className="text-muted-foreground">Details</p>
                  <p>{detailSugg.presentMethod || detailSugg.benefits}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => { setDetailOpen(false); setTimelineOpen(true); }}>
              Timeline
            </Button>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline Dialog */}
      <SuggestionTimelineDialog
        suggestion={detailSugg}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
      />
    </div>
  );
};

export default JaPViewSuggestions;
