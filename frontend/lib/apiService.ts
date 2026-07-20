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
  page?: number;
  limit?: number;
}

export async function fetchSuggestions(plant: "bidp" | "jap", filters: SuggestionFilters = {}): Promise<PaginatedSuggestions> {
  const params = new URLSearchParams();
  if (filters.status)      params.set("status",      filters.status);
  if (filters.type)        params.set("type",         filters.type);
  if (filters.employeeNo)  params.set("employeeNo",   filters.employeeNo);
  if (filters.page)        params.set("page",         String(filters.page));
  if (filters.limit)       params.set("limit",        String(filters.limit));
  const query = params.toString();
  return api.get<PaginatedSuggestions>(`/${plant}/suggestions${query ? `?${query}` : ""}`);
}

export async function fetchSuggestion(plant: "bidp" | "jap", id: string | number): Promise<Suggestion> {
  return api.get<Suggestion>(`/${plant}/suggestions/${id}`);
}

export async function createSuggestion(plant: "bidp" | "jap", payload: Record<string, unknown>): Promise<Suggestion> {
  return api.post<Suggestion>(`/${plant}/suggestions`, payload);
}

export async function updateSuggestion(plant: "bidp" | "jap", id: string | number, payload: Record<string, unknown>): Promise<Suggestion> {
  return api.put<Suggestion>(`/${plant}/suggestions/${id}`, payload);
}

export async function patchSuggestionStatus(
  plant: "bidp" | "jap",
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
  return api.patch<Suggestion>(`/${plant}/suggestions/${id}/status`, { status, pendingWith, ...meta });
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function fetchEmployees(plant: "bidp" | "jap", role?: string): Promise<Employee[]> {
  const query = role ? `?role=${role}` : "";
  return api.get<Employee[]>(`/${plant}/employees${query}`);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(plant: "bidp" | "jap"): Promise<Category[]> {
  return api.get<Category[]>(`/${plant}/categories`);
}

export async function addCategory(plant: "bidp" | "jap", name: string, description?: string): Promise<Category> {
  return api.post<Category>(`/${plant}/categories`, { name, description });
}

export async function removeCategory(plant: "bidp" | "jap", id: number): Promise<void> {
  return api.delete(`/${plant}/categories/${id}`);
}

// ─── Dept Mappings ────────────────────────────────────────────────────────────

export async function fetchDeptMappings(plant: "bidp" | "jap"): Promise<DeptMapping[]> {
  return api.get<DeptMapping[]>(`/${plant}/dept-mappings`);
}

export async function addDeptMapping(plant: "bidp" | "jap", deptName: string, mappedName: string): Promise<DeptMapping> {
  return api.post<DeptMapping>(`/${plant}/dept-mappings`, { deptName, mappedName });
}

export async function updateDeptMapping(plant: "bidp" | "jap", id: number, mappedName: string): Promise<DeptMapping> {
  return api.put<DeptMapping>(`/${plant}/dept-mappings/${id}`, { mappedName });
}

export async function removeDeptMapping(plant: "bidp" | "jap", id: number): Promise<void> {
  return api.delete(`/${plant}/dept-mappings/${id}`);
}

// ─── Authority Assignments ────────────────────────────────────────────────────

export async function fetchAuthority(plant: "bidp" | "jap", role?: string): Promise<AuthorityAssignment[]> {
  const query = role ? `?role=${role}` : "";
  return api.get<AuthorityAssignment[]>(`/${plant}/authority-assignments${query}`);
}

export async function addAuthority(plant: "bidp" | "jap", payload: Partial<AuthorityAssignment>): Promise<AuthorityAssignment> {
  return api.post<AuthorityAssignment>(`/${plant}/authority-assignments`, payload);
}

export async function removeAuthority(plant: "bidp" | "jap", id: number): Promise<void> {
  return api.delete(`/${plant}/authority-assignments/${id}`);
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

// ─── Translation (voice capture — non-English speech → English) ─────────────

export interface TranslateResponse {
  translated: string;
  didTranslate: boolean;
}

/**
 * POST /api/translate — server-side proxy to the internal translation API.
 * `sourceLang`/`targetLang` are 2-letter codes (e.g. "hi", "en").
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang = "en",
): Promise<TranslateResponse> {
  return api.post<TranslateResponse>("/translate", { text, sourceLang, targetLang });
}

// ─── Awards ───────────────────────────────────────────────────────────────────

export async function fetchAwards(plant: "bidp" | "jap", employeeNo?: string): Promise<Award[]> {
  const query = employeeNo ? `?employeeNo=${employeeNo}` : "";
  return api.get<Award[]>(`/${plant}/awards${query}`);
}

export async function createAward(plant: "bidp" | "jap", payload: {
  suggestionId: number;
  suggestionNo: string;
  employeeNo: string;
  amount: number;
  category: string;
  awardDate: string;
}): Promise<Award> {
  return api.post<Award>(`/${plant}/awards`, payload);
}

export async function updateNeftStatus(
  plant: "bidp" | "jap",
  id: number,
  neftStatus: "Pending" | "Processed" | "Failed",
  neftDate?: string
): Promise<Award> {
  return api.patch<Award>(`/${plant}/awards/${id}/neft`, { neftStatus, neftDate });
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function fetchReportSummary(plant: "bidp" | "jap"): Promise<ReportSummary> {
  return api.get<ReportSummary>(`/${plant}/reports/summary`);
}

export async function fetchDeptStats(plant: "bidp" | "jap"): Promise<DeptStats[]> {
  return api.get<DeptStats[]>(`/${plant}/reports/dept-stats`);
}

export async function fetchCategoryStats(plant: "bidp" | "jap"): Promise<CategoryStats[]> {
  return api.get<CategoryStats[]>(`/${plant}/reports/category-stats`);
}

export async function fetchMemoReport(plant: "bidp" | "jap", month: string, year: string, type: string): Promise<MemoEntry[]> {
  return api.get<MemoEntry[]>(`/${plant}/reports/memo?month=${month}&year=${year}&type=${type}`);
}
