// Approval pipeline logic for BidP suggestion types
// Each type has a defined approval flow based on award amount

import type { Suggestion, AuditEntry } from "@/lib/mockData";

/** My Idea Card has a fixed award of ₹250 — no FLM evaluation needed */
export const MIC_FIXED_AMOUNT = 250;

export type ApprovalLevel = "FLM" | "Manager" | "BPS Admin" | "BPS DH" | "Implementation" | "CTG" | "VS RC";

interface PipelineStep {
  level: ApprovalLevel;
  status: string;        // status to set on the suggestion
  pendingWith: string;    // display label
}

/**
 * Calculate CTF award amount from net savings using the defined slab table.
 */
export function calculateCtfAward(netSavings: number): number {
  if (netSavings <= 0) return 0;
  if (netSavings <= 20_000) return Math.round(0.3 * netSavings);
  if (netSavings <= 40_000) return Math.round(6_000 + 0.25 * (netSavings - 20_000));
  if (netSavings <= 80_000) return Math.round(11_000 + 0.20 * (netSavings - 40_000));
  if (netSavings <= 1_60_000) return Math.round(19_000 + 0.10 * (netSavings - 80_000));
  if (netSavings <= 3_20_000) return Math.round(27_000 + 0.05 * (netSavings - 1_60_000));
  if (netSavings <= 6_40_000) return Math.round(35_400 + 0.03 * (netSavings - 3_20_000));
  if (netSavings <= 12_80_000) return Math.round(45_000 + 0.015 * (netSavings - 6_40_000));
  if (netSavings <= 20_00_000) return Math.round(54_600 + 0.0075 * (netSavings - 12_80_000));
  return 60_000;
}

/**
 * Get the full approval pipeline for a suggestion type & award amount.
 *
 * MIC:                     emp → FLM → BPS Admin → Close
 * SSS/SFC (≤ 500):        emp → FLM → BPS Admin → Close
 * SSS/SFC (> 500):        emp → FLM → Manager → BPS Admin → BPS DH → Close
 * CTF (≤ 5000):           emp → FLM → Implementation → BPS Admin → CTG → BPS DH → Close
 * CTF (> 5000):           emp → FLM → Implementation → BPS Admin → CTG → VS RC → BPS DH → Close
 * DCIP:                   emp → Close (no approvals)
 */
