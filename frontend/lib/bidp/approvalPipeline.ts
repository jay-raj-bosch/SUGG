// Approval pipeline logic for BidP suggestion types
// Each type has a defined approval flow based on award amount

import type { Suggestion, AuditEntry } from "@/lib/mockData";

export type ApprovalLevel = "FLM" | "Manager" | "BPS Admin" | "BPS DH";

interface PipelineStep {
  level: ApprovalLevel;
  status: string;        // status to set on the suggestion
  pendingWith: string;    // display label
}

/**
 * Get the full approval pipeline for a suggestion type & award amount.
 *
 * MIC:                     emp → FLM → BPS Admin → Close
 * SSS/SFC/CTF (≤ 500):    emp → FLM → BPS Admin → Close
 * SSS/SFC/CTF (> 500):    emp → FLM → Manager → BPS Admin → BPS DH → Close
 * DCIP:                    emp → Close (no approvals)
 */
export function getPipeline(type: string, awardAmount: number): PipelineStep[] {
  if (type === "Daily CIP") return []; // auto-close on submit

  if (type === "My Idea Card") {
    return [
      { level: "FLM", status: "Submitted", pendingWith: "FLM" },
      { level: "BPS Admin", status: "Pending BPS Admin", pendingWith: "BPS Admin" },
    ];
  }

  // SSS, SFC, CTF — same flow, branched by amount
  if (awardAmount > 500) {
    return [
      { level: "FLM", status: "Submitted", pendingWith: "FLM" },
      { level: "Manager", status: "Pending Manager", pendingWith: "Manager" },
      { level: "BPS Admin", status: "Pending BPS Admin", pendingWith: "BPS Admin" },
      { level: "BPS DH", status: "Pending BPS DH", pendingWith: "BPS DH" },
    ];
  }

  return [
    { level: "FLM", status: "Submitted", pendingWith: "FLM" },
    { level: "BPS Admin", status: "Pending BPS Admin", pendingWith: "BPS Admin" },
  ];
}

/**
 * Get the next approval step after the current level.
 * Returns null if this is the last step → suggestion should be closed.
 */
export function getNextStep(
  type: string,
  awardAmount: number,
  currentLevel: ApprovalLevel
): PipelineStep | null {
  const pipeline = getPipeline(type, awardAmount);
  const currentIndex = pipeline.findIndex(s => s.level === currentLevel);
  if (currentIndex === -1 || currentIndex >= pipeline.length - 1) return null;
  return pipeline[currentIndex + 1];
}

/**
 * Build the Suggestion partial update when a level approves.
 *
 * Throws if the caller's level does not match the suggestion's current
 * approvalLevel — prevents out-of-sequence approvals.
 */
export function buildApprovalUpdate(
  suggestion: Suggestion,
  currentLevel: ApprovalLevel,
  approverEmpNo: string,
  approverName: string,
  awardAmount?: number,
  options?: { comments?: string; department?: string; forwardedTo?: string; attachments?: Array<{ name: string; type: string }>; metadata?: Record<string, any> },
): Partial<Suggestion> {
  // Determine the suggestion's effective current approval level.
  // For a freshly submitted item it may not be set yet — treat as FLM.
  const effectiveLevel: ApprovalLevel =
    (suggestion.approvalLevel as ApprovalLevel | undefined) ??
    (suggestion.status === "Submitted" || suggestion.status === "Pending FLM" ? "FLM" : currentLevel);

  if (effectiveLevel !== currentLevel) {
    throw new Error(
      `Approval not allowed: suggestion is awaiting "${effectiveLevel}" but caller is "${currentLevel}".`
    );
  }
  const amount = awardAmount ?? suggestion.awardAmount ?? 0;
  const now = new Date().toISOString().split("T")[0];
  const next = getNextStep(suggestion.type, amount, currentLevel);

  const base: Partial<Suggestion> = {};

  // Stamp who approved at this level
  if (currentLevel === "FLM") {
    base.evaluatedBy = approverEmpNo;
    base.evaluatedByName = approverName;
    base.evaluatedOn = now;
    if (awardAmount !== undefined) {
      base.awardAmount = awardAmount;
    }
  } else if (currentLevel === "Manager") {
    base.approvedByManager = approverEmpNo;
    base.approvedByManagerName = approverName;
    base.approvedByManagerOn = now;
  } else if (currentLevel === "BPS Admin") {
    base.approvedByBpsAdmin = approverEmpNo;
    base.approvedByBpsAdminName = approverName;
    base.approvedByBpsAdminOn = now;
  } else if (currentLevel === "BPS DH") {
    base.approvedByBpsDh = approverEmpNo;
    base.approvedByBpsDhName = approverName;
    base.approvedByBpsDhOn = now;
  }

  if (next) {
    base.status = next.status;
    base.pendingWith = next.pendingWith;
    base.approvalLevel = next.level;
    base.daysPending = 0;
    base.pendingSince = now;
  } else {
    // Last step — close the suggestion
    base.status = "Approved & Closed";
    base.pendingWith = undefined;
    base.approvalLevel = undefined;
    base.daysPending = undefined;
    base.pendingSince = undefined;
  }

  // Build audit entry
  const auditEntry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: next ? "Approved" : "Closed",
    performedBy: approverEmpNo,
    performedByName: approverName,
    performedByDept: options?.department,
    role: currentLevel,
    date: new Date().toISOString(),
    fromStatus: suggestion.status,
    toStatus: base.status!,
    comments: options?.comments,
    awardAmount: awardAmount,
    forwardedTo: next ? next.pendingWith : undefined,
    attachments: options?.attachments,
    metadata: options?.metadata,
  };
  base.auditTrail = [...(suggestion.auditTrail || []), auditEntry];

  return base;
}

