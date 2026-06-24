// NeftReport — fetches suggestions and employees from backend API
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
import type { Suggestion } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { downloadXLSX, downloadTablePDF } from "@/lib/pdfUtils";
import { useDeptMappings } from "@/contexts/DeptMappingContext";
import { teamMemberOptions, flmOptions, moderatorOptions } from "@/lib/bidp/suggestionConstants";

const reportTypes = ["NEFT Report", "Manpower Report", "Employee Involvement", "Non-Participant Report"];

/** Build short abbreviation from suggestion type name, e.g. "Cash The Flash" → "CTF" */
const toShortName = (type: string) =>
  type
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() || "")
    .join("");

const NeftReport = () => {
  const { t } = useLanguage();
  const [reportType, setReportType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [range, setRange] = useState("all");
  const [showResults, setShowResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [allEmployees, setAllEmployees] = useState<apiService.Employee[]>([]);
  const { uniqueRanges, mapDept } = useDeptMappings();

  // Load data from backend on mount
  useEffect(() => {
    apiService.fetchSuggestions({ limit: 2000 }).then(r => setAllSuggestions(r.data)).catch(() => {});
    apiService.fetchEmployees().then(setAllEmployees).catch(() => {});
  }, []);

  const isManpower           = reportType === "Manpower Report";
  const isNonParticipant      = reportType === "Non-Participant Report";
  const isEmployeeInvolvement = reportType === "Employee Involvement";
  const isNeft                = reportType === "NEFT Report";

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

      // NEFT Report: only "Approved & Closed", exclude Daily CIP, must have positive amount
      if (isNeft) {
        if (s.status !== "Approved & Closed") return false;
        if (s.type === "Daily CIP") return false;
        if (!s.awardAmount || s.awardAmount <= 0) return false;
        return true;
      }

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
  }, [allSuggestions, range, fromDate, toDate, reportType, isNonParticipant, isNeft, mapDept]);

  // ── Build employee lookup from allEmployees for resolving emp details ──────
  const empLookup = useMemo(() => {
    const m = new Map<string, apiService.Employee>();
    for (const e of allEmployees) m.set(e.employee_no, e);
    return m;
  }, [allEmployees]);

  // ── NEFT aggregated rows: distribute awards per employee ──────────────────
  // Rules:
  //   1. Self + no group → full award to the registering employee
  //   2. Self + group → equal split among registering employee + team members
  //   3. On-behalf + no group → full award to mainSuggestor (NOT registering employee)
  //   4. On-behalf + group → equal split among mainSuggestor + team members (registering employee excluded)
  interface NeftRow {
    empNo: string;
    empName: string;
    department: string;
    latestDate: string;
    totalAmount: number;
    suggestionCount: number;
    details: Array<{ suggNo: string; type: string; fullAmount: number; share: number; sharePercent: number }>;
  }

  const neftRows = useMemo((): NeftRow[] => {
    if (!isNeft) return [];
    const empMap = new Map<string, NeftRow>();

    const resolveEmpName = (empNo: string, fallbackName?: string, fallbackDept?: string) => {
      const emp = empLookup.get(empNo);
      if (emp?.name && emp.name !== empNo) return { name: emp.name, dept: emp.department || "—" };
      const fromMock = mockEmployees.find(e => e.employeeNo === empNo);
      if (fromMock) return { name: fromMock.name, dept: fromMock.department || "—" };
      const fromConst = [...teamMemberOptions, ...flmOptions, ...moderatorOptions].find(o => o.value === empNo);
      if (fromConst) return { name: fromConst.name, dept: fromConst.dept || "—" };
      return { name: fallbackName || empNo, dept: fallbackDept || "—" };
    };

    const ensureRow = (empNo: string, fallbackName?: string, fallbackDept?: string): NeftRow => {
      if (!empMap.has(empNo)) {
        const resolved = resolveEmpName(empNo, fallbackName, fallbackDept);
        empMap.set(empNo, {
          empNo,
          empName: resolved.name,
          department: resolved.dept,
          latestDate: "",
          totalAmount: 0,
          suggestionCount: 0,
          details: [],
        });
      }
      return empMap.get(empNo)!;
    };

    filteredData.forEach(s => {
      const award = s.awardAmount || 0;
      if (award <= 0) return;

      const fd: Record<string, any> = s.formData || {};
      const isOnBehalf = fd.suggestionFor === "behalf" && fd.mainSuggestor;
      const isGroup = fd.groupSuggestion === "yes";
      const teamMembers: string[] = fd.teamMembers || [];
      const suggNo = s.suggestionNo || s.id;
      const sType = s.type || "—";

      // Determine the primary person (who gets the award / is included in the split)
      // On-behalf: mainSuggestor is the primary person, registering employee is excluded
      // Self: registering employee is the primary person
      const primaryEmpNo = isOnBehalf ? fd.mainSuggestor : (s.employeeNo || "");
      const primaryName = isOnBehalf ? undefined : (s.employeeName || undefined);
      const primaryDept = isOnBehalf ? undefined : (s.department || undefined);

      if (isGroup && teamMembers.length > 0) {
        // ── Group suggestion: equal split among primary person + team members ──
        // Build unique recipients list: primary + team members (deduplicated)
        const recipientSet = new Set<string>();
        if (primaryEmpNo) recipientSet.add(primaryEmpNo);
        for (const m of teamMembers) {
          if (m) recipientSet.add(m);
        }
        const recipients = Array.from(recipientSet);
        const count = recipients.length;
        if (count === 0) return;

        // Always do equal split among all recipients.
        // Custom teamMemberShares from the form are unreliable because
        // they may not include the primary person (mainSuggestor / registering employee).
        recipients.forEach((recipientId, idx) => {
          const base = Math.floor(100 / count);
          const sharePercent = idx === 0 ? base + (100 - base * count) : base;

          const memberAmount = Math.round((award * sharePercent) / 100);
          if (memberAmount <= 0) return;

          const row = ensureRow(recipientId, recipientId === primaryEmpNo ? primaryName : undefined, recipientId === primaryEmpNo ? primaryDept : undefined);
          row.totalAmount += memberAmount;
          row.suggestionCount += 1;
          row.details.push({ suggNo, type: sType, fullAmount: award, share: memberAmount, sharePercent });
          if (s.date && s.date > row.latestDate) row.latestDate = s.date;
        });
      } else if (primaryEmpNo) {
        // ── No group: full award goes to the primary person ──
        const row = ensureRow(primaryEmpNo, primaryName, primaryDept);
        row.totalAmount += award;
        row.suggestionCount += 1;
        row.details.push({ suggNo, type: sType, fullAmount: award, share: award, sharePercent: 100 });
        if (s.date && s.date > row.latestDate) row.latestDate = s.date;
      }
    });

    return Array.from(empMap.values()).sort((a, b) => a.empName.localeCompare(b.empName));
  }, [isNeft, filteredData, empLookup]);

  const neftGrandTotal = useMemo(() => neftRows.reduce((sum, r) => sum + r.totalAmount, 0), [neftRows]);

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
    if (isNonParticipant) {
      const headers = ["Sno", "Employee Name", "Employee Number", "Department", "Category"];
      const rows = npRows.map((e, i) => [String(i + 1), e.name, e.employeeNo, e.department, e.category]);
      return { headers, rows };
    }

    // ── NEFT Report: aggregated by employee with distribution details ──
    const headers = ["SNo", "Emp No", "Employee Name", "Department", "Date", "Suggestions", "Total Amount (₹)"];
    const rows = neftRows.map((r, i) => [
      String(i + 1),
      r.empNo,
      r.empName,
      r.department,
      formatDate(r.latestDate),
      r.details.map(d => d.suggNo).join(", "),
      `₹${r.totalAmount.toLocaleString()}`,
    ]);
    return { headers, rows };
  };

  const handleGenerate = () => {
    if (!reportType) { toast.error("Please select a report type"); return; }
    setShowResults(true);
    setCurrentPage(1);
    if (isManpower) {
      toast.success(`Generated ${manpowerRows.length} employee(s)`);
    } else if (isNeft) {
      toast.success(`Generated ${neftRows.length} employee(s) from ${filteredData.length} suggestion(s)`);
    } else if (isEmployeeInvolvement) {
      toast.success(`Generated ${invRows.length} involved employee(s) from ${filteredData.length} suggestion(s)`);
    } else if (isNonParticipant) {
      toast.success(`Generated ${npRows.length} non-participant(s)`);
    } else {
      toast.success(`Generated ${filteredData.length} record(s)`);
    }
  };

  const handleExportExcel = () => {
    if (!reportType) { toast.error("Please select a report type"); return; }
    const { headers, rows } = getReportData();
    const filters: Record<string, string> = {
      "Report Type": reportType,
      ...(fromDate ? { "From Date": formatDate(fromDate) } : {}),
      ...(toDate ? { "To Date": formatDate(toDate) } : {}),
      ...(range !== "all" && (isManpower || isNonParticipant || isEmployeeInvolvement) ? { "Range": range } : {}),
      ...(isNeft ? { "Total Employees": String(neftRows.length), "Grand Total": `₹${neftGrandTotal.toLocaleString()}` } : {}),
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

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );



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

  const activeRowCount = isManpower ? manpowerRows.length : isNeft ? neftRows.length : isEmployeeInvolvement ? invRows.length : isNonParticipant ? npRows.length : filteredData.length;
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
        NEFT / MIS Report <span className="text-sm font-normal text-muted-foreground">/ {t("NEFT / MIS Report")}</span>
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
            {(isManpower || isNonParticipant || isEmployeeInvolvement) && (
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
            )}
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
            {isNeft && (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700 px-3 py-1 rounded-lg">
                Grand Total: ₹{neftGrandTotal.toLocaleString()}
              </span>
            )}
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
          ) : isNonParticipant ? (
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
          ) : (
            /* ── NEFT Report — aggregated per employee with distribution ── */
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <div className="overflow-auto max-h-[520px] rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-20">
                      <tr className="border-b text-left bg-muted/90">
                        <th className="pb-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-30 bg-muted/90 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]"><TH en="SNo" /></th>
                        <th className="pb-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Emp No" /></th>
                        <th className="pb-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Employee Name" /></th>
                        <th className="pb-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Department" /></th>
                        <th className="pb-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Date" /></th>
                        <th className="pb-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Suggestion(s)" /></th>
                        <th className="pb-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-right"><TH en="Amount" /> (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {neftRows.length === 0 ? (
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No approved & closed suggestions found for this period</td></tr>
                      ) : (
                        <>
                          {neftRows.slice(pageStart, pageEnd).map((r, i) => (
                            <tr key={r.empNo} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3 text-xs text-muted-foreground sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{pageStart + i + 1}</td>
                              <td className="py-2.5 px-3 text-xs font-mono">{r.empNo}</td>
                              <td className="py-2.5 px-3 text-xs font-semibold">{r.empName}</td>
                              <td className="py-2.5 px-3 text-xs">{r.department}</td>
                              <td className="py-2.5 px-3 text-xs">{formatDate(r.latestDate)}</td>
                              <td className="py-2.5 px-3 text-xs">
                                <div className="space-y-0.5">
                                  {r.details.map((d, di) => (
                                    <div key={di} className="flex items-center gap-1.5">
                                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{d.suggNo}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-xs text-right font-bold text-emerald-700 dark:text-emerald-400">
                                ₹{r.totalAmount.toLocaleString()}
                                {r.suggestionCount > 1 && (
                                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">({r.suggestionCount} sugg.)</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </>
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

export default NeftReport;
