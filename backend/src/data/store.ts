/**
 * store.ts — In-memory data store for the Suggestion Management System.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  DB-READY ARCHITECTURE                                                   │
 * │                                                                          │
 * │  Every public function here mirrors a SQL operation. When you add a      │
 * │  real PostgreSQL (or any DB), create a new file (e.g. pgStore.ts) that   │
 * │  implements the same function signatures using db.query(). Then swap     │
 * │  the import in each controller — zero other changes needed.              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Seed data is split by plant to prevent git conflicts between teams:
 *   - data/seed/bidp.ts  ← BidP (PLT-01) team owns this file
 *   - data/seed/jap.ts   ← JaP  (PLT-02) team owns this file
 *
 * Runtime data isolation: every query function accepts a plantCode parameter.
 * Controllers always pass req.user!.plantCode, so users only ever see their
 * own plant's data.
 */

import bcrypt from "bcryptjs";
import { bidpEmployees, bidpSuggestions, bidpDeptStats, bidpCategoryStats, bidpAuthorityAssignments } from "./seed/bidp";
import { japEmployees, japSuggestions, japDeptStats, japCategoryStats, japAuthorityAssignments } from "./seed/jap";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Employee {
  employee_no: string;
  name: string;
  department: string;
  area: string;
  plant_code: string;
  role: "employee" | "admin";
  ntid: string;
  email: string;
  password_hash: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_name?: string;
  is_active: boolean;
}

export interface Suggestion {
  id: number;
  suggestion_no: string;
  type: string;
  type_code: string;
  subject: string;
  category: string;
  status: string;
  date: string;
  range: string;
  suggestion_for: string;
  group_suggestion: string;
  other_info?: string;
  employee_no: string;
  employee_name: string;
  department: string;
  pending_with?: string;
  days_pending: number;
  plant_code: string;
  present_method?: string;
  proposed_method?: string;
  benefits?: string;
  attachment?: string;
  award_amount?: number;
  award_category?: string;
  award_date?: string;
  form_data?: Record<string, any>;
  rejection_reason?: string;
  rejected_by?: string;
  rejected_by_name?: string;
  rejected_on?: string;
  implemented_on?: string;
  // ─── Approval pipeline fields ────────────────────────
  assigned_flm?: string;
  approval_level?: string;
  evaluated_by?: string;
  evaluated_by_name?: string;
  evaluated_on?: string;
  approved_by_manager?: string;
  approved_by_manager_name?: string;
  approved_by_manager_on?: string;
  approved_by_bps_admin?: string;
  approved_by_bps_admin_name?: string;
  approved_by_bps_admin_on?: string;
  approved_by_bps_dh?: string;
  approved_by_bps_dh_name?: string;
  approved_by_bps_dh_on?: string;
  send_back_history?: Array<{
    from: string;
    fromName: string;
    to: string;
    reason: string;
    date: string;
  }>;
  // Audit trail — complete lifecycle log
  audit_trail?: AuditEntry[];
  created_at: string;
  updated_at: string;
}

/** A single audit log entry */
export interface AuditEntry {
  id: string;
  action: string;
  performed_by: string;
  performed_by_name: string;
  performed_by_dept?: string;
  role?: string;
  date: string;
  from_status?: string;
  to_status?: string;
  comments?: string;
  award_amount?: number;
  forwarded_to?: string;
  attachments?: Array<{ name: string; type: string; url?: string }>;
  metadata?: Record<string, any>;
}

