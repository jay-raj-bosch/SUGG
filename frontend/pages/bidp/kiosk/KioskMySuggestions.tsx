import { useState } from "react";
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
import { Eye, Edit, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SuggestionDetailDialog from "@/components/bidp/SuggestionDetailDialog";
import SuggestionTimelineDialog from "@/components/bidp/SuggestionTimelineDialog";

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

  const empNo = user?.employeeNo;
  const allSubmitted = getSubmittedSuggestions().filter(s => s.employeeNo === empNo);
  const allDrafts    = getDraftSuggestions().filter(s => s.employeeNo === empNo);
  const allDaily     = getDailyCIPSuggestions().filter(s => s.employeeNo === empNo);

  const applyTypeFilter = (list: Suggestion[]) =>
    typeFilter === "all" ? list : list.filter(s => s.type === typeFilter);

  const submitted = applyTypeFilter(allSubmitted);
  const drafts    = applyTypeFilter(allDrafts);
  const daily     = applyTypeFilter(allDaily);

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

  const renderTable = (data: Suggestion[], showDraftActions = false) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 text-xs font-medium text-muted-foreground">Suggestion No</th>
            <th className="pb-2 text-xs font-medium text-muted-foreground">Subject</th>
            <th className="pb-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Type</th>
            <th className="pb-2 text-xs font-medium text-muted-foreground">Date</th>
            <th className="pb-2 text-xs font-medium text-muted-foreground">Status</th>
            <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(s => (
            <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="py-2.5 font-mono text-xs">{s.suggestionNo}</td>
              <td className="py-2.5 max-w-[200px]"><span className="block truncate" title={s.subject}>{s.subject}</span></td>
              <td className="py-2.5 text-xs text-muted-foreground hidden md:table-cell">{s.type}</td>
              <td className="py-2.5 text-xs">{s.date}</td>
              <td className="py-2.5">
                <Badge variant="outline" className={`text-[10px] ${statusColors[s.status]}`}>{s.status}</Badge>
              </td>
              <td className="py-2.5 text-right">
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
          ))}
          {data.length === 0 && (
            <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No suggestions found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground">My Suggestions</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter by type:</span>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Simple Suggestion Scheme">Simple Suggestion Scheme</SelectItem>
              <SelectItem value="Shop Floor CIP">Shop Floor CIP</SelectItem>
              <SelectItem value="My Idea Card">My Idea Card</SelectItem>
              <SelectItem value="Daily CIP">Daily CIP</SelectItem>
              <SelectItem value="Cash The Flash">Cash The Flash</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="submitted">
        <TabsList>
          <TabsTrigger value="submitted">
            Submitted ({submitted.length}{typeFilter !== "all" ? `/${allSubmitted.length}` : ""})
          </TabsTrigger>
          <TabsTrigger value="saved">
            Saved / Drafts ({drafts.length}{typeFilter !== "all" ? `/${allDrafts.length}` : ""})
          </TabsTrigger>
          <TabsTrigger value="daily">
            Daily CIP ({daily.length}{typeFilter !== "all" ? `/${allDaily.length}` : ""})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submitted">
          <Card className="card-shadow"><CardContent className="pt-4">{renderTable(submitted)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="saved">
          <Card className="card-shadow"><CardContent className="pt-4">{renderTable(drafts, true)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="daily">
          <Card className="card-shadow"><CardContent className="pt-4">{renderTable(daily)}</CardContent></Card>
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
