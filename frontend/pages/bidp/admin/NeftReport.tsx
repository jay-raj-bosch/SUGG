// NeftReport — fetches suggestions and employees from backend API
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { statusColors, ranges } from "@/lib/mockData";
import type { Suggestion } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { downloadCSV, downloadTablePDF } from "@/lib/pdfUtils";

const reportTypes = ["NEFT Report", "Manpower Report", "Employee Involvement", "Non-Participant Report"];

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

  // Load data from backend on mount
  useEffect(() => {
    apiService.fetchSuggestions({ limit: 2000 }).then(r => setAllSuggestions(r.data)).catch(() => {});
    apiService.fetchEmployees().then(setAllEmployees).catch(() => {});
  }, []);

  const isManpower           = reportType === "Manpower Report";
  const isNonParticipant      = reportType === "Non-Participant Report";
  const isEmployeeInvolvement = reportType === "Employee Involvement";
  const isRangeReport         = isManpower;

  const filteredData = useMemo(() => {
    return allSuggestions.filter(s => {
      if (isRangeReport) {
        if (range !== "all" && s.range !== range) return false;
        return true;
      }
      if (fromDate && s.date < fromDate) return false;
      if (toDate && s.date > toDate) return false;
      if (reportType === "NEFT Report") return !!s.awardAmount;
      if (reportType === "Employee Involvement") {
        if (range !== "all" && s.range !== range) return false;
        return true;
      }
      if (isNonParticipant) {
        if (range !== "all" && s.range !== range) return false;
        return true; // identifies participants; non-participants derived in getNonParticipantRows
      }
      return true;
    });
  }, [allSuggestions, isRangeReport, range, fromDate, toDate, reportType, isNonParticipant]);

  const getFilteredData = () => filteredData;

  const getReportData = () => {
    if (isManpower) {
      const headers = ["Sno", "Employee Name", "Employee Number", "Range", "Department", "Category"];
      const rows = filteredData.map((s, i) => [
        String(i + 1),
        s.employeeName || "",
        s.employeeNo || "",
        s.range || "",
        s.department || "",
        s.category,
      ]);
      return { headers, rows };
    }
    if (isEmployeeInvolvement) {
      const empMap = new Map<string, { empNo: string; empName: string; category: string; dept: string; CTF: number; SFC: number; SSS: number; MIC: number; DCIP: number }>();
      filteredData.forEach(s => {
        const key = s.employeeNo || s.id;
        if (!empMap.has(key)) empMap.set(key, { empNo: s.employeeNo || "", empName: s.employeeName || "", category: s.category, dept: s.department || "", CTF: 0, SFC: 0, SSS: 0, MIC: 0, DCIP: 0 });
        const r = empMap.get(key)!;
        if (s.type === "Cash The Flash") r.CTF++;
        else if (s.type === "Shop Floor CIP") r.SFC++;
        else if (s.type === "Simple Suggestion Scheme") r.SSS++;
        else if (s.type === "My Idea Card") r.MIC++;
        else if (s.type === "Daily CIP") r.DCIP++;
      });
      const empRows = Array.from(empMap.values());
      const headers = ["SNo", "Employee No", "Employee Name", "Employee Category", "Employee Department", "CTF", "SFC", "SSS", "MIC", "DCIP", "Total"];
      const rows = empRows.map((r, i) => [
        String(i + 1), r.empNo, r.empName, r.category, r.dept,
        String(r.CTF), String(r.SFC), String(r.SSS), String(r.MIC), String(r.DCIP),
        String(r.CTF + r.SFC + r.SSS + r.MIC + r.DCIP),
      ]);
      return { headers, rows };
    }
    if (isNonParticipant) {
      const headers = ["Sno", "Employee Name", "Employee Number", "Department", "Category"];
      const rows = npRows.map((e, i) => [String(i + 1), e.name, e.employeeNo, e.department, e.category]);
      return { headers, rows };
    }
    const headers = ["Suggestion No", "Employee", "Range", "Type", "Category", "Status", "Date", "Award Amount"];
    const rows = getFilteredData().map(s => [
      s.suggestionNo,
      s.employeeName || "",
      s.range || "",
      s.type,
      s.category,
      s.status,
      s.date,
      s.awardAmount ? `₹${s.awardAmount}` : "-",
    ]);
    return { headers, rows };
  };

  const handleGenerate = () => {
    if (!reportType) { toast.error("Please select a report type"); return; }
    setShowResults(true);
    setCurrentPage(1);
    toast.success(`Generated ${getFilteredData().length} record(s)`);
  };

  const handleExportExcel = () => {
    if (!reportType) { toast.error("Please select a report type"); return; }
    const { headers, rows } = getReportData();
    downloadCSV(headers, rows, `${reportType.replace(/\s/g, "_")}_${fromDate || "all"}_to_${toDate || "all"}.csv`);
    toast.success("Excel (CSV) downloaded!");
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

  const getInvolvementRows = () => {
    const empMap = new Map<string, { empNo: string; empName: string; category: string; dept: string; CTF: number; SFC: number; SSS: number; MIC: number; DCIP: number }>();
    filteredData.forEach(s => {
      const key = s.employeeNo || s.id;
      if (!empMap.has(key)) empMap.set(key, { empNo: s.employeeNo || "—", empName: s.employeeName || "—", category: s.category, dept: s.department || "—", CTF: 0, SFC: 0, SSS: 0, MIC: 0, DCIP: 0 });
      const r = empMap.get(key)!;
      if (s.type === "Cash The Flash") r.CTF++;
      else if (s.type === "Shop Floor CIP") r.SFC++;
      else if (s.type === "Simple Suggestion Scheme") r.SSS++;
      else if (s.type === "My Idea Card") r.MIC++;
      else if (s.type === "Daily CIP") r.DCIP++;
    });
    return Array.from(empMap.values());
  };
  const invRows        = isEmployeeInvolvement ? getInvolvementRows() : [];

  const getNonParticipantRows = () => {
    const participantNos = new Set(filteredData.map(s => s.employeeNo).filter(Boolean));
    return allEmployees.map(e => ({ employeeNo: e.employee_no, name: e.name, department: e.department, category: "M&SS" })).filter(e => !participantNos.has(e.employeeNo));
  };
  const npRows = isNonParticipant ? getNonParticipantRows() : [];
  const totalManpower  = allEmployees.length;
  const involved       = invRows.length;
  const notInvolved    = Math.max(0, totalManpower - involved);
  const involvementPct = totalManpower > 0 ? ((involved / totalManpower) * 100).toFixed(1) : "0.0";
  const period         = `${fromDate || "—"} - ${toDate || "—"}`;

  const activeRowCount = isEmployeeInvolvement ? invRows.length : isNonParticipant ? npRows.length : filteredData.length;
  const totalPages     = Math.max(1, Math.ceil(activeRowCount / rowsPerPage));
  const pageStart      = (currentPage - 1) * rowsPerPage;
  const pageEnd        = currentPage * rowsPerPage;

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
                <SelectTrigger><SelectValue placeholder="Select report" /></SelectTrigger>
                <SelectContent>
                  {reportTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Date <span className="text-[9px] opacity-70">/ {t("From Date")}</span></Label>
              <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setShowResults(false); }} disabled={isRangeReport} className={isRangeReport ? "opacity-30 cursor-not-allowed" : ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date <span className="text-[9px] opacity-70">/ {t("To Date")}</span></Label>
              <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setShowResults(false); }} disabled={isRangeReport} className={isRangeReport ? "opacity-30 cursor-not-allowed" : ""} />
            </div>
            {(isRangeReport || isNonParticipant || isEmployeeInvolvement) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Range <span className="text-[9px] opacity-70">/ {t("Range")}</span></Label>
                <Select value={range} onValueChange={v => { setRange(v); setShowResults(false); }}>
                  <SelectTrigger><SelectValue placeholder="All Ranges" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ranges</SelectItem>
                    {ranges.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
              {isRangeReport
                ? ` | Range: ${range === "all" ? "All Ranges" : range}`
                : <>
                    {fromDate && ` | From: ${fromDate}`}
                    {toDate && ` | To: ${toDate}`}
                    {(isNonParticipant || isEmployeeInvolvement) && ` | Range: ${range === "all" ? "All Ranges" : range}`}
                  </>}
            </span>
            {reportType === "NEFT Report" && (
              <span className="text-xs font-medium text-primary">
                Total NEFT: ₹{filteredData.reduce((sum, s) => sum + (s.awardAmount || 0), 0).toLocaleString()}
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
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Range</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Department</th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length === 0 ? (
                        <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No records match the criteria</td></tr>
                      ) : (
                        filteredData.slice(pageStart, pageEnd).map((s, i) => (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-2 text-xs text-muted-foreground sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{pageStart + i + 1}</td>
                            <td className="py-2 px-2 text-xs font-medium">{s.employeeName || "—"}</td>
                            <td className="py-2 px-2 text-xs font-mono">{s.employeeNo || "—"}</td>
                            <td className="py-2 px-2 text-xs font-medium">{s.range || "—"}</td>
                            <td className="py-2 px-2 text-xs">{s.department || "—"}</td>
                            <td className="py-2 px-2 text-xs">
                              <span className="inline-block bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium">{s.category}</span>
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
                          <td className="py-2 px-3 font-medium">BidP Plant</td>
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
                          <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Employee Category</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Employee Department</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground text-center">CTF</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground text-center">SFC</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground text-center">SSS</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground text-center">MIC</th>
                          <th className="pb-2 px-2 font-medium text-muted-foreground text-center">DCIP</th>
                          <th className="pb-2 px-2 font-medium text-foreground text-center font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invRows.length === 0 ? (
                          <tr><td colSpan={11} className="py-8 text-center text-muted-foreground">No records match the criteria</td></tr>
                        ) : (
                          invRows.slice(pageStart, pageEnd).map((r, i) => {
                            const total = r.CTF + r.SFC + r.SSS + r.MIC + r.DCIP;
                            return (
                              <tr key={r.empNo + i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="py-2 px-2 text-muted-foreground sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{pageStart + i + 1}</td>
                                <td className="py-2 px-2 font-mono">{r.empNo}</td>
                                <td className="py-2 px-2 whitespace-nowrap font-medium">{r.empName}</td>
                                <td className="py-2 px-2">
                                  <span className="inline-block bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium">{r.category}</span>
                                </td>
                                <td className="py-2 px-2">{r.dept}</td>
                                <td className="py-2 px-2 text-center">{r.CTF}</td>
                                <td className="py-2 px-2 text-center">{r.SFC}</td>
                                <td className="py-2 px-2 text-center">{r.SSS}</td>
                                <td className="py-2 px-2 text-center">{r.MIC}</td>
                                <td className="py-2 px-2 text-center">{r.DCIP}</td>
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
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <div className="overflow-auto max-h-[520px] rounded-md border">
                  <table className="min-w-[800px] text-sm">
                    <thead className="sticky top-0 z-20">
                      <tr className="border-b text-left bg-muted/90">
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-30 bg-muted/90 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]"><TH en="Suggestion No" /></th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Employee" /></th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Range" /></th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Type" /></th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Category" /></th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Status" /></th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap"><TH en="Date" /></th>
                        <th className="pb-2 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap text-right"><TH en="Amount" /> (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length === 0 ? (
                        <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No records match the criteria</td></tr>
                      ) : (
                        filteredData.slice(pageStart, pageEnd).map(s => (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-2 font-mono text-xs sticky left-0 z-10 bg-background border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">{s.suggestionNo}</td>
                            <td className="py-2 px-2 text-xs">
                              <div>{s.employeeName}</div>
                              <div className="text-muted-foreground">{s.employeeNo}</div>
                            </td>
                            <td className="py-2 px-2 text-xs font-medium">{s.range || "—"}</td>
                            <td className="py-2 px-2 text-xs text-muted-foreground">{s.type}</td>
                            <td className="py-2 px-2 text-xs">{s.category}</td>
                            <td className="py-2 px-2">
                              <Badge variant="outline" className={`text-[10px] ${statusColors[s.status] || ""}`}>{s.status}</Badge>
                            </td>
                            <td className="py-2 px-2 text-xs">{s.date}</td>
                            <td className="py-2 px-2 text-xs text-right font-semibold">
                              {s.awardAmount ? `₹${s.awardAmount.toLocaleString()}` : "-"}
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

export default NeftReport;
