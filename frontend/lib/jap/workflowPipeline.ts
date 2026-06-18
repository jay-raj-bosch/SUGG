// JaP — Suggestion Workflow Pipeline
// Implements the 6-phase workflow from Suggestion_System_Workflow.docx
// Phase 1: Submission → Phase 2: Feasibility → Phase 3: Opinion →
// Phase 4: Implementation → Phase 5: Evaluation → Phase 6: Award → Closed
//
// This file is JaP-only. Never import from or share with BidP.

import type { Suggestion } from "@/lib/mockData";

// ─── Role Types ───────────────────────────────────────────────────────────────

export type JapRole =
  | "employee"      // Phase 1: Submits suggestions
  | "superior"      // Phase 2: Feasibility review
  | "planner"       // Phase 3: Opinion + Phase 5: Evaluation
  | "implementer"   // Phase 4: Implementation
  | "ctg"           // Phase 5: Quantifiable savings calculation
  | "bps"           // Admin: input methods, restricted eval access
  | "coordinator";  // Tracks and helps close open suggestions

// ─── Workflow Statuses (§6 of spec) ──────────────────────────────────────────

export const JAP_STATUSES = {
  DRAFT:               "Draft",
  PENDING_FEASIBILITY: "Pending Feasibility Review",
  IN_OPINION:          "In Opinion Phase",
  IN_IMPLEMENTATION:   "In Implementation",
  IN_EVALUATION:       "In Evaluation",
  IN_AWARD:            "In Award",
  CLOSED_AWARDED:      "Closed / Awarded",
  REJECTED:            "Rejected",
  REOPENED:            "Reopened",
  ON_HOLD:             "On Hold",
} as const;

export type JapStatus = (typeof JAP_STATUSES)[keyof typeof JAP_STATUSES];

// ─── Phase Display Info ───────────────────────────────────────────────────────

export const STATUS_TO_PHASE: Record<string, string> = {
  [JAP_STATUSES.DRAFT]:               "Draft",
  [JAP_STATUSES.PENDING_FEASIBILITY]: "Phase 2 — Feasibility Review",
  [JAP_STATUSES.IN_OPINION]:          "Phase 3 — Opinion",
  [JAP_STATUSES.IN_IMPLEMENTATION]:   "Phase 4 — Implementation",
  [JAP_STATUSES.IN_EVALUATION]:       "Phase 5 — Evaluation",
  [JAP_STATUSES.IN_AWARD]:            "Phase 6 — Award",
  [JAP_STATUSES.CLOSED_AWARDED]:      "Closed / Awarded",
  [JAP_STATUSES.REJECTED]:            "Rejected",
  [JAP_STATUSES.REOPENED]:            "Reopened",
  [JAP_STATUSES.ON_HOLD]:              "On Hold — BPS",
};

// SLA in days per phase (0 = no SLA for that phase)
export const PHASE_SLA: Record<string, number> = {
  [JAP_STATUSES.PENDING_FEASIBILITY]: 0,
  [JAP_STATUSES.IN_OPINION]:          7,
  [JAP_STATUSES.IN_IMPLEMENTATION]:   30,
  [JAP_STATUSES.IN_EVALUATION]:       10,
  [JAP_STATUSES.IN_AWARD]:            3,
};

// Who is responsible at each status
export const STATUS_PENDING_WITH: Record<string, string> = {
  [JAP_STATUSES.PENDING_FEASIBILITY]: "Superior",
  [JAP_STATUSES.IN_OPINION]:          "Planner",
  [JAP_STATUSES.IN_IMPLEMENTATION]:   "Implementer",
  [JAP_STATUSES.IN_EVALUATION]:       "Planner / CTG",
  [JAP_STATUSES.IN_AWARD]:            "BPS / Finance",
};

// Next status in the forward flow
export const NEXT_STATUS: Partial<Record<string, JapStatus>> = {
  [JAP_STATUSES.PENDING_FEASIBILITY]: JAP_STATUSES.IN_OPINION,
  [JAP_STATUSES.IN_OPINION]:          JAP_STATUSES.IN_IMPLEMENTATION,
  [JAP_STATUSES.IN_IMPLEMENTATION]:   JAP_STATUSES.IN_EVALUATION,
  [JAP_STATUSES.IN_EVALUATION]:       JAP_STATUSES.IN_AWARD,
  [JAP_STATUSES.IN_AWARD]:            JAP_STATUSES.CLOSED_AWARDED,
};

