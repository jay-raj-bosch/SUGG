import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { suggestionTypes } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { usePlant } from "@/contexts/PlantContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/pdfUtils";
import { toast } from "sonner";

const monthlyData = [
  { month: "Jan", suggestions: 45, implemented: 38, target: 50, awards: 12 },
  { month: "Feb", suggestions: 52, implemented: 44, target: 50, awards: 15 },
  { month: "Mar", suggestions: 61, implemented: 55, target: 50, awards: 18 },
  { month: "Apr", suggestions: 48, implemented: 40, target: 50, awards: 10 },
  { month: "May", suggestions: 55, implemented: 49, target: 50, awards: 14 },
  { month: "Jun", suggestions: 70, implemented: 63, target: 50, awards: 22 },
  { month: "Jul", suggestions: 42, implemented: 35, target: 50, awards: 9 },
  { month: "Aug", suggestions: 58, implemented: 51, target: 50, awards: 16 },
  { month: "Sep", suggestions: 65, implemented: 60, target: 50, awards: 20 },
  { month: "Oct", suggestions: 53, implemented: 47, target: 50, awards: 13 },
  { month: "Nov", suggestions: 49, implemented: 43, target: 50, awards: 11 },
  { month: "Dec", suggestions: 72, implemented: 68, target: 50, awards: 24 },
];

const PIE_COLORS = [
  "hsl(215, 70%, 28%)", "hsl(174, 55%, 40%)", "hsl(45, 93%, 47%)", "hsl(0, 72%, 51%)",
  "hsl(262, 52%, 47%)", "hsl(24, 95%, 53%)", "hsl(190, 70%, 40%)", "hsl(330, 65%, 50%)"
];

