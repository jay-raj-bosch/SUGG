// TODO [BACKEND]: Fetch pending evaluations → GET /api/suggestions?status=Under Evaluation,Submitted&role=BPS
// TODO [BACKEND]: This page should show suggestions assigned TO the logged-in BPS evaluator
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusColors, suggestionTypes } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculateDaysPending } from "@/lib/bidp/approvalPipeline";
import { useState } from "react";

const PendingEvaluation = () => {
  const [typeFilter, setTypeFilter] = useState("all");
  const { suggestions } = useSuggestions();
  const { t } = useLanguage();

  const filtered = suggestions.filter(s => {
    const isPending = s.status === "Under Evaluation" || s.status === "Submitted";
    if (!isPending) return false;
    if (typeFilter === "all") return true;
    return s.type === typeFilter;
  });

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="max-w-5xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        Pending for Evaluation – BPS
        <span className="text-sm font-normal text-muted-foreground ml-2">/ {t("Pending Evaluation")}</span>
      </h2>

      <div className="flex gap-4 items-center">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder={`Filter by type / ${t("Filter by type")}`} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types / {t("All Types")}</SelectItem>
            {suggestionTypes.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} records</span>
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 text-xs font-medium text-muted-foreground"><TH en="Suggestion No" /></th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground"><TH en="Subject" /></th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground"><TH en="Type" /></th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground"><TH en="Date" /></th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground"><TH en="Status" /></th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground"><TH en="Pending With" /></th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground text-right"><TH en="Days" /></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const days = calculateDaysPending(s);
                  return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-mono text-xs">{s.suggestionNo}</td>
                    <td className="py-2.5">{s.subject}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{s.type}</td>
                    <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">{s.date}</td>
                    <td className="py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${statusColors[s.status]}`}>{s.status}</Badge>
                    </td>
                    <td className="py-2.5 text-xs">{s.pendingWith || "—"}</td>
                    <td className={`py-2.5 text-right font-medium ${days > 10 ? "text-destructive" : days > 5 ? "text-amber-600 dark:text-amber-400" : ""}`}>{days}</td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingEvaluation;
