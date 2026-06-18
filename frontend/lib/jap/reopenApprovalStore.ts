// reopenApprovalStore.ts
// localStorage-backed store for suggestion reopen requests.
// A reopen request requires signatures from 3 authority signatories
// (Rejector, Planner, Range Head) before the suggestion status is changed.
// STORE_KEY: "jap_reopen_approvals"

export interface ReopenSignSlot {
  role: "rejector" | "planner" | "rangeHead";
  label: string;        // human-readable role
  empNo: string;
  empName: string;
  signed: boolean;
  signedAt: string | null;
}

export interface ReopenRequest {
  id: string;           // same as auditId
  auditId: string;
  suggNo: string;
  suggestionId: string; // backend id — needed to patch status on full approval
  subject: string;
  suggesterName: string;
  dept: string;
  requestedBy: string;  // "Name (EmpNo)" of admin who submitted the reopen
  requestedAt: string;  // ISO timestamp
  reopenReason: string;
  slots: ReopenSignSlot[];
  fullyApproved: boolean;
  approvedAt: string | null;
  // Optional rejection
  rejected?: boolean;
  rejectedBy?: string;  // empNo of the person who rejected
  rejectedByName?: string;
  rejectedReason?: string;
  rejectedAt?: string;
}

const STORE_KEY = "jap_reopen_approvals";

function load(): ReopenRequest[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ReopenRequest[]) : [];
  } catch {
    return [];
  }
}

function save(records: ReopenRequest[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(records));
  } catch { /* storage full */ }
}

/** Save a new reopen request (guards against duplicate auditId). */
export function addReopenRequest(request: ReopenRequest): void {
  const records = load();
  if (records.some(r => r.auditId === request.auditId)) return;
  save([request, ...records]);
}

/** All stored reopen requests. */
export function getReopenRequests(): ReopenRequest[] {
  return load();
}

/** Requests where the given empNo has a pending (unsigned) slot. */
export function getReopenRequestsAwaitingSignature(empNo: string): ReopenRequest[] {
  return load().filter(r =>
    !r.fullyApproved &&
    r.slots.some(s => s.empNo === empNo && !s.signed)
  );
}

/**
 * Mark the given empNo's slot as signed.
 * Returns { updated, allSigned } — allSigned=true means status should now be patched.
 */
export function signReopenSlot(
  requestId: string,
  empNo: string
): { updated: ReopenRequest; allSigned: boolean } | null {
  const records = load();
  const idx = records.findIndex(r => r.id === requestId);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const updated: ReopenRequest = {
    ...records[idx],
    slots: records[idx].slots.map(s =>
      s.empNo === empNo && !s.signed
        ? { ...s, signed: true, signedAt: now }
        : s
    ),
  };

  const allSigned = updated.slots.every(s => s.signed);
  if (allSigned) {
    updated.fullyApproved = true;
    updated.approvedAt = now;
  }

  records[idx] = updated;
  save(records);
  return { updated, allSigned };
}

/** Count pending reopen requests for a given empNo. */
export function countPendingReopenForSigner(empNo: string): number {
  return getReopenRequestsAwaitingSignature(empNo).length;
}

/**
 * Reject a reopen request — the requesting empNo's slot is used to identify who rejected.
 * Marks the whole request as rejected (cannot be reopened further from the same request).
 */
export function rejectReopenRequest(
  requestId: string,
  empNo: string,
  empName: string,
  reason: string,
): ReopenRequest | null {
  const records = load();
  const idx = records.findIndex(r => r.id === requestId);
  if (idx === -1) return null;
  const updated: ReopenRequest = {
    ...records[idx],
    rejected: true,
    rejectedBy: empNo,
    rejectedByName: empName,
    rejectedReason: reason,
    rejectedAt: new Date().toISOString(),
  };
  records[idx] = updated;
  save(records);
  return updated;
}

/**
 * Reroute a slot to a different employee (e.g., if the assigned authority is unavailable).
 * The old slot is replaced with the new employee.
 */
export function rerouteReopenSlot(
  requestId: string,
  fromEmpNo: string,
  toEmpNo: string,
  toEmpName: string,
): ReopenRequest | null {
  const records = load();
  const idx = records.findIndex(r => r.id === requestId);
  if (idx === -1) return null;
  const updated: ReopenRequest = {
    ...records[idx],
    slots: records[idx].slots.map(s =>
      s.empNo === fromEmpNo && !s.signed
        ? { ...s, empNo: toEmpNo, empName: toEmpName, signed: false, signedAt: null }
        : s
    ),
  };
  records[idx] = updated;
  save(records);
  return updated;
}