const MisGraphical = () => {
  const { t } = useLanguage();
  const { plant } = usePlant();
  const [year, setYear] = useState("2026");
  const [filterType, setFilterType] = useState("all");
  const { getSubmittedSuggestions } = useSuggestions();
  const allSuggestions = getSubmittedSuggestions();
  const [departmentStats, setDepartmentStats] = useState<apiService.DeptStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<apiService.CategoryStats[]>([]);

  // Load stats from backend on mount — re-run if plant changes
  useEffect(() => {
    apiService.fetchDeptStats(plant as "bidp" | "jap").then(setDepartmentStats).catch(() => {
      setDepartmentStats([
        { dept: "BIDP1/TEF", total: 45, implemented: 38, pending: 5, rejected: 2, participation: 92 },
        { dept: "BIDP2/QAL", total: 32, implemented: 25, pending: 4, rejected: 3, participation: 85 },
        { dept: "BIDP1/MNT", total: 28, implemented: 22, pending: 4, rejected: 2, participation: 78 },
        { dept: "BIDP1/SAF", total: 15, implemented: 12, pending: 2, rejected: 1, participation: 72 },
        { dept: "BIDP1/HRD", total: 8,  implemented: 5,  pending: 2, rejected: 1, participation: 45 },
      ]);
    });
    apiService.fetchCategoryStats(plant as "bidp" | "jap").then(setCategoryStats).catch(() => {
      setCategoryStats([
        { name: "Safety", value: 35 }, { name: "Quality", value: 28 },
        { name: "Productivity", value: 42 }, { name: "Cost Reduction", value: 22 },
        { name: "Energy Saving", value: 18 }, { name: "5S / Housekeeping", value: 15 },
        { name: "Ergonomics", value: 10 }, { name: "Environment", value: 8 },
      ]);
    });
  }, [plant]);

  const totalSuggestions = allSuggestions.length;
  const implemented = allSuggestions.filter(s => s.status === "Implemented" || s.status === "Approved").length;
  const pending = allSuggestions.filter(s => ["Submitted", "Under Evaluation", "Pending FLM", "Pending BPS"].includes(s.status)).length;
  const avgLeadTime = 4.2;
  const participationRate = 78;

  const kpiData = [
    { label: "Total Suggestions", value: totalSuggestions.toString(), subLabel: t("Total Suggestions"), color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Implemented", value: `${implemented}`, subLabel: `${((implemented / totalSuggestions) * 100).toFixed(0)}% rate`, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Pending", value: pending.toString(), subLabel: t("Pending"), color: pending > 5 ? "text-destructive" : "text-primary", bgColor: pending > 5 ? "bg-destructive/10" : "bg-primary/10" },
    { label: "Avg Lead Time", value: `${avgLeadTime} days`, subLabel: avgLeadTime <= 5 ? "Within target" : "Exceeds target", color: avgLeadTime <= 5 ? "text-primary" : "text-destructive", bgColor: avgLeadTime <= 5 ? "bg-primary/10" : "bg-destructive/10" },
    { label: "Participation", value: `${participationRate}%`, subLabel: participationRate >= 80 ? "Good" : "Below target (80%)", color: participationRate >= 80 ? "text-primary" : "text-warning", bgColor: participationRate >= 80 ? "bg-primary/10" : "bg-warning/10" },
    { label: "Total Awards", value: `₹${allSuggestions.reduce((s, sg) => s + (sg.awardAmount || 0), 0).toLocaleString()}`, subLabel: `${allSuggestions.filter(s => s.awardAmount).length} awards`, color: "text-primary", bgColor: "bg-primary/10" },
  ];

  const handleExport = () => {
    const headers = ["Department", "Total", "Implemented", "Pending", "Rejected", "Participation %"];
    const rows = departmentStats.map(d => [d.dept, String(d.total), String(d.implemented), String(d.pending), String(d.rejected), `${d.participation}%`]);
    downloadCSV(headers, rows, `MIS_Report_${year}.csv`);
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
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {suggestionTypes.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={handleExport}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </div>

      {/* Traffic Light Legend */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary" /> &gt;90% (On Track)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-warning" /> 70–90% (Monitor)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-destructive" /> &lt;70% (Action Needed)
        </span>
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
                <Bar dataKey="suggestions" fill="hsl(215, 70%, 28%)" name="Submitted" radius={[2, 2, 0, 0]} />
                <Bar dataKey="implemented" fill="hsl(174, 55%, 40%)" name="Implemented" radius={[2, 2, 0, 0]} />
                <Bar dataKey="awards" fill="hsl(45, 93%, 47%)" name="Awards" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trend Analysis & Target</CardTitle>
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
                <Line type="monotone" dataKey="target" stroke="hsl(0, 72%, 51%)" name="Target" strokeDasharray="5 5" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {categoryStats.map((_, i) => (
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
            <CardTitle className="text-sm">Department-wise Performance</CardTitle>
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

      {/* Department Table */}
      <Card className="card-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Department-wise Summary</CardTitle>
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
                {departmentStats.map(d => (
                  <tr key={d.dept} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2 font-medium text-xs">{d.dept}</td>
                    <td className="py-2 px-2 text-center text-xs">{d.total}</td>
                    <td className="py-2 px-2 text-center text-xs">{d.implemented}</td>
                    <td className="py-2 px-2 text-center text-xs">{d.pending}</td>
                    <td className="py-2 px-2 text-center text-xs">{d.rejected}</td>
                    <td className="py-2 px-2 text-center text-xs font-semibold">{d.participation}%</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${
                        d.participation >= 90 ? "bg-primary" : d.participation >= 70 ? "bg-warning" : "bg-destructive"
                      }`} />
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="py-2 px-2 text-xs">Total</td>
                  <td className="py-2 px-2 text-center text-xs">{departmentStats.reduce((s, d) => s + d.total, 0)}</td>
                  <td className="py-2 px-2 text-center text-xs">{departmentStats.reduce((s, d) => s + d.implemented, 0)}</td>
                  <td className="py-2 px-2 text-center text-xs">{departmentStats.reduce((s, d) => s + d.pending, 0)}</td>
                  <td className="py-2 px-2 text-center text-xs">{departmentStats.reduce((s, d) => s + d.rejected, 0)}</td>
                  <td className="py-2 px-2 text-center text-xs">
                    {(departmentStats.reduce((s, d) => s + d.participation, 0) / departmentStats.length).toFixed(0)}%
                  </td>
                  <td className="py-2 px-2" />
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MisGraphical;
