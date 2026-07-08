import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusColors, Suggestion, suggestionTypes, mockEmployees } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useCategories } from "@/contexts/CategoryContext";
import { useDeptMappings } from "@/contexts/DeptMappingContext";
import { toast } from "sonner";
import { Save, Send, Trash2, CalendarDays, User, Users, FileText, Award, Clock, Info, Percent, ChevronRight, ChevronLeft, Paperclip, Download, ZoomIn, Image, ArrowRightLeft } from "lucide-react";
import { type AttachmentItem, formatFileSize, isImageMime } from "@/lib/attachmentUtils";
import { teamMemberOptions, moderatorOptions, flmOptions } from "@/lib/bidp/suggestionConstants";
import { calculateDaysPending } from "@/lib/bidp/approvalPipeline";

// TODO [BACKEND]: Replace with API call — PUT /api/suggestions/:id for updates
// TODO [BACKEND]: Submit action should call POST /api/suggestions/:id/submit
// TODO [BACKEND]: Delete draft → DELETE /api/suggestions/:id (only for Draft status, employee-side only)

interface Props {
  suggestion: Suggestion | null;
  mode: "view" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
}

const SuggestionDetailDialog = ({ suggestion, mode, open, onOpenChange, onDelete }: Props) => {
  const { updateSuggestion } = useSuggestions();
  const { categories } = useCategories();
  const { uniqueRanges, uniqueDepartments } = useDeptMappings();
  const [editData, setEditData] = useState<Partial<Suggestion>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<AttachmentItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (open && suggestion) {
      setEditData({ ...suggestion });
    } else {
      setEditData({});
    }
    // Track id explicitly so the form resets when the user navigates between
    // different suggestions while the dialog stays mounted.
  }, [open, suggestion?.id, suggestion]);

  const handleSave = () => {
    if (!suggestion) return;
    updateSuggestion(suggestion.id, editData);
    toast.success("Draft saved successfully", {
      description: `${editData.subject || suggestion.subject} has been updated.`,
    });
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!suggestion) return;
    if (!editData.subject?.trim()) {
      toast.error("Subject is required to submit");
      return;
    }
    if (!editData.presentMethod?.trim()) {
      toast.error("Present Method / Problem is required");
      return;
    }
    if (!editData.proposedMethod?.trim()) {
      toast.error("Proposed Method / Solution is required");
      return;
    }
    updateSuggestion(suggestion.id, {
      ...editData,
      status: "Submitted",
      pendingWith: "FLM - Pending Review",
      daysPending: 0,
    });
    toast.success("Suggestion submitted!", {
      description: `${editData.subject || suggestion.subject} is now under review.`,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!suggestion) return;
    onDelete?.(suggestion.id);
    toast.success("Draft deleted", {
      description: `${suggestion.subject} has been removed.`,
    });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  if (!suggestion) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd: Record<string, any> = suggestion.formData || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tf: Record<string, any> = fd.typeFields || {};

  // Helpers
  const fmtDate = (d?: string) => {
    if (!d) return "—";
    const p = d.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  const val = (key: keyof Suggestion) => (isEdit ? (editData[key] ?? suggestion[key]) : suggestion[key]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setField = (field: keyof Suggestion, value: any) => setEditData(prev => ({ ...prev, [field]: value }));

  // ── View-mode section helpers ────────────────────────────────────────────
  const SectionHead = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    </div>
  );

  const Row = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex gap-3 py-1.5 border-b border-border/40 last:border-0 items-start">
      <span className="text-xs text-muted-foreground w-44 shrink-0 leading-relaxed">{label}</span>
      <span className="text-xs text-foreground font-medium flex-1 leading-relaxed whitespace-pre-wrap break-words">{value || "—"}</span>
    </div>
  );

  const Block = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
      </div>
    ) : null;

  // emp-no lookup for roles referenced by name in pendingWith / evaluatedByName etc.
  const EMP_LOOKUP: Record<string, string> = {
    "Suresh M":  "30698710",
    "Ganesh R":  "30698711",
    "Karthik M": "30698730",
    "Lakshmi P": "30698731",
    "Rajesh V":  "30698732",
  };
  const withEmpNo = (name?: string, empNo?: string): string => {
    if (!name) return "\u2014";
    const no = empNo || EMP_LOOKUP[name] || "";
    return no ? `${name} (${no})` : name;
  };

  // Team members + shares from formData
  const teamMembers: string[] = fd.teamMembers || [];
  const teamMemberShares: Record<string, string> = fd.teamMemberShares || {};

  // Build a combined lookup (empNo → {name, dept}) from all options + mockEmployees
  const allOptions = [...teamMemberOptions, ...moderatorOptions, ...flmOptions];
  const optByEmpNo: Record<string, { name: string; dept: string }> = {};
  for (const o of allOptions) {
    if (o.value && !optByEmpNo[o.value]) optByEmpNo[o.value] = { name: o.name, dept: o.dept };
  }
  // Also include mockEmployees for broader coverage
  for (const e of mockEmployees) {
    if (!optByEmpNo[e.employeeNo]) optByEmpNo[e.employeeNo] = { name: e.name, dept: e.department };
  }
  const resolveEmpDisplay = (empNoOrStr: string): string => {
    if (!empNoOrStr) return "\u2014";
    const found = optByEmpNo[empNoOrStr];
    if (found) return `${found.name} (${empNoOrStr}) · ${found.dept}`;
    // maybe it’s already a name
    const byName = allOptions.find(o => o.name === empNoOrStr);
    if (byName) return `${byName.name} (${byName.value}) · ${byName.dept}`;
    return empNoOrStr;
  };

  // Render type-specific fields based on suggestion type
  const renderTypeSpecificFields = () => {
    const type = suggestion.type;

    if (type === "Simple Suggestion Scheme") {
      return (
        <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
          <Row label="Subject" value={tf.subject || suggestion.subject} />
          <Row label="Category" value={tf.category || suggestion.category} />
          <Row label="Date of Implementation" value={fmtDate(tf.dateOfImplementation)} />
          <Row label="FLM" value={tf.flm ? resolveEmpDisplay(tf.flm) : undefined} />
          <div className="py-2 space-y-3 border-b border-border/40">
            <Block label="Details of Present Method" value={tf.presentMethod || suggestion.presentMethod} />
            <Block label="Details of Proposed Method" value={tf.proposedMethod || suggestion.proposedMethod} />
            <Block label="Benefits" value={tf.benefits || suggestion.benefits} />
          </div>
        </div>
      );
    }

    if (type === "Shop Floor CIP") {
      const mods: string[] = tf.moderators || (tf.moderator ? [tf.moderator] : []);
      return (
        <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
          <Row label="Kaizen Theme" value={tf.kaizenTheme} />
          <Row label="Category" value={tf.category || suggestion.category} />
          <Row label="Date of Implementation" value={fmtDate(tf.dateOfImplementation)} />
          <Row label="Moderator(s)" value={mods.length ? mods.map(m => resolveEmpDisplay(m)).join(" | ") : undefined} />
          <Row label="How many places this kaizen is deployed horizontally" value={tf.horizontalDeployment} />
          <div className="py-2 space-y-3 border-b border-border/40">
            <Block label="Problem / Present Status" value={tf.problemStatus || suggestion.presentMethod} />
            <Block label="Before Improvement" value={tf.beforeImprovement} />
            <Block label="After Improvement" value={tf.afterImprovement || suggestion.proposedMethod} />
            <Block label="Root Cause" value={tf.rootCause} />
            <Block label="Real Root Cause Identification" value={tf.rootCauseIdentification} />
            <Block label="Idea to Eliminate Root Cause" value={tf.ideaToEliminate} />
            <Block label="Action Taken" value={tf.actionTaken} />
            <Block label="Standardization" value={tf.standardization} />
            <Block label="Benefits" value={tf.benefits || suggestion.benefits} />
          </div>
        </div>
      );
    }

    if (type === "My Idea Card") {
      return (
        <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
          <Row label="Subject" value={tf.subject || suggestion.subject} />
          <Row label="Category" value={tf.category || suggestion.category} />
          <Row label="Date of Implementation" value={fmtDate(tf.dateOfImplementation)} />
          <Row label="FLM" value={tf.flm ? resolveEmpDisplay(tf.flm) : undefined} />
          <div className="py-2 space-y-3 border-b border-border/40">
            <Block label="Description – Idea / Problem" value={tf.descriptionProblem || suggestion.presentMethod} />
            <Block label="Description – Improvement Done" value={tf.descriptionImprovement || suggestion.proposedMethod} />
            <Block label="Benefits" value={tf.benefits || suggestion.benefits} />
          </div>
        </div>
      );
    }

    if (type === "Daily CIP") {
      return (
        <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
          <Row label="Date of Implementation" value={fmtDate(tf.dateOfImplementation)} />
          <Row label="Category" value={tf.category || suggestion.category} />
          <Row label="Machine No / Area" value={tf.machineNoArea || suggestion.subject} />
          <div className="py-2 space-y-3 border-b border-border/40">
            <Block label="Suggestion Description" value={tf.suggestionDescription || suggestion.presentMethod} />
            <Block label="Action Taken" value={tf.actionTaken || suggestion.proposedMethod} />
            <Block label="Benefits" value={tf.benefits || suggestion.benefits} />
          </div>
          {(tf.photosBefore?.length > 0 || tf.photosAfter?.length > 0) && (
            <div className="py-2 space-y-3">
              {tf.photosBefore?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Before Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {(tf.photosBefore as AttachmentItem[]).map((item, i) => (
                      <button key={item.id ?? i} type="button"
                        onClick={() => { setLightboxImages(tf.photosBefore as AttachmentItem[]); setLightboxIndex(i); setLightboxOpen(true); }}
                        className="relative group focus:outline-none rounded">
                        <img src={item.url} alt={item.name} className="h-20 w-20 object-cover rounded border hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tf.photosAfter?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">After Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {(tf.photosAfter as AttachmentItem[]).map((item, i) => (
                      <button key={item.id ?? i} type="button"
                        onClick={() => { setLightboxImages(tf.photosAfter as AttachmentItem[]); setLightboxIndex(i); setLightboxOpen(true); }}
                        className="relative group focus:outline-none rounded">
                        <img src={item.url} alt={item.name} className="h-20 w-20 object-cover rounded border hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (type === "Cash The Flash") {
      return (
        <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
          <Row label="Subject" value={tf.subject || suggestion.subject} />
          <Row label="Category" value={tf.category || suggestion.category} />
          <Row label="Suggestor Name" value={tf.suggestorName} />
          <Row label="Share %" value={tf.sharePercent ? `${tf.sharePercent}%` : undefined} />
          <Row label="FLM" value={tf.flm ? resolveEmpDisplay(tf.flm) : undefined} />
          <div className="py-2 space-y-3 border-b border-border/40">
            <Block label="Present / Before Method" value={tf.presentMethod || suggestion.presentMethod} />
            <Block label="Proposed / After Method" value={tf.proposedMethod || suggestion.proposedMethod} />
            <Block label="Benefits" value={tf.benefits || suggestion.benefits} />
          </div>
        </div>
      );
    }

    // Fallback – show whatever top-level fields exist
    return (
      <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
        <Row label="Subject" value={suggestion.subject} />
        <Row label="Category" value={suggestion.category} />
        <div className="py-2 space-y-3 border-b border-border/40">
          <Block label="Present Method / Problem" value={suggestion.presentMethod} />
          <Block label="Proposed Method / Solution" value={suggestion.proposedMethod} />
          <Block label="Benefits" value={suggestion.benefits} />
        </div>
      </div>
    );
  };

  // ── Edit-mode helpers (unchanged) ────────────────────────────────────────
  const TextField = ({ label, field, multiline, required }: { label: string; field: keyof Suggestion; multiline?: boolean; required?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {isEdit && required && <span className="text-destructive">*</span>}
      </Label>
      {isEdit ? (
        multiline ? (
          <Textarea value={String(val(field) || "")} onChange={(e) => setField(field, e.target.value)} className="text-sm" rows={3} />
        ) : (
          <Input value={String(val(field) || "")} onChange={(e) => setField(field, e.target.value)} className="text-sm" />
        )
      ) : (
        <p className="text-sm text-foreground">{String(val(field) || "—")}</p>
      )}
    </div>
  );

  const SelectField = ({ label, field, options, required }: { label: string; field: keyof Suggestion; options: string[]; required?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {isEdit && required && <span className="text-destructive">*</span>}
      </Label>
      {isEdit ? (
        <Select value={String(val(field) || "")} onValueChange={(v) => setField(field, v)}>
          <SelectTrigger className="text-sm"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
          <SelectContent>{options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <p className="text-sm text-foreground">{String(val(field) || "—")}</p>
      )}
    </div>
  );

  const avatarColors = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-pink-500","bg-indigo-500"];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            {isEdit ? "Edit Suggestion" : "Suggestion Details"}
            <Badge variant="outline" className={`text-[10px] ${statusColors[suggestion.status]}`}>
              {suggestion.status}
            </Badge>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{suggestion.suggestionNo}</DialogDescription>
        </DialogHeader>

        {/* ── EDIT MODE ─────────────────────────────── */}
        {isEdit && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Subject" field="subject" required />
              <SelectField label="Type" field="type" options={suggestionTypes} required />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SelectField label="Category" field="category" options={categories} required />
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                <Input type="date" value={String(val("date") || "")} onChange={(e) => setField("date", e.target.value)} className="text-sm" />
              </div>
              <SelectField label="Range" field="range" options={uniqueRanges} />
              <SelectField label="Suggestion Department" field="suggestionDepartment" options={uniqueDepartments} required />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Employee No" field="employeeNo" />
              <TextField label="Employee Name" field="employeeName" />
            </div>
            <Separator />
            <TextField label="Present Method / Problem" field="presentMethod" multiline required />
            <TextField label="Proposed Method / Solution" field="proposedMethod" multiline required />
            <TextField label="Benefits" field="benefits" multiline required />
            {suggestion.pendingWith && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Pending With</Label>
                  <p className="text-sm text-foreground">{suggestion.pendingWith}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Days Pending</Label>
                  <p className="text-sm text-foreground">{calculateDaysPending(suggestion)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW MODE ─────────────────────────────── */}
        {!isEdit && (
          <div className="space-y-3">

            {/* ① Identification */}
            <SectionHead icon={FileText} title="Identification" />
            <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
              <Row label="Suggestion No" value={suggestion.suggestionNo} />
              <Row label="Suggestion Date" value={fmtDate(suggestion.date)} />
              <Row label="Type of Suggestion" value={suggestion.type} />
              <Row label="Range" value={suggestion.range} />
              <Row label="Suggestion Department" value={suggestion.suggestionDepartment || "—"} />
            </div>

            {/* ② Employee / Submission Info */}
            <SectionHead icon={User} title="Employee & Submission" />
            <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
              {/* Employee — single line: Name (EmpNo) · Dept */}
              <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                <span className="text-xs text-muted-foreground w-44 shrink-0 leading-relaxed">Employee</span>
                <span className="text-xs text-foreground font-medium flex-1 leading-relaxed">
                  {suggestion.employeeName || "—"}
                  {suggestion.employeeNo && <span className="font-mono font-normal"> ({suggestion.employeeNo})</span>}
                  {(suggestion.department || optByEmpNo[suggestion.employeeNo || ""]?.dept) && (
                    <span className="font-normal text-muted-foreground"> · {suggestion.department || optByEmpNo[suggestion.employeeNo || ""]?.dept}</span>
                  )}
                </span>
              </div>
              <Row label="Suggestion For"
                value={fd.suggestionFor === "behalf" ? "On Behalf" : fd.suggestionFor === "self" ? "Self" : suggestion.suggestionFor as string | undefined} />
              <Row label="Group Suggestion"
                value={fd.groupSuggestion === "yes" ? "Yes" : fd.groupSuggestion === "no" ? "No" : undefined} />
            </div>

            {/* On Behalf — Main Suggestor table */}
            {fd.suggestionFor === "behalf" && fd.mainSuggestor && (() => {
                const ms = optByEmpNo[fd.mainSuggestor];
                const msName = ms?.name || fd.mainSuggestor;
                const msInitials = msName.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <>
                    <SectionHead icon={User} title="Main Suggestor (On Behalf)" />
                    <div className="rounded-lg border overflow-hidden">
                      <div className="grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-1.5 bg-muted/40 border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Name</span>
                        <span>Employee No</span>
                        <span>Department</span>
                      </div>
                      <div className="grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-2.5 items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-white text-[10px] font-bold">{msInitials}</span>
                          </div>
                          <span className="text-xs font-medium truncate">{msName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{fd.mainSuggestor}</span>
                        <span className="text-xs text-muted-foreground">{ms?.dept || "—"}</span>
                      </div>
                    </div>
                  </>
                );
              })()}

            {/* ③ Team Members + Share Distribution */}
            {teamMembers.length > 0 && (
              <>
                <SectionHead icon={Users} title="Team Members & Share Distribution" />
                <div className="rounded-lg border overflow-hidden">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_100px_100px_60px] gap-2 px-3 py-2 bg-muted/40 border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Name</span>
                    <span>Employee No</span>
                    <span>Department</span>
                    <span className="text-right">Share</span>
                  </div>
                  {teamMembers.map((id, idx) => {
                    // id may be an emp no only OR "Name – EmpNo"
                    let namePart: string;
                    let empNoPart: string;
                    if (id.includes("\u2013")) {
                      namePart  = id.split("\u2013")[0].trim();
                      empNoPart = id.split("\u2013")[1]?.trim() || "";
                    } else {
                      // stored as plain emp no — look up name
                      const found = optByEmpNo[id];
                      namePart = found?.name || "";
                      empNoPart = id;
                    }
                    const initials = (namePart || empNoPart).split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                    const color = avatarColors[idx % avatarColors.length];
                    const share = teamMemberShares[id];
                    const dept = optByEmpNo[empNoPart]?.dept || "—";
                    return (
                      <div key={id} className="grid grid-cols-[1fr_100px_100px_60px] gap-2 px-3 py-2.5 border-b last:border-0 items-center hover:bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-7 w-7 rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                            <span className="text-white text-[10px] font-bold">{initials}</span>
                          </div>
                          <span className="text-xs font-medium truncate">{namePart || empNoPart}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{empNoPart || "—"}</span>
                        <span className="text-xs text-muted-foreground">{dept}</span>
                        <span className={`text-xs font-bold text-right ${share ? "text-primary" : "text-muted-foreground"}`}>
                          {share ? `${share}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                  {Object.keys(teamMemberShares).length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t">
                      <div className="flex items-center gap-1.5">
                        <Percent className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Allocated</span>
                      </div>
                      <span className={`text-xs font-bold ${
                        teamMembers.reduce((s, id) => s + (Number(teamMemberShares[id]) || 0), 0) === 100
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}>
                        {teamMembers.reduce((s, id) => s + (Number(teamMemberShares[id]) || 0), 0)}%
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ④ Type-Specific Details */}
            <SectionHead icon={ChevronRight} title={`${suggestion.type} – Details`} />
            {renderTypeSpecificFields()}

            {/* ⑤ Other Info */}
            {fd.otherInfo && (
              <>
                <SectionHead icon={Info} title="Other Information" />
                <div className="rounded-lg border bg-muted/10 px-3 py-3">
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{fd.otherInfo}</p>
                </div>
              </>
            )}

            {/* ⑥ Attachments — global files stored in formData.attachmentItems */}
            {(() => {
              const allAttachments: AttachmentItem[] = fd.attachmentItems || [];
              if (allAttachments.length === 0) return null;
              const images = allAttachments.filter(a => isImageMime(a.type));
              const docs   = allAttachments.filter(a => !isImageMime(a.type));
              return (
                <>
                  <SectionHead icon={Paperclip} title="Attachments" />
                  <div className="rounded-lg border bg-muted/10 px-3 py-3 space-y-3">
                    {images.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                          <Image className="h-3 w-3" /> Images
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {images.map((att, i) => (
                            <button key={att.id} type="button"
                              onClick={() => { setLightboxImages(images); setLightboxIndex(i); setLightboxOpen(true); }}
                              className="relative group focus:outline-none rounded">
                              <img src={att.url} alt={att.name} className="h-20 w-20 object-cover rounded border hover:opacity-80 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                                <ZoomIn className="h-5 w-5 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {docs.length > 0 && (
                      <div className="space-y-2">
                        {images.length > 0 && <Separator />}
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                          <FileText className="h-3 w-3" /> Documents
                        </p>
                        <div className="space-y-1.5">
                          {docs.map(att => (
                            <div key={att.id} className="flex items-center gap-2.5 p-2 rounded-md border bg-background hover:bg-muted/40 transition-colors">
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs font-medium flex-1 truncate">{att.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(att.size)}</span>
                              <a href={att.url} download={att.name}
                                className="shrink-0 text-primary hover:text-primary/80 transition-colors"
                                onClick={e => e.stopPropagation()}>
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* ③ Processing Status */}
            {(suggestion.pendingWith || suggestion.daysPending != null) && (
              <>
                <SectionHead icon={Clock} title="Processing Status" />
                <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
                  {suggestion.pendingWith && (() => {
                    const dash = suggestion.pendingWith.indexOf(" - ");
                    const role = dash !== -1 ? suggestion.pendingWith.slice(0, dash).trim() : suggestion.pendingWith;
                    const name = dash !== -1 ? suggestion.pendingWith.slice(dash + 3).trim() : "";
                    const no = EMP_LOOKUP[name] || suggestion.assignedFlm || "";
                    const dept = (no ? optByEmpNo[no]?.dept : undefined) || (name ? allOptions.find(o => o.name === name)?.dept : undefined) || "";
                    const display = name
                      ? `${role} \u2014 ${name}${no ? ` (${no})` : ""}${dept ? ` \u00b7 ${dept}` : ""}`
                      : role;
                    return <Row label="Pending With" value={display} />;
                  })()}
                  <Row label="Days Pending" value={String(calculateDaysPending(suggestion))} />
                </div>
              </>
            )}

            {/* ⑦ Award Information */}
            {suggestion.awardAmount && (
              <>
                <SectionHead icon={Award} title="Award Information" />
                <div className="rounded-lg border bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 px-3 py-2 space-y-0">
                  <Row label="Award Amount" value={`₹${suggestion.awardAmount.toLocaleString()}`} />
                  {suggestion.awardCategory && <Row label="Award Category" value={suggestion.awardCategory} />}
                  {suggestion.awardDate && <Row label="Award Date" value={fmtDate(suggestion.awardDate)} />}
                </div>
              </>
            )}

            {/* ⑧ Send-Back History */}
            {suggestion.sendBackHistory && suggestion.sendBackHistory.length > 0 && (
              <>
                <SectionHead icon={Clock} title="Send-Back History" />
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-3 space-y-2.5">
                  {suggestion.sendBackHistory.map((sb, idx) => (
                    <div key={idx} className="border-l-2 border-amber-300 dark:border-amber-600 pl-2.5 py-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">{idx + 1}</span>
                        </div>
                        <span className="font-semibold text-amber-800 dark:text-amber-300">
                          {sb.fromName || sb.from} ({sb.from})
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold text-amber-800 dark:text-amber-300">
                          {sb.toName || sb.to} ({sb.to})
                        </span>
                        <span className="text-amber-600/70 dark:text-amber-400/60">on {sb.date}</span>
                      </div>
                      {sb.reason && (
                        <div className="rounded-md bg-background/80 border border-amber-200/50 dark:border-amber-800/50 px-2.5 py-2 ml-7">
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Reason</p>
                          <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{sb.reason}</p>
                        </div>
                      )}
                      {sb.attachments && sb.attachments.length > 0 && (
                        <div className="ml-7 space-y-1">
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                            <Paperclip className="h-2.5 w-2.5" /> Attachments ({sb.attachments.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {sb.attachments.map((att, ai) => (
                              att.url ? (
                                <a key={ai} href={att.url} download={att.name} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] bg-background border px-2 py-1 rounded-md hover:bg-muted transition-colors max-w-[180px]">
                                  <Download className="h-2.5 w-2.5 shrink-0 text-primary" />
                                  <span className="truncate">{att.name}</span>
                                </a>
                              ) : (
                                <span key={ai} className="inline-flex items-center gap-1 text-[10px] bg-muted border px-2 py-1 rounded-md max-w-[180px]">
                                  <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </span>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ⑨ Rejection Info */}
            {suggestion.status === "Rejected" && suggestion.rejectionReason && (
              <>
                <SectionHead icon={Clock} title="Rejection Details" />
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Rejected By:</span>
                    <span className="font-medium">{withEmpNo(suggestion.rejectedByName, EMP_LOOKUP[suggestion.rejectedByName || ""])}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Rejected On:</span>
                    <span className="font-medium">{fmtDate(suggestion.rejectedOn)}</span>
                  </div>
                  <div className="text-xs mt-1">
                    <span className="text-muted-foreground">Reason: </span>
                    <span className="text-foreground">{suggestion.rejectionReason}</span>
                  </div>
                </div>
              </>
            )}

            {/* ⑩ Transfer History */}
            {suggestion.transferHistory && suggestion.transferHistory.length > 0 && (
              <>
                <SectionHead icon={ArrowRightLeft} title="Transfer History" />
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2.5 space-y-2">
                  {suggestion.originalEmployeeName && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Original Suggestor: </span>
                      <span className="font-medium">{suggestion.originalEmployeeName} ({suggestion.originalEmployeeNo})</span>
                    </div>
                  )}
                  {suggestion.transferHistory.map((tr, i) => (
                    <div key={i} className="border-l-2 border-blue-300 dark:border-blue-600 pl-2 py-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">{tr.fromName}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{tr.toName}</span>
                        <span className="text-muted-foreground/70 ml-1">({tr.date})</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 pl-4">Reason: {tr.reason}</p>
                      {tr.transferredBy && <p className="text-muted-foreground/70 pl-4">By: {tr.transferredBy}</p>}
                    </div>
                  ))}
                  <div className="text-xs pt-1 border-t border-blue-200 dark:border-blue-700">
                    <span className="text-muted-foreground">Current Owner: </span>
                    <span className="font-medium text-blue-700 dark:text-blue-300">{suggestion.employeeName} ({suggestion.employeeNo})</span>
                  </div>
                </div>
              </>
            )}

            {/* ⑪ Submission Timeline */}
            <SectionHead icon={CalendarDays} title="Timeline" />
            <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
              <Row label="Submitted On" value={fmtDate(suggestion.date)} />
              <Row label="Current Status" value={suggestion.status} />
            </div>

          </div>
        )}

        {isEdit && (
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Delete Draft
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Save Draft
              </Button>
              <Button onClick={handleSubmit} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Submit
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "<strong>{suggestion?.subject}</strong>". This action cannot be undone.
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

      {/* ── Photo Lightbox ─────────────────────────────────────────────── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-0 [&>button]:text-white">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          <DialogDescription className="sr-only">
            {lightboxImages[lightboxIndex]?.name}
          </DialogDescription>
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {lightboxImages[lightboxIndex] && (
              <img
                src={lightboxImages[lightboxIndex].url}
                alt={lightboxImages[lightboxIndex].name}
                className="max-h-[80vh] max-w-full object-contain"
              />
            )}
            {lightboxImages.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={lightboxIndex === 0}
                  onClick={() => setLightboxIndex(i => Math.max(0, i - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 disabled:opacity-30 text-white rounded-full p-2 transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled={lightboxIndex === lightboxImages.length - 1}
                  onClick={() => setLightboxIndex(i => Math.min(lightboxImages.length - 1, i + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 disabled:opacity-30 text-white rounded-full p-2 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="text-white text-xs bg-black/60 px-3 py-1 rounded-full">
                {lightboxImages[lightboxIndex]?.name}
                {lightboxImages.length > 1 && ` — ${lightboxIndex + 1} / ${lightboxImages.length}`}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
    </>
  );
};

export default SuggestionDetailDialog;
