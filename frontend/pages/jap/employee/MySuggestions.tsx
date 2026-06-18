// JaP — My Suggestions (Employee)
// Lists all suggestions submitted by the logged-in JaP employee.
// Includes status and phase tracking for employee submissions.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { usePlant } from "@/contexts/PlantContext";
import {
  JAP_STATUS_COLORS, STATUS_TO_PHASE, PHASE_SLA,
  JAP_STATUSES,
} from "@/lib/jap/workflowPipeline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ListChecks, Search, Clock, User, Building2, Calendar,
  FilePlus, TrendingUp, CheckCircle2, XCircle, Pencil, Send, GitBranch,
} from "lucide-react";
import type { Suggestion } from "@/lib/mockData";
import { toast } from "sonner";
import SuggestionTimelineDialog from "@/components/jap/SuggestionTimelineDialog";

type StatusFilter = "all" | "draft" | "active" | "closed" | "rejected";

const JaPMySuggestions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { suggestions, updateSuggestion } = useSuggestions();
  const { plantPrefix } = usePlant();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  // Detail dialog
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Timeline dialog
  const [timelineOpen, setTimelineOpen] = useState(false);

  const ACTIVE_STATUSES = [
    JAP_STATUSES.PENDING_FEASIBILITY,
    JAP_STATUSES.IN_OPINION,
    JAP_STATUSES.IN_IMPLEMENTATION,
    JAP_STATUSES.IN_EVALUATION,
    JAP_STATUSES.IN_AWARD,
  ];

  const mySuggestions = useMemo(
    () =>
      suggestions.filter(
        s => s.plantCode === "PLT-02" && s.employeeNo === user?.employeeNo,
      ),
    [suggestions, user],
  );

  const filtered = useMemo(() => {
    let base = mySuggestions;
    if (filter === "draft")    base = base.filter(s => s.status === JAP_STATUSES.DRAFT);
    if (filter === "active")   base = base.filter(s => ACTIVE_STATUSES.includes(s.status as any));
    if (filter === "closed")   base = base.filter(s => s.status === JAP_STATUSES.CLOSED_AWARDED);
    if (filter === "rejected") base = base.filter(s => s.status === JAP_STATUSES.REJECTED || s.status === JAP_STATUSES.REOPENED);
    if (search) {
      const q = search.toLowerCase();
      base = base.filter(
        s =>
          s.suggestionNo.toLowerCase().includes(q) ||
          (s.subject ?? "").toLowerCase().includes(q),
      );
    }
    return [...base].sort((a, b) => b.date.localeCompare(a.date));
  }, [mySuggestions, filter, search]);

  const handleSubmitDraft = (s: Suggestion) => {
    updateSuggestion(s.id, {
      status: "Pending Feasibility Review",
      pendingWith: "Superior",
      daysPending: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    toast.success(`${s.suggestionNo} submitted for review`);
  };

  const draftCount = mySuggestions.filter(s => s.status === JAP_STATUSES.DRAFT).length;

  const FILTER_TABS: Array<{ key: StatusFilter; label: string }> = [
    { key: "all",      label: `All (${mySuggestions.length})` },
    { key: "draft",    label: `Drafts (${draftCount})` },
    { key: "active",   label: `Active (${mySuggestions.filter(s => ACTIVE_STATUSES.includes(s.status as any)).length})` },
    { key: "closed",   label: `Awarded (${mySuggestions.filter(s => s.status === JAP_STATUSES.CLOSED_AWARDED).length})` },
    { key: "rejected", label: `Rejected (${mySuggestions.filter(s => s.status === JAP_STATUSES.REJECTED).length})` },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            My Suggestions
          </h1>
          <p className="text-xs text-muted-foreground">मेरे सुझाव · {user?.name}</p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => navigate(`${plantPrefix}/employee/new-suggestion`)}
        >
          <FilePlus className="h-4 w-4" /> New Suggestion
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filter === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by suggestion no or subject…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No suggestions found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const sla = PHASE_SLA[s.status] ?? 0;
            const overSla = sla > 0 && (s.daysPending ?? 0) > sla;
            const isRejected = s.status === JAP_STATUSES.REJECTED;
            const isDraft = s.status === JAP_STATUSES.DRAFT;
            return (
              <Card key={s.id} className={`transition-all hover:shadow-sm ${overSla ? "border-orange-200" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {s.suggestionNo}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${JAP_STATUS_COLORS[s.status] ?? ""}`}
                        >
                          {STATUS_TO_PHASE[s.status] ?? s.status}
                        </Badge>
                        {overSla && (
                          <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{s.subject}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {s.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {s.department}
                        </span>
                        {s.pendingWith && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending with: {s.pendingWith}
                          </span>
                        )}
                        {s.awardAmount && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            ₹{s.awardAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {isRejected && s.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1 bg-red-50 rounded px-2 py-1">
                          Rejected: {s.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { setSelected(s); setDetailOpen(true); }}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-violet-300 text-violet-700 hover:bg-violet-50"
                        onClick={() => { setSelected(s); setTimelineOpen(true); }}
                      >
                        <GitBranch className="h-3 w-3" /> Timeline
                      </Button>
                      {isDraft && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => navigate(`${plantPrefix}/employee/new-suggestion?draft=${s.id}`)}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => handleSubmitDraft(s)}
                          >
                            <Send className="h-3 w-3" /> Submit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{selected?.suggestionNo} — Detail</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={JAP_STATUS_COLORS[selected.status] ?? ""}
                  >
                    {STATUS_TO_PHASE[selected.status] ?? selected.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p>{selected.category}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Present Method</p>
                <p className="bg-muted/40 rounded p-2 text-xs">{selected.presentMethod || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Proposed Method</p>
                <p className="bg-muted/40 rounded p-2 text-xs">{selected.proposedMethod || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Expected Benefits</p>
                <p className="bg-muted/40 rounded p-2 text-xs">{selected.benefits || "—"}</p>
              </div>
              {selected.status === JAP_STATUSES.REJECTED && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-xs text-red-700">{selected.rejectionReason}</p>
                  {selected.rejectedByName && (
                    <p className="text-[10px] text-red-500 mt-1">
                      — {selected.rejectedByName} on {selected.rejectedOn}
                    </p>
                  )}
                </div>
              )}
              {selected.awardAmount && (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                  <p className="text-xs font-semibold text-emerald-700">
                    Award: ₹{selected.awardAmount.toLocaleString()} ({selected.awardCategory})
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline dialog */}
      <SuggestionTimelineDialog
        suggestion={selected}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
      />
    </div>
  );
};

export default JaPMySuggestions;
