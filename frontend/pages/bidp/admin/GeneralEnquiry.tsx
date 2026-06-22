// General Enquiry — fetches suggestions from backend API
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusColors, suggestionTypes } from "@/lib/mockData";
import type { Suggestion } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { Search, Download, FileText, SendHorizonal, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV, downloadTablePDF, downloadXLSX } from "@/lib/pdfUtils";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import GeneralEnquiryDetailDialog from "@/components/bidp/GeneralEnquiryDetailDialog";
import { calculateDaysPending } from "@/lib/bidp/approvalPipeline";
import { teamMemberOptions, flmOptions } from "@/lib/bidp/suggestionConstants";
import { useCategories } from "@/contexts/CategoryContext";
import { useDeptMappings } from "@/contexts/DeptMappingContext";

// Statuses where all pending columns collapse to "Closed"
const CLOSED_STATUSES = ["Approved & Closed", "Implemented", "Rejected", "Closed"];

// Lookup pending authority details by first name extracted from "FLM - Suresh"
const pendingAuthorityLookup: Record<string, { empNo: string; dept: string }> = {
  "Suresh":  { empNo: "30698710",   dept: "BIDP1/TEF" },
  "Ganesh":  { empNo: "30698711",   dept: "BIDP2/QAL" },
  "Priya":   { empNo: "30698712",   dept: "BIDP1/HRD" },
  "Anita":   { empNo: "30698702", dept: "BIDP1/MNT" },
  "Karthik": { empNo: "30698665", dept: "BIDP1/TEF" },
  "Vijay":   { empNo: "30698703", dept: "BIDP3/PRD" },
  "Kavitha": { empNo: "30698706", dept: "BIDP3/QAL" },
};

// Also build a full-name lookup from flmOptions
const flmByName: Record<string, string> = {};
for (const f of flmOptions) { if (f.name && f.value) flmByName[f.name] = f.value; }

const parsePendingWith = (
  pendingWith: string | undefined,
  status: string,
  employees: apiService.Employee[] = [],
  suggestion?: { assignedFlm?: string; evaluatedBy?: string; approvedByManager?: string; approvedByBpsAdmin?: string; approvedByBpsDh?: string }
) => {
  if (CLOSED_STATUSES.includes(status)) {
    return { currentLevel: "CLS", pendingWithEno: "Closed", pendingWithName: "Closed", pendingWithDept: "Closed", pendingDate: "Closed" };
  }
  if (!pendingWith) {
    return { currentLevel: "—", pendingWithEno: "—", pendingWithName: "—", pendingWithDept: "—", pendingDate: "—" };
  }
  const dash = pendingWith.indexOf(" - ");
  const currentLevel    = dash !== -1 ? pendingWith.slice(0, dash).trim() : pendingWith;
  const pendingWithName = dash !== -1 ? pendingWith.slice(dash + 3).trim() : "—";

  // Priority 1: direct emp no from suggestion status fields
  let empNo = "";
  if (suggestion) {
    if (status === "Submitted" && suggestion.assignedFlm) empNo = suggestion.assignedFlm;
    else if (status === "Pending Manager" && suggestion.approvedByManager) empNo = suggestion.approvedByManager;
    else if (status === "Pending BPS Admin" && suggestion.approvedByBpsAdmin) empNo = suggestion.approvedByBpsAdmin;
    else if (status === "Pending BPS DH" && suggestion.approvedByBpsDh) empNo = suggestion.approvedByBpsDh;
    else if (currentLevel === "FLM" && suggestion.assignedFlm) empNo = suggestion.assignedFlm;
  }
  // Priority 2: live employee list lookup by full name
  if (!empNo && pendingWithName && pendingWithName !== "—") {
    const emp = employees.find(e => e.name === pendingWithName);
    if (emp) empNo = emp.employee_no;
  }
  // Priority 3: flmOptions by name
  if (!empNo && flmByName[pendingWithName]) empNo = flmByName[pendingWithName];
  // Priority 4: static first-name fallback
  const firstName = pendingWithName.split(" ")[0];
  if (!empNo && pendingAuthorityLookup[pendingWithName]) empNo = pendingAuthorityLookup[pendingWithName].empNo;
  if (!empNo && pendingAuthorityLookup[firstName]) empNo = pendingAuthorityLookup[firstName].empNo;

  // Resolve dept from live employee list
  let dept = "—";
  if (empNo) {
    const emp = employees.find(e => e.employee_no === empNo);
    if (emp) dept = emp.department;
  }
  if (dept === "—" && pendingAuthorityLookup[firstName]) dept = pendingAuthorityLookup[firstName].dept;

  return {
    currentLevel,
    pendingWithEno:  empNo || "—",
    pendingWithName: pendingWithName || "—",
    pendingWithDept: dept,
    pendingDate: null as null,
  };
};

