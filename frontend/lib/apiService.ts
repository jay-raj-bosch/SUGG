/**
 * apiService.ts — typed wrappers around every backend endpoint.
 *
 * Import individual functions rather than this whole module to keep bundles lean.
 */

import { api, setToken, clearToken } from "./api";
import type { Suggestion } from "./mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  employeeNo: string;
  name: string;
  department: string;
  area: string;
  plantCode: string;
  role: "employee" | "admin";
  ntid: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface PaginatedSuggestions {
  data: Suggestion[];
  total: number;
  page: number;
  limit: number;
}

/**
 * API response types below use snake_case to match the current Node.js backend.
 *
 * IMPORTANT FOR .NET BACKEND TEAM:
 *   When the .NET backend is live, configure camelCase serialization:
 *     builder.Services.AddControllers().AddJsonOptions(o =>
 *         o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);
 *
 *   Then rename these interface fields to camelCase in the same commit:
 *     employee_no → employeeNo
 *     plant_code  → plantCode
 *     dept_name   → deptName
 *     mapped_name → mappedName
 *     user_id     → userId
 *     is_read     → isRead
 *     created_at  → createdAt
 *     neft_status → neftStatus
 *     neft_date   → neftDate
 *     award_date  → awardDate
 *
 *   All consumer files that read these fields will also need the same rename
 *   (the compiler will flag every broken reference automatically).
 */

export interface Employee {
  employee_no: string;
  name: string;
  department: string;
  area?: string;
  plant_code: string;
  role: string;
  ntid: string;
  email: string;
}

export interface Category {
  id: number;
  plant_code: string;
  name: string;
  description?: string;
}

export interface DeptMapping {
  id: number;
  dept_name: string;
  mapped_name: string;
}

export interface AuthorityAssignment {
  id: number;
  plant_code: string;
  employee_no: string;
  name: string;
  department?: string;
  role: string;
  type: "Internal" | "External";
  email?: string;
  ntid?: string;
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
  employee_name?: string;
  department?: string;
  amount: number;
  category: "Bronze" | "Silver" | "Gold" | "Platinum";
  award_date: string;
  neft_status: "Pending" | "Processed" | "Failed";
  neft_date?: string;
}

export interface DeptStats {
  dept: string;
  total: number;
  implemented: number;
  pending: number;
  rejected: number;
  participation: number;
}

export interface CategoryStats {
  name: string;
  value: number;
}

export interface MemoEntry {
  id: number;
  suggestion_no: string;
  employee_name: string;
  employee_no: string;
  department: string;
  type: string;
  status: string;
  submitted_date: string;
  evaluated_date?: string;
  award_amount?: number;
  remarks: string;
}

export interface ReportSummary {
  total: number;
  submitted: number;
  approved: number;
  pending: number;
  totalAwardAmount: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Standard credential-based login.
 * POST /api/auth/login  →  { token, user }
 * Stores the returned JWT in localStorage["authToken"].
 */
export async function login(
  employeeNo: string,
  password: string,
  role: "employee" | "admin"
): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>("/auth/login", { employeeNo, password, role });
  setToken(data.token);
  return data;
}

/**
 * SSO token exchange.
 * Called after the SSO provider redirects back with an access token.
 * POST /api/auth/sso-exchange  →  { token, user }
 *
 * The .NET backend must:
 *  1. Validate the ssoAccessToken with the SSO provider (Azure AD / ADFS / etc.)
 *  2. Look up the employee record by the SSO identity (e.g. email / UPN)
 *  3. Return a new app-specific JWT: { employeeNo, name, role, plantCode }
 *
 * Stores the returned app JWT in localStorage["authToken"].
 */
export async function exchangeSsoToken(ssoAccessToken: string): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>("/auth/sso-exchange", { token: ssoAccessToken });
  setToken(data.token);
  return data;
}

/**
 * Restore an existing session by validating the stored JWT.
 * GET /api/auth/me  →  AuthUser
 * Throws ApiError(401) if the token is missing or expired.
 * Use this on page load instead of re-logging in.
 */
export async function restoreSession(): Promise<AuthUser> {
  return api.get<AuthUser>("/auth/me");
}

export async function logout(): Promise<void> {
  clearToken();
}

