import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, FileX2, FileText, Image as ImageIcon, X, ArrowRightLeft, CheckCircle2, XCircle, Undo2, RotateCcw, Send, Clock, User, ShieldCheck, Users, Calendar, Tag, Building2, Hash, ChevronRight, Award } from "lucide-react";
import { Suggestion, AuditEntry, statusColors, mockEmployees } from "@/lib/mockData";
import type { AttachmentItem } from "@/lib/attachmentUtils";
import { teamMemberOptions, moderatorOptions, flmOptions } from "@/lib/bidp/suggestionConstants";
import { calculateDaysPending } from "@/lib/bidp/approvalPipeline";

/** Resolve an employee ID to a display name from all known option lists */
const allEmployeeOptions = [...teamMemberOptions, ...moderatorOptions, ...flmOptions];
const optByEmpNo: Record<string, { name: string; dept: string }> = {};
for (const o of allEmployeeOptions) {
  if (o.value && !optByEmpNo[o.value]) optByEmpNo[o.value] = { name: o.name, dept: o.dept };
}
for (const e of mockEmployees) {
  if (!optByEmpNo[e.employeeNo]) optByEmpNo[e.employeeNo] = { name: e.name, dept: e.department };
}
const resolveEmpName = (id?: string | null): string => {
  if (!id) return "—";
  const match = optByEmpNo[id];
  return match ? `${match.name} (${id})` : id;
};
const resolveEmpDetails = (id?: string | null) => {
  if (!id) return { name: "—", empNo: "—", dept: "—" };
  const match = optByEmpNo[id];
  return { name: match?.name || id, empNo: id, dept: match?.dept || "—" };
};

interface Props {
  suggestion: Suggestion | null;
  serialNo: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Compact label/value pair for info grids
const InfoItem = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) => (
  <div className="space-y-0.5">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </p>
    <p className="text-sm font-medium text-foreground break-words">{value || "—"}</p>
  </div>
);

// Block for long text
const TextBlock = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/30 border px-4 py-3">{value}</p>
    </div>
  ) : null;

// Section heading
const SectionHead = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2.5 pt-2 pb-1">
    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
  </div>
);

/** Collect all attachments from various storage locations on the suggestion */
const collectAttachments = (suggestion: Suggestion): AttachmentItem[] => {
  const items: AttachmentItem[] = [];
  // From suggestion.attachments array
  if (suggestion.attachments && suggestion.attachments.length > 0) {
    items.push(...suggestion.attachments);
  }
  // From formData.attachmentItems
  const fdItems = suggestion.formData?.attachmentItems;
  if (Array.isArray(fdItems) && fdItems.length > 0) {
    items.push(...fdItems);
  }
  // From formData.typeFields that store images (Daily CIP beforeImages/afterImages)
  const tf = suggestion.formData?.typeFields;
  if (tf) {
    if (Array.isArray(tf.beforeImages) && tf.beforeImages.length > 0) items.push(...tf.beforeImages);
    if (Array.isArray(tf.afterImages) && tf.afterImages.length > 0) items.push(...tf.afterImages);
  }
  return items;
};

