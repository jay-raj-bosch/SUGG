// KioskMyAwards — mirrors employee MyAwards (table + filters)
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Trophy, X } from "lucide-react";
import { useState, useMemo } from "react";

const KioskMyAwards = () => {
  const { getAwardedSuggestions } = useSuggestions();
  const { t } = useLanguage();
  const allAwards = getAwardedSuggestions();

  const [nameFilter, setNameFilter] = useState("");
  const [empNoFilter, setEmpNoFilter] = useState("");
  const [suggNoFilter, setSuggNoFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    const cats = new Set(allAwards.map(a => a.awardCategory).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [allAwards]);

  const awards = useMemo(() => {
    return allAwards.filter(a => {
      if (nameFilter.trim() && !a.employeeName?.toLowerCase().includes(nameFilter.trim().toLowerCase())) return false;
      if (empNoFilter.trim() && !a.employeeNo?.includes(empNoFilter.trim())) return false;
      if (suggNoFilter.trim() && !a.suggestionNo.toLowerCase().includes(suggNoFilter.trim().toLowerCase())) return false;
      if (dateFilter && (a.awardDate || a.date || "") < dateFilter) return false;
      if (categoryFilter !== "all" && a.awardCategory !== categoryFilter) return false;
      return true;
    });
  }, [allAwards, nameFilter, empNoFilter, suggNoFilter, dateFilter, categoryFilter]);

  const handleReset = () => {
    setNameFilter(""); setEmpNoFilter(""); setSuggNoFilter(""); setDateFilter(""); setCategoryFilter("all");
  };

  const hasFilter = nameFilter || empNoFilter || suggNoFilter || dateFilter || categoryFilter !== "all";

  return (
    <div className="max-w-5xl space-y-4">
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
                onChange={e => setNameFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Emp No <span className="text-[9px] opacity-70">/ {t("Employee No")}</span></Label>
              <Input
                className="h-8 text-xs"
                placeholder="Filter by emp no..."
                value={empNoFilter}
                onChange={e => setEmpNoFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Suggestion No <span className="text-[9px] opacity-70">/ {t("Suggestion No")}</span></Label>
              <Input
                className="h-8 text-xs"
                placeholder="Filter by suggestion no..."
                value={suggNoFilter}
                onChange={e => setSuggNoFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From Date <span className="text-[9px] opacity-70">/ {t("From Date")}</span></Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Award Category <span className="text-[9px] opacity-70">/ {t("Award Category")}</span></Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
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
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left bg-muted">
                <th className="pb-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                  Employee No <span className="text-[9px] opacity-70">/ {t("Employee No")}</span>
                </th>
                <th className="pb-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                  Employee Name <span className="text-[9px] opacity-70">/ {t("Name")}</span>
                </th>
                <th className="pb-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                  Employee Department <span className="text-[9px] opacity-70">/ {t("Department")}</span>
                </th>
                <th className="pb-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                  Suggestion No <span className="text-[9px] opacity-70">/ {t("Suggestion No")}</span>
                </th>
                <th className="pb-2 px-3 font-medium text-muted-foreground whitespace-nowrap text-right">
                  Amount <span className="text-[9px] opacity-70">/ {t("Amount")}</span>
                </th>
                <th className="pb-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                  Received Date <span className="text-[9px] opacity-70">/ {t("Award Date")}</span>
                </th>
                <th className="pb-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                  Award Category <span className="text-[9px] opacity-70">/ {t("Award Category")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {awards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    {hasFilter ? "No awards match your filters." : `No awards yet / ${t("No awards yet")}`}
                  </td>
                </tr>
              ) : awards.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono">{a.employeeNo || "—"}</td>
                  <td className="py-2.5 px-3 font-medium whitespace-nowrap">{a.employeeName || "—"}</td>
                  <td className="py-2.5 px-3">{a.department || "—"}</td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">{a.suggestionNo}</td>
                  <td className="py-2.5 px-3 font-bold text-primary text-right whitespace-nowrap">
                    ₹{a.awardAmount?.toLocaleString() || "—"}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{a.awardDate || a.date || "—"}</td>
                  <td className="py-2.5 px-3">
                    {a.awardCategory ? (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Trophy className="h-3 w-3 text-accent" />{a.awardCategory}
                      </Badge>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default KioskMyAwards;
