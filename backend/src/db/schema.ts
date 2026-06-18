// ─────────────────────────────────────────────────────────────────────────────
//  TypeScript types mirroring every database table in DATA_MODEL.md
// ─────────────────────────────────────────────────────────────────────────────

export interface Plant {
  plant_code: string;
  name: string;
  location?: string;
  created_at: Date;
}

export interface Employee {
  employee_no: string;
  name: string;
  department: string;
  area?: string;
  plant_code: string;
  role: "employee" | "admin";
  ntid: string;
  email: string;
  password_hash: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_name?: string;
  is_active: boolean;
  created_at: Date;
}

export interface SuggestionType {
  id: number;
  code: string; // SSS | SFC | MIC | DCP | CTF
  name: string;
  description?: string;
}

export interface Category {
  id: number;
  plant_code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
}

export type SuggestionStatus =
  | "Draft"
  | "Submitted"
  | "Pending FLM"
  | "Pending BPS"
  | "Under Evaluation"
  | "Approved"
  | "Rejected"
  | "Implemented";

export interface Suggestion {
  id: number;
  suggestion_no: string;
  type_code: string;
  subject?: string;
  category?: string;
  status: SuggestionStatus;
  suggestion_date: Date;
  range: string;
  suggestion_for: "self" | "behalf";
  group_suggestion: "yes" | "no";
  other_info?: string;
  employee_no: string;
  pending_with?: string;
  days_pending: number;
  plant_code?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SimpleSuggestionDetail {
  id: number;
  suggestion_id: number;
  present_method: string;
  proposed_method: string;
  benefits: string;
  flm: string;
}

export interface ShopFloorCIPDetail {
  id: number;
  suggestion_id: number;
  date_of_implementation: Date;
  kaizen_theme: string;
  problem_status: string;
  before_improvement: string;
  after_improvement: string;
  benefits: string;
  root_cause_identification: string;
  standardization: string;
  root_cause: string;
  idea_to_eliminate: string;
  action_taken: string;
  horizontal_deployment: number;
  moderator_emp_no: string;
}

export interface CIPTeamMember {
  id: number;
  suggestion_id: number;
  employee_no: string;
}

export interface MyIdeaCardDetail {
  id: number;
  suggestion_id: number;
  date_of_implementation: Date;
  description_problem: string;
  description_improvement: string;
  benefits: string;
  flm: string;
}

export interface DailyCIPDetail {
  id: number;
  suggestion_id: number;
  date_of_implementation: Date;
  workshop?: string;
  machine_no_area: string;
  suggestion_description: string;
  action_taken: string;
}

export interface CashTheFlashDetail {
  id: number;
  suggestion_id: number;
  present_method: string;
  proposed_method: string;
  benefits: string;
  suggestor_name?: string;
  share_percent?: number;
  flm: string;
}

export interface Attachment {
  id: number;
  suggestion_id: number;
  file_name: string;
  file_type?: string;
  file_size?: number;
  storage_path: string;
  is_photo_before: boolean;
  is_photo_after: boolean;
  uploaded_at: Date;
}

export type AwardCategory = "Bronze" | "Silver" | "Gold" | "Platinum";
export type NeftStatus = "Pending" | "Processed" | "Failed";

export interface Award {
  id: number;
  suggestion_id: number;
  suggestion_no: string;
  employee_no: string;
  amount: number;
  category: AwardCategory;
  award_date: Date;
  neft_status: NeftStatus;
  neft_date?: Date;
  created_at: Date;
}

export interface AuthorityAssignment {
  id: number;
  plant_code: string;
  employee_no: string;
  name: string;
  department?: string;
  role: "FLM" | "BPS" | "Admin";
  type: "Internal" | "External";
  email?: string;
  ntid?: string;
  assigned_at: Date;
}

export interface DepartmentMapping {
  id: number;
  dept_name: string;
  mapped_name: string;
  created_at: Date;
}

export interface TransferAuditLog {
  id: number;
  audit_id: string;
  suggestion_no: string;
  from_emp_no: string;
  to_emp_no: string;
  reason: string;
  transferred_by: string;
  transferred_at: Date;
}

export interface ReopenAuditLog {
  id: number;
  audit_id: string;
  suggestion_no: string;
  remark: string;
  reopened_by: string;
  reopened_at: Date;
}

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: number;
  user_id: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: Date;
}
