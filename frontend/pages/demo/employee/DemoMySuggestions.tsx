// Demo Plant — My Suggestions (Employee)
// Enterprise-Grade Suggestion Portfolio & Workflow Tracker for Demo Sandbox
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { usePlant } from "@/contexts/PlantContext";
import {
  JAP_STATUS_COLORS,
  STATUS_TO_PHASE,
  PHASE_SLA,
  JAP_STATUSES,
} from "@/lib/jap/workflowPipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ListChecks,
  Search,
  Clock,
  Building2,
  Calendar,
  FilePlus,
  TrendingUp,
  Pencil,
  Send,
  GitBranch,
  Copy,
  Check,
  Award,
  Layers,
  Wrench,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Filter,
} from "lucide-react";
import type { Suggestion } from "@/lib/mockData";
import { toast } from "sonner";
import SuggestionTimelineDialog from "@/components/jap/SuggestionTimelineDialog";
import { getDemoSelection, DEMO_PLANTS_CONFIG } from "@/lib/demoConfig";

type StatusFilter = "all" | "draft" | "active" | "closed" | "rejected";

const ACTIVE_STATUSES = [
  JAP_STATUSES.PENDING_FEASIBILITY,
  JAP_STATUSES.IN_OPINION,
  JAP_STATUSES.IN_IMPLEMENTATION,
  JAP_STATUSES.IN_EVALUATION,
  JAP_STATUSES.IN_AWARD,
];

