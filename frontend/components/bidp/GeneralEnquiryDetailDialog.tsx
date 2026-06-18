import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, FileX2, FileText, Image as ImageIcon, X, ArrowRightLeft, CheckCircle2, XCircle, Undo2, RotateCcw, Send, Clock, User, ShieldCheck, Users, Calendar, Tag, Building2, Hash, ChevronRight, Award } from "lucide-react";
import { Suggestion, AuditEntry, statusColors } from "@/lib/mockData";
import type { AttachmentItem } from "@/lib/attachmentUtils";
import { teamMemberOptions } from "@/lib/bidp/suggestionConstants";

interface Props {
  suggestion: Suggestion | null;
  serialNo: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Compact label/value pair for info grids
const InfoItem = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {label}
    </p>
    <p className="text-xs font-medium text-foreground break-words">{value || "—"}</p>
  </div>
);

// Block for long text
const TextBlock = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap rounded-md bg-muted/30 border px-3 py-2">{value}</p>
    </div>
  ) : null;

// Section heading
const SectionHead = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pt-1 pb-0.5">
    <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-3 w-3 text-primary" />
    </div>
    <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
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
  if (!suggestion) return null;

  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<AttachmentItem | null>(null);

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
              <InfoItem label="Moderator" value={typeFields.moderator} />
              <InfoItem label="Date of Implementation" value={formatDate(typeFields.dateOfImplementation)} />
              <InfoItem label="Horizontal Deployment" value={typeFields.horizontalDeployment} />
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
              <InfoItem label="FLM" value={typeFields.flm} />
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
              <InfoItem label="Workshop" value={typeFields.workshop} />
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
              <InfoItem label="FLM" value={typeFields.flm} />
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
              <InfoItem label="FLM" value={typeFields.flm} />
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
          performedByName: sb.fromName,
          role: sb.from,
          date: sb.date ? new Date(sb.date).toISOString() : "",
          comments: sb.reason,
          forwardedTo: sb.to,
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

  /** Render the full audit trail timeline */
  const renderAuditTrail = () => {
    const trail: AuditEntry[] = (suggestion.auditTrail && suggestion.auditTrail.length > 0)
      ? suggestion.auditTrail
      : buildSyntheticTrail();

    if (trail.length === 0) {
      return (
        <div className="rounded-lg border bg-muted/10 px-6 py-8 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No audit trail available yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Actions will be recorded as the suggestion moves through the approval pipeline.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {trail.map((entry, idx) => {
          const isLast = idx === trail.length - 1;
          return (
            <div key={entry.id} className="relative flex gap-4">
              {/* Timeline spine */}
              <div className="flex flex-col items-center shrink-0" style={{ width: "2.5rem" }}>
                {/* Icon bubble */}
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 shrink-0 shadow-sm ${
                  entry.action === "Approved" || entry.action === "Evaluated" || entry.action === "Closed"
                    ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700"
                    : entry.action === "Rejected"
                    ? "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700"
                    : entry.action === "Sent Back"
                    ? "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700"
                    : entry.action === "Submitted"
                    ? "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700"
                    : entry.action === "Transferred"
                    ? "bg-indigo-50 border-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-700"
                    : "bg-muted border-border"
                }`}>
                  {getAuditIcon(entry.action)}
                </div>
                {/* Connecting line */}
                {!isLast && <div className="w-0.5 flex-1 bg-border mt-1 mb-0 min-h-[1.5rem]" />}
              </div>

              {/* Card */}
              <div className={`flex-1 rounded-lg border shadow-sm mb-3 overflow-hidden ${
                entry.action === "Rejected" ? "border-red-200 dark:border-red-800" :
                entry.action === "Sent Back" ? "border-amber-200 dark:border-amber-800" :
                entry.action === "Approved" || entry.action === "Evaluated" || entry.action === "Closed" ? "border-emerald-200 dark:border-emerald-800" :
                entry.action === "Submitted" ? "border-blue-200 dark:border-blue-800" :
                "border-border"
              }`}>
                {/* Card header */}
                <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
                  entry.action === "Rejected" ? "bg-red-50 dark:bg-red-950/20" :
                  entry.action === "Sent Back" ? "bg-amber-50 dark:bg-amber-950/20" :
                  entry.action === "Approved" || entry.action === "Evaluated" || entry.action === "Closed" ? "bg-emerald-50 dark:bg-emerald-950/20" :
                  entry.action === "Submitted" ? "bg-blue-50 dark:bg-blue-950/20" :
                  "bg-muted/30"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getActionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                    {entry.role && (
                      <span className="text-xs font-semibold text-foreground">
                        by {entry.role}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Step {idx + 1}
                    </span>
                  </div>
                  {entry.date && (
                    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {formatAuditDate(entry.date)}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="px-4 py-3 bg-background space-y-3">
                  {/* Person row */}
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {entry.performedByName || "—"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {entry.performedBy && (
                          <span className="text-xs font-mono text-muted-foreground">Emp No: {entry.performedBy}</span>
                        )}
                        {entry.performedByDept && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-xs text-muted-foreground">Dept: {entry.performedByDept}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status transition */}
                  {(entry.fromStatus || entry.toStatus) && (
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Status change:</span>
                      {entry.fromStatus && (
                        <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground border">
                          {entry.fromStatus}
                        </span>
                      )}
                      {entry.fromStatus && entry.toStatus && (
                        <span className="text-muted-foreground text-base leading-none">→</span>
                      )}
                      {entry.toStatus && (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getActionColor(entry.action)}`}>
                          {entry.toStatus}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Forwarded to */}
                  {entry.forwardedTo && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Forwarded to:</span>
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-700">
                        {entry.forwardedTo}
                      </span>
                    </div>
                  )}

                  {/* Award amount */}
                  {entry.awardAmount != null && entry.awardAmount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Award Amount:</span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">
                        ₹{entry.awardAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Comments */}
                  {entry.comments && (
                    <div className="rounded-md bg-muted/30 border px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Remarks / Comments</p>
                      <p className="text-sm text-foreground leading-relaxed">{entry.comments}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {entry.attachments && entry.attachments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Attachments ({entry.attachments.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.attachments.map((att, aIdx) => {
                          const isImg = /^image\//i.test(att.type);
                          const hasUrl = Boolean(att.url);
                          return hasUrl ? (
                            <a
                              key={aIdx}
                              href={att.url}
                              download={att.name}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-background border border-primary/30 text-primary px-2.5 py-1 rounded-md font-medium hover:bg-primary/5 transition-colors cursor-pointer"
                              onClick={e => {
                                // For blob URLs, trigger download directly
                                if (att.url?.startsWith('blob:') && !isImg) {
                                  e.preventDefault();
                                  const a = document.createElement('a');
                                  a.href = att.url!;
                                  a.download = att.name;
                                  a.click();
                                }
                              }}
                            >
                              {isImg ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                              {att.name}
                              <span className="text-[9px] opacity-60">↓</span>
                            </a>
                          ) : (
                            <span key={aIdx} className="inline-flex items-center gap-1.5 text-xs bg-muted border px-2.5 py-1 rounded-md font-medium text-muted-foreground">
                              {isImg ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                              {att.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evaluation Details — FLM Approved/Evaluated entries only */}
                  {entry.role === "FLM" && (entry.action === "Approved" || entry.action === "Evaluated") && entry.metadata && Object.keys(entry.metadata).length > 0 && (() => {
                    const visibleEntries = Object.entries(entry.metadata).filter(([key, val]) => {
                      if (val == null || val === "" || val === 0) return false;
                      if (key === "forwardTo") return false; // shown separately above
                      return true;
                    });
                    if (visibleEntries.length === 0) return null;
                    return (
                      <div className="rounded-md border bg-primary/5 border-primary/20 px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-2">Evaluation Details</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                          {visibleEntries.map(([key, val]) => (
                            <div key={key}>
                              <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </p>
                              <p className="text-xs font-semibold text-foreground mt-0.5">{String(val)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-muted/30 border mt-1">
          <span className="text-xs text-muted-foreground">
            Total actions recorded: <span className="font-semibold text-foreground">{trail.length}</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Current Status:</span>
            <Badge variant="outline" className={`text-xs ${statusColors[suggestion.status] || ""}`}>
              {suggestion.status}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl [&>button:last-child]:hidden">

        {/* ── Header ── */}
        <div className="shrink-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Hash className="h-4 w-4 opacity-70 shrink-0" />
              <span className="text-sm font-bold">Request #{serialNo}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-medium">{suggestion.suggestionNo}</span>
              <Badge variant="outline" className={`text-[10px] border-white/40 bg-white/10 text-white ${statusColors[suggestion.status] || ""}`}>
                {suggestion.status}
              </Badge>
            </div>
            <p className="text-[11px] opacity-75 mt-1 flex items-center gap-2 flex-wrap">
              <Tag className="h-3 w-3" />
              <span>{suggestion.type}</span>
              {suggestion.date && (
                <>
                  <span className="opacity-50">·</span>
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(suggestion.date)}</span>
                </>
              )}
              {suggestion.awardAmount ? (
                <>
                  <span className="opacity-50">·</span>
                  <Award className="h-3 w-3" />
                  <span>₹{suggestion.awardAmount.toLocaleString()}</span>
                </>
              ) : null}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-full text-white/70 hover:text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Scrollable body ── */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* ── Overview cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Suggestion meta */}
              <div className="rounded-lg border bg-muted/10 p-4 space-y-3">
                <SectionHead icon={FileText} title="Suggestion Info" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoItem icon={Hash} label="Suggestion No" value={suggestion.suggestionNo} />
                  <InfoItem icon={Calendar} label="Date" value={formatDate(suggestion.date)} />
                  <InfoItem icon={Tag} label="Type" value={suggestion.type} />
                  <InfoItem icon={Tag} label="Category" value={suggestion.category} />
                  <InfoItem icon={Building2} label="Range / Area" value={suggestion.range} />
                  <InfoItem icon={Clock} label="Days Pending" value={suggestion.daysPending != null ? String(suggestion.daysPending) : undefined} />
                </div>
              </div>

              {/* Employee */}
              <div className="rounded-lg border bg-muted/10 p-4 space-y-3">
                <SectionHead icon={User} title="Employee" />
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{suggestion.employeeName || "—"}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <InfoItem label="Employee No" value={suggestion.employeeNo} />
                      <InfoItem label="Department" value={suggestion.department} />
                      {suggestion.formData?.suggestionFor && (
                        <InfoItem label="Suggestion For" value={suggestion.formData.suggestionFor === "behalf" ? "On Behalf" : "Self"} />
                      )}
                      {suggestion.formData?.groupSuggestion === "yes" && (
                        <InfoItem label="Group Suggestion" value="Yes" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Team members if any */}
                {(suggestion.formData?.teamMembers as string[] | undefined)?.length ? (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
                      <Users className="h-3 w-3" /> Team Members
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(suggestion.formData!.teamMembers as string[]).map((m, i) => {
                        const di = m.indexOf("\u2013");
                        let mName: string;
                        let mNo: string;
                        if (di !== -1) {
                          mName = m.slice(0, di).trim();
                          mNo   = m.slice(di + 1).trim();
                        } else {
                          const opt = teamMemberOptions.find(o => o.value === m);
                          if (opt) {
                            mName = opt.name;
                          } else {
                            mName = "";
                          }
                          mNo = m;
                        }
                        const dept = teamMemberOptions.find(o => o.value === mNo)?.dept || "";
                        return (
                          <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-primary/5 border-primary/20">
                            <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                            </div>
                            <span className="text-[11px] leading-tight min-w-0 truncate">
                              <span className="font-semibold text-foreground">{mName || mNo}</span>
                              {mNo && mName && <span className="font-mono text-muted-foreground"> ({mNo})</span>}
                              {dept && <span className="text-muted-foreground/70"> · {dept}</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── Transfer History ── */}
            {suggestion.transferHistory && suggestion.transferHistory.length > 0 && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 space-y-2">
                <SectionHead icon={ArrowRightLeft} title="Transfer History" />
                {suggestion.originalEmployeeName && (
                  <p className="text-xs text-muted-foreground">Original: <span className="font-medium text-foreground">{suggestion.originalEmployeeName} ({suggestion.originalEmployeeNo})</span></p>
                )}
                {suggestion.transferHistory.map((tr, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs border-l-2 border-blue-300 dark:border-blue-600 pl-2 py-0.5">
                    <ArrowRightLeft className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="font-medium">{tr.fromName}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{tr.toName}</span>
                    <span className="text-muted-foreground/70 ml-1">({tr.date})</span>
                    {tr.reason && <span className="text-muted-foreground italic hidden sm:inline">– {tr.reason}</span>}
                  </div>
                ))}
                <p className="text-xs pt-1 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-muted-foreground">Current Owner: </span>
                  <span className="font-medium text-blue-700 dark:text-blue-300">{suggestion.employeeName} ({suggestion.employeeNo})</span>
                </p>
              </div>
            )}

            {/* ── Suggestion Details ── */}
            <div className="space-y-2">
              <SectionHead icon={FileText} title="Suggestion Details" />
              {renderTypeSpecificFields()}
            </div>

            {/* ── Attachments ── */}
            {hasAttachments && (
              <div className="space-y-2">
                <SectionHead icon={Paperclip} title="Attachments" />
                {renderAttachments()}
              </div>
            )}

            {/* ── Approval Pipeline Status ── */}
            {suggestion.pendingWith && suggestion.status !== "Approved & Closed" && suggestion.status !== "Rejected" && (() => {
              // Find the name of the person this was forwarded to from the most recent audit entry
              const trail = suggestion.auditTrail || [];
              const lastForward = [...trail].reverse().find(e => e.forwardedTo && e.action !== "Sent Back");
              const forwardedName = lastForward?.forwardedTo || null;
              return (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Pending with: <span className="text-amber-900 dark:text-amber-200">{suggestion.pendingWith}</span>
                      {forwardedName && (
                        <span className="ml-2 font-bold">— {forwardedName}</span>
                      )}
                    </p>
                    {suggestion.daysPending != null && suggestion.daysPending > 0 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">Waiting for {suggestion.daysPending} day{suggestion.daysPending !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── Award Info (if closed) ── */}
            {suggestion.awardAmount && suggestion.awardAmount > 0 && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3 flex items-center gap-3">
                <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Award Amount</p>
                    <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">₹{suggestion.awardAmount.toLocaleString()}</p>
                  </div>
                  {suggestion.awardCategory && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Category</p>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{suggestion.awardCategory}</p>
                    </div>
                  )}
                  {suggestion.awardDate && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Award Date</p>
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{formatDate(suggestion.awardDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Rejection Info ── */}
            {suggestion.status === "Rejected" && suggestion.rejectionReason && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Rejected
                  {suggestion.rejectedByName && <span className="font-normal">by {suggestion.rejectedByName}</span>}
                  {suggestion.rejectedOn && <span className="font-normal text-muted-foreground">on {formatDate(suggestion.rejectedOn)}</span>}
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 pl-5 leading-relaxed">{suggestion.rejectionReason}</p>
              </div>
            )}

            <Separator />

            {/* ── Audit Trail ── */}
            <SectionHead icon={Clock} title="Approval Trail" />
            {renderAuditTrail()}

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
