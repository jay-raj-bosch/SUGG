import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { FilePlus, FolderOpen, Trophy, Clock, CheckCircle } from "lucide-react";

const KioskHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { suggestions, getPendingSuggestions, getAwardedSuggestions, getSuggestionsByStatus } = useSuggestions();

  const empNo = user?.employeeNo;
  const mySuggestions = suggestions.filter(s => s.employeeNo === empNo);
  const pending = getPendingSuggestions().filter(s => s.employeeNo === empNo);
  const approved = getSuggestionsByStatus("Approved", "Implemented").filter(s => s.employeeNo === empNo);
  const awards = getAwardedSuggestions().filter(s => s.employeeNo === empNo);

  const quickActions = [
    { title: "New Suggestion", icon: FilePlus, color: "bg-blue-500", path: "/bidp/kiosk/new-suggestion" },
    { title: "My Suggestions", icon: FolderOpen, color: "bg-emerald-500", path: "/bidp/kiosk/my-suggestions" },
    { title: "My Awards", icon: Trophy, color: "bg-amber-500", path: "/bidp/kiosk/my-awards" },
  ];

  const stats = [
    { label: "Total Suggestions", value: mySuggestions.length, icon: FilePlus, color: "text-primary" },
    { label: "Pending", value: pending.length, icon: Clock, color: "text-amber-500" },
    { label: "Approved", value: approved.length, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Awards", value: awards.length, icon: Trophy, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {user?.name || "Employee"}
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          {user?.department} &bull; Employee No: {user?.employeeNo}
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          Use the kiosk to submit new suggestions, track your existing ones, and view your awards.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full bg-muted flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

 
      
    </div>
  );
};

export default KioskHome;
