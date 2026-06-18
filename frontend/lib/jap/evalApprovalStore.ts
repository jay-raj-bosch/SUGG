// evalApprovalStore.ts
// localStorage-backed store that persists submitted eval records so that
// named approvers can review and digitally sign them when they log in.
//
// Isolation: records are stored under the key "jap_eval_approvals".
// In a production setup this would be replaced by backend API calls.

export type EvalFormType = "quantifiable" | "nonquantifiable";

export interface ApprovalSlot {
  role: "deptCoord" | "procPlanSign" | "approvalAuth" | "fcmHead";
  label: string;           // human-readable role name
  empNo: string;           // the employee who must approve
  empName: string;         // resolved on submit
  approved: boolean;
  approvedAt: string | null; // ISO timestamp
}

export interface PendingApproval {
  id: string;
  evalType: EvalFormType;
  auditId: string;
  suggNo: string;
  suggesterName: string;
  dept: string;
  submittedBy: string;    // name + empNo of evaluator who submitted
  submittedAt: string;    // ISO timestamp
  summary: string;        // one-line human-readable snapshot
  approvals: ApprovalSlot[];
}

const STORE_KEY = "jap_eval_approvals";

function load(): PendingApproval[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as PendingApproval[]) : [];
  } catch {
    return [];
  }
}

function save(records: PendingApproval[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(records));
  } catch { /* storage full — silently ignore */ }
}

/** Persist a newly submitted eval record for its approvers to review. */
export function addApprovalRecord(record: PendingApproval): void {
  const records = load();
  // Prevent duplicates (re-submit guard)
  if (records.some(r => r.auditId === record.auditId)) return;
  save([record, ...records]);
}

/** Return all stored approval records. */
export function getApprovalRecords(): PendingApproval[] {
  return load();
}

/** Return records where the given empNo has at least one pending (unapproved) slot. */
export function getRecordsAwaitingApproval(empNo: string): PendingApproval[] {
  return load().filter(r =>
    r.approvals.some(a => a.empNo === empNo && !a.approved)
  );
}

/** Mark the given empNo's slot on the given record as approved. Returns updated record or null. */
export function approveSlot(recordId: string, empNo: string): PendingApproval | null {
  const records = load();
  const idx = records.findIndex(r => r.id === recordId);
  if (idx === -1) return null;

  const updated: PendingApproval = {
    ...records[idx],
    approvals: records[idx].approvals.map(a =>
      a.empNo === empNo && !a.approved
        ? { ...a, approved: true, approvedAt: new Date().toISOString() }
        : a
    ),
  };
  records[idx] = updated;
  save(records);
  return updated;
}

/** Count how many records are waiting for this empNo to approve. */
export function countPendingForApprover(empNo: string): number {
  return getRecordsAwaitingApproval(empNo).length;
}
