import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePlant } from "@/contexts/PlantContext";

const EDIT_KEY = "edit-suggestion-draft";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { statusColors, Suggestion, mockEmployees } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import * as apiService from "@/lib/apiService";
import { Eye, Edit, Clock, Trash2, ChevronLeft, ChevronRight, Timer, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const { plant, plantPrefix } = usePlant();

  // Authority list — used to resolve Pending With details dynamically
  const [authorities, setAuthorities] = useState<apiService.AuthorityAssignment[]>([]);
  useEffect(() => {
    apiService.fetchAuthority(plant as "bidp" | "jap").then(setAuthorities).catch(() => {
      // fallback: seed BidP authority list
      setAuthorities([
        { id: 110, plant_code: "PLT-01", employee_no: "30698710", name: "Suresh M",     department: "BIDP1/TEF", role: "FLM",       type: "Internal", email: "", ntid: "" },
        { id: 111, plant_code: "PLT-01", employee_no: "30698711", name: "Ganesh R",     department: "BIDP2/QAL", role: "FLM",       type: "Internal", email: "", ntid: "" },
        { id: 112, plant_code: "PLT-01", employee_no: "30698712", name: "Priya S",      department: "BIDP1/HRD", role: "FLM",       type: "Internal", email: "", ntid: "" },
        { id: 113, plant_code: "PLT-01", employee_no: "30698702", name: "Anita Sharma", department: "BIDP1/MNT", role: "Manager",   type: "Internal", email: "", ntid: "" },
        { id: 114, plant_code: "PLT-01", employee_no: "30698720", name: "Vijay Sharma", department: "BIDP1/ADM", role: "BPS Admin", type: "Internal", email: "", ntid: "" },
        { id: 115, plant_code: "PLT-01", employee_no: "30698704", name: "Priya Devi",   department: "BIDP1/SAF", role: "BPS DH",    type: "Internal", email: "", ntid: "" },
        { id: 116, plant_code: "PLT-01", employee_no: "30698730", name: "Ramesh Iyer",  department: "BIDP1/MNT", role: "Dept General Manager", type: "Internal", email: "", ntid: "" },
        { id: 117, plant_code: "PLT-01", employee_no: "30698731", name: "Lakshmi Rao",  department: "BIDP1/ADM", role: "General Manager",      type: "Internal", email: "", ntid: "" },
        { id: 118, plant_code: "PLT-01", employee_no: "30698740", name: "Deepak Verma", department: "BIDP1/ADM", role: "VS RC",               type: "Internal", email: "", ntid: "" },
      ]);
    });
  }, [plant]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [timelineSuggestion, setTimelineSuggestion] = useState<Suggestion | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Suggestion | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingFilter, setPendingFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPageSubs, setCurrentPageSubs] = useState(1);
  const [currentPageDrafts, setCurrentPageDrafts] = useState(1);

  const filterParam = searchParams.get("filter");
  const defaultTab = filterParam === "drafts" ? "saved" : "submitted";

  const empNo = user?.employeeNo;
  const allSubs   = getSubmittedSuggestions().filter(s => s.employeeNo === empNo);
  const allDrafts = getDraftSuggestions().filter(s => s.employeeNo === empNo);

  const CLOSED_STATUSES = new Set(["Approved & Closed", "Implemented", "Rejected", "Closed"]);
  const BPS_ROLES = ["BPS Admin", "BPS DH"];

  // Build a fast lookup: empNo → { name, dept, role } from authorities + mockEmployees
  const empLookup = useMemo(() => {
    const m: Record<string, { name: string; dept: string; role: string }> = {};
    for (const a of authorities) {
      m[a.employee_no] = { name: a.name, dept: a.department || "", role: a.role };
    }
    for (const e of mockEmployees.filter(emp => emp.plantCode === "PLT-01")) {
      if (!m[e.employeeNo]) m[e.employeeNo] = { name: e.name, dept: e.department, role: "Employee" };
    }
    return m;
  }, [authorities]);

  const formatPendingWith = (s: Suggestion): { role: string; name: string; empNo: string; dept: string } => {
    if (CLOSED_STATUSES.has(s.status)) return { role: "Closed", name: "", empNo: "", dept: "" };
    if (!s.pendingWith) return { role: "\u2014", name: "", empNo: "", dept: "" };

    const dash = s.pendingWith.indexOf(" - ");
    const role = dash !== -1 ? s.pendingWith.slice(0, dash).trim() : s.pendingWith;
    const nameFromPW = dash !== -1 ? s.pendingWith.slice(dash + 3).trim() : "";
    // "Revision"/"Revision Required" suffixes (used on send-back) aren't real names
    const cleanNameFromPW = nameFromPW && nameFromPW !== "Revision" && nameFromPW !== "Revision Required" ? nameFromPW : "";

    // Resolve empNo: prefer direct suggestion fields over string parsing
    let resolvedEmpNo = "";
    if (role === "FLM" && s.assignedFlm) resolvedEmpNo = s.assignedFlm;

    // If not found from fields, try matching by name in the lookup — covers
    // reroutes and the initial "FLM - Name" assignment, both of which carry
    // a real person's name in pendingWith.
    if (!resolvedEmpNo && cleanNameFromPW) {
      const found = Object.entries(empLookup).find(([, v]) => v.name === cleanNameFromPW);
      if (found) resolvedEmpNo = found[0];
    }

    // Manager/BPS Admin/BPS DH (and other authority roles) are routed by
    // department rather than a single assigned person, so pendingWith for
    // those stages is just the bare role label with no name attached. Resolve
    // the authority who actually covers this suggestion's department, falling
    // back to any authority holding that role — mirrors the routing logic
    // used to decide who sees the suggestion in "My Approvals".
    if (!resolvedEmpNo && role !== "FLM" && role !== "Employee") {
      const suggDept = s.suggestionDepartment || s.department;
      const atRole = authorities.filter(a => a.role === role);
      const deptMatch = atRole.find(a => a.department === s.department || a.department === suggDept);
      const chosen = deptMatch || atRole[0];
      if (chosen) resolvedEmpNo = chosen.employee_no;
    }

    const entry = resolvedEmpNo ? empLookup[resolvedEmpNo] : undefined;
    const name = entry?.name || cleanNameFromPW;
    const dept = entry?.dept || "";

    return { role, name, empNo: resolvedEmpNo, dept };
  };

  const applyFilters = (list: Suggestion[]) => {
    let r = list;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      r = r.filter(s => s.suggestionNo?.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") r = r.filter(s => s.type === typeFilter);
    if (statusFilter !== "all") r = r.filter(s => s.status === statusFilter);
    if (pendingFilter !== "all") {
      r = r.filter(s => {
        const pw = formatPendingWith(s);
        if (pendingFilter === "BPS") {
          return BPS_ROLES.includes(pw.role);
        }
        return pw.role.toLowerCase().includes(pendingFilter.toLowerCase());
      });
    }
    if (dateFrom) r = r.filter(s => s.date >= dateFrom);
    if (dateTo) r = r.filter(s => s.date <= dateTo);
    return r;
  };

  const subs   = applyFilters(allSubs);
  const drafts = applyFilters(allDrafts);
  const anyFilter = typeFilter !== "all" || statusFilter !== "all" || pendingFilter !== "all" || searchQuery.trim() !== "" || dateFrom !== "" || dateTo !== "";

  // Collect unique pending-with roles dynamically from data (BPS roles grouped under "BPS")
  const pendingRoles = useMemo(() => {
    const roles = new Set<string>();
    allSubs.forEach(s => {
      const pw = formatPendingWith(s);
      if (pw.role && pw.role !== "—" && pw.role !== "Closed" && !BPS_ROLES.includes(pw.role)) roles.add(pw.role);
    });
    return Array.from(roles).sort();
  }, [allSubs, BPS_ROLES, authorities, empLookup]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPageSubs(1); setCurrentPageDrafts(1); }, [typeFilter, statusFilter, pendingFilter, searchQuery, dateFrom, dateTo]);

  const openView = (s: Suggestion) => { setSelectedSuggestion(s); setDialogOpen(true); };

  const openEdit = (s: Suggestion) => {
    // Allow editing for Draft and Sent Back (only if sent back TO employee)
    const sentBackToEmployee = s.status === "Sent Back" && s.sendBackHistory?.length
      ? s.sendBackHistory[s.sendBackHistory.length - 1].to === "Employee"
      : false;
    if (s.status !== "Draft" && !sentBackToEmployee) {
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

  /** Clean status for display — strip role names since they're in the Pending With column */
  const displayStatus = (status: string): string => {
    if (status === "Pending Manager" || status === "Pending BPS Admin" || status === "Pending BPS DH" || status === "Pending FLM" || status === "Pending Implementation" || status === "Pending CTG" || status === "Pending VS RC") {
      return "Under Review";
    }
    return status;
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
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[s.status]}`}>{displayStatus(s.status)}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-primary/70">{pw.role}</span>
                  {pw.name && <><span>–</span><span className="font-medium text-foreground/70">{pw.name}</span></>}
                  {pw.empNo && <span className="font-mono text-[10px]">({pw.empNo})</span>}
                  {pw.dept && <span className="text-[10px]">{pw.dept}</span>}
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
                  {!showDraftActions && s.status === "Sent Back" && s.sendBackHistory?.length && s.sendBackHistory[s.sendBackHistory.length - 1].to === "Employee" && (
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
                          <span className="flex flex-col leading-tight gap-0.5">
                            <span className="font-medium text-foreground/90">{pw.name}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                              <span className="font-semibold text-primary/70">{pw.role}</span>
                              {pw.empNo && <span className="font-mono">{pw.empNo}</span>}
                              {pw.dept && <><span className="opacity-40">·</span><span>{pw.dept}</span></>}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-medium">{pw.role}</span>
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
                        <Badge variant="outline" className={`text-[10px] ${statusColors[s.status]}`}>{displayStatus(s.status)}</Badge>
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
                          {/* Edit button for sent-back suggestions ONLY if sent back to Employee */}
                          {!showDraftActions && s.status === "Sent Back" && s.sendBackHistory?.length && s.sendBackHistory[s.sendBackHistory.length - 1].to === "Employee" && (
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
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border bg-muted/20 px-4 py-3 space-y-2.5">
        {/* Row 1: Search + Dropdowns — all stretch to fill */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3">
          {/* Search by suggestion no */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider">Search</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Suggestion No…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`h-8 w-full text-xs pl-8 pr-7 bg-background ${searchQuery ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Type filter */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider">Type</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className={`h-8 w-full text-xs bg-background ${typeFilter !== "all" ? "border-primary/50 ring-1 ring-primary/20" : ""}`}>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Simple Suggestion Scheme">Simple Suggestion</SelectItem>
                <SelectItem value="Shop Floor CIP">Shop Floor CIP</SelectItem>
                <SelectItem value="My Idea Card">My Idea Card</SelectItem>
                <SelectItem value="Daily CIP">Daily CIP</SelectItem>
                <SelectItem value="Cash The Flash">Cash The Flash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`h-8 w-full text-xs bg-background ${statusFilter !== "all" ? "border-primary/50 ring-1 ring-primary/20" : ""}`}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Under Evaluation">Under Evaluation</SelectItem>
                <SelectItem value="Approved &amp; Closed">Approved &amp; Closed</SelectItem>
                <SelectItem value="Sent Back">Sent Back</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Implemented">Implemented</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pending With filter */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider">Pending With</span>
            <Select value={pendingFilter} onValueChange={setPendingFilter}>
              <SelectTrigger className={`h-8 w-full text-xs bg-background ${pendingFilter !== "all" ? "border-amber-400 ring-1 ring-amber-400/20" : ""}`}>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {pendingRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
                <SelectItem value="BPS">BPS (DH / Admin)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Date range + results + clear */}
        <div className="flex items-end gap-3">
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider">From Date</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className={`h-8 w-40 text-xs bg-background ${dateFrom ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
              />
            </div>
            <span className="text-xs text-muted-foreground mb-1.5">→</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider">To Date</span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className={`h-8 w-40 text-xs bg-background ${dateTo ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-muted-foreground">
              {subs.length + drafts.length} result{subs.length + drafts.length !== 1 ? "s" : ""}
              {anyFilter ? ` / ${allSubs.length + allDrafts.length} total` : ""}
            </span>
            {anyFilter && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setTypeFilter("all"); setStatusFilter("all"); setPendingFilter("all"); setDateFrom(""); setDateTo(""); }}
                className="flex items-center gap-1.5 text-xs text-destructive/80 hover:text-destructive px-3 py-1.5 rounded-lg border border-destructive/20 hover:bg-destructive/5 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>
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
