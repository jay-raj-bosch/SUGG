import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { statusColors, Suggestion } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Edit, Clock, Trash2, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { toast } from "sonner";
import SuggestionDetailDialog from "@/components/bidp/SuggestionDetailDialog";
import SuggestionTimelineDialog from "@/components/bidp/SuggestionTimelineDialog";
import { calculateDaysPending } from "@/lib/bidp/approvalPipeline";

const EDIT_KEY = "edit-suggestion-draft";

const KioskMySuggestions = () => {
  const { getSubmittedSuggestions, getDraftSuggestions, getDailyCIPSuggestions, deleteSuggestion } = useSuggestions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [timelineSuggestion, setTimelineSuggestion] = useState<Suggestion | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Suggestion | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPageSubs, setCurrentPageSubs] = useState(1);
  const [currentPageDrafts, setCurrentPageDrafts] = useState(1);

  const empNo = user?.employeeNo;
  const allSubs   = [...getSubmittedSuggestions(), ...getDailyCIPSuggestions()].filter(s => s.employeeNo === empNo);
  const allDrafts = getDraftSuggestions().filter(s => s.employeeNo === empNo);

  const CLOSED_STATUSES = new Set(["Approved & Closed", "Implemented", "Rejected", "Closed"]);

  const PENDING_EMP_LOOKUP: Record<string, string> = {
    "Suresh M":  "30698710",
    "Ganesh R":  "30698711",
    "Karthik M": "30698730",
    "Lakshmi P": "30698731",
    "Rajesh V":  "30698732",
  };

  const formatPendingWith = (s: Suggestion): { role: string; name: string; empNo: string } => {
    if (CLOSED_STATUSES.has(s.status)) return { role: "Closed", name: "", empNo: "" };
    if (!s.pendingWith) return { role: "\u2014", name: "", empNo: "" };
    const dash = s.pendingWith.indexOf(" - ");
    const role = dash !== -1 ? s.pendingWith.slice(0, dash).trim() : s.pendingWith;
    const name = dash !== -1 ? s.pendingWith.slice(dash + 3).trim() : "";
    const empNo = PENDING_EMP_LOOKUP[name] || (s.assignedFlm || "");
    return { role, name, empNo };
  };

  const applyFilters = (list: Suggestion[]) => {
    let r = list;
    if (typeFilter !== "all") r = r.filter(s => s.type === typeFilter);
    if (statusFilter !== "all") r = r.filter(s => s.status === statusFilter);
    return r;
  };

  const subs   = applyFilters(allSubs);
  const drafts = applyFilters(allDrafts);
  const anyFilter = typeFilter !== "all" || statusFilter !== "all";

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPageSubs(1); setCurrentPageDrafts(1); }, [typeFilter, statusFilter]);

  const openView     = (s: Suggestion) => { setSelectedSuggestion(s); setDialogMode("view"); setDialogOpen(true); };
  const openTimeline = (s: Suggestion) => { setTimelineSuggestion(s); setTimelineOpen(true); };

  const openEdit = (s: Suggestion) => {
    if (s.status !== "Draft") return;
    const formData = s.formData ?? {
      suggestionType: s.type,
      range: s.range || "",
      suggestionFor: "self",
      groupSuggestion: "no",
      otherInfo: "",
      mainSuggestor: "",
      teamMembers: [],
      typeFields: { subject: s.subject, category: s.category, presentMethod: s.presentMethod, proposedMethod: s.proposedMethod, benefits: s.benefits },
    };
    localStorage.setItem(EDIT_KEY, JSON.stringify({ editingId: s.id, returnTo: "/bidp/kiosk/my-suggestions", ...formData }));
    navigate("/bidp/kiosk/new-suggestion");
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSuggestion(deleteTarget.id);
    toast.success("Draft deleted", { description: `${deleteTarget.subject} has been removed.` });
    setDeleteTarget(null);
  };

  const renderTable = (
    data: Suggestion[],
    showDraftActions: boolean,
    currentPage: number,
    setCurrentPage: (p: number) => void,
  ) => {
    const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const pageRows = data.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

    const PaginationBar = () => (
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {data.length > 0
              ? `${(safePage - 1) * rowsPerPage + 1}–${Math.min(safePage * rowsPerPage, data.length)} of ${data.length}`
              : "0 records"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );

    return (
      <div className="space-y-2">
        <div className="overflow-auto rounded-md border" style={{ maxHeight: "calc(100vh - 320px)", minHeight: "200px" }}>
          <table className="min-w-[780px] w-full text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="border-b text-left bg-muted">
                <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Suggestion No</th>
                <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Subject</th>
                <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Pending With</th>
                <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Days</th>
                <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(s => {
                const pw = formatPendingWith(s);
                const isClosed = CLOSED_STATUSES.has(s.status);
                const days = isClosed ? null : calculateDaysPending(s);
                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-2 font-mono">{s.suggestionNo}</td>
                    <td className="py-2.5 px-2 max-w-[200px]"><span className="block truncate" title={s.subject}>{s.subject}</span></td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {isClosed ? (
                        <span className="text-muted-foreground">Closed</span>
                      ) : pw.name ? (
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium text-foreground/80">{pw.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{pw.empNo || pw.role}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{pw.role}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">{s.date}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {isClosed ? (
                        <span className="text-muted-foreground">—</span>
                      ) : days !== null ? (
                        <span className={`flex items-center gap-1 font-medium ${
                          days > 10 ? "text-destructive" : days > 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          <Timer className="h-3 w-3" />{days}d
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      <Badge variant="outline" className={`text-[10px] ${statusColors[s.status]}`}>{s.status}</Badge>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(s)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        {showDraftActions && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTimeline(s)} title="Timeline"><Clock className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No suggestions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground">My Suggestions</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filter by type:</span>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Simple Suggestion Scheme">Simple Suggestion Scheme</SelectItem>
              <SelectItem value="Shop Floor CIP">Shop Floor CIP</SelectItem>
              <SelectItem value="My Idea Card">My Idea Card</SelectItem>
              <SelectItem value="Daily CIP">Daily CIP</SelectItem>
              <SelectItem value="Cash The Flash">Cash The Flash</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Under Evaluation">Under Evaluation</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Approved & Closed">Approved &amp; Closed</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Implemented">Implemented</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="submitted">
        <TabsList>
          <TabsTrigger value="submitted">
            All Submissions ({subs.length}{anyFilter ? `/${allSubs.length}` : ""})
          </TabsTrigger>
          <TabsTrigger value="saved">
            Saved / Drafts ({drafts.length}{anyFilter ? `/${allDrafts.length}` : ""})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submitted">
          <Card className="card-shadow"><CardContent className="pt-4">{renderTable(subs, false, currentPageSubs, setCurrentPageSubs)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="saved">
          <Card className="card-shadow"><CardContent className="pt-4">{renderTable(drafts, true, currentPageDrafts, setCurrentPageDrafts)}</CardContent></Card>
        </TabsContent>
      </Tabs>

      <SuggestionDetailDialog suggestion={selectedSuggestion} mode={dialogMode} open={dialogOpen} onOpenChange={setDialogOpen} />
      <SuggestionTimelineDialog suggestion={timelineSuggestion} open={timelineOpen} onOpenChange={setTimelineOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.subject}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KioskMySuggestions;