export interface Category {
  id: number;
  plant_code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface DeptMapping {
  id: number;
  plant_code: string;
  dept_name: string;
  mapped_name: string;
}

export interface AuthorityAssignment {
  id: number;
  plant_code: string;
  employee_no: string;
  name: string;
  department: string;
  role: string;
  type: string;
  email: string;
  ntid: string;
}

export interface Notification {
  id: number;
  user_id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  created_at: string;
}

export interface Award {
  id: number;
  suggestion_id: number;
  suggestion_no: string;
  employee_no: string;
  employee_name: string;
  department: string;
  plant_code: string;
  amount: number;
  category: string;
  award_date: string;
  neft_status: "Pending" | "Processed" | "Failed";
  neft_date?: string;
}

export interface DeptStat {
  dept: string;
  total: number;
  implemented: number;
  pending: number;
  rejected: number;
  participation: number;
}

export interface CategoryStat {
  name: string;
  value: number;
}

// ─── Auto-increment IDs ──────────────────────────────────────────────────────

let nextSuggestionId = 100;
let nextCategoryId = 100;
let nextDeptMappingId = 100;
let nextAuthorityId = 100;
let nextNotificationId = 100;
let nextAwardId = 100;

// ─── Suggestion No counters ──────────────────────────────────────────────────

const suggestionCounters: Record<string, number> = {
  SSS: 40, SFC: 40, MIC: 10, DCP: 40, CTF: 15, JAP: 40,
};

// ─── TYPE maps ───────────────────────────────────────────────────────────────

const TYPE_CODE_TO_NAME: Record<string, string> = {
  SSS: "Simple Suggestion Scheme",
  SFC: "Shop Floor CIP",
  MIC: "My Idea Card",
  DCP: "Daily CIP",
  CTF: "Cash The Flash",
  JAP: "Improvement Suggestion",
};

// ─── Default password for all seeded employees ───────────────────────────────
const DEFAULT_HASH = bcrypt.hashSync("password123", 10);

// ─── Data arrays (seeded from per-plant files) ────────────────────────────────

const employees: Employee[] = [
  ...bidpEmployees.map(e => ({ ...e, password_hash: DEFAULT_HASH })),
  ...japEmployees.map(e => ({ ...e, password_hash: DEFAULT_HASH })),
];

const suggestions: Suggestion[] = [
  ...(bidpSuggestions as unknown as Suggestion[]),
  ...(japSuggestions  as unknown as Suggestion[]),
];
nextSuggestionId = suggestions.reduce((max, s) => Math.max(max, s.id), 0) + 1;

// ── Default categories seeded for both plants ────────────────────────────────
const DEFAULT_CATEGORIES = [
  "Safety",
  "Quality",
  "Productivity",
  "Cost Reduction",
  "Environment",
  "5S / Housekeeping",
  "Ergonomics",
  "Energy Saving",
];

const categories: Category[] = [];
let _catSeedId = 1;
for (const plantCode of ["PLT-01", "PLT-02"]) {
  for (const name of DEFAULT_CATEGORIES) {
    categories.push({
      id: _catSeedId++,
      plant_code: plantCode,
      name,
      description: "",
      is_active: true,
    });
  }
}
nextCategoryId = _catSeedId;

const deptMappings: DeptMapping[] = [];
nextDeptMappingId = 9;

const authorityAssignments: AuthorityAssignment[] = [
  ...japAuthorityAssignments,
  ...bidpAuthorityAssignments,
];
nextAuthorityId = 200;

const notifications: Notification[] = [];
nextNotificationId = 8;

const awards: Award[] = suggestions
  .filter(s => s.award_amount)
  .map((s, i) => ({
    id: i + 1,
    suggestion_id: s.id,
    suggestion_no: s.suggestion_no,
    employee_no: s.employee_no,
    employee_name: s.employee_name,
    department: s.department,
    plant_code: s.plant_code,
    amount: s.award_amount!,
    category: s.award_category || "Bronze",
    award_date: s.award_date || s.date,
    neft_status: "Pending" as const,
  }));
nextAwardId = awards.length + 1;

// Per-plant stats — add a new plant's stats here when onboarding a new plant
const deptStatsByPlant: Record<string, DeptStat[]> = {
  "PLT-01": bidpDeptStats,
  "PLT-02": japDeptStats,
};
const categoryStatsByPlant: Record<string, CategoryStat[]> = {
  "PLT-01": bidpCategoryStats,
  "PLT-02": japCategoryStats,
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC QUERY FUNCTIONS — swap these with db.query() to connect a real DB
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function findEmployeeByNo(empNo: string): Employee | undefined {
  return employees.find(e => e.employee_no === empNo && e.is_active);
}

// ─── Employees ────────────────────────────────────────────────────────────────

export function getEmployees(filters?: { plantCode?: string; role?: string }): Omit<Employee, "password_hash">[] {
  let result = employees.filter(e => e.is_active);
  if (filters?.plantCode) result = result.filter(e => e.plant_code === filters.plantCode);
  if (filters?.role) result = result.filter(e => e.role === filters.role);
  return result.map(({ password_hash, ...rest }) => rest);
}

export function getEmployee(empNo: string, plantCode?: string): Omit<Employee, "password_hash"> | undefined {
  const e = employees.find(emp => emp.employee_no === empNo && (!plantCode || emp.plant_code === plantCode));
  if (!e) return undefined;
  const { password_hash, ...rest } = e;
  return rest;
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

/** Converts internal store Suggestion → frontend-compatible shape */
function toFrontendSuggestion(s: Suggestion): Record<string, any> {
  return {
    id: String(s.id),
    suggestionNo: s.suggestion_no,
    plantCode: s.plant_code,
    subject: s.subject,
    type: s.type,
    category: s.category,
    status: s.status,
    date: s.date,
    pendingWith: s.pending_with,
    daysPending: s.days_pending,
    plantCode: s.plant_code,
    suggestionFor: s.suggestion_for,
    employeeNo: s.employee_no,
    employeeName: s.employee_name,
    department: s.department,
    range: s.range,
    presentMethod: s.present_method,
    proposedMethod: s.proposed_method,
    benefits: s.benefits,
    attachment: s.attachment,
    awardAmount: s.award_amount,
    awardCategory: s.award_category,
    awardDate: s.award_date,
    formData: s.form_data,
    rejectionReason: s.rejection_reason,
    rejectedBy:      s.rejected_by,
    rejectedByName:  s.rejected_by_name,
    rejectedOn:      s.rejected_on,
    implementedOn:   s.implemented_on,
    // Approval pipeline
    assignedFlm:           s.assigned_flm,
    approvalLevel:         s.approval_level,
    evaluatedBy:           s.evaluated_by,
    evaluatedByName:       s.evaluated_by_name,
    evaluatedOn:           s.evaluated_on,
    approvedByManager:     s.approved_by_manager,
    approvedByManagerName: s.approved_by_manager_name,
    approvedByManagerOn:   s.approved_by_manager_on,
    approvedByBpsAdmin:    s.approved_by_bps_admin,
    approvedByBpsAdminName:s.approved_by_bps_admin_name,
    approvedByBpsAdminOn:  s.approved_by_bps_admin_on,
    approvedByBpsDh:       s.approved_by_bps_dh,
    approvedByBpsDhName:   s.approved_by_bps_dh_name,
    approvedByBpsDhOn:     s.approved_by_bps_dh_on,
    sendBackHistory:       s.send_back_history,
    auditTrail:            s.audit_trail?.map(a => ({
      id: a.id,
      action: a.action,
      performedBy: a.performed_by,
      performedByName: a.performed_by_name,
      performedByDept: a.performed_by_dept,
      role: a.role,
      date: a.date,
      fromStatus: a.from_status,
      toStatus: a.to_status,
      comments: a.comments,
      awardAmount: a.award_amount,
      forwardedTo: a.forwarded_to,
      attachments: a.attachments,
      metadata: a.metadata,
    })),
  };
}

export function getSuggestions(filters?: {
  status?: string; type?: string; employeeNo?: string;
  plantCode?: string; assignedFlm?: string; page?: number; limit?: number;
}): { data: Record<string, any>[]; total: number; page: number; limit: number } {
  let result = [...suggestions];
  if (filters?.plantCode) result = result.filter(s => s.plant_code === filters.plantCode);
  if (filters?.status) {
    const statuses = filters.status.split(",");
    result = result.filter(s => statuses.includes(s.status));
  }
  if (filters?.type) result = result.filter(s => s.type_code === filters.type || s.type === filters.type);
  if (filters?.employeeNo) result = result.filter(s => s.employee_no === filters.employeeNo);
  if (filters?.assignedFlm) result = result.filter(s => s.assigned_flm === filters.assignedFlm);

  const total = result.length;
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  const offset = (page - 1) * limit;
  const paged = result
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(offset, offset + limit);

  return { data: paged.map(toFrontendSuggestion), total, page, limit };
}

export function getSuggestionById(id: number | string, plantCode?: string): Record<string, any> | undefined {
  const s = suggestions.find(s => s.id === Number(id));
  if (!s) return undefined;
  if (plantCode && s.plant_code !== plantCode) return undefined;
  return toFrontendSuggestion(s);
}

export function createSuggestion(data: {
  typeCode: string; subject?: string; category?: string; status?: string;
  suggestionDate?: string; range?: string; suggestionFor?: string;
  groupSuggestion?: string; otherInfo?: string; employeeNo: string;
  pendingWith?: string; plantCode?: string; presentMethod?: string;
  proposedMethod?: string; benefits?: string; formData?: Record<string, any>;
  assignedFlm?: string; approvalLevel?: string;
}): Record<string, any> {
  const typeCode = data.typeCode;
  const typeName = TYPE_CODE_TO_NAME[typeCode] || typeCode;
  const year = new Date().getFullYear();
  const counter = (suggestionCounters[typeCode] ?? 0) + 1;
  suggestionCounters[typeCode] = counter;
  const suggestion_no = `${typeCode}-${year}-${String(counter).padStart(3, "0")}`;

  const emp = employees.find(e => e.employee_no === data.employeeNo);
  const id = nextSuggestionId++;
  const now = new Date().toISOString();

  const entry: Suggestion = {
    id,
    suggestion_no,
    type: typeName,
    type_code: typeCode,
    subject: data.subject || "",
    category: data.category || "",
    status: data.status || "Draft",
    date: data.suggestionDate || now.split("T")[0],
    range: data.range || "",
    suggestion_for: data.suggestionFor || "self",
    group_suggestion: data.groupSuggestion || "no",
    other_info: data.otherInfo,
    employee_no: data.employeeNo,
    employee_name: emp?.name || "",
    department: emp?.department || "",
    pending_with: data.pendingWith,
    days_pending: 0,
    plant_code: data.plantCode || emp?.plant_code || "PLT-01",
    present_method: data.presentMethod,
    proposed_method: data.proposedMethod,
    benefits: data.benefits,
    form_data: data.formData,
    assigned_flm: data.assignedFlm,
    approval_level: data.approvalLevel,
    created_at: now,
    updated_at: now,
  };
  suggestions.unshift(entry);
  return toFrontendSuggestion(entry);
}

export function updateSuggestion(id: number | string, data: Record<string, any>, plantCode?: string): Record<string, any> | undefined {
  const idx = suggestions.findIndex(s => s.id === Number(id));
  if (idx === -1) return undefined;
  const s = suggestions[idx];
  if (plantCode && s.plant_code !== plantCode) return undefined;

  if (data.subject !== undefined)         s.subject = data.subject;
  if (data.category !== undefined)        s.category = data.category;
  if (data.status !== undefined)          s.status = data.status;
  if (data.range !== undefined)           s.range = data.range;
  if (data.suggestionFor !== undefined)   s.suggestion_for = data.suggestionFor;
  if (data.groupSuggestion !== undefined) s.group_suggestion = data.groupSuggestion;
  if (data.otherInfo !== undefined)       s.other_info = data.otherInfo;
  if (data.pendingWith !== undefined)     s.pending_with = data.pendingWith;
  if (data.daysPending !== undefined)     s.days_pending = data.daysPending;
  if (data.presentMethod !== undefined)   s.present_method = data.presentMethod;
  if (data.proposedMethod !== undefined)  s.proposed_method = data.proposedMethod;
  if (data.benefits !== undefined)        s.benefits = data.benefits;
  if (data.formData !== undefined)        s.form_data = data.formData;
  // Award fields
  if (data.awardAmount !== undefined)     s.award_amount = data.awardAmount;
  if (data.awardCategory !== undefined)   s.award_category = data.awardCategory;
  if (data.awardDate !== undefined)       s.award_date = data.awardDate;
  // Rejection fields
  if (data.rejectionReason !== undefined) s.rejection_reason = data.rejectionReason;
  if (data.rejectedBy !== undefined)      s.rejected_by = data.rejectedBy;
  if (data.rejectedByName !== undefined)  s.rejected_by_name = data.rejectedByName;
  if (data.rejectedOn !== undefined)      s.rejected_on = data.rejectedOn;
  // Approval pipeline fields
  if (data.assignedFlm !== undefined)           s.assigned_flm = data.assignedFlm;
  if (data.approvalLevel !== undefined)         s.approval_level = data.approvalLevel;
  if (data.evaluatedBy !== undefined)           s.evaluated_by = data.evaluatedBy;
  if (data.evaluatedByName !== undefined)       s.evaluated_by_name = data.evaluatedByName;
  if (data.evaluatedOn !== undefined)           s.evaluated_on = data.evaluatedOn;
  if (data.approvedByManager !== undefined)     s.approved_by_manager = data.approvedByManager;
  if (data.approvedByManagerName !== undefined) s.approved_by_manager_name = data.approvedByManagerName;
  if (data.approvedByManagerOn !== undefined)   s.approved_by_manager_on = data.approvedByManagerOn;
  if (data.approvedByBpsAdmin !== undefined)    s.approved_by_bps_admin = data.approvedByBpsAdmin;
  if (data.approvedByBpsAdminName !== undefined)s.approved_by_bps_admin_name = data.approvedByBpsAdminName;
  if (data.approvedByBpsAdminOn !== undefined)  s.approved_by_bps_admin_on = data.approvedByBpsAdminOn;
  if (data.approvedByBpsDh !== undefined)       s.approved_by_bps_dh = data.approvedByBpsDh;
  if (data.approvedByBpsDhName !== undefined)   s.approved_by_bps_dh_name = data.approvedByBpsDhName;
  if (data.approvedByBpsDhOn !== undefined)     s.approved_by_bps_dh_on = data.approvedByBpsDhOn;
  if (data.sendBackHistory !== undefined)       s.send_back_history = data.sendBackHistory;
  if (data.auditTrail !== undefined)            s.audit_trail = data.auditTrail.map((a: any) => ({
    id: a.id,
    action: a.action,
    performed_by: a.performedBy,
    performed_by_name: a.performedByName,
    performed_by_dept: a.performedByDept,
    role: a.role,
    date: a.date,
    from_status: a.fromStatus,
    to_status: a.toStatus,
    comments: a.comments,
    award_amount: a.awardAmount,
    forwarded_to: a.forwardedTo,
    attachments: a.attachments,
    metadata: a.metadata,
  }));
  s.updated_at = new Date().toISOString();

  return toFrontendSuggestion(s);
}

export function patchSuggestionStatus(
  id: number | string,
  status: string,
  pendingWith?: string,
  meta?: {
    rejectionReason?: string;
    rejectedBy?: string;
    rejectedByName?: string;
    rejectedOn?: string;
  },
  plantCode?: string
): Record<string, any> | undefined {
  const s = suggestions.find(s => s.id === Number(id));
  if (!s) return undefined;
  if (plantCode && s.plant_code !== plantCode) return undefined;
  s.status = status;
  if (pendingWith !== undefined) s.pending_with = pendingWith;
  if (meta?.rejectionReason !== undefined) s.rejection_reason = meta.rejectionReason;
  if (meta?.rejectedBy     !== undefined) s.rejected_by       = meta.rejectedBy;
  if (meta?.rejectedByName !== undefined) s.rejected_by_name  = meta.rejectedByName;
  if (meta?.rejectedOn     !== undefined) s.rejected_on       = meta.rejectedOn;
  s.updated_at = new Date().toISOString();
  return toFrontendSuggestion(s);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function getCategories(plantCode?: string): Category[] {
  let result = categories.filter(c => c.is_active);
  if (plantCode) result = result.filter(c => c.plant_code === plantCode);
  return result;
}

export function addCategory(plantCode: string, name: string, description?: string): Category {
  const entry: Category = { id: nextCategoryId++, plant_code: plantCode, name, description: description || "", is_active: true };
  categories.push(entry);
  return entry;
}

export function deleteCategory(id: number, plantCode?: string): boolean {
  const c = categories.find(c => c.id === id);
  if (!c) return false;
  if (plantCode && c.plant_code !== plantCode) return false;
  c.is_active = false;
  return true;
}

// ─── Dept Mappings ────────────────────────────────────────────────────────────

export function getDeptMappings(plantCode?: string): DeptMapping[] {
  let result = [...deptMappings].sort((a, b) => a.dept_name.localeCompare(b.dept_name));
  if (plantCode) result = result.filter(d => d.plant_code === plantCode);
  return result;
}

export function addDeptMapping(plantCode: string, deptName: string, mappedName: string): DeptMapping {
  const entry: DeptMapping = { id: nextDeptMappingId++, plant_code: plantCode, dept_name: deptName, mapped_name: mappedName };
  deptMappings.push(entry);
  return entry;
}

export function updateDeptMapping(id: number, mappedName: string): DeptMapping | null {
  const entry = deptMappings.find(d => d.id === id);
  if (!entry) return null;
  entry.mapped_name = mappedName;
  return entry;
}

export function deleteDeptMapping(id: number): boolean {
  const idx = deptMappings.findIndex(d => d.id === id);
  if (idx === -1) return false;
  deptMappings.splice(idx, 1);
  return true;
}

// ─── Authority Assignments ────────────────────────────────────────────────────

export function getAuthorityAssignments(filters?: { plantCode?: string; role?: string }): AuthorityAssignment[] {
  let result = [...authorityAssignments];
  if (filters?.plantCode) result = result.filter(a => a.plant_code === filters.plantCode);
  if (filters?.role) result = result.filter(a => a.role === filters.role);
  return result;
}

export function addAuthorityAssignment(data: Omit<AuthorityAssignment, "id">): AuthorityAssignment {
  const existingIdx = authorityAssignments.findIndex(
    a => a.plant_code === data.plant_code && a.employee_no === data.employee_no && a.role === data.role
  );
  if (existingIdx !== -1) {
    authorityAssignments[existingIdx] = { ...authorityAssignments[existingIdx], ...data };
    return authorityAssignments[existingIdx];
  }
  const entry = { ...data, id: nextAuthorityId++ };
  authorityAssignments.push(entry);
  return entry;
}

export function deleteAuthorityAssignment(id: number): boolean {
  const idx = authorityAssignments.findIndex(a => a.id === id);
  if (idx === -1) return false;
  authorityAssignments.splice(idx, 1);
  return true;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function getNotifications(userId: string, unreadOnly?: boolean): Notification[] {
  let result = notifications.filter(n => n.user_id === userId);
  if (unreadOnly) result = result.filter(n => !n.is_read);
  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100);
}

export function addNotification(userId: string, message: string, type: Notification["type"] = "info"): Notification {
  const entry: Notification = {
    id: nextNotificationId++, user_id: userId, message, type, is_read: false,
    created_at: new Date().toISOString(),
  };
  notifications.unshift(entry);
  return entry;
}

export function markNotificationRead(id: number, userId: string): Notification | undefined {
  const n = notifications.find(n => n.id === id && n.user_id === userId);
  if (!n) return undefined;
  n.is_read = true;
  return n;
}

export function markAllNotificationsRead(userId: string): void {
  notifications.filter(n => n.user_id === userId).forEach(n => { n.is_read = true; });
}

// ─── Awards ───────────────────────────────────────────────────────────────────

export function getAwards(filters?: { employeeNo?: string; neftStatus?: string; plantCode?: string }): Award[] {
  let result = [...awards];
  if (filters?.plantCode) result = result.filter(a => a.plant_code === filters.plantCode);
  if (filters?.employeeNo) result = result.filter(a => a.employee_no === filters.employeeNo);
  if (filters?.neftStatus) result = result.filter(a => a.neft_status === filters.neftStatus);
  return result.sort((a, b) => new Date(b.award_date).getTime() - new Date(a.award_date).getTime());
}

export function addAward(data: {
  suggestionId: number; suggestionNo: string; employeeNo: string;
  amount: number; category: string; awardDate: string;
}): Award {
  const emp = employees.find(e => e.employee_no === data.employeeNo);
  const suggestion = suggestions.find(s => s.id === data.suggestionId);
  const entry: Award = {
    id: nextAwardId++,
    suggestion_id: data.suggestionId,
    suggestion_no: data.suggestionNo,
    employee_no: data.employeeNo,
    employee_name: emp?.name || "",
    department: emp?.department || "",
    plant_code: suggestion?.plant_code || emp?.plant_code || "PLT-01",
    amount: data.amount,
    category: data.category,
    award_date: data.awardDate,
    neft_status: "Pending",
  };
  awards.push(entry);
  // Also update the suggestion
  const s = suggestions.find(s => s.id === data.suggestionId);
  if (s) {
    s.status = "Approved";
    s.award_amount = data.amount;
    s.award_category = data.category;
    s.award_date = data.awardDate;
  }
  return entry;
}

export function updateNeftStatus(id: number, neftStatus: "Pending" | "Processed" | "Failed", neftDate?: string): Award | undefined {
  const a = awards.find(a => a.id === id);
  if (!a) return undefined;
  a.neft_status = neftStatus;
  if (neftDate) a.neft_date = neftDate;
  return a;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function getReportSummary(plantCode?: string) {
  const scope = plantCode ? suggestions.filter(s => s.plant_code === plantCode) : suggestions;
  const nonDraft = scope.filter(s => s.status !== "Draft");
  const scopeAwards = plantCode ? awards.filter(a => a.plant_code === plantCode) : awards;
  return {
    total: nonDraft.length,
    submitted: scope.filter(s => s.status === "Submitted").length,
    approved: scope.filter(s => ["Approved", "Implemented"].includes(s.status)).length,
    pending: scope.filter(s => ["Pending FLM", "Pending BPS", "Under Evaluation", "Submitted"].includes(s.status)).length,
    totalAwardAmount: scopeAwards.reduce((sum, a) => sum + a.amount, 0),
  };
}

export function getDeptStats(plantCode?: string): DeptStat[] {
  return deptStatsByPlant[plantCode ?? ""] ?? [];
}

export function getCategoryStats(plantCode?: string): CategoryStat[] {
  return categoryStatsByPlant[plantCode ?? ""] ?? [];
}

export function getMemoReport(monthNum: number, year: number, typeName?: string, plantCode?: string) {
  return suggestions
    .filter(s => {
      const d = new Date(s.date);
      const matchMonth = d.getMonth() + 1 === monthNum && d.getFullYear() === year;
      const matchType = !typeName || typeName === "all" || s.type === typeName;
      const matchPlant = !plantCode || s.plant_code === plantCode;
      return matchMonth && matchType && matchPlant;
    })
    .map(s => ({
      id: s.id,
      suggestion_no: s.suggestion_no,
      employee_name: s.employee_name,
      employee_no: s.employee_no,
      department: s.department,
      type: s.type,
      status: s.status,
      submitted_date: s.date,
      evaluated_date: s.award_date,
      award_amount: s.award_amount,
      remarks:
        s.status === "Approved"     ? "Award sanctioned" :
        s.status === "Implemented"  ? "Completed & awarded" :
        s.status === "Rejected"     ? "Not feasible" : "Under process",
    }));
}
