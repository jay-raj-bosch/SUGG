// BidP — Role Definitions
// Single source of truth for BidP role metadata and module access.
// Adding a new role only requires adding one entry here — every
// consumer (AuthContext, role-select screen, sidebar, route guard)
// reads from this list instead of hardcoding role checks.

export type BidpRole =
  | "employee"
  | "flm"
  | "manager"
  | "dept_general_manager"
  | "general_manager"
  | "bps_admin"
  | "bps_dh"
  | "vs_rc"
  | "ctg";

export interface BidpRoleDefinition {
  role: BidpRole;
  label: string;
  sublabel: string;
  name: string;
  employeeNo: string;
  department: string;
  description: string;
  /** Roles with hasAdminAccess=true get the Admin module in addition to the Employee module. */
  hasAdminAccess: boolean;
  /**
   * Optional allow-list of admin route segments (the part after "admin/",
   * e.g. "general-enquiry", "mis-report") this role may access.
   * Omit (undefined) to allow ALL admin pages. Roles with a restricted
   * list only see/reach those pages — every other admin page is hidden
   * from the sidebar and blocked by BidPAdminGuard.
   */
  allowedAdminPaths?: string[];
}

export const BIDP_ROLE_DEFINITIONS: BidpRoleDefinition[] = [
  {
    role: "employee",
    label: "Employee",
    sublabel: "ಉದ್ಯೋಗಿ",
    name: "Karthik",
    employeeNo: "30698665",
    department: "BIDP1/TEF",
    description: "Submit suggestions, view status & awards",
    hasAdminAccess: false,
  },
  {
    role: "flm",
    label: "FLM",
    sublabel: "First Line Manager",
    name: "Suresh M",
    employeeNo: "30698710",
    department: "BIDP2/QAL",
    description: "Review & evaluate suggestions from team",
    hasAdminAccess: false,
  },
  {
    role: "manager",
    label: "Manager",
    sublabel: "ವ್ಯವಸ್ಥಾಪಕ",
    name: "Anita Sharma",
    employeeNo: "30698702",
    department: "BIDP1/MNT",
    description: "Manage department suggestions & approvals",
    hasAdminAccess: false,
  },
  {
    role: "dept_general_manager",
    label: "Dept General Manager",
    sublabel: "Dept. GM",
    name: "Ramesh Iyer",
    employeeNo: "30698730",
    department: "BIDP1/MNT",
    description: "Departmental oversight of suggestions",
    hasAdminAccess: false,
  },
  {
    role: "general_manager",
    label: "General Manager",
    sublabel: "GM",
    name: "Lakshmi Rao",
    employeeNo: "30698731",
    department: "BIDP1/ADM",
    description: "Plant-wide oversight of suggestions",
    hasAdminAccess: false,
  },
  {
    role: "bps_admin",
    label: "BPS Admin",
    sublabel: "BPS Administrator",
    name: "Vijay Sharma",
    employeeNo: "30698720",
    department: "BIDP1/ADM",
    description: "Full admin access — assign authority, reports, awards",
    hasAdminAccess: true,
  },
  {
    role: "bps_dh",
    label: "BPS DH",
    sublabel: "Dept Head",
    name: "Priya Devi",
    employeeNo: "30698704",
    department: "BIDP1/SAF",
    description: "Department head approvals & oversight",
    hasAdminAccess: true,
  },
  {
    role: "vs_rc",
    label: "VS RC",
    sublabel: "Regional Coordinator",
    name: "Deepak Verma",
    employeeNo: "30698740",
    department: "BIDP1/ADM",
    description: "Employee module + General Enquiry & MIS Report only",
    hasAdminAccess: true,
    allowedAdminPaths: ["general-enquiry", "mis-report"],
  },
  {
    role: "ctg",
    label: "CTG",
    sublabel: "Cost Task Group",
    name: "Rajesh Kumar",
    employeeNo: "30698750",
    department: "BIDP1/FIN",
    description: "Evaluate Cash The Flash suggestions — calculate net savings & award",
    hasAdminAccess: false,
  },

];

const ROLE_LOOKUP: Partial<Record<string, BidpRoleDefinition>> = Object.fromEntries(
  BIDP_ROLE_DEFINITIONS.map(r => [r.role, r]),
);

export function getBidpRoleDefinition(role?: string | null): BidpRoleDefinition | undefined {
  return role ? ROLE_LOOKUP[role] : undefined;
}

/** Only roles with hasAdminAccess=true (currently BPS Admin & BPS DH) get the Admin module. */
export function bidpRoleHasAdminAccess(role?: string | null): boolean {
  return !!getBidpRoleDefinition(role)?.hasAdminAccess;
}

/**
 * Returns the allow-list of admin route segments for a role, or `null`
 * if the role may access every admin page (no restriction configured).
 */
export function getAllowedAdminPaths(role?: string | null): string[] | null {
  return getBidpRoleDefinition(role)?.allowedAdminPaths ?? null;
}

/** Whether a role may access a given admin route segment (e.g. "mis-report"). */
export function bidpRoleCanAccessAdminPath(role: string | null | undefined, path: string): boolean {
  const allowed = getAllowedAdminPaths(role);
  return allowed === null || allowed.includes(path);
}
