import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePlant } from "@/contexts/PlantContext";

const EDIT_KEY = "edit-suggestion-draft";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { statusColors, Suggestion } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Eye, Edit, Clock, Trash2, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { toast } from "sonner";
import SuggestionDetailDialog from "@/components/bidp/SuggestionDetailDialog";
import SuggestionTimelineDialog from "@/components/bidp/SuggestionTimelineDialog";
import { calculateDaysPending } from "@/lib/bidp/approvalPipeline";

// TODO [BACKEND]: Replace useSuggestions() with API call — GET /api/suggestions?employeeNo={user.employeeNo}
// TODO [BACKEND]: Fetch suggestions filtered by logged-in user from database
// TODO [BACKEND]: Implement real-time updates via WebSocket or polling for status changes

const MySuggestions = () => {
  const [searchParams] = useSearchParams();
  const { getSubmittedSuggestions, getDraftSuggestions, deleteSuggestion } = useSuggestions();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { plantPrefix } = usePlant();
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [timelineSuggestion, setTimelineSuggestion] = useState<Suggestion | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Suggestion | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPageSubs, setCurrentPageSubs] = useState(1);
  const [currentPageDrafts, setCurrentPageDrafts] = useState(1);

  const filterParam = searchParams.get("filter");
  const defaultTab = filterParam === "drafts" ? "saved" : "submitted";

  const empNo = user?.employeeNo;
  const allSubs   = getSubmittedSuggestions().filter(s => s.employeeNo === empNo);
  const allDrafts = getDraftSuggestions().filter(s => s.employeeNo === empNo);

  const CLOSED_STATUSES = new Set(["Approved & Closed", "Implemented", "Rejected", "Closed"]);

  // emp-no lookup from flmOptions + moderatorOptions for Pending With display
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

  const openView = (s: Suggestion) => { setSelectedSuggestion(s); setDialogOpen(true); };

  const openEdit = (s: Suggestion) => {
    // Allow editing for Draft and Sent Back suggestions
    if (s.status !== "Draft" && s.status !== "Sent Back") {
      return;
    }
    // Build the full form state from stored formData, or fall back to basic fields
    const formData = s.formData ?? {
      suggestionType: s.type,
      range: s.range || "",
      suggestionFor: "self",
      groupSuggestion: "no",
      otherInfo: "",
      mainSuggestor: "",
      teamMembers: [],
      typeFields: {
        subject: s.subject,
        category: s.category,
        presentMethod: s.presentMethod,
        proposedMethod: s.proposedMethod,
        benefits: s.benefits,
      },
    };
    const returnTo = s.status === "Sent Back" ? "/employee/my-suggestions" : "/employee/my-suggestions?filter=drafts";
    localStorage.setItem(EDIT_KEY, JSON.stringify({ editingId: s.id, returnTo, ...formData }));
    navigate(`${plantPrefix}/employee/new-suggestion`);
  };
  const openTimeline = (s: Suggestion) => { setTimelineSuggestion(s); setTimelineOpen(true); };

  const handleDelete = (id: string) => { deleteSuggestion(id); };

  const confirmDelete = (s: Suggestion) => { setDeleteTarget(s); };
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSuggestion(deleteTarget.id);
    toast.success("Draft deleted", { description: `${deleteTarget.subject} has been removed.` });
    setDeleteTarget(null);
  };

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

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
      <>
        {/* ── Mobile card list (< sm) ── */}
        <div className="sm:hidden space-y-2">
          {pageRows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No suggestions found</p>
          )}
          {pageRows.map(s => {
            const pw = formatPendingWith(s);
            return (
              <div key={s.id} className={`rounded-lg border bg-card p-3 space-y-2 ${s.status === "Sent Back" ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{s.suggestionNo}</p>
                    <p className="text-sm font-medium leading-snug mt-0.5">{s.subject}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[s.status]}`}>{s.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{pw.role}</span>
                  {pw.name && <><span>–</span><span>{pw.name}</span></>}
                  <span>·</span>
                  <span>{s.date}</span>
                </div>
                <div className="flex gap-1 pt-1 border-t border-border/40">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openView(s)}><Eye className="h-3.5 w-3.5" /> View</Button>
                  {showDraftActions && (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5" /> Edit</Button>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => confirmDelete(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                  {!showDraftActions && s.status === "Sent Back" && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-amber-600" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5" /> Edit & Resubmit</Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openTimeline(s)}><Clock className="h-3.5 w-3.5" /> Timeline</Button>
                </div>
              </div>
            );
          })}
          <PaginationBar />
        </div>

        {/* ── Desktop table (≥ sm) ── */}
        <div className="hidden sm:block space-y-2">
          <div className="overflow-auto rounded-md border" style={{ maxHeight: "calc(100vh - 230px)" }}>
            <table className="min-w-[820px] w-full text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="border-b text-left bg-muted">
                  <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap w-12">Sl No</th>
                  <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap"><TH en="Suggestion No" /></th>
                  <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap"><TH en="Subject" /></th>
                  <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap"><TH en="Pending With" /></th>
                  <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap"><TH en="Date" /></th>
                  <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap"><TH en="Days" /></th>
                  <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap"><TH en="Status" /></th>
                  <th className="py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-right"><TH en="Actions" /></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s, idx) => {
                  const pw = formatPendingWith(s);
                  const isClosed = CLOSED_STATUSES.has(s.status);
                  const days = isClosed ? null : calculateDaysPending(s);
                  const slNo = (safePage - 1) * rowsPerPage + idx + 1;
                  const isSentBack = s.status === "Sent Back";
                  return (
                    <tr key={s.id} className={`border-b last:border-0 transition-colors ${isSentBack ? "bg-amber-50/60 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30" : "hover:bg-muted/30"}`}>
                      <td className="py-2.5 px-2 text-muted-foreground">{slNo}</td>
                      <td className="py-2.5 px-2 font-mono">{s.suggestionNo}</td>
                      <td className="py-2.5 px-2 max-w-[220px]"><span className="block truncate" title={s.subject}>{s.subject}</span></td>
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
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => confirmDelete(s)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                          {/* Edit button for sent-back suggestions in the submitted tab */}
                          {!showDraftActions && s.status === "Sent Back" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100/50" onClick={() => openEdit(s)} title="Edit & Resubmit">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTimeline(s)} title="Timeline"><Clock className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No suggestions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar />
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground">
          My Suggestions <span className="text-sm font-normal text-muted-foreground">/ {t("My Suggestions")}</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filter by type:</span>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={`h-8 w-48 text-xs ${typeFilter !== "all" ? "filter-active" : ""}`}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
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
            <SelectTrigger className={`h-8 w-40 text-xs ${statusFilter !== "all" ? "filter-active" : ""}`}>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Under Evaluation">Under Evaluation</SelectItem>
              <SelectItem value="Approved &amp; Closed">Approved &amp; Closed</SelectItem>
              <SelectItem value="Sent Back">Sent Back</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Implemented">Implemented</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="submitted">All Submissions / {t("All Submissions")} ({subs.length}{anyFilter ? `/${allSubs.length}` : ""})</TabsTrigger>
          <TabsTrigger value="saved">Saved / {t("Saved")} ({drafts.length}{anyFilter ? `/${allDrafts.length}` : ""})</TabsTrigger>
        </TabsList>

        <TabsContent value="submitted" className="mt-2">
          <Card className="card-shadow"><CardContent className="pt-4">{renderTable(subs, false, currentPageSubs, setCurrentPageSubs)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="saved" className="mt-2">
          <Card className="card-shadow"><CardContent className="pt-4">{renderTable(drafts, true, currentPageDrafts, setCurrentPageDrafts)}</CardContent></Card>
        </TabsContent>
      </Tabs>

      <SuggestionDetailDialog suggestion={selectedSuggestion} mode="view" open={dialogOpen} onOpenChange={setDialogOpen} onDelete={handleDelete} />
      <SuggestionTimelineDialog suggestion={timelineSuggestion} open={timelineOpen} onOpenChange={setTimelineOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the draft "<strong>{deleteTarget?.subject}</strong>". This action cannot be undone.
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

export default MySuggestions;