// ─── Role → Inbox Statuses ────────────────────────────────────────────────────

/** Returns the list of statuses this role should see in their WorkflowInbox */
export function getInboxStatuses(role: JapRole): string[] {
  switch (role) {
    case "superior":
      return [JAP_STATUSES.PENDING_FEASIBILITY];
    case "planner":
      return [JAP_STATUSES.IN_OPINION, JAP_STATUSES.IN_EVALUATION];
    case "implementer":
      return [JAP_STATUSES.IN_IMPLEMENTATION];
    case "ctg":
      return [JAP_STATUSES.IN_EVALUATION];
    case "bps":
      return [
        JAP_STATUSES.PENDING_FEASIBILITY,
        JAP_STATUSES.IN_OPINION,
        JAP_STATUSES.IN_IMPLEMENTATION,
        JAP_STATUSES.IN_EVALUATION,
        JAP_STATUSES.IN_AWARD,
        JAP_STATUSES.ON_HOLD,
      ];
    case "coordinator":
      return [
        JAP_STATUSES.PENDING_FEASIBILITY,
        JAP_STATUSES.IN_OPINION,
        JAP_STATUSES.IN_IMPLEMENTATION,
        JAP_STATUSES.IN_EVALUATION,
        JAP_STATUSES.IN_AWARD,
        JAP_STATUSES.ON_HOLD,
      ];
    default:
      return [];
  }
}

/** Whether this role can take approve/reject actions */
export function canActOnSuggestion(role: JapRole, status: string): boolean {
  if (role === "coordinator") return false; // read-only observer
  if (role === "bps") return true;          // full access
  return getInboxStatuses(role).includes(status);
}

/** Phase tab options shown in WorkflowInbox for this role */
export function getPhaseTabsForRole(role: JapRole): Array<{ label: string; status: string }> {
  const statuses = getInboxStatuses(role);
  return statuses.map(s => ({
    label: STATUS_TO_PHASE[s] ?? s,
    status: s,
  }));
}

// ─── Update Builders ──────────────────────────────────────────────────────────

/** Build the suggestion update when a role approves/advances a suggestion */
export function buildJapApprovalUpdate(
  currentStatus: string,
  approverEmpNo: string,
  approverName: string,
  extraFormData?: Record<string, unknown>,
): Partial<Suggestion> & Record<string, unknown> {
  const next = NEXT_STATUS[currentStatus];
  const now = new Date().toISOString().split("T")[0];

  const base: Partial<Suggestion> & Record<string, unknown> = {
    status: next ?? JAP_STATUSES.CLOSED_AWARDED,
    pendingWith: next ? STATUS_PENDING_WITH[next] : undefined,
    daysPending: 0,
    formData: { ...extraFormData },
  };

  // Stamp approver at current phase
  if (currentStatus === JAP_STATUSES.PENDING_FEASIBILITY) {
    base.formData = {
      ...extraFormData,
      feasibilityApprovedBy: approverEmpNo,
      feasibilityApprovedByName: approverName,
      feasibilityApprovedOn: now,
    };
  } else if (currentStatus === JAP_STATUSES.IN_OPINION) {
    base.formData = {
      ...extraFormData,
      opinionApprovedBy: approverEmpNo,
      opinionApprovedByName: approverName,
      opinionApprovedOn: now,
    };
  } else if (currentStatus === JAP_STATUSES.IN_IMPLEMENTATION) {
    base.implementedOn = now;
    base.formData = {
      ...extraFormData,
      implementedBy: approverEmpNo,
      implementedByName: approverName,
    };
  } else if (currentStatus === JAP_STATUSES.IN_EVALUATION) {
    base.formData = {
      ...extraFormData,
      evaluatedBy: approverEmpNo,
      evaluatedByName: approverName,
      evaluatedOn: now,
    };
  } else if (currentStatus === JAP_STATUSES.IN_AWARD) {
    base.awardDate = now;
    base.formData = {
      ...extraFormData,
      awardApprovedBy: approverEmpNo,
      awardApprovedByName: approverName,
      awardApprovedOn: now,
    };
  }

  return base;
}

