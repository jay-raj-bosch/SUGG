// TODO [BACKEND]: Dashboard stats → GET /api/dashboard?employeeNo={user.employeeNo}
// TODO [BACKEND]: Recent suggestions → GET /api/suggestions?employeeNo={user.employeeNo}&limit=4&sort=date:desc
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColors, Suggestion } from "@/lib/mockData";
import { FilePlus, Clock, CheckCircle, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useLanguage } from "@/contexts/LanguageContext";

type FilterKey = "recent" | "total" | "pending" | "approved" | "awards";

const EmployeeHome = () => {
  const { user } = useAuth();
  const { suggestions, getPendingSuggestions, getAwardedSuggestions, getSuggestionsByStatus } = useSuggestions();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("recent");

  const empNo = user?.employeeNo;
  const mySuggestions = suggestions.filter(s => s.employeeNo === empNo);
  const pending = getPendingSuggestions().filter(s => s.employeeNo === empNo);
  const approved = getSuggestionsByStatus("Approved", "Implemented").filter(s => s.employeeNo === empNo);
  const awards = getAwardedSuggestions().filter(s => s.employeeNo === empNo);

  const stats = [
    { key: "total" as FilterKey, label: "Total Suggestions", value: mySuggestions.length, icon: FilePlus, color: "text-primary" },
    { key: "pending" as FilterKey, label: "Pending", value: pending.length, icon: Clock, color: "text-warning" },
    { key: "approved" as FilterKey, label: "Approved", value: approved.length, icon: CheckCircle, color: "text-success" },
    { key: "awards" as FilterKey, label: "Awards Earned", value: awards.length, icon: Trophy, color: "text-accent" },
  ];

  const filterDataMap: Record<FilterKey, { title: string; data: Suggestion[] }> = {
    recent: { title: "Recent Suggestions", data: mySuggestions.slice(0, 4) },
    total: { title: "All Suggestions", data: mySuggestions },
    pending: { title: "Pending Suggestions", data: pending },
    approved: { title: "Approved Suggestions", data: approved },
    awards: { title: "Awarded Suggestions", data: awards },
  };

  const { title, data } = filterDataMap[activeFilter];

  return (
    <div className="flex flex-col h-full w-full max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Welcome, {user?.name || "User"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {user?.department} • {user?.area}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`kpi-card flex items-center gap-3 cursor-pointer transition-all ${activeFilter === stat.key ? "ring-2 ring-primary shadow-md" : "hover:ring-2 hover:ring-primary/20"}`}
            onClick={() => setActiveFilter(activeFilter === stat.key ? "recent" : stat.key)}
          >
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label} <span className="text-[9px] opacity-70">/ {t(stat.label)}</span></p>
            </div>
          </div>
        ))}
      </div>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {title} <span className="text-xs font-normal text-muted-foreground">/ {t(title)}</span>
            {activeFilter !== "recent" && (
              <Badge variant="secondary" className="ml-2 text-[10px] cursor-pointer" onClick={() => setActiveFilter("recent")}>
                ✕ Clear filter
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {data.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{s.suggestionNo}</span>
                    <Badge variant="outline" className={`text-[10px] ${statusColors[s.status]}`}>
                      {s.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate mt-0.5">{s.subject}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {s.awardAmount && <span className="text-xs font-semibold text-accent">₹{s.awardAmount}</span>}
                  <span className="text-xs text-muted-foreground">{s.date}</span>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No suggestions found for {t(title)}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeHome;
