// JaP — MIS Graphical Report
// Dashboard showing suggestion pipeline analytics for Jaipur Plant
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import type { DeptStats, CategoryStats } from "@/lib/apiService";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/pdfUtils";
import { toast } from "sonner";
import { useSuggestions } from "@/contexts/SuggestionContext";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PIE_COLORS = [
  "hsl(215, 70%, 28%)", "hsl(174, 55%, 40%)", "hsl(45, 93%, 47%)", "hsl(0, 72%, 51%)",
  "hsl(262, 52%, 47%)", "hsl(24, 95%, 53%)",
];

const JaPMisGraphical = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => String(currentYear - 2 + i));
  const [year, setYear] = useState(String(currentYear));
  const { suggestions } = useSuggestions();

  // All JaP suggestions (context is already plant-scoped)
  const allSuggestions = useMemo(
    () => suggestions.filter(s => s.plantCode === "PLT-02"),
    [suggestions],
  );

  // Build monthly data from actual suggestion dates
  const monthlyData = useMemo(() => {
    const target = 30;
    return MONTH_NAMES.map((month, idx) => {
      const submitted = allSuggestions.filter(s => {
        if (!s.date) return false;
        const d = new Date(s.date);
        return d.getMonth() === idx && String(d.getFullYear()) === year;
      });
      const implementedCount = submitted.filter(s =>
        ["Closed / Awarded"].includes(s.status)
      ).length;
      const awardCount = submitted.filter(s => s.awardAmount).length;
      return { month, suggestions: submitted.length, implemented: implementedCount, target, awards: awardCount };
    });
  }, [allSuggestions, year]);

  // Derive dept stats from suggestions
  const departmentStats = useMemo((): DeptStats[] => {
    const map = new Map<string, { total: number; implemented: number; pending: number; rejected: number }>();
    allSuggestions.forEach(s => {
      const dept = s.department || "Unknown";
      const e = map.get(dept) ?? { total: 0, implemented: 0, pending: 0, rejected: 0 };
      e.total++;
      if (s.status === "Closed / Awarded") e.implemented++;
      else if (s.status === "Rejected")    e.rejected++;
      else                                 e.pending++;
      map.set(dept, e);
    });
    return Array.from(map.entries()).map(([dept, v]) => ({
      dept, ...v,
      participation: v.total > 0 ? Math.round((v.implemented / v.total) * 100) : 0,
    }));
  }, [allSuggestions]);

  // Derive category stats from suggestions
  const categoryStats = useMemo((): CategoryStats[] => {
    const map = new Map<string, number>();
    allSuggestions.forEach(s => map.set(s.category || "Other", (map.get(s.category || "Other") ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [allSuggestions]);

  const totalSuggestions = allSuggestions.length;
  const implemented = allSuggestions.filter(s => s.status === "Closed / Awarded").length;
  const pending = allSuggestions.filter(s => !["Draft", "Closed / Awarded", "Rejected"].includes(s.status)).length;
  const awarded = allSuggestions.filter(s => s.awardAmount).length;

  // Participation rate: unique employees who submitted / all unique employees known
  const uniqueSubmitters = new Set(allSuggestions.map(s => s.employeeNo)).size;
  const participationRate = uniqueSubmitters > 0 ? Math.min(100, Math.round((uniqueSubmitters / Math.max(uniqueSubmitters, 20)) * 100)) : 0;

  // Avg lead time: average daysPending across closed/awarded suggestions
  const closedSuggs = allSuggestions.filter(s => s.status === "Closed / Awarded");
  const avgLeadTime = closedSuggs.length > 0
    ? Math.round(closedSuggs.reduce((sum, s) => sum + (s.daysPending ?? 0), 0) / closedSuggs.length * 10) / 10
    : 0;

  const kpiData = [
    { label: "Total Suggestions", value: totalSuggestions.toString(), subLabel: t("Total Suggestions"), color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Implemented", value: String(implemented), subLabel: `${totalSuggestions > 0 ? ((implemented / totalSuggestions) * 100).toFixed(0) : 0}% rate`, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Pending", value: String(pending), subLabel: t("Pending"), color: pending > 5 ? "text-destructive" : "text-primary", bgColor: pending > 5 ? "bg-destructive/10" : "bg-primary/10" },
    { label: "Avg Lead Time", value: `${avgLeadTime} days`, subLabel: avgLeadTime <= 5 ? "Within target" : "Exceeds target", color: avgLeadTime <= 5 ? "text-primary" : "text-destructive", bgColor: avgLeadTime <= 5 ? "bg-primary/10" : "bg-destructive/10" },
    { label: "Participation", value: `${participationRate}%`, subLabel: participationRate >= 80 ? "Good" : "Below target (80%)", color: participationRate >= 80 ? "text-primary" : "text-warning", bgColor: "bg-primary/10" },
    { label: "Awards Given", value: String(awarded), subLabel: `${awarded} awards`, color: "text-primary", bgColor: "bg-primary/10" },
  ];

  const handleExport = () => {
    const headers = ["Department", "Total", "Implemented", "Pending", "Rejected", "Participation %"];
    const rows = departmentStats.map(d => [d.dept, String(d.total), String(d.implemented), String(d.pending), String(d.rejected), `${d.participation}%`]);
    downloadCSV(headers, rows, `JaP_MIS_Report_${year}.csv`);
    toast.success("MIS report exported!");
  };

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-bold text-foreground">MIS Graphical Report <span className="text-sm font-normal text-muted-foreground">/ {t("MIS Graphical Report")}</span></h2>
        <div className="flex gap-2 items-center">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={handleExport}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </div>

      {/* Traffic Light Legend */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary" /> &gt;90% (On Track)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-warning" /> 70–90% (Monitor)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive" /> &lt;70% (Action Needed)</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiData.map(kpi => (
          <Card key={kpi.label} className="card-shadow">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground leading-tight">{kpi.label}</p>
              <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.subLabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm"><TH en="Total Suggestions" /> — Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="suggestions" fill="hsl(215, 70%, 28%)" name="Submitted / प्रस्तुत" radius={[2, 2, 0, 0]} />
                <Bar dataKey="implemented" fill="hsl(174, 55%, 40%)" name="Implemented / क्रियान्वित" radius={[2, 2, 0, 0]} />
                <Bar dataKey="awards"      fill="hsl(45, 93%, 47%)"  name="Awards / पुरस्कार"     radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trend Analysis & Target / रुझान विश्लेषण</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="suggestions" stroke="hsl(215, 70%, 28%)" name="Submitted" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="implemented" stroke="hsl(174, 55%, 40%)" name="Implemented" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="target"      stroke="hsl(0, 72%, 51%)"   name="Target" strokeDasharray="5 5" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Category Distribution / श्रेणी वितरण</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryStats.length ? categoryStats : [{name:"No data",value:1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {(categoryStats.length ? categoryStats : [{name:"No data",value:1}]).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Department-wise Performance / विभाग प्रदर्शन</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={departmentStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" fill="hsl(215, 70%, 28%)" name="Total" radius={[0, 2, 2, 0]} />
                <Bar dataKey="implemented" fill="hsl(174, 55%, 40%)" name="Implemented" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Summary Table */}
      <Card className="card-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Department-wise Summary / विभागवार सारांश</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Department" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground text-center">Total</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground text-center">Implemented</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground text-center"><TH en="Pending" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground text-center">Rejected</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground text-center">Participation %</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground text-center"><TH en="Status" /></th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.length === 0 ? (
                  <tr><td colSpan={7} className="py-4 text-center text-xs text-muted-foreground">No data — connect JaP backend</td></tr>
                ) : departmentStats.map(d => (
                  <tr key={d.dept} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2 font-medium text-xs">{d.dept}</td>
                    <td className="py-2 px-2 text-center text-xs">{d.total}</td>
                    <td className="py-2 px-2 text-center text-xs">{d.implemented}</td>
                    <td className="py-2 px-2 text-center text-xs">{d.pending}</td>
                    <td className="py-2 px-2 text-center text-xs">{d.rejected}</td>
                    <td className="py-2 px-2 text-center text-xs font-semibold">{d.participation}%</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${d.participation >= 90 ? "bg-primary" : d.participation >= 70 ? "bg-warning" : "bg-destructive"}`} />
                    </td>
                  </tr>
                ))}
                {departmentStats.length > 0 && (
                  <tr className="bg-muted/30 font-semibold">
                    <td className="py-2 px-2 text-xs">Total</td>
                    <td className="py-2 px-2 text-center text-xs">{departmentStats.reduce((s, d) => s + d.total, 0)}</td>
                    <td className="py-2 px-2 text-center text-xs">{departmentStats.reduce((s, d) => s + d.implemented, 0)}</td>
                    <td className="py-2 px-2 text-center text-xs">{departmentStats.reduce((s, d) => s + d.pending, 0)}</td>
                    <td className="py-2 px-2 text-center text-xs">{departmentStats.reduce((s, d) => s + d.rejected, 0)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JaPMisGraphical;