// Suggestion Level: 3 values driven by TYPE (not status)
const getSuggestionLevel = (type: string, status: string): string => {
  if (CLOSED_STATUSES.includes(status)) return "Closed";
  if (type === "Cash The Flash") return "Opinion";
  return "Evaluation";
};

const GeneralEnquiry = () => {
  const { t } = useLanguage();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [suggestionNo, setSuggestionNo] = useState("");
  const [status, setStatus] = useState("all");
  const [employeeNo, setEmployeeNo] = useState("");
  const [range, setRange] = useState("all");
  const [suggestionType, setSuggestionType] = useState("all");
  const [category, setCategory] = useState("all");
  const [onBehalfFilter, setOnBehalfFilter] = useState("all");
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<(typeof results)[0] | null>(null);
  const [selectedSerialNo, setSelectedSerialNo] = useState<number | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [allEmployees, setAllEmployees] = useState<apiService.Employee[]>([]);
  const { categories: categoryOptions } = useCategories();
  const { mapDept, entries: deptEntries } = useDeptMappings();

  // Load suggestions and employees from backend on mount
  // Exclude drafts — drafts are only visible to the owning employee in MySuggestions
  useEffect(() => {
    apiService.fetchSuggestions({ limit: 2000 }).then(r => {
      const nonDrafts = r.data.filter(s => s.status !== "Draft");
      setAllSuggestions(nonDrafts);
      setResults(nonDrafts);
    }).catch(() => {});
    apiService.fetchEmployees().then(setAllEmployees).catch(() => {});
  }, []);

  const suggestionOptions = useMemo(() =>
    allSuggestions.map(s => ({
      value: s.suggestionNo,
      label: `${s.suggestionNo} — ${s.subject.slice(0, 40)}`,
      sublabel: `${s.employeeName} • ${s.type}`,
    })), [allSuggestions]);

  const employeeOptions = useMemo(() =>
    allEmployees.map(e => ({
      value: e.employee_no,
      label: `${e.employee_no} — ${e.name}`,
      sublabel: e.department,
    })), [allEmployees]);

  // Build dropdown options from department mapping entries (all mapped names)
  const deptFilterOptions = useMemo(() => {
    const unique = new Set(deptEntries.map(e => e.mapped));
    return Array.from(unique).sort();
  }, [deptEntries]);

  const totalPages = Math.max(1, Math.ceil(results.length / rowsPerPage));
  const pageRows   = results.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Clamp currentPage if results shrink (e.g. after a new filter narrows results)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handleSearch = () => {
    let filtered = [...allSuggestions];
    if (fromDate) filtered = filtered.filter(s => s.date >= fromDate);
    if (toDate) filtered = filtered.filter(s => s.date <= toDate);
    if (suggestionNo.trim()) {
      filtered = filtered.filter(s =>
        s.suggestionNo.toLowerCase().includes(suggestionNo.trim().toLowerCase())
      );
    }
    if (status !== "all") filtered = filtered.filter(s => s.status === status);
    if (employeeNo.trim()) {
      filtered = filtered.filter(s =>
        s.employeeNo?.toLowerCase().includes(employeeNo.trim().toLowerCase())
      );
    }
    if (range !== "all") filtered = filtered.filter(s => mapDept(s.department) === range);
    if (suggestionType !== "all") filtered = filtered.filter(s => s.type === suggestionType);
    if (category !== "all") filtered = filtered.filter(s => s.category === category);
    if (onBehalfFilter !== "all") {
      filtered = filtered.filter(s => {
        const isOnBehalf = s.formData?.suggestionFor === "behalf";
        return onBehalfFilter === "yes" ? isOnBehalf : !isOnBehalf;
      });
    }
    setResults(filtered);
    setSearched(true);
    setCurrentPage(1);
    toast.success(`Found ${filtered.length} record(s)`);
  };

  const handleReset = () => {
    setFromDate(""); setToDate(""); setSuggestionNo(""); setStatus("all");
    setEmployeeNo(""); setRange("all"); setSuggestionType("all"); setCategory("all");
    setOnBehalfFilter("all");
    setResults(allSuggestions); setSearched(false); setCurrentPage(1);
  };

  const exportData = useMemo(() => {
    const headers = [
      "Serial No", "Requested By (Name)", "Requested By (Emp No)", "Team Members", "Department",
      "Suggestion No", "Suggestion Date", "On Behalf", "Status", "Current Level", "Suggestion Level",
      "Pending With Eno", "Pending With Name", "Pending With Department", "Days Pending",
    ];
    const rows = results.map((s, i) => {
      const p = parsePendingWith(s.pendingWith, s.status, allEmployees, s);
      const isClosed = CLOSED_STATUSES.includes(s.status);
      const fd = (s.formData || {}) as Record<string, any>;
      const teamMembers: string[] = (fd.teamMembers || []);
      const teamStr = teamMembers.map((m: string) => {
        const di = m.indexOf("\u2013");
        if (di !== -1) return `${m.slice(0, di).trim()} (${m.slice(di + 1).trim()})`;
        const opt = teamMemberOptions.find(o => o.value === m);
        if (opt) {
          return `${opt.name} (${m})`;
        }
        return m;
      }).join(" | ");
      const isOnBehalf = fd.suggestionFor === "behalf" ? "Yes" : "No";
      return [
        String(i + 1), s.employeeName || "", s.employeeNo || "", teamStr, mapDept(s.department),
        s.suggestionNo, s.date, isOnBehalf, s.status,
        p.currentLevel, getSuggestionLevel(s.type, s.status),
        p.pendingWithEno, p.pendingWithName, p.pendingWithDept,
        isClosed ? "0" : String(calculateDaysPending(s)),
      ];
    });
    return { headers, rows };
  }, [results, mapDept]);

  const handleExportCSV = () => {
    const { headers, rows } = exportData;
    downloadCSV(headers, rows, `General_Enquiry_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("CSV exported!");
  };

  const handleExportPDF = () => {
    const { headers, rows } = exportData;
    downloadTablePDF("General Enquiry Report", headers, rows, `General_Enquiry_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exported!");
  };

  const handleExportXLSX = () => {
    const { headers, rows } = exportData;
    // Collect active filters to show in the sheet
    const filters: Record<string, string> = {};
    if (fromDate) filters["From Date"] = fromDate;
    if (toDate) filters["To Date"] = toDate;
    if (suggestionNo) filters["Suggestion No"] = suggestionNo;
    if (status !== "all") filters["Status"] = status;
    if (employeeNo) filters["Employee No"] = employeeNo;
    if (range !== "all") filters["Range"] = range;
    if (suggestionType !== "all") filters["Suggestion Type"] = suggestionType;
    if (category !== "all") filters["Category"] = category;
    if (onBehalfFilter !== "all") filters["On Behalf"] = onBehalfFilter === "yes" ? "Yes" : "No";
    downloadXLSX(
      "General Enquiry Report",
      headers,
      rows,
      `General_Enquiry_${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters,
    );
    toast.success("XLSX exported!");
  };

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  // Helper: apply highlight class when a filter has an active (non-default) value
  const af = (isActive: boolean) => isActive ? "filter-active" : "";

  return (
    <div className="max-w-6xl flex flex-col h-full gap-4">
      <h2 className="text-xl font-bold text-foreground">General Enquiry <span className="text-sm font-normal text-muted-foreground">/ {t("General Enquiry")}</span></h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date <span className="text-[10px] text-muted-foreground font-normal">/ {t("From Date")}</span></Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={af(!!fromDate)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date <span className="text-[10px] text-muted-foreground font-normal">/ {t("To Date")}</span></Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={af(!!toDate)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Suggestion No <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion No")}</span></Label>
              <SuggestionCombobox
                options={suggestionOptions}
                value={suggestionNo}
                onChange={setSuggestionNo}
                placeholder="Type suggestion no..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status <span className="text-[10px] text-muted-foreground font-normal">/ {t("Status")}</span></Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={af(status !== "all")}><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Under Evaluation">Under Evaluation</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Approved & Closed">Approved &amp; Closed</SelectItem>
                  <SelectItem value="Sent Back">Sent Back</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Implemented">Implemented</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee No <span className="text-[10px] text-muted-foreground font-normal">/ {t("Employee No")}</span></Label>
              <SuggestionCombobox
                options={employeeOptions}
                value={employeeNo}
                onChange={setEmployeeNo}
                placeholder="Type employee no or name..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Range <span className="text-[10px] text-muted-foreground font-normal">/ {t("Range")}</span></Label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className={af(range !== "all")}><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {deptFilterOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Suggestion Type <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion Type")}</span></Label>
              <Select value={suggestionType} onValueChange={setSuggestionType}>
                <SelectTrigger className={af(suggestionType !== "all")}><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {suggestionTypes.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category <span className="text-[10px] text-muted-foreground font-normal">/ {t("Category")}</span></Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={af(category !== "all")}><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">On Behalf <span className="text-[10px] text-muted-foreground font-normal">/ {t("On Behalf")}</span></Label>
              <Select value={onBehalfFilter} onValueChange={setOnBehalfFilter}>
                <SelectTrigger className={af(onBehalfFilter !== "all")}><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSearch} className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> Search / {t("Search")}
            </Button>
            <Button variant="outline" onClick={handleReset}>Reset / {t("Reset")}</Button>
            {searched && results.length > 0 && (
              <>
                <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={handleExportCSV}>
                  <Download className="h-3 w-3" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleExportXLSX}>
                  <Download className="h-3 w-3" /> XLSX
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPDF}>
                  <FileText className="h-3 w-3" /> PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Total Records: {results.length}
          {results.length > 0 && ` — showing ${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, results.length)}`}
        </span>
        {searched && results.length > 0 && (
          <span className="text-xs text-primary font-medium">
            Awards: ₹{results.reduce((s, r) => s + (r.awardAmount || 0), 0).toLocaleString()}
          </span>
        )}
      </div>

      <Card className="card-shadow flex-1 min-h-0">
        <CardContent className="pt-4 flex flex-col h-full pb-4">
          <div className="overflow-auto rounded-md border" style={{ maxHeight: "calc(100vh - 150px)", minHeight: "200px" }}>
            <table className="min-w-[1200px] text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="border-b text-left bg-muted">
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-30 bg-muted border-r border-border shadow-[2px_0_6px_-1px_rgba(0,0,0,0.18)]">Serial No</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Requested By</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Dept</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Suggestion No</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Subject</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Suggestion Date</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">On Behalf</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Current Level</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Suggestion Level</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Pending With Eno</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Pending With Name</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Pending With Dept</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Days Pending</th>
                  <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Detail</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-muted-foreground text-sm">No records found.</td>
                  </tr>
                ) : (
                  pageRows.map((s, i) => {
                    const p = parsePendingWith(s.pendingWith, s.status, allEmployees, s);
                    const isClosed = CLOSED_STATUSES.includes(s.status);
                    const isSentBack = s.status === "Sent Back";
                    const globalIdx = (currentPage - 1) * rowsPerPage + i + 1;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedRowId(s.id)}
                        className={`border-b last:border-0 cursor-pointer transition-colors ${
                          selectedRowId === s.id
                            ? "bg-indigo-100 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/50"
                            : isSentBack
                            ? "bg-amber-50/60 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <td className={`py-2 px-2 font-semibold sticky left-0 z-10 border-r border-border shadow-[2px_0_6px_-1px_rgba(0,0,0,0.14)] transition-colors ${
                          selectedRowId === s.id
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                            : "bg-white text-muted-foreground dark:bg-background"
                        }`}>{globalIdx}</td>
                        <td className="py-2 px-2">
                          <div className="flex flex-col leading-tight gap-0.5">
                            <span className="font-medium whitespace-nowrap">{s.employeeName || "—"}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{s.employeeNo || ""}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2" title={s.department || ""}>{mapDept(s.department)}</td>
                        <td className="py-2 px-2 font-mono whitespace-nowrap">{s.suggestionNo}</td>
                        <td className="py-2 px-2 max-w-[180px]">
                          <span className="block truncate" title={s.subject}>{s.subject || "—"}</span>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">{s.date}</td>
                        <td className="py-2 px-2 text-center">
                          {s.formData?.suggestionFor === "behalf" ? (
                            <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className={`text-[10px] ${statusColors[s.status] || ""}`}>{s.status}</Badge>
                        </td>
                        <td className={`py-2 px-2 font-medium whitespace-nowrap ${isClosed ? "text-muted-foreground" : ""}`}>{p.currentLevel}</td>
                        <td className={`py-2 px-2 whitespace-nowrap ${isClosed ? "text-muted-foreground" : ""}`}>{getSuggestionLevel(s.type, s.status)}</td>
                        <td className={`py-2 px-2 font-mono ${isClosed ? "text-muted-foreground" : ""}`}>{p.pendingWithEno}</td>
                        <td className={`py-2 px-2 whitespace-nowrap ${isClosed ? "text-muted-foreground" : ""}`}>{p.pendingWithName}</td>
                        <td className={`py-2 px-2 ${isClosed ? "text-muted-foreground" : ""}`}>{p.pendingWithDept}</td>
                        <td className={`py-2 px-2 whitespace-nowrap font-medium ${isClosed ? "text-muted-foreground" : ""}`}>
                          {(() => {
                            if (isClosed) return "—";
                            const days = calculateDaysPending(s);
                            return (
                              <span className={days > 10 ? "text-destructive" : days > 5 ? "text-amber-600 dark:text-amber-400" : ""}>
                                {days}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={() => {
                              setSelectedSuggestion(s);
                              setSelectedSerialNo(globalIdx);
                              setDetailOpen(true);
                            }}
                          >
                            <SendHorizonal className="h-3 w-3" /> Submit
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between pt-3 border-t mt-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page:</span>
              <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline" size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline" size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <GeneralEnquiryDetailDialog
        suggestion={selectedSuggestion}
        serialNo={selectedSerialNo}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};

export default GeneralEnquiry;
