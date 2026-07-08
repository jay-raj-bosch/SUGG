// NeftReport — dedicated NEFT payment report; fetches suggestions and employees from backend API
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { mockEmployees } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { downloadXLSX, downloadTablePDF } from "@/lib/pdfUtils";
import { usePlant } from "@/contexts/PlantContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { teamMemberOptions, flmOptions, moderatorOptions } from "@/lib/bidp/suggestionConstants";

const NeftReport = () => {
  const { t } = useLanguage();
  const { plant } = usePlant();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const { getSubmittedSuggestions } = useSuggestions();
  const allSuggestions = useMemo(() => getSubmittedSuggestions(), [getSubmittedSuggestions]);
  const [allEmployees, setAllEmployees] = useState<apiService.Employee[]>([]);

  // Load employees from backend on mount — re-run if plant changes
  useEffect(() => {
    apiService.fetchEmployees(plant as "bidp" | "jap").then(setAllEmployees).catch(() => {
      setAllEmployees(mockEmployees.filter(e => e.plantCode === "PLT-01").map(e => ({ employee_no: e.employeeNo, name: e.name, department: e.department, area: "", plant_code: e.plantCode, role: "employee" as const, ntid: e.ntid, email: e.email })));
    });
  }, [plant]);

  // ── Filtered suggestions: only "Approved & Closed", exclude Daily CIP, must have positive amount ──
  const filteredData = useMemo(() => {
    return allSuggestions.filter(s => {
      if (fromDate && s.date < fromDate) return false;
      if (toDate && s.date > toDate) return false;
      if (s.status !== "Approved & Closed") return false;
      if (s.type === "Daily CIP") return false;
      if (!s.awardAmount || s.awardAmount <= 0) return false;
      return true;
    });
  }, [allSuggestions, fromDate, toDate]);

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

      const fd: Record<string, unknown> = s.formData || {};
      const isOnBehalf = fd.suggestionFor === "behalf" && fd.mainSuggestor;
      const isGroup = fd.groupSuggestion === "yes";
      const teamMembers: string[] = Array.isArray(fd.teamMembers) ? (fd.teamMembers as string[]) : [];
      const suggNo = String(s.suggestionNo || s.id);
      const sType = s.type || "—";

      // Determine the primary person (who gets the award / is included in the split)
      // On-behalf: mainSuggestor is the primary person, registering employee is excluded
      // Self: registering employee is the primary person
      const primaryEmpNo = isOnBehalf ? (fd.mainSuggestor as string) : (s.employeeNo || "");
      const primaryName = isOnBehalf ? undefined : (s.employeeName || undefined);
      const primaryDept = isOnBehalf ? undefined : (s.department || undefined);

      // Build unique recipients list: primary + team members (if group) + moderator(s).
      // Shop Floor CIP always shares the award with its moderator, group or not.
      const recipientSet = new Set<string>();
      if (primaryEmpNo) recipientSet.add(primaryEmpNo);
      if (isGroup) {
        for (const m of teamMembers) {
          if (m) recipientSet.add(m);
        }
      }
      if (sType === "Shop Floor CIP") {
        const moderators: string[] = Array.isArray(fd.moderators) ? (fd.moderators as string[]) : (fd.moderator ? [fd.moderator as string] : []);
        for (const m of moderators) {
          if (m) recipientSet.add(m);
        }
      }
      const recipients = Array.from(recipientSet);

      if (recipients.length > 1) {
        // ── Multiple recipients (group and/or moderator): equal split ──
        // Custom teamMemberShares from the form are unreliable because they
        // may not include the primary person or the moderator, so always
        // split equally. Each share keeps one decimal place; any residual
        // amount left over from truncating the extra decimals is added to
        // the first recipient so the full award is always distributed.
        const count = recipients.length;
        const perShare = Math.floor((award / count) * 10) / 10;
        const distributed = Math.round(perShare * count * 10) / 10;
        const remainder = Math.round((award - distributed) * 10) / 10;

        recipients.forEach((recipientId, idx) => {
          const memberAmount = idx === 0 ? Math.round((perShare + remainder) * 10) / 10 : perShare;
          if (memberAmount <= 0) return;
          const sharePercent = Math.round((memberAmount / award) * 10000) / 100;

          const row = ensureRow(recipientId, recipientId === primaryEmpNo ? primaryName : undefined, recipientId === primaryEmpNo ? primaryDept : undefined);
          row.totalAmount = Math.round((row.totalAmount + memberAmount) * 10) / 10;
          row.suggestionCount += 1;
          row.details.push({ suggNo, type: sType, fullAmount: award, share: memberAmount, sharePercent });
          if (s.date && s.date > row.latestDate) row.latestDate = s.date;
        });
      } else if (primaryEmpNo) {
        // ── Single recipient: full award goes to the primary person ──
        const row = ensureRow(primaryEmpNo, primaryName, primaryDept);
        row.totalAmount += award;
        row.suggestionCount += 1;
        row.details.push({ suggNo, type: sType, fullAmount: award, share: award, sharePercent: 100 });
        if (s.date && s.date > row.latestDate) row.latestDate = s.date;
      }
    });

    return Array.from(empMap.values()).sort((a, b) => a.empName.localeCompare(b.empName));
  }, [filteredData, empLookup]);

  const neftGrandTotal = useMemo(() => neftRows.reduce((sum, r) => sum + r.totalAmount, 0), [neftRows]);

  const getReportData = () => {
    // ── NEFT Report: aggregated by employee with distribution details ──
    const headers = ["SNo", "Emp No", "Employee Name", "Department", "Total Amount (₹)"];
    const rows = neftRows.map((r, i) => [
      String(i + 1),
      r.empNo,
      r.empName,
      r.department,
      `₹${r.totalAmount.toLocaleString()}`,
    ]);
    return { headers, rows };
  };

  const handleGenerate = () => {
    setShowResults(true);
    setCurrentPage(1);
    toast.success(`Generated ${neftRows.length} employee(s) from ${filteredData.length} suggestion(s)`);
  };

  const handleExportExcel = () => {
    const { headers, rows } = getReportData();
    const filters: Record<string, string> = {
      "Report Type": "NEFT Report",
      ...(fromDate ? { "From Date": formatDate(fromDate) } : {}),
      ...(toDate ? { "To Date": formatDate(toDate) } : {}),
      "Total Employees": String(neftRows.length),
      "Grand Total": `₹${neftGrandTotal.toLocaleString()}`,
    };
    downloadXLSX(
      "NEFT Report",
      headers,
      rows,
      `NEFT_Report_${fromDate || "all"}_to_${toDate || "all"}.xlsx`,
      filters,
    );
    toast.success("Excel (.xlsx) downloaded!");
  };

  const handleExportPDF = () => {
    const { headers, rows } = getReportData();
    downloadTablePDF("NEFT Report", headers, rows, `NEFT_Report_${fromDate || "all"}_to_${toDate || "all"}.pdf`);
    toast.success("PDF report downloaded!");
  };

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  const activeRowCount = neftRows.length;
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
        NEFT Report <span className="text-sm font-normal text-muted-foreground">/ {t("NEFT Report")}</span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date <span className="text-[9px] opacity-70">/ {t("From Date")}</span></Label>
              <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setShowResults(false); }} className={fromDate ? "filter-active" : ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date <span className="text-[9px] opacity-70">/ {t("To Date")}</span></Label>
              <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setShowResults(false); }} className={toDate ? "filter-active" : ""} />
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
          Select a date range, then click Generate to preview the NEFT report
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Report: NEFT Report | Total Records: {activeRowCount}
              {activeRowCount > 0 && ` — showing ${pageStart + 1}–${Math.min(pageEnd, activeRowCount)}`}
              {fromDate && ` | From: ${fromDate}`}
              {toDate && ` | To: ${toDate}`}
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700 px-3 py-1 rounded-lg">
              Grand Total: ₹{neftGrandTotal.toLocaleString()}
            </span>
          </div>

          {/* ── NEFT Report — aggregated per employee with distribution ── */}
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
                      <th className="pb-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-right"><TH en="Amount" /> (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neftRows.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No approved & closed suggestions found for this period</td></tr>
                    ) : (
                      <>
                        {neftRows.slice(pageStart, pageEnd).map((r, i) => (
                          <tr key={r.empNo} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 text-xs text-muted-foreground sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{pageStart + i + 1}</td>
                            <td className="py-2.5 px-3 text-xs font-mono">{r.empNo}</td>
                            <td className="py-2.5 px-3 text-xs font-semibold">{r.empName}</td>
                            <td className="py-2.5 px-3 text-xs">{r.department}</td>
                            <td className="py-2.5 px-3 text-xs">{formatDate(r.latestDate)}</td>
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
        </>
      )}
    </div>
  );
};

export default NeftReport;