const DemoMySuggestions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { suggestions, updateSuggestion, deleteSuggestion, refreshSuggestions } = useSuggestions();
  const { plantPrefix } = usePlant();
  const demoSelection = getDemoSelection();
  const activePlantConfig = demoSelection?.plant ? DEMO_PLANTS_CONFIG[demoSelection.plant] : null;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Detail dialog
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Timeline dialog
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Delete draft confirmation
  const [draftToDelete, setDraftToDelete] = useState<Suggestion | null>(null);

  // Sync / refresh suggestions on mount
  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions]);

  // Robust filtering for demo items:
  // Matches PLT-03, demo, or empty plant code in demo mode
  const mySuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const isDemoPlant =
        s.plantCode === "PLT-03" ||
        (s as any).plant_code === "PLT-03" ||
        s.plantCode === "demo" ||
        (s as any).plant_code === "demo" ||
        !s.plantCode;
      if (!isDemoPlant) return false;

      // In Demo sandbox, allow Alex Morgan (default demo user DEMO-1001) or demo visitors to see all demo submissions
      if (!user?.employeeNo || user.employeeNo === "DEMO-1001" || user.employeeNo === "DEMO-EMP") {
        return true;
      }
      return (
        s.employeeNo === user.employeeNo ||
        (s as any).employee_no === user.employeeNo ||
        (s.formData as any)?.onBehalfEmpNo === user.employeeNo ||
        s.employeeNo === "DEMO-1001"
      );
    });
  }, [suggestions, user]);

  // Extract unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    mySuggestions.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [mySuggestions]);

  // Aggregated KPI Stats
  const stats = useMemo(() => {
    const total = mySuggestions.length;
    const active = mySuggestions.filter((s) => ACTIVE_STATUSES.includes(s.status as any)).length;
    const drafts = mySuggestions.filter((s) => s.status === JAP_STATUSES.DRAFT).length;
    const closed = mySuggestions.filter((s) => s.status === JAP_STATUSES.CLOSED_AWARDED).length;
    const rejected = mySuggestions.filter(
      (s) => s.status === JAP_STATUSES.REJECTED || s.status === JAP_STATUSES.REOPENED
    ).length;
    const totalRewards = mySuggestions.reduce((acc, s) => acc + (s.awardAmount ?? 0), 0);

    return { total, active, drafts, closed, rejected, totalRewards };
  }, [mySuggestions]);

  // Filtered list based on tab, category, and search text
  const filtered = useMemo(() => {
    let base = mySuggestions;

    // Status Tab filter
    if (filter === "draft") {
      base = base.filter((s) => s.status === JAP_STATUSES.DRAFT);
    } else if (filter === "active") {
      base = base.filter((s) => ACTIVE_STATUSES.includes(s.status as any));
    } else if (filter === "closed") {
      base = base.filter((s) => s.status === JAP_STATUSES.CLOSED_AWARDED);
    } else if (filter === "rejected") {
      base = base.filter(
        (s) => s.status === JAP_STATUSES.REJECTED || s.status === JAP_STATUSES.REOPENED
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      base = base.filter((s) => s.category === categoryFilter);
    }

    // Free text search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      base = base.filter((s) => {
        const no = (s.suggestionNo || "").toLowerCase();
        const sub = (s.subject || "").toLowerCase();
        const cat = (s.category || "").toLowerCase();
        const dept = (s.department || "").toLowerCase();
        const present = (s.presentMethod || "").toLowerCase();
        const proposed = (s.proposedMethod || "").toLowerCase();
        const machine = ((s.formData as any)?.machineRef || "").toLowerCase();
        const comp = ((s.formData as any)?.componentToolNo || "").toLowerCase();
        return (
          no.includes(q) ||
          sub.includes(q) ||
          cat.includes(q) ||
          dept.includes(q) ||
          present.includes(q) ||
          proposed.includes(q) ||
          machine.includes(q) ||
          comp.includes(q)
        );
      });
    }

    return [...base].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [mySuggestions, filter, categoryFilter, search]);

  const handleCopySuggestionNo = (suggNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(suggNo);
    setCopiedId(suggNo);
    toast.success("Suggestion No copied to clipboard", { description: suggNo });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmitDraft = async (s: Suggestion) => {
    await updateSuggestion(s.id, {
      status: "Pending Feasibility Review",
      pendingWith: "Superior",
      daysPending: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    toast.success("Draft Submitted Successfully", {
      description: `${s.suggestionNo} has been routed to Superior for feasibility review.`,
    });
  };

  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;
    if (deleteSuggestion) {
      deleteSuggestion(draftToDelete.id);
    } else {
      await updateSuggestion(draftToDelete.id, { status: "Deleted" } as any);
    }
    toast.success("Draft Deleted", { description: `${draftToDelete.suggestionNo} removed.` });
    setDraftToDelete(null);
  };

  const FILTER_TABS: Array<{ key: StatusFilter; label: string; count: number; colorClass: string }> = [
    { key: "all", label: "All Suggestions", count: stats.total, colorClass: "text-foreground" },
    { key: "active", label: "Active Review", count: stats.active, colorClass: "text-blue-600" },
    { key: "closed", label: "Awarded / Closed", count: stats.closed, colorClass: "text-emerald-600" },
    { key: "draft", label: "Drafts", count: stats.drafts, colorClass: "text-amber-600" },
    { key: "rejected", label: "Rejected", count: stats.rejected, colorClass: "text-rose-600" },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ── Enterprise Header & Quick Actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 sm:p-5 rounded-xl border card-shadow">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ListChecks className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Suggestions</h1>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[11px]">
              Demo Plant: {demoSelection?.plant ?? "JaP"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Overview and real-time lifecycle tracking of improvement ideas submitted by{" "}
            <span className="font-semibold text-foreground">{user?.name ?? "Alex Morgan"}</span> (
            <span className="font-mono text-xs">{user?.employeeNo ?? "DEMO-1001"}</span>).
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshSuggestions()}
            className="text-xs gap-1.5 h-9"
            title="Refresh suggestion list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            className="gap-2 text-xs h-9 shadow-sm flex-1 sm:flex-initial"
            onClick={() => navigate(`${plantPrefix}/employee/new-suggestion`)}
          >
            <FilePlus className="h-4 w-4" />
            New Suggestion
          </Button>
        </div>
      </div>

      {/* ── Enterprise KPI Metrics Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="card-shadow border hover:border-primary/30 transition-colors">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Ideas
              </p>
              <p className="text-2xl font-bold mt-0.5">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Submitted in Demo</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border hover:border-blue-300 transition-colors">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                In Review
              </p>
              <p className="text-2xl font-bold mt-0.5 text-blue-600">{stats.active}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Under evaluation & opinion</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border hover:border-emerald-300 transition-colors">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Awarded Ideas
              </p>
              <p className="text-2xl font-bold mt-0.5 text-emerald-600">{stats.closed}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Successfully implemented</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border hover:border-amber-300 transition-colors">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Cash Awards
              </p>
              <p className="text-2xl font-bold mt-0.5 text-amber-600">
                ₹{stats.totalRewards.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total recognition earned</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div className="bg-card p-3 sm:p-4 rounded-xl border card-shadow space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                <span
                  className={[
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                    isActive ? "bg-white/20 text-white" : "bg-background text-muted-foreground",
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter inputs: Search and Category dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Suggestion No, Subject, Category, Machine Ref, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-background h-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 text-xs bg-background h-9">
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {categoryFilter === "all" ? "All Categories" : categoryFilter}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories ({mySuggestions.length})</SelectItem>
                {uniqueCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || categoryFilter !== "all" || filter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setFilter("all");
                }}
                className="text-xs h-9 text-muted-foreground hover:text-foreground shrink-0"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Suggestions List Cards ── */}
      {filtered.length === 0 ? (
        <Card className="card-shadow border-dashed">
          <CardContent className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-semibold text-foreground">No suggestions found</p>
              <p className="text-xs text-muted-foreground">
                {search || categoryFilter !== "all" || filter !== "all"
                  ? "No suggestion matches your current filter or search criteria."
                  : "You haven't submitted any suggestions in this demo profile yet."}
              </p>
            </div>
            <div className="pt-2">
              <Button
                size="sm"
                className="gap-2 text-xs"
                onClick={() => navigate(`${plantPrefix}/employee/new-suggestion`)}
              >
                <FilePlus className="h-4 w-4" /> Create First Suggestion
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
              <strong>{mySuggestions.length}</strong> ideas
            </span>
            <span className="font-mono text-[11px]">Sorted by submission date (newest first)</span>
          </div>

          {filtered.map((s) => {
            const sla = PHASE_SLA[s.status] ?? 0;
            const overSla = sla > 0 && (s.daysPending ?? 0) > sla;
            const isRejected = s.status === JAP_STATUSES.REJECTED;
            const isDraft = s.status === JAP_STATUSES.DRAFT;
            const isAwarded = s.status === JAP_STATUSES.CLOSED_AWARDED;
            const machineRef = (s.formData as any)?.machineRef;
            const componentToolNo = (s.formData as any)?.componentToolNo;
            const schemeName = (s.formData as any)?.scheme || s.type;

            return (
              <Card
                key={s.id}
                className={`transition-all hover:shadow-md card-shadow border bg-card ${
                  overSla
                    ? "border-orange-300 bg-orange-50/10"
                    : isDraft
                    ? "border-amber-200 bg-amber-50/10"
                    : isAwarded
                    ? "border-emerald-200/80"
                    : "hover:border-primary/40"
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                    {/* Left: Suggestion Meta, Title, Methods */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Top Badges Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Suggestion Code with Copy Button */}
                        <div className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          <span>{s.suggestionNo}</span>
                          <button
                            onClick={(e) => handleCopySuggestionNo(s.suggestionNo, e)}
                            className="text-primary hover:text-primary/70 transition-colors p-0.5 rounded"
                            title="Copy Suggestion Number"
                          >
                            {copiedId === s.suggestionNo ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold px-2 py-0.5 border ${
                            JAP_STATUS_COLORS[s.status] ?? "bg-muted text-muted-foreground"
                          }`}
                        >
                          {STATUS_TO_PHASE[s.status] ?? s.status}
                        </Badge>

                        {/* Category Badge */}
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {s.category}
                        </Badge>

                        {/* Scheme Badge */}
                        {schemeName && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50/60 font-medium capitalize"
                          >
                            <Layers className="h-2.5 w-2.5 mr-1" />
                            {schemeName}
                          </Badge>
                        )}

                        {/* SLA / Overdue Pill */}
                        {overSla && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-orange-300 text-orange-700 bg-orange-50 font-medium"
                          >
                            <AlertCircle className="h-2.5 w-2.5 mr-1" />
                            Overdue ({s.daysPending}d vs {sla}d SLA)
                          </Badge>
                        )}

                        {/* Award Pill */}
                        {isAwarded && s.awardAmount && (
                          <Badge className="text-[10px] bg-emerald-600 text-white font-semibold">
                            <Award className="h-3 w-3 mr-1" />₹{s.awardAmount.toLocaleString()}
                          </Badge>
                        )}
                      </div>

                      {/* Subject */}
                      <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight leading-snug">
                        {s.subject}
                      </h3>

                      {/* Present vs Proposed Snapshot */}
                      {(s.presentMethod || s.proposedMethod) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          {s.presentMethod && (
                            <div className="bg-muted/40 rounded-lg p-2.5 border text-muted-foreground border-border/50">
                              <span className="font-semibold text-[11px] text-foreground block mb-0.5">
                                Present Method:
                              </span>
                              <p className="line-clamp-2 text-[11px] leading-relaxed">
                                {s.presentMethod}
                              </p>
                            </div>
                          )}
                          {s.proposedMethod && (
                            <div className="bg-primary/5 rounded-lg p-2.5 border text-foreground border-primary/20">
                              <span className="font-semibold text-[11px] text-primary block mb-0.5">
                                Proposed Improvement:
                              </span>
                              <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                                {s.proposedMethod}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadata Row: Date, Dept, Pending With, Machine/Tool */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="h-3 w-3 text-muted-foreground" /> {s.date}
                        </span>

                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" /> {s.department}
                        </span>

                        {s.pendingWith && s.pendingWith !== "Closed" && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            <span>
                              Pending with: <strong className="text-foreground">{s.pendingWith}</strong>
                            </span>
                          </span>
                        )}

                        {machineRef && machineRef !== "N/A" && (
                          <span className="flex items-center gap-1 font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">
                            <Wrench className="h-2.5 w-2.5 text-primary" /> {machineRef}
                          </span>
                        )}

                        {componentToolNo && componentToolNo !== "N/A" && (
                          <span className="flex items-center gap-1 font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">
                            Tool: {componentToolNo}
                          </span>
                        )}
                      </div>

                      {/* Rejection notice if applicable */}
                      {isRejected && s.rejectionReason && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-800 space-y-0.5">
                          <p className="font-semibold flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Rejection Feedback:
                          </p>
                          <p className="text-rose-700 pl-4">{s.rejectionReason}</p>
                          {s.rejectedByName && (
                            <p className="text-[10px] text-rose-500 pl-4">
                              Reviewed by {s.rejectedByName} on {s.rejectedOn}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions Column */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-1.5 shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-xs gap-1.5 px-3 flex-1 lg:flex-initial"
                        onClick={() => {
                          setSelected(s);
                          setDetailOpen(true);
                        }}
                      >
                        View Full Details
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 flex-1 lg:flex-initial"
                        onClick={() => {
                          setSelected(s);
                          setTimelineOpen(true);
                        }}
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        Audit Timeline
                      </Button>

                      {isDraft && (
                        <div className="flex items-center gap-1.5 w-full lg:w-auto pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 flex-1"
                            onClick={() =>
                              navigate(`${plantPrefix}/employee/new-suggestion?draft=${s.id}`)
                            }
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex-1"
                            onClick={() => handleSubmitDraft(s)}
                          >
                            <Send className="h-3 w-3" /> Submit
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => setDraftToDelete(s)}
                            title="Delete Draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Comprehensive Enterprise Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {selected?.suggestionNo}
              </span>
              <Badge
                variant="outline"
                className={`text-xs px-2 py-0.5 ${
                  selected?.status ? JAP_STATUS_COLORS[selected.status] ?? "" : ""
                }`}
              >
                {selected?.status ? STATUS_TO_PHASE[selected.status] ?? selected.status : ""}
              </Badge>
              {selected?.awardAmount ? (
                <Badge className="bg-emerald-600 text-white text-xs">
                  ₹{selected.awardAmount.toLocaleString()} ({selected.awardCategory || "Awarded"})
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground pt-1">
              {selected?.subject}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submitted on {selected?.date} · Plant: PLT-03 (Demo Sandbox)
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-xs sm:text-sm pt-2">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-xl border">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Suggestor
                  </p>
                  <p className="font-medium mt-0.5">{selected.employeeName}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{selected.employeeNo}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Department / Area
                  </p>
                  <p className="font-medium mt-0.5">{selected.department}</p>
                  <p className="text-[10px] text-muted-foreground">{selected.range || "Shop Floor"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Category</p>
                  <p className="font-medium mt-0.5">{selected.category}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Pending With</p>
                  <p className="font-medium mt-0.5 text-primary">{selected.pendingWith || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Days: {selected.daysPending ?? 0}
                  </p>
                </div>
              </div>

              {/* Machine & Component References */}
              {((selected.formData as any)?.machineRef ||
                (selected.formData as any)?.componentToolNo) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-card p-3 rounded-xl border">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Machine Reference
                    </p>
                    <p className="font-mono text-xs font-semibold mt-0.5">
                      {(selected.formData as any)?.machineRef || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Component / Tool Reference
                    </p>
                    <p className="font-mono text-xs font-semibold mt-0.5">
                      {(selected.formData as any)?.componentToolNo || "N/A"}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Present Method vs Proposed Method */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Present Method (Existing
                    Problem)
                  </span>
                  <div className="bg-muted/40 rounded-xl p-3 border text-xs leading-relaxed text-foreground">
                    {selected.presentMethod || "No present method recorded."}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Proposed Method (Kaizen / Idea)
                  </span>
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/20 text-xs leading-relaxed text-foreground">
                    {selected.proposedMethod || "No proposed method recorded."}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 uppercase tracking-wide">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" /> Expected Tangible &
                    Intangible Benefits
                  </span>
                  <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200 text-xs leading-relaxed text-emerald-950">
                    {selected.benefits || "No specific benefits noted."}
                  </div>
                </div>
              </div>

              {/* Rejection info if rejected */}
              {selected.status === JAP_STATUSES.REJECTED && selected.rejectionReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1">
                  <p className="text-xs font-bold text-rose-800">Rejection Notice</p>
                  <p className="text-xs text-rose-700">{selected.rejectionReason}</p>
                  {selected.rejectedByName && (
                    <p className="text-[11px] text-rose-500 pt-1">
                      Actioned by {selected.rejectedByName} on {selected.rejectedOn}
                    </p>
                  )}
                </div>
              )}

              {/* Award banner if awarded */}
              {selected.awardAmount && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-emerald-600" /> Award Recognition
                    </p>
                    <p className="text-xs text-emerald-700">
                      Category: {selected.awardCategory || "Quality Kaizen Award"}
                    </p>
                    {selected.awardDate && (
                      <p className="text-[11px] text-emerald-600">Disbursed on: {selected.awardDate}</p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-emerald-700 font-mono">
                    ₹{selected.awardAmount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDetailOpen(false);
                setTimelineOpen(true);
              }}
              className="text-xs gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
            >
              <GitBranch className="h-3.5 w-3.5" /> View Audit Trail
            </Button>

            <Button size="sm" onClick={() => setDetailOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Timeline Dialog ── */}
      <SuggestionTimelineDialog
        suggestion={selected}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
      />

      {/* ── Delete Draft Confirmation Dialog ── */}
      <Dialog open={!!draftToDelete} onOpenChange={(open) => !open && setDraftToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Delete Draft
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete draft{" "}
              <strong className="text-foreground">{draftToDelete?.suggestionNo}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraftToDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteDraft}
              className="text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DemoMySuggestions;
