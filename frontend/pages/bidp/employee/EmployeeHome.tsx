// TODO [BACKEND]: Dashboard stats → GET /api/dashboard?employeeNo={user.employeeNo}
// TODO [BACKEND]: Recent suggestions → GET /api/suggestions?employeeNo={user.employeeNo}&limit=5&sort=date:desc
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColors } from "@/lib/mockData";
import { FilePlus, Clock, CheckCircle, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useLanguage } from "@/contexts/LanguageContext";

const EmployeeHome = () => {
  const { user } = useAuth();
  const { suggestions, getPendingSuggestions, getAwardedSuggestions, getSuggestionsByStatus } = useSuggestions();
  const { t } = useLanguage();

  const empNo = user?.employeeNo;
  const mySuggestions = suggestions.filter(s => s.employeeNo === empNo);
  const pending = getPendingSuggestions().filter(s => s.employeeNo === empNo);
  const approved = getSuggestionsByStatus("Approved", "Implemented").filter(s => s.employeeNo === empNo);
  const awards = getAwardedSuggestions().filter(s => s.employeeNo === empNo);

  const stats = [
    { label: "Total Suggestions", value: mySuggestions.length, icon: FilePlus, color: "text-primary" },
    { label: "Pending", value: pending.length, icon: Clock, color: "text-warning" },
    { label: "Approved", value: approved.length, icon: CheckCircle, color: "text-success" },
    { label: "Awards Earned", value: awards.length, icon: Trophy, color: "text-accent" },
  ];

  // Show only the 5 most recent suggestions
  const recentSuggestions = mySuggestions.slice(0, 5);

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
          <div key={stat.label} className="kpi-card flex items-center gap-3">
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
            Recent Suggestions <span className="text-xs font-normal text-muted-foreground">/ {t("Recent Suggestions")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {recentSuggestions.map((s) => (
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
                  {s.awardAmount && <span className="text-xs font-semibold text-accent">Rs.{s.awardAmount}</span>}
                  <span className="text-xs text-muted-foreground">{s.date}</span>
                </div>
              </div>
            ))}
            {recentSuggestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No suggestions yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeHome;
