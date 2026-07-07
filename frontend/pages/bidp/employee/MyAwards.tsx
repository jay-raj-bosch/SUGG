// MyAwards — uses SuggestionContext (which fetches from backend)
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

const MyAwards = () => {
  const { getAwardedSuggestions } = useSuggestions();
  const { t } = useLanguage();
  const allAwards = getAwardedSuggestions();

  const [nameFilter, setNameFilter] = useState("");
  const [empNoFilter, setEmpNoFilter] = useState("");
  const [suggNoFilter, setSuggNoFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const awards = useMemo(() => {
    return allAwards.filter(a => {
      if (nameFilter.trim() && !a.employeeName?.toLowerCase().includes(nameFilter.trim().toLowerCase())) return false;
      if (empNoFilter.trim() && !a.employeeNo?.includes(empNoFilter.trim())) return false;
      if (suggNoFilter.trim() && !a.suggestionNo.toLowerCase().includes(suggNoFilter.trim().toLowerCase())) return false;
      const awardDate = a.awardDate || a.date || "";
      if (fromDate && awardDate < fromDate) return false;
      if (toDate && awardDate > toDate) return false;
      return true;
    });
  }, [allAwards, nameFilter, empNoFilter, suggNoFilter, fromDate, toDate]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(awards.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = awards.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const handleReset = () => {
    setNameFilter(""); setEmpNoFilter(""); setSuggNoFilter(""); setFromDate(""); setToDate("");
    setCurrentPage(1);
  };

  const hasFilter = nameFilter || empNoFilter || suggNoFilter || fromDate || toDate;

  return (
    <div className="flex flex-col h-full space-y-3">
      <h2 className="text-xl font-bold text-foreground">
        My Awards <span className="text-sm font-normal text-muted-foreground">/ {t("My Awards")}</span>
      </h2>

      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name <span className="text-[9px] opacity-70">/ {t("Name")}</span></Label>
              <Input
                className="h-8 text-xs"
                placeholder="Filter by name..."
                value={nameFilter}
                onChange={e => { setNameFilter(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Emp No <span className="text-[9px] opacity-70">/ {t("Employee No")}</span></Label>
              <Input
                className="h-8 text-xs"
                placeholder="Filter by emp no..."
                value={empNoFilter}
                onChange={e => { setEmpNoFilter(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Suggestion No <span className="text-[9px] opacity-70">/ {t("Suggestion No")}</span></Label>
              <Input
                className="h-8 text-xs"
                placeholder="Filter by suggestion no..."
                value={suggNoFilter}
                onChange={e => { setSuggNoFilter(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From Date <span className="text-[9px] opacity-70">/ {t("From Date")}</span></Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={fromDate}
                max={toDate || undefined}
                onChange={e => { setFromDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date <span className="text-[9px] opacity-70">/ {t("To Date")}</span></Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={toDate}
                min={fromDate || undefined}
                onChange={e => { setToDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          {hasFilter && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Showing {awards.length} of {allAwards.length} award(s)</span>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleReset}>
                <X className="h-3 w-3" /> Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-shadow">
        <CardContent className="pt-4">
          <div className="overflow-auto rounded-md border" style={{ maxHeight: "calc(100vh - 180px)" }}>
            <table className="min-w-[700px] w-full text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="border-b text-left bg-muted">
                  <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap w-12">Sl No</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                    Employee No <span className="text-[9px] opacity-70">/ {t("Employee No")}</span>
                  </th>
                  <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                    Employee Name <span className="text-[9px] opacity-70">/ {t("Name")}</span>
                  </th>
                  <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                    Department <span className="text-[9px] opacity-70">/ {t("Department")}</span>
                  </th>
                  <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                    Suggestion No <span className="text-[9px] opacity-70">/ {t("Suggestion No")}</span>
                  </th>
                  <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap text-right">
                    Amount <span className="text-[9px] opacity-70">/ {t("Amount")}</span>
                  </th>
                  <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                    Received Date <span className="text-[9px] opacity-70">/ {t("Award Date")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      {hasFilter ? "No awards match your filters." : `No awards yet / ${t("No awards yet")}`}
                    </td>
                  </tr>
                ) : pageRows.map((a, idx) => {
                  const slNo = (safePage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-muted-foreground">{slNo}</td>
                      <td className="py-2.5 px-3 font-mono">{a.employeeNo || "—"}</td>
                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">{a.employeeName || "—"}</td>
                      <td className="py-2.5 px-3">{a.department || "—"}</td>
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">{a.suggestionNo}</td>
                      <td className="py-2.5 px-3 font-bold text-primary text-right whitespace-nowrap">
                        ₹{a.awardAmount?.toLocaleString() || "—"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{a.awardDate || a.date || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40 mt-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page:</span>
              <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {awards.length > 0
                  ? `${(safePage - 1) * rowsPerPage + 1}–${Math.min(safePage * rowsPerPage, awards.length)} of ${awards.length}`
                  : "0 records"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAwards;