/** Build the suggestion update when a role rejects */
export function buildJapRejectionUpdate(
  rejectorEmpNo: string,
  rejectorName: string,
  reason: string,
): Partial<Suggestion> {
  return {
    status: JAP_STATUSES.REJECTED,
    rejectionReason: reason,
    rejectedBy: rejectorEmpNo,
    rejectedByName: rejectorName,
    rejectedOn: new Date().toISOString().split("T")[0],
    pendingWith: undefined,
    daysPending: undefined,
  };
}

/** Build the suggestion update when a suggestion is reopened */
export function buildJapReopenUpdate(reopenReason: string): Partial<Suggestion> {
  return {
    status: JAP_STATUSES.REOPENED,
    rejectionReason: undefined,
    pendingWith: undefined,
    daysPending: 0,
    formData: {
      reopenReason,
      reopenedAt: new Date().toISOString(),
    },
  };
}

/** Build the suggestion update when BPS puts a suggestion on hold */
export function buildJapHoldUpdate(
  previousStatus: string,
  holderEmpNo: string,
  holderName: string,
  holdReason: string,
): Partial<Suggestion> & Record<string, unknown> {
  return {
    status: JAP_STATUSES.ON_HOLD,
    pendingWith: "BPS (On Hold)",
    daysPending: 0,
    formData: {
      holdReason,
      heldBy: holderEmpNo,
      heldByName: holderName,
      heldOn: new Date().toISOString().split("T")[0],
      statusBeforeHold: previousStatus,
    },
  };
}

/** Build the suggestion update when BPS resumes a held suggestion */
export function buildJapResumeUpdate(
  resumerEmpNo: string,
  resumerName: string,
  previousStatus: string,
): Partial<Suggestion> & Record<string, unknown> {
  return {
    status: previousStatus as JapStatus,
    pendingWith: STATUS_PENDING_WITH[previousStatus] ?? undefined,
    daysPending: 0,
    formData: {
      resumedBy: resumerEmpNo,
      resumedByName: resumerName,
      resumedOn: new Date().toISOString().split("T")[0],
    },
  };
}

// ─── Status Color Classes ─────────────────────────────────────────────────────

export const JAP_STATUS_COLORS: Record<string, string> = {
  [JAP_STATUSES.DRAFT]:               "bg-gray-100 text-gray-600 border-gray-200",
  [JAP_STATUSES.PENDING_FEASIBILITY]: "bg-orange-100 text-orange-700 border-orange-200",
  [JAP_STATUSES.IN_OPINION]:          "bg-blue-100 text-blue-700 border-blue-200",
  [JAP_STATUSES.IN_IMPLEMENTATION]:   "bg-amber-100 text-amber-700 border-amber-200",
  [JAP_STATUSES.IN_EVALUATION]:       "bg-purple-100 text-purple-700 border-purple-200",
  [JAP_STATUSES.IN_AWARD]:            "bg-green-100 text-green-700 border-green-200",
  [JAP_STATUSES.CLOSED_AWARDED]:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  [JAP_STATUSES.REJECTED]:            "bg-red-100 text-red-700 border-red-200",
  [JAP_STATUSES.REOPENED]:            "bg-teal-100 text-teal-700 border-teal-200",
  [JAP_STATUSES.ON_HOLD]:              "bg-yellow-100 text-yellow-700 border-yellow-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Is this suggestion in an active (non-terminal) state? */
export function isJapSuggestionActive(status: string): boolean {
  const terminal: string[] = [
    JAP_STATUSES.DRAFT,
    JAP_STATUSES.CLOSED_AWARDED,
    JAP_STATUSES.REJECTED,
    JAP_STATUSES.ON_HOLD,
  ];
  return !terminal.includes(status);
}

/** Count inbox items for badge display (suggestions this user should act on) */
export function countJapInboxItems(
  suggestions: Suggestion[],
  role: JapRole,
  employeeNo: string,
  plantCode = "PLT-02",
): number {
  if (role === "employee") return 0;
  const inboxStatuses = getInboxStatuses(role);
  return suggestions.filter(
    s => s.plantCode === plantCode && inboxStatuses.includes(s.status)
  ).length;
}