export async function getMe(): Promise<AuthUser> {
  return api.get<AuthUser>("/auth/me");
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

export interface SuggestionFilters {
  status?: string;
  type?: string;
  employeeNo?: string;
  /** Plant code — REQUIRED for strict plant isolation. Always pass this. */
  plantCode?: string;
  page?: number;
  limit?: number;
}

export async function fetchSuggestions(filters: SuggestionFilters = {}): Promise<PaginatedSuggestions> {
  const params = new URLSearchParams();
  if (filters.status)      params.set("status",      filters.status);
  if (filters.type)        params.set("type",         filters.type);
  if (filters.employeeNo)  params.set("employeeNo",   filters.employeeNo);
  if (filters.plantCode)   params.set("plantCode",    filters.plantCode);
  if (filters.page)        params.set("page",         String(filters.page));
  if (filters.limit)       params.set("limit",        String(filters.limit));
  const query = params.toString();
  return api.get<PaginatedSuggestions>(`/suggestions${query ? `?${query}` : ""}`);
}

export async function fetchSuggestion(id: string | number): Promise<Suggestion> {
  return api.get<Suggestion>(`/suggestions/${id}`);
}

export async function createSuggestion(payload: Record<string, unknown>): Promise<Suggestion> {
  return api.post<Suggestion>("/suggestions", payload);
}

export async function updateSuggestion(id: string | number, payload: Record<string, unknown>): Promise<Suggestion> {
  return api.put<Suggestion>(`/suggestions/${id}`, payload);
}

export async function patchSuggestionStatus(
  id: string | number,
  status: string,
  pendingWith?: string,
  meta?: {
    rejectionReason?: string;
    rejectedBy?: string;
    rejectedByName?: string;
    rejectedOn?: string;
  }
): Promise<Suggestion> {
  return api.patch<Suggestion>(`/suggestions/${id}/status`, { status, pendingWith, ...meta });
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function fetchEmployees(plantCode?: string, role?: string): Promise<Employee[]> {
  const params = new URLSearchParams();
  if (plantCode) params.set("plantCode", plantCode);
  if (role)      params.set("role", role);
  const query = params.toString();
  return api.get<Employee[]>(`/employees${query ? `?${query}` : ""}`);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(plantCode?: string): Promise<Category[]> {
  const query = plantCode ? `?plantCode=${plantCode}` : "";
  return api.get<Category[]>(`/categories${query}`);
}

export async function addCategory(plantCode: string, name: string, description?: string): Promise<Category> {
  return api.post<Category>("/categories", { plantCode, name, description });
}

export async function removeCategory(id: number): Promise<void> {
  return api.delete(`/categories/${id}`);
}

// ─── Dept Mappings ────────────────────────────────────────────────────────────

export async function fetchDeptMappings(): Promise<DeptMapping[]> {
  return api.get<DeptMapping[]>("/dept-mappings");
}

export async function addDeptMapping(deptName: string, mappedName: string): Promise<DeptMapping> {
  return api.post<DeptMapping>("/dept-mappings", { deptName, mappedName });
}

export async function updateDeptMapping(id: number, mappedName: string): Promise<DeptMapping> {
  return api.put<DeptMapping>(`/dept-mappings/${id}`, { mappedName });
}

export async function removeDeptMapping(id: number): Promise<void> {
  return api.delete(`/dept-mappings/${id}`);
}

// ─── Authority Assignments ────────────────────────────────────────────────────

export async function fetchAuthority(plantCode?: string, role?: string): Promise<AuthorityAssignment[]> {
  const params = new URLSearchParams();
  if (plantCode) params.set("plantCode", plantCode);
  if (role)      params.set("role", role);
  const query = params.toString();
  return api.get<AuthorityAssignment[]>(`/authority-assignments${query ? `?${query}` : ""}`);
}

export async function addAuthority(payload: Partial<AuthorityAssignment>): Promise<AuthorityAssignment> {
  return api.post<AuthorityAssignment>("/authority-assignments", payload);
}

export async function removeAuthority(id: number): Promise<void> {
  return api.delete(`/authority-assignments/${id}`);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
  return api.get<Notification[]>(`/notifications${unreadOnly ? "?unread=true" : ""}`);
}

export async function postNotification(userId: string, message: string, type = "info"): Promise<Notification> {
  return api.post<Notification>("/notifications", { userId, message, type });
}

export async function markNotificationRead(id: number): Promise<Notification> {
  return api.patch<Notification>(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  return api.patch("/notifications/read-all");
}

// ─── Awards ───────────────────────────────────────────────────────────────────

export async function fetchAwards(employeeNo?: string): Promise<Award[]> {
  const query = employeeNo ? `?employeeNo=${employeeNo}` : "";
  return api.get<Award[]>(`/awards${query}`);
}

export async function createAward(payload: {
  suggestionId: number;
  suggestionNo: string;
  employeeNo: string;
  amount: number;
  category: string;
  awardDate: string;
}): Promise<Award> {
  return api.post<Award>("/awards", payload);
}

export async function updateNeftStatus(
  id: number,
  neftStatus: "Pending" | "Processed" | "Failed",
  neftDate?: string
): Promise<Award> {
  return api.patch<Award>(`/awards/${id}/neft`, { neftStatus, neftDate });
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function fetchReportSummary(): Promise<ReportSummary> {
  return api.get<ReportSummary>("/reports/summary");
}

export async function fetchDeptStats(): Promise<DeptStats[]> {
  return api.get<DeptStats[]>("/reports/dept-stats");
}

export async function fetchCategoryStats(): Promise<CategoryStats[]> {
  return api.get<CategoryStats[]>("/reports/category-stats");
}

export async function fetchMemoReport(month: string, year: string, type: string): Promise<MemoEntry[]> {
  return api.get<MemoEntry[]>(`/reports/memo?month=${month}&year=${year}&type=${type}`);
}