const GeneralEnquiryDetailDialog = ({ suggestion, serialNo, open, onOpenChange }: Props) => {
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<AttachmentItem | null>(null);

  if (!suggestion) return null;

  // Collect all attachments
  const allAttachments = collectAttachments(suggestion);
  const hasLegacyAttachment = Boolean(suggestion.attachment);
  const hasAttachments = allAttachments.length > 0 || hasLegacyAttachment;

  // Get type-specific fields from formData
  const typeFields = suggestion.formData?.typeFields || {};
  const suggestionType = suggestion.type || suggestion.formData?.suggestionType || "";

  // Format date from YYYY-MM-DD → DD/MM/YYYY
  const formatDate = (d?: string) => {
    if (!d) return "—";
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const openAttachmentViewer = (item: AttachmentItem) => {
    setViewingAttachment(item);
    setAttachmentOpen(true);
  };

  /** Render suggestion details based on type */
  const renderTypeSpecificFields = () => {
    switch (suggestionType) {
      case "Shop Floor CIP":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg border bg-muted/10 px-4 py-3">
              <InfoItem label="Kaizen Theme" value={typeFields.kaizenTheme || suggestion.subject} />
              <InfoItem label="Category" value={typeFields.category || suggestion.category} />
              <InfoItem label="Moderator" value={resolveEmpName(typeFields.moderator)} />
              <InfoItem label="Date of Implementation" value={formatDate(typeFields.dateOfImplementation)} />
              <InfoItem label="How many places this kaizen is deployed horizontally" value={typeFields.horizontalDeployment} />
            </div>
            <TextBlock label="Problem / Present Status" value={typeFields.problemStatus || suggestion.presentMethod} />
            <TextBlock label="Before Improvement" value={typeFields.beforeImprovement} />
            <TextBlock label="After Improvement" value={typeFields.afterImprovement || suggestion.proposedMethod} />
            <TextBlock label="Root Cause" value={typeFields.rootCause} />
            <TextBlock label="Action Taken" value={typeFields.actionTaken} />
            <TextBlock label="Standardization" value={typeFields.standardization} />
            <TextBlock label="Benefits" value={typeFields.benefits || suggestion.benefits} />
          </div>
        );

      case "My Idea Card":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg border bg-muted/10 px-4 py-3">
              <InfoItem label="Subject" value={typeFields.subject || suggestion.subject} />
              <InfoItem label="Category" value={typeFields.category || suggestion.category} />
              <InfoItem label="Date of Implementation" value={formatDate(typeFields.dateOfImplementation)} />
              <InfoItem label="FLM" value={resolveEmpName(typeFields.flm)} />
            </div>
            <TextBlock label="Description – Idea / Problem" value={typeFields.descriptionProblem || suggestion.presentMethod} />
            <TextBlock label="Description – Improvement Done" value={typeFields.descriptionImprovement || suggestion.proposedMethod} />
            <TextBlock label="Benefits" value={typeFields.benefits || suggestion.benefits} />
          </div>
        );

      case "Daily CIP":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg border bg-muted/10 px-4 py-3">
              <InfoItem label="Machine No / Area" value={typeFields.machineNoArea || suggestion.subject} />
              <InfoItem label="Category" value={typeFields.category || suggestion.category} />
              <InfoItem label="Date of Implementation" value={formatDate(typeFields.dateOfImplementation)} />
            </div>
            <TextBlock label="Suggestion Description" value={typeFields.suggestionDescription || suggestion.presentMethod} />
            <TextBlock label="Action Taken" value={typeFields.actionTaken || suggestion.proposedMethod} />
            <TextBlock label="Benefits" value={typeFields.benefits || suggestion.benefits} />
          </div>
        );

      case "Cash The Flash":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg border bg-muted/10 px-4 py-3">
              <InfoItem label="Subject" value={typeFields.subject || suggestion.subject} />
              <InfoItem label="Category" value={typeFields.category || suggestion.category} />
              <InfoItem label="FLM" value={resolveEmpName(typeFields.flm)} />
            </div>
            <TextBlock label="Present Method / Before" value={typeFields.presentMethod || suggestion.presentMethod} />
            <TextBlock label="Proposed Method / After" value={typeFields.proposedMethod || suggestion.proposedMethod} />
            <TextBlock label="Benefits" value={typeFields.benefits || suggestion.benefits} />
          </div>
        );

      case "Simple Suggestion Scheme":
      default:
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg border bg-muted/10 px-4 py-3">
              <InfoItem label="Subject" value={typeFields.subject || suggestion.subject} />
              <InfoItem label="Category" value={typeFields.category || suggestion.category} />
              <InfoItem label="Date of Implementation" value={formatDate(typeFields.dateOfImplementation)} />
              <InfoItem label="FLM" value={resolveEmpName(typeFields.flm)} />
            </div>
            <TextBlock label="Present Method / Problem" value={typeFields.presentMethod || suggestion.presentMethod} />
            <TextBlock label="Proposed Method / Solution" value={typeFields.proposedMethod || suggestion.proposedMethod} />
            <TextBlock label="Benefits" value={typeFields.benefits || suggestion.benefits} />
          </div>
        );
    }
  };

  /** Render attachments section */
  const renderAttachments = () => {
    if (!hasAttachments) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground italic">
          <FileX2 className="h-3.5 w-3.5" /> No attachment
        </span>
      );
    }

    return (
      <div className="space-y-1.5">
        {/* Attachment items from formData / suggestion.attachments */}
        {allAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allAttachments.map((item, idx) => {
              const isImg = /^image\//i.test(item.type);
              return (
                <Button
                  key={item.id || idx}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] px-2 gap-1 w-fit text-primary"
                  onClick={() => openAttachmentViewer(item)}
                >
                  {isImg ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                  {item.name}
                </Button>
              );
            })}
          </div>
        )}
        {/* Legacy single attachment string */}
        {hasLegacyAttachment && allAttachments.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2 gap-1 w-fit text-primary"
            onClick={() => {
              setViewingAttachment({
                id: "legacy",
                name: suggestion.attachment!,
                size: 0,
                type: /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(suggestion.attachment!) ? "image/jpeg" : "application/octet-stream",
                url: suggestion.attachment!,
                uploadedAt: "",
              });
              setAttachmentOpen(true);
            }}
          >
            <Paperclip className="h-3 w-3" /> {suggestion.attachment}
          </Button>
        )}
      </div>
    );
  };

  /** Get icon for audit action */
  const getAuditIcon = (action: string) => {
    switch (action) {
      case "Submitted": return <Send className="h-3.5 w-3.5 text-blue-600" />;
      case "Created": return <FileText className="h-3.5 w-3.5 text-slate-500" />;
      case "Approved":
      case "Evaluated": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
      case "Rejected": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case "Sent Back": return <Undo2 className="h-3.5 w-3.5 text-amber-600" />;
      case "Reopened": return <RotateCcw className="h-3.5 w-3.5 text-blue-500" />;
      case "Transferred": return <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500" />;
      case "Rerouted": return <RotateCcw className="h-3.5 w-3.5 text-violet-500" />;
      case "Closed": return <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  /** Get action badge color */
  const getActionColor = (action: string) => {
    switch (action) {
      case "Submitted": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
      case "Created": return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-600";
      case "Approved":
      case "Evaluated":
      case "Closed": return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700";
      case "Rejected": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
      case "Sent Back": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
      case "Rerouted": return "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700";
      case "Reopened": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700";
      case "Transferred": return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  /** Format ISO datetime to readable */
  const formatAuditDate = (d: string) => {
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
        " " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return d;
    }
  };

  /** Build a synthetic audit trail from existing fields when auditTrail is empty */
  const buildSyntheticTrail = (): AuditEntry[] => {
    const trail: AuditEntry[] = [];

    // 1. Created/Submitted
    trail.push({
      id: "syn-submit",
      action: "Submitted",
      performedBy: suggestion.employeeNo || "",
      performedByName: suggestion.employeeName || "Employee",
      performedByDept: suggestion.department,
      role: "Employee",
      date: suggestion.date ? new Date(suggestion.date).toISOString() : "",
      toStatus: "Submitted",
    });

    // 2. FLM Evaluation
    if (suggestion.evaluatedBy) {
      trail.push({
        id: "syn-flm",
        action: "Evaluated",
        performedBy: suggestion.evaluatedBy,
        performedByName: suggestion.evaluatedByName || suggestion.evaluatedBy,
        role: "FLM",
        date: suggestion.evaluatedOn ? new Date(suggestion.evaluatedOn).toISOString() : "",
        fromStatus: "Submitted",
        toStatus: suggestion.approvedByManager ? "Pending Manager" : suggestion.approvedByBpsAdmin ? "Pending BPS Admin" : suggestion.status,
        awardAmount: suggestion.awardAmount,
      });
    }

    // 3. Manager Approval
    if (suggestion.approvedByManager) {
      trail.push({
        id: "syn-mgr",
        action: "Approved",
        performedBy: suggestion.approvedByManager,
        performedByName: suggestion.approvedByManagerName || suggestion.approvedByManager,
        role: "Manager",
        date: suggestion.approvedByManagerOn ? new Date(suggestion.approvedByManagerOn).toISOString() : "",
        fromStatus: "Pending Manager",
        toStatus: suggestion.approvedByBpsAdmin ? "Pending BPS Admin" : suggestion.status,
      });
    }

    // 4. BPS Admin Approval
    if (suggestion.approvedByBpsAdmin) {
      trail.push({
        id: "syn-bps",
        action: "Approved",
        performedBy: suggestion.approvedByBpsAdmin,
        performedByName: suggestion.approvedByBpsAdminName || suggestion.approvedByBpsAdmin,
        role: "BPS Admin",
        date: suggestion.approvedByBpsAdminOn ? new Date(suggestion.approvedByBpsAdminOn).toISOString() : "",
        fromStatus: "Pending BPS Admin",
        toStatus: suggestion.approvedByBpsDh ? "Pending BPS DH" : suggestion.status,
      });
    }

    // 5. BPS DH Approval
    if (suggestion.approvedByBpsDh) {
      trail.push({
        id: "syn-dh",
        action: "Approved",
        performedBy: suggestion.approvedByBpsDh,
        performedByName: suggestion.approvedByBpsDhName || suggestion.approvedByBpsDh,
        role: "BPS DH",
        date: suggestion.approvedByBpsDhOn ? new Date(suggestion.approvedByBpsDhOn).toISOString() : "",
        fromStatus: "Pending BPS DH",
        toStatus: suggestion.status,
      });
    }

    // 6. Rejection
    if (suggestion.rejectedBy) {
      trail.push({
        id: "syn-rej",
        action: "Rejected",
        performedBy: suggestion.rejectedBy,
        performedByName: suggestion.rejectedByName || suggestion.rejectedBy,
        date: suggestion.rejectedOn ? new Date(suggestion.rejectedOn).toISOString() : "",
        toStatus: "Rejected",
        comments: suggestion.rejectionReason,
      });
    }

    // 7. Send-back history entries
    if (suggestion.sendBackHistory) {
      suggestion.sendBackHistory.forEach((sb, idx) => {
        trail.push({
          id: `syn-sb-${idx}`,
          action: "Sent Back",
          performedBy: "",
          performedByName: sb.fromName || sb.from,
          role: sb.from,
          date: sb.date ? new Date(sb.date).toISOString() : "",
          comments: sb.reason,
          forwardedTo: sb.toName ? `${sb.toName} (${sb.to})` : sb.to,
        });
      });
    }

    // 7b. Reroute history
    if (suggestion.rerouteHistory) {
      suggestion.rerouteHistory.forEach((rr, idx) => {
        trail.push({
          id: `syn-rr-${idx}`,
          action: "Rerouted",
          performedBy: "",
          performedByName: rr.reroutedByName,
          role: rr.fromLevel,
          date: rr.date ? new Date(rr.date).toISOString() : "",
          comments: rr.reason,
          forwardedTo: `${rr.toName} (${rr.toLevel})`,
        });
      });
    }

    // 8. Transfer history
    if (suggestion.transferHistory) {
      suggestion.transferHistory.forEach((tr, idx) => {
        trail.push({
          id: `syn-tr-${idx}`,
          action: "Transferred",
          performedBy: tr.fromEmpNo,
          performedByName: tr.transferredBy || tr.fromName,
          date: tr.date ? new Date(tr.date).toISOString() : "",
          comments: tr.reason,
          forwardedTo: tr.toName,
        });
      });
    }

    // Sort by date
    trail.sort((a, b) => {
      if (!a.date) return -1;
      if (!b.date) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return trail;
  };

  /** Render the full audit trail as a clean vertical stepper */
  const renderAuditTrail = () => {
    const trail: AuditEntry[] = (suggestion.auditTrail && suggestion.auditTrail.length > 0)
      ? [...suggestion.auditTrail]
      : buildSyntheticTrail();

    // Always ensure Step 1 is the employee submission
    const hasSubmitStep = trail.some(e => e.action === "Submitted" && (e.role === "Employee" || e.performedBy === suggestion.employeeNo));
    if (!hasSubmitStep) {
      trail.unshift({
        id: "syn-submit-auto",
        action: "Submitted",
        performedBy: suggestion.employeeNo || "",
        performedByName: suggestion.employeeName || "Employee",
        performedByDept: suggestion.department,
        role: "Employee",
        date: suggestion.date ? new Date(suggestion.date).toISOString() : "",
        toStatus: "Submitted",
      });
    }

    if (trail.length === 0) {
      return (
        <div className="rounded-lg border bg-muted/10 px-6 py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No audit trail available yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Actions will be recorded as the suggestion moves through the approval pipeline.</p>
        </div>
      );
    }

    // Action-to-dot-color mapping
    const dotColor = (action: string) => {
      if (action === "Approved" || action === "Evaluated" || action === "Closed") return "bg-emerald-500 border-emerald-200 dark:border-emerald-800";
      if (action === "Rejected") return "bg-red-500 border-red-200 dark:border-red-800";
      if (action === "Sent Back") return "bg-amber-500 border-amber-200 dark:border-amber-800";
      if (action === "Rerouted") return "bg-violet-500 border-violet-200 dark:border-violet-800";
      if (action === "Submitted") return "bg-blue-500 border-blue-200 dark:border-blue-800";
      if (action === "Transferred") return "bg-indigo-500 border-indigo-200 dark:border-indigo-800";
      if (action === "Pending") return "bg-slate-400 border-slate-200 dark:border-slate-800";
      return "bg-muted-foreground/50 border-border";
    };

    // Add a "Pending" step at the end if suggestion is still in-progress
    const pendingStatuses = ["Submitted", "Pending FLM", "Pending Manager", "Pending BPS Admin", "Pending BPS DH"];
    const isPending = pendingStatuses.includes(suggestion.status);
    const daysPending = calculateDaysPending(suggestion);

    // Determine who it's pending with
    const pendingWith = (() => {
      const s = suggestion.status;
      if (s === "Submitted" || s === "Pending FLM") return "FLM";
      if (s === "Pending Manager") return "Manager";
      if (s === "Pending BPS Admin") return "BPS Admin";
      if (s === "Pending BPS DH") return "BPS DH";
      return "";
    })();

    return (
      <div className="space-y-0">
        {trail.map((entry, idx) => {
          const isLast = idx === trail.length - 1 && !isPending;
          const hasEvalSheet = entry.role === "FLM" && (entry.action === "Approved" || entry.action === "Evaluated") && entry.metadata && Object.keys(entry.metadata).length > 0;

          return (
            <div key={entry.id} className="relative flex gap-3">
              {/* Left: pipeline dot + connecting line */}
              <div className="flex flex-col items-center shrink-0 w-7">
                <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${dotColor(entry.action)}`}>
                  {idx + 1}
                </div>
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-border" />
                )}
              </div>

              {/* Right: step content */}
              <div className={`flex-1 min-w-0 ${isLast ? "pb-2" : "pb-7"}`}>
                {/* Action badge row */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${getActionColor(entry.action)}`}>
                    {entry.action}
                  </span>
                  {entry.role && (
                    <span className="text-[11px] text-muted-foreground">by <span className="font-medium text-foreground">{entry.role}</span></span>
                  )}
                  {entry.date && (
                    <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{formatAuditDate(entry.date)}</span>
                  )}
                </div>

                {/* Data card */}
                <div className="rounded-md border bg-muted/5 text-xs divide-y divide-border">
                  {/* Row 1: Name + Emp No together */}
                  <div className="flex items-center gap-4 px-3 py-2">
                    <span className="text-muted-foreground font-medium shrink-0">Name</span>
                    <span className="font-semibold text-foreground">{entry.performedByName || "\u2014"}</span>
                    {entry.performedBy && (
                      <>
                        <span className="text-border">|</span>
                        <span className="text-muted-foreground font-medium">Emp No</span>
                        <span className="font-mono text-foreground">{entry.performedBy}</span>
                      </>
                    )}
                  </div>
                  {/* Row 2: Award + Fwd To — side by side box (only if either exists) */}
                  {(entry.awardAmount != null && entry.awardAmount > 0 || entry.forwardedTo) && (
                    <div className="flex items-center gap-0 divide-x divide-border">
                      {entry.awardAmount != null && entry.awardAmount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 flex-1">
                          <span className="text-muted-foreground font-medium shrink-0">Award</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{"\u20b9"}{entry.awardAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {entry.forwardedTo && (
                        <div className="flex items-center gap-2 px-3 py-2 flex-1">
                          <span className="text-muted-foreground font-medium shrink-0">Fwd To</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{entry.forwardedTo}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Row 3: Remarks — full width */}
                  <div className="px-3 py-2">
                    <span className="text-muted-foreground font-medium mr-2">Remarks</span>
                    <span className={entry.comments ? "text-foreground leading-relaxed" : "text-muted-foreground/50 italic"}>{entry.comments || "No remarks"}</span>
                  </div>
                  {/* Row 4: Attachments (if any) */}
                  {entry.attachments && entry.attachments.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
                      <span className="text-muted-foreground font-medium shrink-0">Files</span>
                      {entry.attachments.map((att, aIdx) => {
                        const isImg = /^image\//i.test(att.type);
                        const hasUrl = Boolean(att.url);
                        return hasUrl ? (
                          <a key={aIdx} href={att.url} download={att.name} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            onClick={e => { if (att.url?.startsWith('blob:') && !isImg) { e.preventDefault(); const a = document.createElement('a'); a.href = att.url!; a.download = att.name; a.click(); } }}
                          >
                            {isImg ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                            {att.name}
                          </a>
                        ) : (
                          <span key={aIdx} className="inline-flex items-center gap-1 text-muted-foreground">
                            {isImg ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                            {att.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Evaluation sheet (SSS / SFC) */}
                {hasEvalSheet && (() => {
                  const meta = entry.metadata!;
                  const evalType = meta.evaluationType;

                  if (evalType === "SSS") {
                    const SSS_CRITERIA_LABELS = [
                      { label: "Position or Grade Factor", optA: { pts: 0.5 }, optB: { pts: 1 } },
                      { label: "Merit Factor", optA: { pts: 0.5 }, optB: { pts: 1 } },
                      { label: "Technical Value of Suggestion", optA: { pts: 0.5 }, optB: { pts: 1 } },
                      { label: "Effort Factor", optA: { pts: 0.5 }, optB: { pts: 1 } },
                      { label: "Safety Factor", optA: { pts: 0.5 }, optB: { pts: 1 } },
                      { label: "Applicability", optA: { pts: 0 }, optB: { pts: 1 } },
                      { label: "Recurring Benefit", optA: { pts: 0 }, optB: { pts: 1 } },
                      { label: "Customer Satisfaction", optA: { pts: 0 }, optB: { pts: 1 } },
                      { label: "Cycle Time Reduction", optA: { pts: 0 }, optB: { pts: 1 } },
                      { label: "Systems & Procedures", optA: { pts: 0 }, optB: { pts: 1 } },
                    ];
                    const selections: (null | "A" | "B")[] = Array.isArray(meta.selections) ? meta.selections : [];
                    const totalPoints = meta.totalPoints ?? 0;
                    const weightage = meta.weightage ?? "";
                    const calculatedAmount = meta.calculatedAmount ?? null;

                    return (
                      <div className="mt-3 rounded-lg border bg-muted/5 p-4 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                          <Award className="h-3.5 w-3.5 text-primary" /> SSS Evaluation Sheet
                        </p>
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-primary text-primary-foreground text-[11px] font-semibold">
                                <th className="px-3 py-2 text-center w-10">Sr.</th>
                                <th className="px-3 py-2 text-left">Criteria</th>
                                <th className="px-3 py-2 text-center w-16">Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {SSS_CRITERIA_LABELS.map((row, i) => {
                                const sel = selections[i];
                                const pts = sel === "A" ? row.optA.pts : sel === "B" ? row.optB.pts : null;
                                return (
                                  <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/10"}`}>
                                    <td className="px-3 py-1.5 text-center text-muted-foreground">{i + 1}</td>
                                    <td className="px-3 py-1.5 font-medium">{row.label}</td>
                                    <td className="px-3 py-1.5 text-center font-bold text-primary">{pts != null ? pts : "\u2014"}</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                                <td colSpan={2} className="px-3 py-2 text-right text-xs uppercase">Total</td>
                                <td className="px-3 py-2 text-center text-sm text-primary">{totalPoints}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-muted-foreground">Weightage: <span className="font-semibold text-foreground">{weightage || "\u2014"}</span></span>
                          <span className="text-muted-foreground">Amount: <span className="font-bold text-primary">{calculatedAmount != null ? `\u20b9${Number(calculatedAmount).toLocaleString()}` : "\u2014"}</span></span>
                        </div>
                      </div>
                    );
                  }

                  if (evalType === "SFC") {
                    const SFC_GEMBA_ROWS = [
                      { label: "Importance of the project to the value stream", max: 30 },
                      { label: "Sustenance of actions", max: 5 },
                      { label: "Horizontal Deployment", max: 5 },
                      { label: "Evaluation of project / Kaizen Sheet", max: 30 },
                      { label: "Standardization", max: 15 },
                      { label: "Presentation of project to RC/RH", max: 15 },
                    ];
                    const SFC_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                    const SFC_MONTH_POINTS = [25, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2];
                    const SFC_WEIGHTAGE_OPTIONS = [
                      { label: "x1 (1st Kaizen)" }, { label: "x1.25 (2nd Kaizen)" },
                      { label: "x1.5 (3rd Kaizen)" }, { label: "x1.75 (4th Kaizen)" },
                    ];
                    const gembaSelections: (number | null)[] = Array.isArray(meta.gembaSelections) ? meta.gembaSelections : [];
                    const gembaTotal = meta.gembaTotal ?? null;
                    const kaizenPoints = meta.kaizenPoints ?? null;
                    const finalPoints = meta.finalPoints ?? null;
                    const monthLabel = meta.selectedMonth != null ? SFC_MONTHS[meta.selectedMonth] : "\u2014";
                    const monthPts = meta.selectedMonth != null ? SFC_MONTH_POINTS[meta.selectedMonth] : null;
                    const weightageLabel = meta.selectedWeightage != null ? SFC_WEIGHTAGE_OPTIONS[meta.selectedWeightage]?.label : "\u2014";

                    return (
                      <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10 p-4 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-300 flex items-center gap-2">
                          <Award className="h-3.5 w-3.5" /> SFC Evaluation Sheet
                        </p>
                        <div className="flex items-center gap-6 text-sm flex-wrap">
                          <span className="text-muted-foreground">Month: <span className="font-semibold text-foreground">{monthLabel}{monthPts != null ? ` (${monthPts} pts)` : ""}</span></span>
                          <span className="text-muted-foreground">Weightage: <span className="font-semibold text-foreground">{weightageLabel}</span></span>
                          <span className="text-muted-foreground">Kaizen Pts: <span className="font-bold text-blue-700 dark:text-blue-400">{kaizenPoints ?? "\u2014"}</span></span>
                        </div>
                        <div className="rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-blue-100/60 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
                                <th className="text-center px-3 py-2 font-semibold text-blue-900 dark:text-blue-200 w-10">SNo</th>
                                <th className="text-left px-3 py-2 font-semibold text-blue-900 dark:text-blue-200">Gemba Criteria</th>
                                <th className="text-center px-3 py-2 font-semibold text-blue-900 dark:text-blue-200 w-14">Max</th>
                                <th className="text-center px-3 py-2 font-semibold text-blue-900 dark:text-blue-200 w-14">Scored</th>
                              </tr>
                            </thead>
                            <tbody>
                              {SFC_GEMBA_ROWS.map((row, i) => (
                                <tr key={i} className={`border-b border-blue-100 dark:border-blue-800/50 ${i % 2 === 0 ? "bg-background" : "bg-blue-50/20 dark:bg-blue-950/5"}`}>
                                  <td className="px-3 py-1.5 text-center text-muted-foreground">{i + 1}</td>
                                  <td className="px-3 py-1.5 font-medium">{row.label}</td>
                                  <td className="px-3 py-1.5 text-center text-muted-foreground">{row.max}</td>
                                  <td className="px-3 py-1.5 text-center font-bold text-blue-700 dark:text-blue-400">{gembaSelections[i] ?? "\u2014"}</td>
                                </tr>
                              ))}
                              <tr className="bg-blue-100/40 dark:bg-blue-900/20 font-bold">
                                <td colSpan={2} className="px-3 py-2 text-right">Gemba Total</td>
                                <td className="px-3 py-2 text-center text-muted-foreground">100</td>
                                <td className="px-3 py-2 text-center text-blue-700 dark:text-blue-400">{gembaTotal ?? "\u2014"}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between text-sm rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 px-4 py-2">
                          <span className="font-semibold text-blue-800 dark:text-blue-300">Final Points (Kaizen + Gemba)</span>
                          <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{finalPoints ?? "\u2014"}</span>
                        </div>
                      </div>
                    );
                  }

                  // Generic fallback
                  const visibleEntries = Object.entries(meta).filter(([key, val]) => {
                    if (val == null || val === "" || val === 0) return false;
                    if (key === "forwardTo" || key === "evaluationType") return false;
                    if (Array.isArray(val)) return false;
                    return true;
                  });
                  if (visibleEntries.length === 0) return null;
                  return (
                    <div className="mt-3 rounded-lg border bg-muted/5 p-4">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-2">Evaluation Details</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-6 gap-y-1.5">
                        {visibleEntries.map(([key, val]) => (
                          <div key={key}>
                            <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                            <p className="text-xs font-semibold text-foreground">{String(val)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}

        {/* Pending step — shown when suggestion is still in-progress */}
        {isPending && pendingWith && (() => {
          // Resolve who it's pending with dynamically
          const pendingEmpNo = suggestion.pendingWith
            ? (() => {
              const dash = suggestion.pendingWith.indexOf(" - ");
              if (dash !== -1) {
                const name = suggestion.pendingWith.slice(dash + 3).trim();
                const found = allEmployeeOptions.find(o => o.name === name);
                return { name, empNo: found?.value || "", dept: found?.dept || "" };
              }
              // Try to find by assignedFlm or other fields
              if (pendingWith === "FLM" && suggestion.assignedFlm) {
                const info = optByEmpNo[suggestion.assignedFlm];
                return { name: info?.name || suggestion.assignedFlm, empNo: suggestion.assignedFlm, dept: info?.dept || "" };
              }
              return { name: "", empNo: "", dept: "" };
            })()
            : { name: "", empNo: "", dept: "" };

          return (
            <div className="relative flex gap-3">
              <div className="flex flex-col items-center shrink-0 w-7">
                <div className="h-7 w-7 rounded-full border-2 border-dashed border-amber-400 dark:border-amber-600 flex items-center justify-center text-[11px] font-bold text-amber-500 dark:text-amber-400 shrink-0 animate-pulse">
                  {trail.length + 1}
                </div>
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">
                    Pending
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Waiting for <span className="font-semibold text-foreground">{pendingWith}</span> approval
                  </span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium ml-auto shrink-0">
                    {daysPending} day{daysPending !== 1 ? "s" : ""} pending
                  </span>
                </div>
                <div className="rounded-md border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10 text-xs">
                  <div className="grid grid-cols-2 gap-x-4 px-3 py-2 border-b border-dashed border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="text-muted-foreground font-medium shrink-0">Name</span>
                      <span className={`font-semibold truncate ${pendingEmpNo.name ? "text-foreground" : "text-muted-foreground/30"}`}>
                        {pendingEmpNo.name || "\u2014"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="text-muted-foreground font-medium shrink-0">Emp No</span>
                      <span className={`font-mono ${pendingEmpNo.empNo ? "text-foreground" : "text-muted-foreground/30"}`}>
                        {pendingEmpNo.empNo || "\u2014"}
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <span className="text-muted-foreground/40 font-medium mr-2">Remarks</span>
                    <span className="text-muted-foreground/30 italic">Awaiting review...</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[96vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl [&>button:last-child]:hidden">

          {/* ── Header ── */}
          <div className="shrink-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-8 py-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <FileText className="h-5 w-5 opacity-70 shrink-0" />
                <span className="text-base font-bold">{suggestion.suggestionNo}</span>
                <Badge variant="outline" className={`text-[11px] border-white/40 bg-white/10 text-white ${statusColors[suggestion.status] || ""}`}>
                  {suggestion.status}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-white/15 text-white hover:text-white hover:bg-white/30 border border-white/20 transition-all"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* ── Scrollable body ── */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-8 py-6 space-y-6">

              {/* ── Identification & Employee — side by side ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SectionHead icon={FileText} title="Identification" />
                  <div className="rounded-lg border bg-muted/10 px-4 py-2 mt-1.5 space-y-0">
                    <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Suggestion No</span>
                      <span className="text-xs text-foreground font-medium flex-1">{suggestion.suggestionNo}</span>
                    </div>
                    <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Date</span>
                      <span className="text-xs text-foreground font-medium flex-1">{formatDate(suggestion.date)}</span>
                    </div>
                    <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Type</span>
                      <span className="text-xs text-foreground font-medium flex-1">{suggestion.type}</span>
                    </div>
                    <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Range</span>
                      <span className="text-xs text-foreground font-medium flex-1">{suggestion.range || "—"}</span>
                    </div>
                    <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Suggestion Department</span>
                      <span className="text-xs text-foreground font-medium flex-1">{suggestion.suggestionDepartment || "—"}</span>
                    </div>
                    <div className="flex gap-3 py-1.5 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Days Pending</span>
                      <span className="text-xs text-foreground font-medium flex-1">{String(calculateDaysPending(suggestion))}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <SectionHead icon={User} title="Employee" />
                  <div className="rounded-lg border bg-muted/10 px-4 py-2 mt-1.5 space-y-0">
                    <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Employee Name</span>
                      <span className="text-xs text-foreground font-medium flex-1">{suggestion.employeeName || "—"}</span>
                    </div>
                    <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Employee No</span>
                      <span className="text-xs text-foreground font-medium flex-1">{suggestion.employeeNo}</span>
                    </div>
                    <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Department</span>
                      <span className="text-xs text-foreground font-medium flex-1">{suggestion.department || optByEmpNo[suggestion.employeeNo || ""]?.dept || "—"}</span>
                    </div>
                    {suggestion.formData?.suggestionFor && (
                      <div className="flex gap-3 py-1.5 border-b border-border/40 items-start">
                        <span className="text-xs text-muted-foreground w-40 shrink-0">Suggestion For</span>
                        <span className="text-xs text-foreground font-medium flex-1">{suggestion.formData.suggestionFor === "behalf" ? "On Behalf" : "Self"}</span>
                      </div>
                    )}
                    <div className="flex gap-3 py-1.5 items-start">
                      <span className="text-xs text-muted-foreground w-40 shrink-0">Group Suggestion</span>
                      <span className="text-xs text-foreground font-medium flex-1">{suggestion.formData?.groupSuggestion === "yes" ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* On Behalf — Main Suggestor table */}
              {suggestion.formData?.suggestionFor === "behalf" && suggestion.formData?.mainSuggestor && (() => {
                const ms = String(suggestion.formData.mainSuggestor);
                const msInfo = optByEmpNo[ms];
                const msName = msInfo?.name || ms;
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
                        <span className="text-xs text-muted-foreground font-mono">{ms}</span>
                        <span className="text-xs text-muted-foreground">{msInfo?.dept || "—"}</span>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Team Members — table format; share/amount only shown after FLM evaluation */}
              {(suggestion.formData?.teamMembers as string[] | undefined)?.length ? (() => {
                const avatarColors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500"];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fd: Record<string, any> = suggestion.formData || {};
                const teamMembers = fd.teamMembers as string[];
                const isOnBehalf = fd.suggestionFor === "behalf" && fd.mainSuggestor;
                const award = suggestion.awardAmount || 0;
                const hasAward = award > 0;

                // Build correct recipients: primary person + team members
                const primaryEmpNo = isOnBehalf ? fd.mainSuggestor : (suggestion.employeeNo || "");
                const recipientSet = new Set<string>();
                if (primaryEmpNo) recipientSet.add(primaryEmpNo);
                for (const m of teamMembers) { if (m) recipientSet.add(m); }
                const recipients = Array.from(recipientSet);
                const count = recipients.length;

                return (
                  <>
                    <SectionHead icon={Users} title={hasAward ? "Team Members & Share Distribution" : "Team Members"} />
                    <div className="rounded-lg border overflow-hidden">
                      <div className={`grid ${hasAward ? "grid-cols-[1fr_100px_100px_80px]" : "grid-cols-[1fr_100px_100px]"} gap-2 px-3 py-2 bg-muted/40 border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`}>
                        <span>Name</span>
                        <span>Employee No</span>
                        <span>Department</span>
                        {hasAward && <span className="text-right">Share</span>}
                      </div>
                      {recipients.map((m: string, i: number) => {
                        // Equal split (only relevant when award exists)
                        const base = Math.floor(100 / count);
                        const sharePct = i === 0 ? base + (100 - base * count) : base;
                        const shareAmt = hasAward ? Math.round((award * sharePct) / 100) : 0;

                        const di = m.indexOf("\u2013");
                        let mName: string;
                        let mNo: string;
                        if (di !== -1) {
                          mName = m.slice(0, di).trim();
                          mNo = m.slice(di + 1).trim();
                        } else {
                          const found = optByEmpNo[m];
                          mName = found?.name || "";
                          mNo = m;
                        }
                        // For the primary person (self), use suggestion's employeeName
                        if (m === primaryEmpNo && !isOnBehalf && !mName) {
                          mName = suggestion.employeeName || mNo;
                        }
                        const dept = optByEmpNo[mNo]?.dept || "—";
                        const initials = (mName || mNo).split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                        const color = avatarColors[i % avatarColors.length];
                        const isPrimary = m === primaryEmpNo;
                        return (
                          <div key={i} className={`grid ${hasAward ? "grid-cols-[1fr_100px_100px_80px]" : "grid-cols-[1fr_100px_100px]"} gap-2 px-3 py-2.5 border-b last:border-0 items-center hover:bg-muted/20 ${isPrimary ? "bg-primary/5" : ""}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`h-7 w-7 rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                                <span className="text-white text-[10px] font-bold">{initials}</span>
                              </div>
                              <span className="text-xs font-medium truncate">{mName || mNo}</span>
                              {isPrimary && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0">
                                  {isOnBehalf ? "Main Suggestor" : "Suggestor"}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">{mNo || "—"}</span>
                            <span className="text-xs text-muted-foreground">{dept}</span>
                            {hasAward && (
                              <span className="text-xs font-bold text-right text-emerald-600 dark:text-emerald-400">
                                ₹{shareAmt.toLocaleString()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {!hasAward && (
                        <div className="px-3 py-2 text-[10px] text-muted-foreground/70 italic bg-muted/10">
                          Share distribution will be calculated after FLM evaluation
                        </div>
                      )}
                    </div>
                  </>
                );
              })() : null}

              {/* ── Transfer History ── */}
              {suggestion.transferHistory && suggestion.transferHistory.length > 0 && (
                <div className="space-y-3">
                  <SectionHead icon={ArrowRightLeft} title="Transfer History" />
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-5 py-4 space-y-2.5">
                    {suggestion.originalEmployeeName && (
                      <p className="text-sm text-muted-foreground">Original: <span className="font-medium text-foreground">{suggestion.originalEmployeeName} ({suggestion.originalEmployeeNo})</span></p>
                    )}
                    {suggestion.transferHistory.map((tr, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm border-l-2 border-blue-300 dark:border-blue-600 pl-3 py-1">
                        <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-medium">{tr.fromName}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{tr.toName}</span>
                        <span className="text-muted-foreground/70 ml-1">({tr.date})</span>
                        {tr.reason && <span className="text-muted-foreground italic hidden sm:inline">– {tr.reason}</span>}
                      </div>
                    ))}
                    <p className="text-sm pt-1.5 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-muted-foreground">Current Owner: </span>
                      <span className="font-medium text-blue-700 dark:text-blue-300">{suggestion.employeeName} ({suggestion.employeeNo})</span>
                    </p>
                  </div>
                </div>
              )}

              {/* ── Suggestion Details ── */}
              <div className="space-y-3">
                <SectionHead icon={FileText} title="Suggestion Details" />
                {renderTypeSpecificFields()}
              </div>

              {/* ── Attachments ── */}
              {hasAttachments && (
                <div className="space-y-3">
                  <SectionHead icon={Paperclip} title="Attachments" />
                  {renderAttachments()}
                </div>
              )}

              {/* ── Approval Status (simple bar) ── */}
              {suggestion.pendingWith && suggestion.status !== "Approved & Closed" && suggestion.status !== "Rejected" && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 px-5 py-4 flex items-center gap-4">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Pending with: {suggestion.pendingWith}
                    </p>
                    {(() => {
                      const dp = calculateDaysPending(suggestion); return dp > 0 ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Waiting for {dp} day{dp !== 1 ? "s" : ""}</p>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {/* ── Award Info (if closed) ── */}
              {suggestion.awardAmount && suggestion.awardAmount > 0 && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-5 py-4 flex items-center gap-4">
                  <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex items-center gap-6 flex-wrap">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Total Award</p>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">₹{suggestion.awardAmount.toLocaleString()}</p>
                    </div>
                    {suggestion.awardCategory && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Category</p>
                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{suggestion.awardCategory}</p>
                      </div>
                    )}
                    {suggestion.awardDate && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Award Date</p>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{formatDate(suggestion.awardDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Rejection Info ── */}
              {suggestion.status === "Rejected" && suggestion.rejectionReason && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20 px-5 py-4 space-y-1.5">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" /> Rejected
                    {suggestion.rejectedByName && <span className="font-normal">by {suggestion.rejectedByName}</span>}
                    {suggestion.rejectedOn && <span className="font-normal text-muted-foreground">on {formatDate(suggestion.rejectedOn)}</span>}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 pl-5 leading-relaxed">{suggestion.rejectionReason}</p>
                </div>
              )}

              <Separator />

              {/* ── Audit Trail ── */}
              <SectionHead icon={Clock} title="Approval Trail" />
              {renderAuditTrail()}

              {/* ── Member-wise Amount Distribution (after approval trail, only when closed with award) ── */}
              {suggestion.status === "Approved & Closed" && suggestion.awardAmount && suggestion.awardAmount > 0 && (() => {
                const fd: Record<string, any> = suggestion.formData || {};
                const award = suggestion.awardAmount || 0;
                const isOnBehalf = fd.suggestionFor === "behalf" && fd.mainSuggestor;
                const isGroup = fd.groupSuggestion === "yes";
                const teamMembers: string[] = fd.teamMembers || [];

                // Determine the primary person:
                // On-behalf → mainSuggestor (registering employee is excluded)
                // Self → registering employee
                const primaryEmpNo = isOnBehalf ? fd.mainSuggestor : (suggestion.employeeNo || "");
                const primaryName = isOnBehalf ? undefined : (suggestion.employeeName || undefined);

                type DistEntry = { empNo: string; name: string; sharePercent: number; amount: number };
                const dist: DistEntry[] = [];

                if (isGroup && teamMembers.length > 0) {
                  // Build unique recipients: primary + team members
                  const recipientSet = new Set<string>();
                  if (primaryEmpNo) recipientSet.add(primaryEmpNo);
                  for (const m of teamMembers) { if (m) recipientSet.add(m); }
                  const recipients = Array.from(recipientSet);
                  const count = recipients.length;

                  // Equal split among all recipients
                  recipients.forEach((recipientId, idx) => {
                    const base = Math.floor(100 / count);
                    const sharePct = idx === 0 ? base + (100 - base * count) : base;
                    const memberAmount = Math.round((award * sharePct) / 100);
                    const details = resolveEmpDetails(recipientId);
                    const name = recipientId === primaryEmpNo && primaryName ? primaryName : details.name;
                    dist.push({ empNo: recipientId, name, sharePercent: sharePct, amount: memberAmount });
                  });
                } else if (primaryEmpNo) {
                  // No group: full award to primary person
                  const details = resolveEmpDetails(primaryEmpNo);
                  const name = primaryName || details.name;
                  dist.push({ empNo: primaryEmpNo, name, sharePercent: 100, amount: award });
                }

                if (dist.length === 0) return null;

                return (
                  <>
                    <Separator />
                    <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50/60 via-background to-teal-50/40 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/15 p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Amount Distribution</h3>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            Total ₹{award.toLocaleString()} distributed to {dist.length} recipient{dist.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {dist.map((d, i) => {
                          const avatarColors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500"];
                          const color = avatarColors[i % avatarColors.length];
                          const initials = d.name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
                          return (
                            <div key={d.empNo} className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm">
                              <div className={`h-9 w-9 rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                                <span className="text-white text-[11px] font-bold">{initials}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{d.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{d.empNo}</p>
                              </div>
                              {dist.length > 1 && (
                                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-full shrink-0">
                                  {d.sharePercent}%
                                </span>
                              )}
                              <div className="shrink-0 px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300/60 dark:border-emerald-700/40">
                                <span className="text-base font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">₹{d.amount.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-200/60 dark:bg-emerald-800/40 px-4 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                          Grand Total: ₹{dist.reduce((s, d) => s + d.amount, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}

            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Attachment Viewer ── */}
      {viewingAttachment && (
        <Dialog open={attachmentOpen} onOpenChange={setAttachmentOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                {/^image\//i.test(viewingAttachment.type) ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                {viewingAttachment.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center min-h-[300px] rounded-md border bg-muted/20 p-6 gap-4">
              {/^image\//i.test(viewingAttachment.type) ? (
                viewingAttachment.url && viewingAttachment.url.startsWith("blob:") ? (
                  <img src={viewingAttachment.url} alt={viewingAttachment.name} className="max-h-[400px] max-w-full rounded object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <ImageIcon className="h-16 w-16 opacity-30" />
                    <p className="text-sm font-medium">{viewingAttachment.name}</p>
                    <p className="text-xs">[Image preview — connect to storage URL in production]</p>
                  </div>
                )
              ) : /\.pdf$/i.test(viewingAttachment.name) ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <FileText className="h-16 w-16 opacity-30" />
                  <p className="text-sm font-medium">{viewingAttachment.name}</p>
                  <p className="text-xs">[PDF preview — connect to storage URL in production]</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Paperclip className="h-16 w-16 opacity-30" />
                  <p className="text-sm font-medium">{viewingAttachment.name}</p>
                  <p className="text-xs">[File preview — connect to storage URL in production]</p>
                </div>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={() => setAttachmentOpen(false)}>
                <X className="h-3.5 w-3.5" /> Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default GeneralEnquiryDetailDialog;
