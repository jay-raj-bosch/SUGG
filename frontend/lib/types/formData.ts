/**
 * formData.ts — Typed interfaces for the `formData` JSON blob on each suggestion.
 *
 * The `formData` field on the `Suggestion` model is a schema-less JSON object
 * that stores all type-specific and phase-specific fields that don't belong
 * in the core suggestions table (e.g. evaluation results, sign-off lists,
 * co-suggestors, machine references, etc.)
 *
 * NOTE FOR .NET BACKEND TEAM:
 *   Store `formData` as a `jsonb` column in PostgreSQL (or `nvarchar(max)` /
 *   `json` column in SQL Server) and return it verbatim to the frontend.
 *   Do NOT try to flatten these fields into separate columns — the frontend
 *   reads them directly from the JSON object.
 *
 *   On write (POST/PUT), accept the entire `formData` object from the request
 *   body and persist it without modification.
 */

// ─── Shared sign-off slot (used in evaluation forms) ─────────────────────────

export interface SignOffSlot {
  empNo: string;
  empName?: string;
  dept?: string;
  date?: string;
  areaOfImpl?: string;
}

// ─── JaP Suggestion formData ──────────────────────────────────────────────────
// Populated by the New Suggestion form and updated through the workflow phases.

export interface JapFormData {
  // ── Submission fields (Phase 1) ────────────────────────────────────────────
  themeName?: string;           // one of 16 themes (e.g. "safety")
  themeBased?: boolean;
  suggestionArea?: string;      // one of 24 shop floor areas
  machineRefType?: "na" | "Name" | "No.";
  machineRef?: string;          // machine name or number
  isGroupSuggestion?: boolean;
  coSuggestors?: string[];      // employee numbers
  attachments?: Array<{ name: string; url?: string; size?: number; type?: string }>;

  // ── Phase 2: Feasibility Review ────────────────────────────────────────────
  feasibilityApprovedBy?: string;   // employee number of Superior
  feasibilityApprovedByName?: string;
  feasibilityRemark?: string;
  feasibilityDate?: string;         // ISO date

  // ── Phase 3: Opinion ───────────────────────────────────────────────────────
  opinionApprovedBy?: string;
  opinionApprovedByName?: string;
  opinionRemarks?: string;
  opinionDate?: string;

  // ── Phase 4: Implementation ────────────────────────────────────────────────
  implementationNotes?: string;
  implementedBy?: string;
  implementedByName?: string;
  implementedDate?: string;

  // ── Phase 5: Evaluation ───────────────────────────────────────────────────
  evaluationType?: "quantifiable" | "non-quantifiable";
  plannerEvalDone?: boolean;        // planner section submitted; CTG section pending
  plannerEvalNotes?: string;
  // Quantifiable — saved by CTG
  savingsMaterial?: string;
  savingsProcessingTime?: string;
  savingsPower?: string;
  savingsSpace?: string;
  savingsManpower?: string;
  totalCostReduction?: number;
  // Non-quantifiable — factor degree scores (Safety / Quality / Cost etc.)
  factorRows?: Array<{ factorName: string; degree: string; points: string }>;
  totalPoints?: number;
  totalRewardAmount?: number;
  benefitFrequency?: string;
  // Shared evaluation sign-offs
  opinionBySlots?: string[];        // 3 employee numbers
  tefTeamSlots?: string[];
  implDoneBySlots?: string[];
  processPlanner?: string;
  deptCoord?: SignOffSlot;
  procPlanSign?: SignOffSlot;
  fcmHead?: SignOffSlot;
  approvalAuth?: SignOffSlot;

  // ── Hold / Resume ─────────────────────────────────────────────────────────
  statusBeforeHold?: string;        // status to restore on Resume
  holdRemark?: string;

  // ── Reopen ────────────────────────────────────────────────────────────────
  reopenRemark?: string;
  reopenedBy?: string;
  reopenDate?: string;

  // ── Team members (for team suggestions) ───────────────────────────────────
  teamMembers?: string[];           // employee numbers

  // Allow additional keys added in future phases without breaking existing code
  [key: string]: unknown;
}

// ─── BidP Suggestion formData ─────────────────────────────────────────────────
// Shape varies by suggestion type (SSS / SFC / MIC / DCP / CTF).

export interface BidpFormData {
  // SSS / MIC / CTF shared
  flm?: string;               // assigned FLM employee number
  flmName?: string;
  sharePercent?: string;      // CTF — share percentage

  // SFC (Shop Floor CIP) specific
  kaizenTheme?: string;
  rootCause?: string;
  beforeDescription?: string;
  afterDescription?: string;
  horizontalDeployment?: number;
  moderators?: string[];
  teamMembers?: string[];

  // DCP (Daily CIP) specific
  machineNoArea?: string;
  actionTaken?: string;
  photosBefore?: string[];    // file URLs
  photosAfter?: string[];

  // MIC specific
  dateOfImplementation?: string;

  // Approval chain tracking
  approvedByFlm?: string;
  approvedByFlmName?: string;
  approvedByFlmOn?: string;
  approvedByManager?: string;
  approvedByManagerName?: string;
  approvedByManagerOn?: string;
  approvedByBpsAdmin?: string;
  approvedByBpsAdminName?: string;
  approvedByBpsAdminOn?: string;

  // Allow additional keys
  [key: string]: unknown;
}