export function getPipeline(type: string, awardAmount: number): PipelineStep[] {
  if (type === "Daily CIP") return []; // auto-close on submit

  if (type === "My Idea Card") {
    return [
      { level: "FLM", status: "Submitted", pendingWith: "FLM" },
      { level: "BPS Admin", status: "Pending BPS Admin", pendingWith: "BPS Admin" },
    ];
  }

  // CTF — unique pipeline: FLM forwards for implementation (no evaluation),
  // CTG evaluates with net savings, VS RC involved for >5000
  if (type === "Cash The Flash") {
    if (awardAmount > 5000) {
      return [
        { level: "FLM", status: "Submitted", pendingWith: "FLM" },
        { level: "Implementation", status: "Pending Implementation", pendingWith: "Implementation" },
        { level: "BPS Admin", status: "Pending BPS Admin", pendingWith: "BPS Admin" },
        { level: "CTG", status: "Pending CTG", pendingWith: "CTG" },
        { level: "VS RC", status: "Pending VS RC", pendingWith: "VS RC" },
        { level: "BPS DH", status: "Pending BPS DH", pendingWith: "BPS DH" },
      ];
    }
    return [
      { level: "FLM", status: "Submitted", pendingWith: "FLM" },
      { level: "Implementation", status: "Pending Implementation", pendingWith: "Implementation" },
      { level: "BPS Admin", status: "Pending BPS Admin", pendingWith: "BPS Admin" },
      { level: "CTG", status: "Pending CTG", pendingWith: "CTG" },
      { level: "BPS DH", status: "Pending BPS DH", pendingWith: "BPS DH" },
    ];
  }

  // SSS, SFC — same flow, branched by amount
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
  } else if (currentLevel === "Implementation") {
    (base as any).implementedBy = approverEmpNo;
    (base as any).implementedByName = approverName;
    (base as any).implementedOn = now;
  } else if (currentLevel === "CTG") {
    (base as any).ctgEvaluatedBy = approverEmpNo;
    (base as any).ctgEvaluatedByName = approverName;
    (base as any).ctgEvaluatedOn = now;
    if (awardAmount !== undefined) {
      base.awardAmount = awardAmount;
    }
  } else if (currentLevel === "VS RC") {
    (base as any).approvedByVsRc = approverEmpNo;
    (base as any).approvedByVsRcName = approverName;
    (base as any).approvedByVsRcOn = now;
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
    case "implementation": return "Implementation";
    case "manager": return "Manager";
    case "bps_admin": return "BPS Admin";
    case "ctg": return "CTG";
    case "vs_rc": return "VS RC";
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
    case "Implementation": return ["Pending Implementation"];
    case "Manager": return ["Pending Manager"];
    case "BPS Admin": return ["Pending BPS Admin"];
    case "CTG": return ["Pending CTG"];
    case "VS RC": return ["Pending VS RC"];
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
  options?: {
    department?: string;
    targetLevel?: ApprovalLevel | "Employee";
    toName?: string;
    attachments?: Array<{ name: string; type: string; url?: string }>;
  },
): Partial<Suggestion> {
  const amount = suggestion.awardAmount ?? 0;
  const now = new Date().toISOString().split("T")[0];

  // Determine target: explicit selection or default to previous step
  let resolvedTarget: string;
  let resolvedStatus: string;
  let resolvedPendingWith: string;

  if (options?.targetLevel === "Employee") {
    // Send all the way back to the employee
    resolvedTarget = "Employee";
    resolvedStatus = "Sent Back";
    resolvedPendingWith = "Employee - Revision Required";
  } else if (options?.targetLevel) {
    // A specific pipeline level was selected
    const pipeline = getPipeline(suggestion.type, amount);
    const targetStep = pipeline.find(s => s.level === options.targetLevel);
    resolvedTarget = options.targetLevel;
    resolvedStatus = "Sent Back";
    resolvedPendingWith = targetStep ? targetStep.pendingWith + " - Revision" : "FLM";
  } else {
    // Default: previous step
    const prev = getPreviousStep(suggestion.type, amount, currentLevel);
    resolvedTarget = prev ? prev.level : "FLM";
    resolvedStatus = "Sent Back";
    resolvedPendingWith = prev ? prev.pendingWith + " - Revision" : "FLM";
  }

  const entry = {
    from: currentLevel,
    fromName: senderName,
    to: resolvedTarget,
    toName: options?.toName,
    reason,
    date: now,
    attachments: options?.attachments?.length ? options.attachments : undefined,
  };

  const history = [...(suggestion.sendBackHistory || []), entry];

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
    toStatus: resolvedStatus,
    comments: reason,
    forwardedTo: resolvedTarget,
    attachments: options?.attachments?.length ? options.attachments : undefined,
  };

  const base: Partial<Suggestion> = {
    status: resolvedStatus,
    pendingWith: resolvedPendingWith,
    approvalLevel: resolvedTarget === "Employee" ? "FLM" : resolvedTarget,
    daysPending: 0,
    pendingSince: now,
    sendBackHistory: history,
    auditTrail: [...(suggestion.auditTrail || []), auditEntry],
  };

  return base;
}

/**
 * Build the reroute update — lets BPS Admin/BPS DH redirect a suggestion to
 * ANY specific person at ANY pipeline level (e.g. if the wrong FLM evaluated
 * it, or it needs a different Manager's attention). Unlike send-back, this
 * does NOT imply revision is required from the employee — it simply
 * reassigns who currently needs to act, resetting that level's own stamp so
 * the newly-assigned person can act on it fresh.
 */
