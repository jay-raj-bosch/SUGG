// MisReport — Manpower / Employee Involvement / Non-Participant reports
// Split out from NeftReport so NEFT and MIS reports each have their own dedicated page & sidebar entry.
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { suggestionTypes, mockEmployees } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { downloadXLSX, downloadTablePDF } from "@/lib/pdfUtils";
import { useDeptMappings } from "@/contexts/DeptMappingContext";
import { usePlant } from "@/contexts/PlantContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { teamMemberOptions, flmOptions, moderatorOptions } from "@/lib/bidp/suggestionConstants";

const reportTypes = ["Manpower Report", "Employee Involvement", "Non-Participant Report"];

/** Build short abbreviation from suggestion type name, e.g. "Cash The Flash" → "CTF" */
const toShortName = (type: string) =>
  type
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() || "")
    .join("");

const MisReport = () => {
  const { t } = useLanguage();
  const { plant } = usePlant();
  const [reportType, setReportType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [range, setRange] = useState("all");
  const [showResults, setShowResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const { getSubmittedSuggestions } = useSuggestions();
  const allSuggestions = useMemo(() => getSubmittedSuggestions(), [getSubmittedSuggestions]);
  const [allEmployees, setAllEmployees] = useState<apiService.Employee[]>([]);
  const { uniqueRanges, mapDept } = useDeptMappings();

  // Load employees from backend on mount — re-run if plant changes
  useEffect(() => {
    apiService.fetchEmployees(plant as "bidp" | "jap").then(setAllEmployees).catch(() => {
      setAllEmployees(mockEmployees.filter(e => e.plantCode === "PLT-01").map(e => ({ employee_no: e.employeeNo, name: e.name, department: e.department, area: "", plant_code: e.plantCode, role: "employee" as const, ntid: e.ntid, email: e.email })));
    });
  }, [plant]);

  const isManpower           = reportType === "Manpower Report";
  const isNonParticipant      = reportType === "Non-Participant Report";
  const isEmployeeInvolvement = reportType === "Employee Involvement";

  // ── Manpower: filtered from allEmployees ──────────────────────────────────
  const manpowerRows = useMemo(() => {
    if (!isManpower) return [];
    return allEmployees.filter(e => {
      if (range !== "all" && mapDept(e.department) !== range) return false;
      return true;
    });
  }, [isManpower, allEmployees, range, mapDept]);

  // ── Filtered suggestions for all report types ────────────────────────────
  const filteredData = useMemo(() => {
    return allSuggestions.filter(s => {
      if (fromDate && s.date < fromDate) return false;
      if (toDate && s.date > toDate) return false;

      if (reportType === "Employee Involvement") {
        if (range !== "all" && mapDept(s.department) !== range) return false;
        return true;
      }
      if (isNonParticipant) {
        if (range !== "all" && mapDept(s.department) !== range) return false;
        return true;
      }
      return true;
    });
  }, [allSuggestions, range, fromDate, toDate, reportType, isNonParticipant, mapDept]);

  // ── Build employee lookup from allEmployees for resolving emp details ──────
  const empLookup = useMemo(() => {
    const m = new Map<string, apiService.Employee>();
    for (const e of allEmployees) m.set(e.employee_no, e);
    return m;
  }, [allEmployees]);

  const getReportData = () => {
    if (isManpower) {
      const headers = ["Sno", "Employee Name", "Employee Number", "Department"];
      const rows = manpowerRows.map((e, i) => [
        String(i + 1),
        e.name || "",
        e.employee_no || "",
        e.department || "",
      ]);
      return { headers, rows };
    }
    if (isEmployeeInvolvement) {
      const empRows = invRows;
      const typeShortNames = suggestionTypes.map(toShortName);
      const headers = ["SNo", "Employee No", "Employee Name", "Department", ...typeShortNames, "Total"];
      const rows = empRows.map((r, i) => {
        const typeCounts = suggestionTypes.map(t => String(r.typeCounts[t] || 0));
        const total = suggestionTypes.reduce((sum, t) => sum + (r.typeCounts[t] || 0), 0);
        return [
          String(i + 1), r.empNo, r.empName, r.dept,
          ...typeCounts,
          String(total),
        ];
      });
      return { headers, rows };
    }
    // Non-Participant Report
    const headers = ["Sno", "Employee Name", "Employee Number", "Department", "Category"];
    const rows = npRows.map((e, i) => [String(i + 1), e.name, e.employeeNo, e.department, e.category]);
    return { headers, rows };
  };

  const handleGenerate = () => {
    if (!reportType) { toast.error("Please select a report type"); return; }
    setShowResults(true);
    setCurrentPage(1);
    if (isManpower) {
      toast.success(`Generated ${manpowerRows.length} employee(s)`);
    } else if (isEmployeeInvolvement) {
      toast.success(`Generated ${invRows.length} involved employee(s) from ${filteredData.length} suggestion(s)`);
    } else if (isNonParticipant) {
      toast.success(`Generated ${npRows.length} non-participant(s)`);
    }
  };

  const handleExportExcel = () => {
    if (!reportType) { toast.error("Please select a report type"); return; }
    const { headers, rows } = getReportData();
    const filters: Record<string, string> = {
      "Report Type": reportType,
      ...(fromDate ? { "From Date": formatDate(fromDate) } : {}),
      ...(toDate ? { "To Date": formatDate(toDate) } : {}),
      ...(range !== "all" ? { "Range": range } : {}),
    };
    downloadXLSX(
      reportType,
      headers,
      rows,
      `${reportType.replace(/\s/g, "_")}_${fromDate || "all"}_to_${toDate || "all"}.xlsx`,
      filters,
    );
    toast.success("Excel (.xlsx) downloaded!");
  };

  const handleExportPDF = () => {
    if (!reportType) { toast.error("Please select a report type"); return; }
    const { headers, rows } = getReportData();
    downloadTablePDF(reportType, headers, rows, `${reportType.replace(/\s/g, "_")}_${fromDate || "all"}_to_${toDate || "all"}.pdf`);
    toast.success("PDF report downloaded!");
  };

  // ── Employee Involvement: proper counting ─────────────────────────────────
  // Rules:
  //   1. On-behalf suggestions → count the mainSuggestor, NOT the registering employee
  //   2. Self suggestions → count the registering employee
  //   3. Team members → each team member is also counted as involved
  const getInvolvementRows = () => {
    type InvRow = { empNo: string; empName: string; dept: string; typeCounts: Record<string, number> };
    const empMap = new Map<string, InvRow>();

    // Build a secondary name lookup from suggestion data (employeeNo → employeeName)
    const nameFromSuggestions = new Map<string, { name: string; dept: string }>();
    for (const s of filteredData) {
      if (s.employeeNo && s.employeeName) {
        nameFromSuggestions.set(s.employeeNo, { name: s.employeeName, dept: s.department || "—" });
      }
    }

    const resolveEmployee = (empNo: string): { name: string; dept: string } => {
      // 1. Try backend employee list
      const emp = empLookup.get(empNo);
      if (emp?.name && emp.name !== empNo) return { name: emp.name, dept: emp.department || "—" };
      // 2. Try suggestion data
      const fromSugg = nameFromSuggestions.get(empNo);
      if (fromSugg) return fromSugg;
      // 3. Try frontend mock employees (covers JaP / PLT-02 employees)
      const fromMock = mockEmployees.find(e => e.employeeNo === empNo);
      if (fromMock) return { name: fromMock.name, dept: fromMock.department || "—" };
      // 4. Try frontend constants (teamMemberOptions, flmOptions, moderatorOptions)
      const fromConstants = [...teamMemberOptions, ...flmOptions, ...moderatorOptions].find(o => o.value === empNo);
      if (fromConstants) return { name: fromConstants.name, dept: fromConstants.dept || "—" };
      // 5. Fallback
      return { name: empNo, dept: "—" };
    };

    const ensureEmp = (empNo: string): InvRow => {
      if (!empMap.has(empNo)) {
        const resolved = resolveEmployee(empNo);
        empMap.set(empNo, {
          empNo,
          empName: resolved.name,
          dept: resolved.dept,
          typeCounts: {},
        });
      }
      return empMap.get(empNo)!;
    };

    filteredData.forEach(s => {
      const fd: Record<string, any> = s.formData || {};
      if (!s.type) return;

      // Determine the primary involved person
      const isOnBehalf = fd.suggestionFor === "behalf" && fd.mainSuggestor;
      const primaryEmpNo = isOnBehalf ? fd.mainSuggestor : (s.employeeNo || "");

      if (primaryEmpNo) {
        const row = ensureEmp(primaryEmpNo);
        // Update name/dept if we have better info from the suggestion itself
        if (!isOnBehalf && s.employeeName && s.employeeName !== primaryEmpNo) {
          row.empName = s.employeeName;
          if (s.department) row.dept = s.department;
        }
        row.typeCounts[s.type] = (row.typeCounts[s.type] || 0) + 1;
      }

      // Also count each team member as involved
      const teamMembers: string[] = fd.teamMembers || [];
      for (const memberId of teamMembers) {
        if (!memberId || memberId === primaryEmpNo) continue;
        const row = ensureEmp(memberId);
        row.typeCounts[s.type] = (row.typeCounts[s.type] || 0) + 1;
      }
    });

    return Array.from(empMap.values()).sort((a, b) => a.empName.localeCompare(b.empName));
  };
  const invRows = isEmployeeInvolvement || isNonParticipant ? getInvolvementRows() : [];

  // ── Non-Participant: employees NOT in the involvement set ──────────────────
  // When a range filter is active, only consider employees from that range
  const rangeFilteredEmployees = useMemo(() => {
    if (range === "all") return allEmployees;
    return allEmployees.filter(e => mapDept(e.department) === range);
  }, [allEmployees, range, mapDept]);

  const getNonParticipantRows = () => {
    const participantNos = new Set(invRows.map(r => r.empNo));
    return rangeFilteredEmployees
      .filter(e => !participantNos.has(e.employee_no))
      .map(e => ({ employeeNo: e.employee_no, name: e.name, department: e.department, category: "M&SS" }));
  };
  const npRows = isNonParticipant ? getNonParticipantRows() : [];
  const totalManpower  = rangeFilteredEmployees.length;
  // Only count employees that actually exist in the manpower roster
  // (prevents involvement % from exceeding 100% when team members
  // from other ranges or non-roster employees appear in suggestions)
  const rosterEmpNos = useMemo(() => new Set(rangeFilteredEmployees.map(e => e.employee_no)), [rangeFilteredEmployees]);
  const involved       = invRows.filter(r => rosterEmpNos.has(r.empNo)).length;
  const notInvolved    = Math.max(0, totalManpower - involved);
  const involvementPct = totalManpower > 0 ? Math.min(100, (involved / totalManpower) * 100).toFixed(1) : "0.0";
  const period         = `${fromDate || "—"} - ${toDate || "—"}`;

  const activeRowCount = isManpower ? manpowerRows.length : isEmployeeInvolvement ? invRows.length : isNonParticipant ? npRows.length : filteredData.length;
  const totalPages     = Math.max(1, Math.ceil(activeRowCount / rowsPerPage));
  const pageStart      = (currentPage - 1) * rowsPerPage;
  const pageEnd        = currentPage * rowsPerPage;

  // Format date YYYY-MM-DD → DD/MM/YYYY
  const formatDate = (d?: string) => {
    if (!d) return "—";
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const paginationControls = (
    <div className="flex items-center justify-between pt-3 border-t mt-2 gap-2 flex-wrap">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Rows per page:</span>
        <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
          <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        MIS Report <span className="text-sm font-normal text-muted-foreground">/ {t("MIS Report")}</span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Report Type <span className="text-[9px] opacity-70">/ {t("Suggestion Type")}</span></Label>
              <Select value={reportType} onValueChange={v => { setReportType(v); setShowResults(false); setRange("all"); }}>
                <SelectTrigger className={reportType ? "filter-active" : ""}><SelectValue placeholder="Select report" /></SelectTrigger>
                <SelectContent>
                  {reportTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Date <span className="text-[9px] opacity-70">/ {t("From Date")}</span></Label>
              <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setShowResults(false); }} disabled={isManpower} className={`${isManpower ? "opacity-30 cursor-not-allowed" : ""} ${!isManpower && fromDate ? "filter-active" : ""}`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date <span className="text-[9px] opacity-70">/ {t("To Date")}</span></Label>
              <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setShowResults(false); }} disabled={isManpower} className={`${isManpower ? "opacity-30 cursor-not-allowed" : ""} ${!isManpower && toDate ? "filter-active" : ""}`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Range <span className="text-[9px] opacity-70">/ {t("Range")}</span></Label>
              <Select value={range} onValueChange={v => { setRange(v); setShowResults(false); }}>
                <SelectTrigger className={range !== "all" ? "filter-active" : ""}><SelectValue placeholder="All Ranges" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ranges</SelectItem>
                  {uniqueRanges.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerate}>Generate</Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="gap-1.5" size="sm" onClick={handleExportExcel} disabled={!showResults}>
              <Download className="h-3.5 w-3.5" /> Export Excel
            </Button>
            <Button variant="outline" className="gap-1.5" size="sm" onClick={handleExportPDF} disabled={!showResults}>
              <Download className="h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {!showResults ? (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground bg-muted/30">
          Select report type and date range, then click Generate to preview report
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Report: {reportType} | Total Records: {activeRowCount}
              {activeRowCount > 0 && ` — showing ${pageStart + 1}–${Math.min(pageEnd, activeRowCount)}`}
              {isManpower
                ? ` | Range: ${range === "all" ? "All Ranges" : range}`
                : <>
                    {fromDate && ` | From: ${fromDate}`}
                    {toDate && ` | To: ${toDate}`}
                    {(isNonParticipant || isEmployeeInvolvement) && ` | Range: ${range === "all" ? "All Ranges" : range}`}
                  </>}
            </span>
          </div>

          {isManpower ? (
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <div className="overflow-auto max-h-[520px] rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-20">
                      <tr className="border-b text-left bg-muted/90">
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-30 bg-muted/90 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">Sno</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Employee Name</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Employee Number</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manpowerRows.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No employees found</td></tr>
                      ) : (
                        manpowerRows.slice(pageStart, pageEnd).map((e, i) => (
                          <tr key={e.employee_no} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-2 text-xs text-muted-foreground sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{pageStart + i + 1}</td>
                            <td className="py-2 px-2 text-xs font-medium">{e.name || "—"}</td>
                            <td className="py-2 px-2 text-xs font-mono">{e.employee_no || "—"}</td>
                            <td className="py-2 px-2 text-xs">{e.department || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {paginationControls}
              </CardContent>
            </Card>
          ) : isEmployeeInvolvement ? (
            <>
              {/* Summary banner */}
              <Card className="card-shadow">
                <CardContent className="pt-3 pb-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left bg-primary/10">
                          <th className="pb-1.5 px-3 font-semibold text-foreground">Dept</th>
                          <th className="pb-1.5 px-3 font-semibold text-foreground">Period</th>
                          <th className="pb-1.5 px-3 font-semibold text-foreground text-right">Total Manpower</th>
                          <th className="pb-1.5 px-3 font-semibold text-foreground text-right">Involved</th>
                          <th className="pb-1.5 px-3 font-semibold text-foreground text-right">Not Involved</th>
                          <th className="pb-1.5 px-3 font-semibold text-foreground text-right">Involvement %</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-muted/30">
                          <td className="py-2 px-3 font-medium">{range === "all" ? "All Ranges" : range}</td>
                          <td className="py-2 px-3">{period}</td>
                          <td className="py-2 px-3 text-right font-medium">{totalManpower}</td>
                          <td className="py-2 px-3 text-right text-primary font-semibold">{involved}</td>
                          <td className="py-2 px-3 text-right text-destructive/70 font-medium">{notInvolved}</td>
                          <td className="py-2 px-3 text-right font-semibold">{involvementPct}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              {/* Detail table */}
              <Card className="card-shadow">
                <CardContent className="pt-4">
                  <div className="overflow-auto max-h-[520px] rounded-md border">
                    <table className="min-w-[900px] text-xs">
                      <thead className="sticky top-0 z-20">
                        <tr className="border-b text-left bg-muted/90">
                          <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-30 bg-muted/90 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">SNo</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Employee No</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Employee Name</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Department</th>
                          {suggestionTypes.map(t => (
                            <th key={t} className="pb-2 px-2 font-medium text-muted-foreground text-center" title={t}>{toShortName(t)}</th>
                          ))}
                          <th className="pb-2 px-2 font-medium text-foreground text-center font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invRows.length === 0 ? (
                          <tr><td colSpan={4 + suggestionTypes.length + 1} className="py-8 text-center text-muted-foreground">No records match the criteria</td></tr>
                        ) : (
                          invRows.slice(pageStart, pageEnd).map((r, i) => {
                            const total = suggestionTypes.reduce((sum, t) => sum + (r.typeCounts[t] || 0), 0);
                            return (
                              <tr key={r.empNo + i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="py-2 px-2 text-muted-foreground sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{pageStart + i + 1}</td>
                                <td className="py-2 px-2 font-mono">{r.empNo}</td>
                                <td className="py-2 px-2 whitespace-nowrap font-medium">{r.empName}</td>
                                <td className="py-2 px-2">{r.dept}</td>
                                {suggestionTypes.map(t => (
                                  <td key={t} className="py-2 px-2 text-center">{r.typeCounts[t] || 0}</td>
                                ))}
                                <td className="py-2 px-2 text-center font-bold">{total}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {paginationControls}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <div className="overflow-auto max-h-[520px] rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-20">
                      <tr className="border-b text-left bg-muted/90">
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-30 bg-muted/90 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">Sno</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Employee Name</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Employee Number</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Department</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {npRows.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No non-participant records match the criteria</td></tr>
                      ) : (
                        npRows.slice(pageStart, pageEnd).map((e, i) => (
                          <tr key={e.employeeNo} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-2 text-xs text-muted-foreground sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{pageStart + i + 1}</td>
                            <td className="py-2 px-2 text-xs font-medium">{e.name}</td>
                            <td className="py-2 px-2 text-xs font-mono">{e.employeeNo}</td>
                            <td className="py-2 px-2 text-xs">{e.department}</td>
                            <td className="py-2 px-2 text-xs">
                              <span className="inline-block bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium">{e.category}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {paginationControls}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default MisReport;
