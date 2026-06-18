// TODO [BACKEND]: Fetch pending suggestions → GET /api/suggestions?status=pending&employeeNo={user.employeeNo}
// TODO [BACKEND]: Tab-specific queries for SFC/CTF evaluation and approval stages
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusColors, Suggestion } from "@/lib/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Eye, Clock, XCircle, Undo2 } from "lucide-react";
import SuggestionDetailDialog from "@/components/bidp/SuggestionDetailDialog";
import SuggestionTimelineDialog from "@/components/bidp/SuggestionTimelineDialog";
import { calculateDaysPending } from "@/lib/bidp/approvalPipeline";

const MyPending = () => {
  const { getPendingSuggestions, suggestions } = useSuggestions();
  const { user } = useAuth();
  const { t } = useLanguage();
  const empNo = user?.employeeNo;
  const pendingSuggestions = getPendingSuggestions().filter(s => s.employeeNo === empNo);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [timelineSuggestion, setTimelineSuggestion] = useState<Suggestion | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const mySuggestions = suggestions.filter(s => s.employeeNo === empNo);
  const sfcEval = mySuggestions.filter(s => s.type === "Shop Floor CIP" && s.status === "Under Evaluation");
  const sfcApproval = mySuggestions.filter(s => s.type === "Shop Floor CIP" && s.status === "Submitted");
  const ctfOpinion = mySuggestions.filter(s => s.type === "Cash The Flash" && s.status === "Submitted");
  const ctfImpl = mySuggestions.filter(s => s.type === "Cash The Flash" && s.status === "Approved");
  const rejectedSuggestions = mySuggestions.filter(s => s.status === "Rejected");

  const openView = (s: Suggestion) => { setSelectedSuggestion(s); setDialogOpen(true); };
  const openTimeline = (s: Suggestion) => { setTimelineSuggestion(s); setTimelineOpen(true); };

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  const renderTable = (data: typeof pendingSuggestions) => (
    <>
      {/* ── Mobile card list (< sm) ── */}
      <div className="sm:hidden space-y-2">
        {data.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No pending items</p>
        )}
        {data.map(s => (
          <div key={s.id} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-mono text-muted-foreground">{s.suggestionNo}</p>
                <p className="text-sm font-medium leading-snug mt-0.5">{s.subject}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 whitespace-nowrap ${statusColors[s.status]}`}>{s.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{s.type}</span>
              {s.pendingWith && <><span>·</span><span>{s.pendingWith}</span></>}
              {s.status !== "Rejected" && (() => {
                const days = calculateDaysPending(s);
                return (
                  <><span>·</span>
                  <span className={`font-semibold ${days > 10 ? "text-destructive" : days > 5 ? "text-warning" : "text-muted-foreground"}`}>
                    {days} day{days !== 1 ? "s" : ""}
                  </span></>
                );
              })()}
            </div>
            {s.status === "Rejected" && s.rejectionReason && (
              <div className="flex items-start gap-1.5 text-xs bg-destructive/10 text-destructive rounded p-2">
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Rejected by {s.rejectedByName || "Unknown"} on {s.rejectedOn || "—"}</p>
                  <p className="mt-0.5 opacity-80">{s.rejectionReason}</p>
                </div>
              </div>
            )}
            {s.sendBackHistory && s.sendBackHistory.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 rounded p-2">
                <Undo2 className="h-3.5 w-3.5 shrink-0" />
                <p className="font-medium">Sent back by {s.sendBackHistory[s.sendBackHistory.length - 1].from}</p>
              </div>
            )}
            <div className="flex gap-1 pt-1 border-t border-border/40">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openView(s)}><Eye className="h-3.5 w-3.5" /> View</Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openTimeline(s)}><Clock className="h-3.5 w-3.5" /> Timeline</Button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop table (≥ sm) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 text-xs font-medium text-muted-foreground w-32"><TH en="Suggestion No" /></th>
              <th className="pb-2 text-xs font-medium text-muted-foreground"><TH en="Subject" /></th>
              <th className="pb-2 text-xs font-medium text-muted-foreground w-28 hidden sm:table-cell"><TH en="Type" /></th>
              <th className="pb-2 text-xs font-medium text-muted-foreground w-28"><TH en="Status" /></th>
              <th className="pb-2 text-xs font-medium text-muted-foreground w-36 hidden md:table-cell"><TH en="Pending With" /></th>
              <th className="pb-2 text-xs font-medium text-muted-foreground text-right w-14"><TH en="Days" /></th>
              <th className="pb-2 text-xs font-medium text-muted-foreground text-right w-16"><TH en="Actions" /></th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${s.status === "Rejected" ? "bg-destructive/5" : s.sendBackHistory?.length ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
                <td className="py-2.5 font-mono text-xs">{s.suggestionNo}</td>
                <td className="py-2.5 max-w-[160px]">
                  <span className="block truncate" title={s.subject}>{s.subject}</span>
                  {s.status === "Rejected" && s.rejectionReason && (
                    <span className="block text-[10px] text-destructive mt-0.5" title={s.rejectionReason}>
                      Rejected by {s.rejectedByName || "—"}: {s.rejectionReason}
                    </span>
                  )}
                  {s.sendBackHistory && s.sendBackHistory.length > 0 && s.status !== "Rejected" && (
                    <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                      ↩ Sent back by {s.sendBackHistory[s.sendBackHistory.length - 1].from}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                  <span className="block truncate max-w-[100px]" title={s.type}>{s.type}</span>
                </td>
                <td className="py-2.5">
                  <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${statusColors[s.status]}`}>{s.status}</Badge>
                </td>
                <td className="py-2.5 text-xs hidden md:table-cell">
                  <span className="block truncate max-w-[130px]" title={s.pendingWith || ""}>{s.pendingWith || "—"}</span>
                </td>
                <td className="py-2.5 text-right font-medium">
                  {(() => {
                    const days = calculateDaysPending(s);
                    return (
                      <span className={days > 10 ? "text-destructive" : days > 5 ? "text-warning" : "text-muted-foreground"}>
                        {days}
                      </span>
                    );
                  })()}
                </td>
                <td className="py-2.5 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(s)} title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTimeline(s)} title="Timeline">
                      <Clock className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No pending items</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="max-w-5xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        My Pending <span className="text-sm font-normal text-muted-foreground">/ {t("My Pending")}</span>
      </h2>

      <Tabs defaultValue="all">
        <TabsList className="h-auto flex-wrap gap-1 justify-start bg-muted/60 p-1">
          <TabsTrigger value="all" className="text-xs">
            All Pending <span className="text-[9px] opacity-60">/ {t("All Pending")}</span>
            <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px] rounded-full">{pendingSuggestions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sfc-eval" className="text-xs">
            SFC Eval <span className="text-[9px] opacity-60">/ {t("SFC Evaluation")}</span>
            <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px] rounded-full">{sfcEval.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sfc-approval" className="text-xs">
            SFC Approval <span className="text-[9px] opacity-60">/ {t("SFC Approval")}</span>
            <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px] rounded-full">{sfcApproval.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ctf-opinion" className="text-xs">
            CTF Opinion <span className="text-[9px] opacity-60">/ {t("CTF Opinion")}</span>
            <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px] rounded-full">{ctfOpinion.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ctf-impl" className="text-xs">
            CTF Impl. <span className="text-[9px] opacity-60">/ {t("CTF Implementation")}</span>
            <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px] rounded-full">{ctfImpl.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">
            Rejected <span className="text-[9px] opacity-60">/ {t("Rejected")}</span>
            <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px] rounded-full bg-destructive/10 text-destructive">{rejectedSuggestions.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all"><Card className="card-shadow"><CardContent className="pt-4">{renderTable(pendingSuggestions)}</CardContent></Card></TabsContent>
        <TabsContent value="sfc-eval"><Card className="card-shadow"><CardContent className="pt-4">{renderTable(sfcEval)}</CardContent></Card></TabsContent>
        <TabsContent value="sfc-approval"><Card className="card-shadow"><CardContent className="pt-4">{renderTable(sfcApproval)}</CardContent></Card></TabsContent>
        <TabsContent value="ctf-opinion"><Card className="card-shadow"><CardContent className="pt-4">{renderTable(ctfOpinion)}</CardContent></Card></TabsContent>
        <TabsContent value="ctf-impl"><Card className="card-shadow"><CardContent className="pt-4">{renderTable(ctfImpl)}</CardContent></Card></TabsContent>
        <TabsContent value="rejected"><Card className="card-shadow"><CardContent className="pt-4">{renderTable(rejectedSuggestions)}</CardContent></Card></TabsContent>
      </Tabs>

      <SuggestionDetailDialog suggestion={selectedSuggestion} mode="view" open={dialogOpen} onOpenChange={setDialogOpen} />
      <SuggestionTimelineDialog suggestion={timelineSuggestion} open={timelineOpen} onOpenChange={setTimelineOpen} />
    </div>
  );
};

export default MyPending;