export function buildRerouteUpdate(
  suggestion: Suggestion,
  reroutedByEmpNo: string,
  reroutedByName: string,
  targetLevel: ApprovalLevel,
  targetEmpNo: string,
  targetName: string,
  reason: string,
  options?: { department?: string; fromLevel?: ApprovalLevel | string },
): Partial<Suggestion> {
  const now = new Date().toISOString().split("T")[0];

  const statusForLevel: Record<ApprovalLevel, string> = {
    FLM: "Submitted",
    Implementation: "Pending Implementation",
    Manager: "Pending Manager",
    "BPS Admin": "Pending BPS Admin",
    CTG: "Pending CTG",
    "VS RC": "Pending VS RC",
    "BPS DH": "Pending BPS DH",
  };

  const base: Partial<Suggestion> = {
    status: statusForLevel[targetLevel],
    pendingWith: `${targetLevel} - ${targetName}`,
    approvalLevel: targetLevel,
    daysPending: 0,
    pendingSince: now,
    rerouteTargetEmpNo: targetEmpNo,
    rerouteTargetName: targetName,
  };

  // Reassign the pointer field used to filter "my approvals" for that level,
  // and clear any existing stamp so the new person can act on it afresh.
  if (targetLevel === "FLM") {
    base.assignedFlm = targetEmpNo;
    base.evaluatedBy = undefined;
    base.evaluatedByName = undefined;
    base.evaluatedOn = undefined;
  } else if (targetLevel === "Implementation") {
    (base as any).implementedBy = undefined;
    (base as any).implementedByName = undefined;
    (base as any).implementedOn = undefined;
  } else if (targetLevel === "CTG") {
    (base as any).ctgEvaluatedBy = undefined;
    (base as any).ctgEvaluatedByName = undefined;
    (base as any).ctgEvaluatedOn = undefined;
  } else if (targetLevel === "VS RC") {
    (base as any).approvedByVsRc = undefined;
    (base as any).approvedByVsRcName = undefined;
    (base as any).approvedByVsRcOn = undefined;
  } else if (targetLevel === "Manager") {
    base.approvedByManager = undefined;
    base.approvedByManagerName = undefined;
    base.approvedByManagerOn = undefined;
  } else if (targetLevel === "BPS Admin") {
    base.approvedByBpsAdmin = undefined;
    base.approvedByBpsAdminName = undefined;
    base.approvedByBpsAdminOn = undefined;
  } else if (targetLevel === "BPS DH") {
    base.approvedByBpsDh = undefined;
    base.approvedByBpsDhName = undefined;
    base.approvedByBpsDhOn = undefined;
  }

  const rerouteEntry = {
    fromLevel: (options?.fromLevel || suggestion.approvalLevel || "FLM") as string,
    toLevel: targetLevel,
    toEmpNo: targetEmpNo,
    toName: targetName,
    reason,
    date: now,
    reroutedBy: reroutedByEmpNo,
    reroutedByName,
  };
  base.rerouteHistory = [...(suggestion.rerouteHistory || []), rerouteEntry];

  const auditEntry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: "Rerouted",
    performedBy: reroutedByEmpNo,
    performedByName: reroutedByName,
    performedByDept: options?.department,
    role: (options?.fromLevel || suggestion.approvalLevel) as string | undefined,
    date: new Date().toISOString(),
    fromStatus: suggestion.status,
    toStatus: base.status,
    comments: reason,
    forwardedTo: `${targetLevel} - ${targetName}`,
  };
  base.auditTrail = [...(suggestion.auditTrail || []), auditEntry];

  return base;
}

/**
 * Calculate the actual days pending for a suggestion based on pendingSince or date.
 * Returns 0 for closed/rejected/draft items.
 */
export function calculateDaysPending(suggestion: Suggestion): number {
  // Not applicable for terminal states
  if (!suggestion.status || suggestion.status === "Draft" || suggestion.status === "Rejected" ||
      suggestion.status === "Approved & Closed" || suggestion.status === "Closed" || suggestion.status === "Implemented") {
    return 0;
  }

  // Find the most recent approval action date — this is when the counter resets
  // Walk backwards through the approval chain: BPS DH > BPS Admin > Manager > FLM > Submitted
  const lastActionDate =
    suggestion.approvedByBpsDhOn  ||
    suggestion.approvedByBpsAdminOn ||
    suggestion.approvedByManagerOn ||
    suggestion.evaluatedOn ||
    suggestion.pendingSince ||
    suggestion.date;

  if (!lastActionDate) return suggestion.daysPending ?? 0;

  const start = new Date(lastActionDate);
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
  "FLM":            500,
  "Implementation": 0,
  "Manager":        5_000,
  "BPS Admin":      25_000,
  "CTG":            100_000,
  "VS RC":          100_000,
  "BPS DH":         100_000,
};

export function getMaxAwardForLevel(level: ApprovalLevel | null | undefined): number {
  if (!level) return 0;
  return APPROVAL_LIMITS[level] ?? 0;
}
