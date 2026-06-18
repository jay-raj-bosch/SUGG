import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, FilePlus, ListChecks, CheckCircle2, XCircle, Clock, TrendingUp, Award, Star, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { JAP_STATUSES, JAP_STATUS_COLORS, STATUS_TO_PHASE } from "@/lib/jap/workflowPipeline";
import { usePlant } from "@/contexts/PlantContext";

const ACTIVE_STATUSES = [
  JAP_STATUSES.PENDING_FEASIBILITY,
  JAP_STATUSES.IN_OPINION,
  JAP_STATUSES.IN_IMPLEMENTATION,
  JAP_STATUSES.IN_EVALUATION,
  JAP_STATUSES.IN_AWARD,
];

const JaPEmployeeHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { suggestions } = useSuggestions();
  const { plantPrefix } = usePlant();

  const mySuggestions = useMemo(
    () => suggestions.filter(
      s => s.plantCode === "PLT-02" && s.employeeNo === user?.employeeNo
    ),
    [suggestions, user],
  );

  const stats = useMemo(() => ({
    total:    mySuggestions.length,
    active:   mySuggestions.filter(s => ACTIVE_STATUSES.includes(s.status as any)).length,
    closed:   mySuggestions.filter(s => s.status === JAP_STATUSES.CLOSED_AWARDED).length,
    rejected: mySuggestions.filter(s => s.status === JAP_STATUSES.REJECTED).length,
    drafts:   mySuggestions.filter(s => s.status === JAP_STATUSES.DRAFT).length,
  }), [mySuggestions]);

  const recent = useMemo(
    () => [...mySuggestions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [mySuggestions],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Jaipur Plant — Employee Portal
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          जयपुर संयंत्र — कर्मचारी पोर्टल · Welcome, {user?.name}
        </p>
      </div>

      {/* Quick action */}
      <Button
        className="gap-2 w-full sm:w-auto"
        onClick={() => navigate(`${plantPrefix}/employee/new-suggestion`)}
      >
        <FilePlus className="h-4 w-4" />
        Submit New Suggestion
      </Button>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",    value: stats.total,    icon: ListChecks,   color: "text-slate-600" },
          { label: "Active",   value: stats.active,   icon: Clock,        color: "text-blue-600" },
          { label: "Awarded",  value: stats.closed,   icon: Award,        color: "text-emerald-600" },
          { label: "Rejected", value: stats.rejected, icon: XCircle,      color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color} shrink-0`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Points & Rewards demo cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Total Points / कुल अंक</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <IndianRupee className="h-8 w-8 text-green-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold">₹0</p>
              <p className="text-xs text-muted-foreground">Total Value / कुल मूल्य</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Recent Suggestions</span>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7"
              onClick={() => navigate(`${plantPrefix}/employee/my-suggestions`)}
            >
              View all →
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No suggestions yet.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => navigate(`${plantPrefix}/employee/new-suggestion`)}
              >
                Submit your first suggestion
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-primary">{s.suggestionNo}</p>
                    <p className="text-sm truncate">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">{s.date}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ml-2 ${JAP_STATUS_COLORS[s.status] ?? ""}`}
                  >
                    {STATUS_TO_PHASE[s.status] ?? s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JaPEmployeeHome;