/**
 * Build the rejection update.
 */
export function buildRejectionUpdate(
  rejectorEmpNo: string,
  rejectorName: string,
  reason: string,
  suggestion?: Suggestion,
  options?: { department?: string; role?: string },
): Partial<Suggestion> {
  const now = new Date().toISOString();
  const base: Partial<Suggestion> = {
    status: "Rejected",
    rejectedBy: rejectorEmpNo,
    rejectedByName: rejectorName,
    rejectedOn: now.split("T")[0],
    rejectionReason: reason,
    pendingWith: undefined,
    approvalLevel: undefined,
    daysPending: undefined,
    pendingSince: undefined,
  };

  if (suggestion) {
    const auditEntry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action: "Rejected",
      performedBy: rejectorEmpNo,
      performedByName: rejectorName,
      performedByDept: options?.department,
      role: options?.role,
      date: now,
      fromStatus: suggestion.status,
      toStatus: "Rejected",
      comments: reason,
    };
    base.auditTrail = [...(suggestion.auditTrail || []), auditEntry];
  }

  return base;
}

/**
 * Which BidP role maps to which approval level?
 */
export function roleToApprovalLevel(bidpRole: string): ApprovalLevel | null {
  switch (bidpRole) {
    case "flm": return "FLM";
    case "manager": return "Manager";
    case "bps_admin": return "BPS Admin";
    case "bps_dh": return "BPS DH";
    default: return null;
  }
}

/**
 * Which statuses should a given approval level see?
 */
export function getStatusesForLevel(level: ApprovalLevel): string[] {
  switch (level) {
    case "FLM": return ["Submitted", "Pending FLM"];
    case "Manager": return ["Pending Manager"];
    case "BPS Admin": return ["Pending BPS Admin"];
    case "BPS DH": return ["Pending BPS DH"];
  }
}

/**
 * Human-readable label for the pipeline display.
 */
export function getPipelineDisplay(type: string, amount: number): string[] {
  if (type === "Daily CIP") return ["Employee", "Close"];
  const pipeline = getPipeline(type, amount);
  return ["Employee", ...pipeline.map(s => s.level), "Close"];
}

/**
 * Get the previous step in the pipeline (for send-back).
 * Returns null if there's no previous level (FLM can't send back further).
 */
export function getPreviousStep(
  type: string,
  awardAmount: number,
  currentLevel: ApprovalLevel
): PipelineStep | null {
  const pipeline = getPipeline(type, awardAmount);
  const currentIndex = pipeline.findIndex(s => s.level === currentLevel);
  if (currentIndex <= 0) return null; // FLM is first — can't send back
  return pipeline[currentIndex - 1];
}

/**
 * Build the send-back update — moves suggestion to previous approval level.
 */
export function buildSendBackUpdate(
  suggestion: Suggestion,
  currentLevel: ApprovalLevel,
  senderEmpNo: string,
  senderName: string,
  reason: string,
  options?: { department?: string },
): Partial<Suggestion> {
  const amount = suggestion.awardAmount ?? 0;
  const prev = getPreviousStep(suggestion.type, amount, currentLevel);
  const now = new Date().toISOString().split("T")[0];

  const entry = {
    from: currentLevel,
    fromName: senderName,
    to: prev ? prev.level : "FLM",
    reason,
    date: now,
  };

  const history = [...(suggestion.sendBackHistory || []), entry];

  const targetStatus = prev ? prev.status : "Submitted";
  const targetLevel = prev ? prev.level : "FLM";

  // Build audit entry
  const auditEntry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: "Sent Back",
    performedBy: senderEmpNo,
    performedByName: senderName,
    performedByDept: options?.department,
    role: currentLevel,
    date: new Date().toISOString(),
    fromStatus: suggestion.status,
    toStatus: targetStatus,
    comments: reason,
    forwardedTo: targetLevel,
  };

  const base: Partial<Suggestion> = {
    status: targetStatus,
    pendingWith: prev ? prev.pendingWith : "FLM",
    approvalLevel: targetLevel,
    daysPending: 0,
    pendingSince: now,
    sendBackHistory: history,
    auditTrail: [...(suggestion.auditTrail || []), auditEntry],
  };

  return base;
}

/**
 * Calculate the actual days pending for a suggestion based on pendingSince or date.
 * Returns 0 for closed/rejected/draft items.
 */
export function calculateDaysPending(suggestion: Suggestion): number {
  // Not applicable for terminal states
  if (!suggestion.status || suggestion.status === "Draft" || suggestion.status === "Rejected" ||
      suggestion.status === "Approved & Closed" || suggestion.status === "Closed") {
    return 0;
  }

  const referenceDate = suggestion.pendingSince || suggestion.date;
  if (!referenceDate) return suggestion.daysPending ?? 0;

  const start = new Date(referenceDate);
  const today = new Date();
  // Reset time component for accurate day calculation
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return diffDays;
}

/**
 * Maximum award amount a given approval level can sanction without escalation.
 * Used by the UI to validate award inputs before submission and avoid
 * server-side rejections that look like "success then error" to the user.
 */
export const APPROVAL_LIMITS: Record<ApprovalLevel, number> = {
  "FLM":        500,
  "Manager":    5_000,
  "BPS Admin":  25_000,
  "BPS DH":     100_000,
};

export function getMaxAwardForLevel(level: ApprovalLevel | null | undefined): number {
  if (!level) return 0;
  return APPROVAL_LIMITS[level] ?? 0;
}
