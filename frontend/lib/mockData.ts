// TODO [BACKEND]: This entire file should be replaced with real API calls
// TODO [BACKEND]: Database tables needed:
//   - employees (employeeNo, name, department, email, ntid, plantCode, bankDetails)
//   - suggestions (id, suggestionNo, subject, type, category, status, date, employeeNo, range, presentMethod, proposedMethod, benefits, pendingWith, daysPending)
//   - awards (id, suggestionNo, amount, category, date, neftStatus)
//   - categories (id, plantCode, name, description)
//   - department_mappings (id, deptName, mappedName)
//   - authority_assignments (id, plantCode, employeeNo, role, type)
//   - transfer_audit_log (id, suggestionNo, fromEmpNo, toEmpNo, reason, date)
//   - reopen_audit_log (id, suggestionNo, remark, date)
//   - notifications (id, userId, message, type, read, timestamp)
//   - memo_reports (generated views, not a table)
import type { AttachmentItem } from "./attachmentUtils";

export const suggestionTypes = [
  "Simple Suggestion Scheme",
  "Shop Floor CIP",
  "My Idea Card",
  "Daily CIP",
  "Cash The Flash",
];

export const categories = [
  "Safety",
  "Quality",
  "Productivity",
  "Cost Reduction",
  "Environment",
  "5S / Housekeeping",
  "Ergonomics",
  "Energy Saving",
  "Other",
];

export const ranges = [
  "TEF",
  "QAL",
  "MNT",
  "PRD",
  "SAF",
  "HRD",
  "LOG",
  "ENG",
];

export const departments = [
  "BIDP1/TEF",
  "BIDP2/QAL",
  "BIDP1/MNT",
  "BIDP3/PRD",
  "BIDP1/SAF",
  "BIDP1/HRD",
  "BIDP3/LOG",
];

export const statusColors: Record<string, string> = {
  Draft: "status-badge-draft",
  Submitted: "status-badge-pending",
  Pending: "status-badge-pending",
  "Under Evaluation": "status-badge-pending",
  Approved: "status-badge-approved",
  "Approved & Closed": "status-badge-approved",
  Rejected: "status-badge-rejected",
  Implemented: "status-badge-approved",
  "Pending FLM": "status-badge-pending",
  "Pending Manager": "status-badge-pending",
  "Pending BPS Admin": "status-badge-pending",
  "Pending BPS DH": "status-badge-pending",
  "Pending BPS": "status-badge-pending",
  "Sent Back": "status-badge-sent-back",
  Closed: "status-badge-draft",
  // JaP workflow statuses
  "Pending Feasibility Review": "status-badge-pending",
  "In Opinion Phase":           "status-badge-pending",
  "In Implementation":          "status-badge-pending",
  "In Evaluation":              "status-badge-pending",
  "In Award":                   "status-badge-approved",
  "Closed / Awarded":           "status-badge-approved",
  "On Hold":                        "status-badge-pending",
  Reopened:                     "status-badge-pending",
};

export interface Suggestion {
  /**
   * Unique identifier.
   * Mock data uses string IDs (e.g. "jap-17").
   * The .NET backend will return numeric IDs — both are accepted here.
   */
  id: string | number;
  suggestionNo: string;
  subject: string;
  type: string;
  /** Plant isolation field. Must be "PLT-01" (BidP) or "PLT-02" (JaP). */
  plantCode?: string;
  category: string;
  status: string;
  date: string;
  pendingWith?: string;
  daysPending?: number;
  pendingSince?: string;               // ISO date — when the suggestion entered its current pending state
  awardAmount?: number;
  awardCategory?: string;
  awardDate?: string;
  employeeNo?: string;
  employeeName?: string;
  department?: string;
  /** The department the suggestion is actually about (may differ from the submitter's own department) */
  suggestionDepartment?: string;
  range?: string;
  presentMethod?: string;
  proposedMethod?: string;
  benefits?: string;
  attachment?: string;                // legacy single filename or URL
  attachments?: AttachmentItem[];      // uploaded file list (images + docs)
  /**
   * Type-specific extended fields stored as a JSON blob.
   * JaP shape: see JapFormData in frontend/lib/types/formData.ts
   * BidP shape: see BidpFormData in frontend/lib/types/formData.ts
   * The .NET backend should store this as a jsonb column and return it as-is.
   */
  formData?: Record<string, unknown>;
  suggestionFor?: string;              // "self" | "others"
  // Rejection metadata
  rejectionReason?: string;
  rejectedBy?: string;                 // emp no of rejecting authority
  rejectedByName?: string;
  rejectedOn?: string;                 // ISO date
  implementedOn?: string;              // ISO date
  assignedFlm?: string;                // employee number of assigned FLM
  approvalLevel?: string;              // current pipeline level: FLM | Manager | BPS Admin | BPS DH
  evaluatedBy?: string;                // emp no
  evaluatedByName?: string;
  evaluatedOn?: string;                // ISO date
  approvedByManager?: string;
  approvedByManagerName?: string;
  approvedByManagerOn?: string;
  approvedByBpsAdmin?: string;
  approvedByBpsAdminName?: string;
  approvedByBpsAdminOn?: string;
  approvedByBpsDh?: string;
  approvedByBpsDhName?: string;
  approvedByBpsDhOn?: string;
  // Send-back history
  sendBackHistory?: Array<{
    from: string;        // level that sent back (e.g. "Manager")
    fromName: string;    // name of person who sent back
    to: string;          // level sent back to (e.g. "FLM" or "Employee")
    toName?: string;     // name of person it was sent back to
    reason: string;
    date: string;        // ISO date
    attachments?: Array<{ name: string; type: string; url?: string }>;  // files attached
  }>;
  // Reroute history — BPS Admin/BPS DH redirecting to a SPECIFIC person at ANY level
  // (distinct from send-back, which targets a previous LEVEL generically for revision)
  rerouteHistory?: Array<{
    fromLevel: string;    // level the reroute was initiated from
    toLevel: string;      // level rerouted to (e.g. "FLM" | "Manager" | "BPS Admin" | "BPS DH")
    toEmpNo: string;      // employee no of the specific person rerouted to
    toName: string;       // name of that person
    reason: string;
    date: string;         // ISO date
    reroutedBy: string;   // emp no of who performed the reroute
    reroutedByName: string;
  }>;
  // The specific person a suggestion is currently rerouted to (if any) — lets
  // the "my approvals" view surface it to exactly that person even if their
  // department doesn't match the suggestion's own department.
  rerouteTargetEmpNo?: string;
  rerouteTargetName?: string;
  // Reopen metadata
  reopenRemark?: string;               // admin remark when reopening rejected suggestion
  reopenedOn?: string;                 // ISO date
  reopenedBy?: string;                 // admin name
  // Transfer metadata
  transferHistory?: Array<{
    fromEmpNo: string;
    fromName: string;
    toEmpNo: string;
    toName: string;
    reason: string;
    date: string;       // ISO date
    transferredBy?: string; // admin name
  }>;
  originalEmployeeNo?: string;         // original suggestor before first transfer
  originalEmployeeName?: string;
  // Audit trail — complete lifecycle log for compliance
  auditTrail?: AuditEntry[];
}

/** A single audit log entry capturing an action on a suggestion */
export interface AuditEntry {
  id: string;                          // unique entry id (timestamp-based)
  action: "Submitted" | "Approved" | "Rejected" | "Sent Back" | "Rerouted" | "Reopened" | "Transferred" | "Closed" | "Evaluated" | "Updated" | "Created";
  performedBy: string;                 // employee no
  performedByName: string;             // full name
  performedByDept?: string;            // department
  role?: string;                       // FLM | Manager | BPS Admin | BPS DH | Employee | Admin
  date: string;                        // ISO datetime
  fromStatus?: string;                 // status before the action
  toStatus?: string;                   // status after the action
  comments?: string;                   // remarks / reason
  awardAmount?: number;                // award amount set at this stage
  forwardedTo?: string;                // who it was forwarded to (name or role)
  attachments?: Array<{ name: string; type: string; url?: string }>;  // files attached at this stage
  metadata?: Record<string, any>;      // extra data (evaluation scores, weightage, etc.)
}

export interface MockEmployee {
  employeeNo: string;
  name: string;
  department: string;
  category: string;
  email: string;
  ntid: string;
  plantCode: string;
}

export const mockEmployees: MockEmployee[] = [
  { employeeNo: "30698665", name: "Karthik", department: "BIDP1/TEF", category: "M&SS", email: "karthik@company.com", ntid: "karthik", plantCode: "PLT-01" },
  { employeeNo: "30698701", name: "Suresh Patil", department: "BIDP2/QAL", category: "M&SS", email: "suresh.patil@company.com", ntid: "spatil", plantCode: "PLT-01" },
  { employeeNo: "30698702", name: "Anita Sharma", department: "BIDP1/MNT", category: "M&SS", email: "anita.sharma@company.com", ntid: "asharma", plantCode: "PLT-01" },
  { employeeNo: "30698704", name: "Priya Devi", department: "BIDP1/SAF", category: "M&SS", email: "priya.devi@company.com", ntid: "pdevi", plantCode: "PLT-01" },
  { employeeNo: "30698706", name: "Kavitha Nair", department: "BIDP2/QAL", category: "M&SS", email: "kavitha.nair@company.com", ntid: "knair", plantCode: "PLT-01" },
  { employeeNo: "30698730", name: "Ramesh Iyer", department: "BIDP1/MNT", category: "M&SS", email: "ramesh.iyer@company.com", ntid: "riyer", plantCode: "PLT-01" },
  { employeeNo: "30698731", name: "Lakshmi Rao", department: "BIDP1/ADM", category: "M&SS", email: "lakshmi.rao@company.com", ntid: "lrao", plantCode: "PLT-01" },
  { employeeNo: "30698740", name: "Deepak Verma", department: "BIDP1/ADM", category: "M&SS", email: "deepak.verma@company.com", ntid: "dverma", plantCode: "PLT-01" },
  // Additional manpower — a few regular employees per department
  { employeeNo: "30698741", name: "Manoj Kumar",    department: "BIDP1/TEF", category: "M&SS", email: "manoj.kumar@company.com",    ntid: "mkumar",    plantCode: "PLT-01" },
  { employeeNo: "30698742", name: "Divya Reddy",    department: "BIDP1/TEF", category: "M&SS", email: "divya.reddy@company.com",    ntid: "dreddy",    plantCode: "PLT-01" },
  { employeeNo: "30698743", name: "Arun Prasad",    department: "BIDP2/QAL", category: "M&SS", email: "arun.prasad@company.com",    ntid: "aprasad",   plantCode: "PLT-01" },
  { employeeNo: "30698744", name: "Meera Krishnan", department: "BIDP2/QAL", category: "M&SS", email: "meera.krishnan@company.com", ntid: "mkrishnan", plantCode: "PLT-01" },
  { employeeNo: "30698745", name: "Sanjay Gupta",   department: "BIDP1/MNT", category: "M&SS", email: "sanjay.gupta@company.com",   ntid: "sgupta",    plantCode: "PLT-01" },
  { employeeNo: "30698746", name: "Pooja Mehta",    department: "BIDP1/MNT", category: "M&SS", email: "pooja.mehta@company.com",    ntid: "pmehta",    plantCode: "PLT-01" },
  { employeeNo: "30698747", name: "Vikas Singh",    department: "BIDP1/SAF", category: "M&SS", email: "vikas.singh@company.com",    ntid: "vsingh",    plantCode: "PLT-01" },
  { employeeNo: "30698748", name: "Nandini Rao",    department: "BIDP1/SAF", category: "M&SS", email: "nandini.rao@company.com",    ntid: "nrao",      plantCode: "PLT-01" },
  { employeeNo: "30698749", name: "Rahul Joshi",    department: "BIDP1/HRD", category: "M&SS", email: "rahul.joshi@company.com",    ntid: "rjoshi",    plantCode: "PLT-01" },
  { employeeNo: "30698750", name: "Swathi Menon",   department: "BIDP1/HRD", category: "M&SS", email: "swathi.menon@company.com",   ntid: "smenon",    plantCode: "PLT-01" },
  { employeeNo: "30698751", name: "Ashok Pillai",   department: "BIDP1/ADM", category: "M&SS", email: "ashok.pillai@company.com",   ntid: "apillai",   plantCode: "PLT-01" },
  { employeeNo: "30698752", name: "Geeta Bansal",   department: "BIDP1/ADM", category: "M&SS", email: "geeta.bansal@company.com",   ntid: "gbansal",   plantCode: "PLT-01" },
  { employeeNo: "30698753", name: "Naveen Kumar",   department: "BIDP3/LOG", category: "M&SS", email: "naveen.kumar@company.com",   ntid: "nkumar",    plantCode: "PLT-01" },
  { employeeNo: "30698754", name: "Shalini Devi",   department: "BIDP3/LOG", category: "M&SS", email: "shalini.devi@company.com",   ntid: "sdevi",     plantCode: "PLT-01" },
  { employeeNo: "30698755", name: "Rajiv Menon",    department: "BIDP3/LOG", category: "M&SS", email: "rajiv.menon@company.com",    ntid: "rmenon",    plantCode: "PLT-01" },
  { employeeNo: "30698756", name: "Abhishek Rao",   department: "BIDP2/RND", category: "M&SS", email: "abhishek.rao@company.com",   ntid: "arao",      plantCode: "PLT-01" },
  { employeeNo: "30698757", name: "Kavya Iyer",     department: "BIDP2/RND", category: "M&SS", email: "kavya.iyer@company.com",     ntid: "kiyer",     plantCode: "PLT-01" },
  { employeeNo: "30698758", name: "Siddharth Nair", department: "BIDP2/RND", category: "M&SS", email: "siddharth.nair@company.com", ntid: "snair",     plantCode: "PLT-01" },
  { employeeNo: "30698759", name: "Neha Kapoor",    department: "BIDP1/FIN", category: "M&SS", email: "neha.kapoor@company.com",    ntid: "nkapoor",   plantCode: "PLT-01" },
  { employeeNo: "30698760", name: "Vinod Shetty",   department: "BIDP1/FIN", category: "M&SS", email: "vinod.shetty@company.com",   ntid: "vshetty",   plantCode: "PLT-01" },
  { employeeNo: "30698761", name: "Anjali Verma",   department: "BIDP1/FIN", category: "M&SS", email: "anjali.verma@company.com",   ntid: "averma",    plantCode: "PLT-01" },
  { employeeNo: "30698762", name: "Rohit Malhotra", department: "BIDP1/ITS", category: "M&SS", email: "rohit.malhotra@company.com", ntid: "rmalhotra", plantCode: "PLT-01" },
  { employeeNo: "30698763", name: "Sneha Pillai",   department: "BIDP1/ITS", category: "M&SS", email: "sneha.pillai@company.com",   ntid: "spillai",   plantCode: "PLT-01" },
  { employeeNo: "30698764", name: "Karan Bhatt",    department: "BIDP1/ITS", category: "M&SS", email: "karan.bhatt@company.com",    ntid: "kbhatt",    plantCode: "PLT-01" },
  // ═══ JaP (PLT-02) employees — Jaipur Plant ═══
  { employeeNo: "EMP-10201", name: "Suresh M",      department: "Production",    category: "M&SS", email: "suresh.m@company.com",      ntid: "sureshm",  plantCode: "PLT-02" },
  { employeeNo: "EMP-10202", name: "Ganesh R",      department: "Quality",       category: "M&SS", email: "ganesh.r@company.com",      ntid: "ganeshr",  plantCode: "PLT-02" },
  { employeeNo: "EMP-10203", name: "Priya S",       department: "HR",            category: "M&SS", email: "priya.s@company.com",       ntid: "priyas",   plantCode: "PLT-02" },
  { employeeNo: "EMP-10204", name: "Vikram K",      department: "Finance",       category: "M&SS", email: "vikram.k@company.com",      ntid: "vikramk",  plantCode: "PLT-02" },
  { employeeNo: "EMP-10205", name: "Deepa N",       department: "Engineering",   category: "M&SS", email: "deepa.n@company.com",       ntid: "deepan",   plantCode: "PLT-02" },
  { employeeNo: "EMP-10206", name: "Arjun B",       department: "Manufacturing", category: "M&SS", email: "arjun.b@company.com",       ntid: "arjunb",   plantCode: "PLT-02" },
  { employeeNo: "EMP-10207", name: "Meena T",       department: "Safety",        category: "M&SS", email: "meena.t@company.com",       ntid: "meenat",   plantCode: "PLT-02" },
  { employeeNo: "EMP-10234", name: "Kiran V",       department: "Manufacturing", category: "M&SS", email: "kiran.v@company.com",       ntid: "kiranv",   plantCode: "PLT-02" },
  { employeeNo: "EMP-10235", name: "Sona R",        department: "Production",    category: "M&SS", email: "sona.r@company.com",        ntid: "sonar",    plantCode: "PLT-02" },
  { employeeNo: "EMP-10237", name: "Vijay Reddy",   department: "Production",    category: "M&SS", email: "vijay.reddy@company.com",   ntid: "vreddy",   plantCode: "PLT-02" },
  { employeeNo: "EMP-10238", name: "Ramesh T",      department: "Quality",       category: "M&SS", email: "ramesh.t@company.com",      ntid: "ramesht",  plantCode: "PLT-02" },
  { employeeNo: "EMP-10239", name: "Ganesh Iyer",   department: "Manufacturing", category: "M&SS", email: "ganesh.iyer@company.com",   ntid: "giyer",    plantCode: "PLT-02" },
  { employeeNo: "EMP-10241", name: "Pooja K",       department: "Engineering",   category: "M&SS", email: "pooja.k@company.com",       ntid: "poojak",   plantCode: "PLT-02" },
  { employeeNo: "EMP-10250", name: "Rajesh Kumar",  department: "Production",    category: "M&SS", email: "rajesh.kumar@company.com",  ntid: "rkumar",   plantCode: "PLT-02" },
  { employeeNo: "EMP-10251", name: "Anita Sharma",  department: "Planning",      category: "M&SS", email: "anita.sharma.j@company.com",ntid: "asharmaj", plantCode: "PLT-02" },
  { employeeNo: "EMP-10252", name: "Praveen N",     department: "CTG",           category: "M&SS", email: "praveen.n@company.com",     ntid: "praveenn", plantCode: "PLT-02" },
  { employeeNo: "EMP-10253", name: "Sanjay P",      department: "Engineering",   category: "M&SS", email: "sanjay.p@company.com",      ntid: "sanjayp",  plantCode: "PLT-02" },
  { employeeNo: "EMP-10254", name: "Kavitha R",     department: "HR",            category: "M&SS", email: "kavitha.r@company.com",     ntid: "kavithar", plantCode: "PLT-02" },
];

export const mockSuggestions: Suggestion[] = [
  // ═══ Karthik's suggestions — showing different pipeline stages ═══
  // #1: Submitted → pending with FLM Suresh (shows in Karthik's My Pending AND Suresh's My Approvals)
  {
    id: "1",
    suggestionNo: "SSS-2026-001",
    subject: "Improve conveyor belt alignment",
    type: "Simple Suggestion Scheme",
    category: "Productivity",
    status: "Submitted",
    date: "2026-02-20",
    pendingWith: "FLM - Suresh M",
    assignedFlm: "30698710",
    approvalLevel: "FLM",
    daysPending: 10,
    employeeNo: "30698665",
    employeeName: "Karthik",
    department: "BIDP1/TEF",
    range: "TEF",
    presentMethod: "Manual alignment of conveyor belt every shift",
    proposedMethod: "Install auto-alignment sensor system",
    benefits: "Reduce downtime by 30%, save 2 hours per shift",
    attachment: "conveyor_alignment_proposal.pdf",
  },
  // #2: FLM evaluated, now pending Manager (shows in Manager's My Approvals)
  {
    id: "2",
    suggestionNo: "SFC-2026-012",
    subject: "Reduce coolant wastage in CNC area",
    type: "Shop Floor CIP",
    category: "Cost Reduction",
    status: "Pending Manager",
    date: "2026-02-15",
    pendingWith: "Manager",
    assignedFlm: "30698710",
    approvalLevel: "Manager",
    awardAmount: 800,
    evaluatedBy: "30698710",
    evaluatedByName: "Suresh M",
    evaluatedOn: "2026-02-18",
    pendingSince: "2026-02-18",
    daysPending: 3,
    employeeNo: "30698665",
    employeeName: "Karthik",
    department: "BIDP1/TEF",
    range: "QAL",
    presentMethod: "Coolant flows continuously during non-cutting operations",
    proposedMethod: "Install proximity sensor to auto-stop coolant when idle",
    benefits: "Save 200L coolant/month, reduce cost by ₹15,000/month",
  },
  // #3: Fully approved & closed (visible in My Awards)
  {
    id: "3",
    suggestionNo: "CTF-2026-005",
    subject: "Quick fix for pneumatic leak",
    type: "Cash The Flash",
    category: "Safety",
    status: "Approved & Closed",
    date: "2026-01-28",
    awardAmount: 500,
    awardCategory: "Silver",
    awardDate: "2026-02-05",
    assignedFlm: "30698710",
    evaluatedBy: "30698710",
    evaluatedByName: "Suresh M",
    evaluatedOn: "2026-01-30",
    approvedByBpsAdmin: "30698720",
    approvedByBpsAdminName: "Vijay Sharma",
    approvedByBpsAdminOn: "2026-02-03",
    employeeNo: "30698665",
    employeeName: "Karthik",
    department: "BIDP1/TEF",
    range: "TEF",
    presentMethod: "Air leak in pneumatic line causing pressure drop",
    proposedMethod: "Replaced worn O-ring and added sealant tape",
    benefits: "Prevented line shutdown, saved ₹5,000 in downtime",
    attachment: "pneumatic_fix_photo.jpg",
  },
  // #4: Draft — not yet submitted
  {
    id: "4",
    suggestionNo: "MIC-2026-003",
    subject: "Better tool storage organization",
    type: "My Idea Card",
    category: "5S / Housekeeping",
    status: "Draft",
    date: "2026-02-28",
    employeeNo: "30698665",
    employeeName: "Karthik",
    department: "BIDP1/TEF",
    range: "PRD",
    presentMethod: "Tools scattered on workbench",
    proposedMethod: "Shadow board with labeled slots for each tool",
    benefits: "Reduce tool search time by 50%",
  },
  // #5: Fully approved high-value (went through full pipeline including BPS DH)
  {
    id: "5",
    suggestionNo: "SSS-2026-008",
    subject: "LED lighting upgrade in assembly area",
    type: "Simple Suggestion Scheme",
    category: "Energy Saving",
    status: "Approved & Closed",
    date: "2026-01-10",
    awardAmount: 1000,
    awardCategory: "Gold",
    awardDate: "2026-02-01",
    assignedFlm: "30698710",
    evaluatedBy: "30698710",
    evaluatedByName: "Suresh M",
    evaluatedOn: "2026-01-12",
    approvedByManager: "30698702",
    approvedByManagerName: "Anita Sharma",
    approvedByManagerOn: "2026-01-18",
    approvedByBpsAdmin: "30698720",
    approvedByBpsAdminName: "Vijay Sharma",
    approvedByBpsAdminOn: "2026-01-25",
    approvedByBpsDh: "30698704",
    approvedByBpsDhName: "Priya Devi",
    approvedByBpsDhOn: "2026-02-01",
    employeeNo: "30698665",
    employeeName: "Karthik",
    department: "BIDP1/TEF",
    range: "TEF",
    presentMethod: "Fluorescent tube lights with high energy consumption",
    proposedMethod: "Replace with energy-efficient LED panels",
    benefits: "40% energy savings, better illumination, reduced maintenance",
    attachment: "led_upgrade_report.pdf",
  },
  // #6: Daily CIP — auto-closed (no approval pipeline)
  {
    id: "6",
    suggestionNo: "DCP-2026-020",
    subject: "Daily cleanup checklist for workstation",
    type: "Daily CIP",
    category: "5S / Housekeeping",
    status: "Approved & Closed",
    date: "2026-02-27",
    employeeNo: "30698665",
    employeeName: "Karthik",
    department: "BIDP1/TEF",
    range: "QAL",
    presentMethod: "No structured cleanup process at end of shift",
    proposedMethod: "Implement 5-point daily cleanup checklist",
    benefits: "Improved workplace hygiene and reduced next-shift setup time",
  },
  // ═══ Other employees' suggestions — pending with Suresh (FLM) ═══
  // #7: Submitted by Suresh Patil → pending with FLM Suresh M (shows in Suresh's My Approvals)
  {
    id: "7",
    suggestionNo: "SSS-2026-015",
    subject: "Anti-fatigue mats for assembly stations",
    type: "Simple Suggestion Scheme",
    category: "Ergonomics",
    status: "Submitted",
    date: "2026-02-18",
    pendingWith: "FLM - Suresh M",
    assignedFlm: "30698710",
    approvalLevel: "FLM",
    daysPending: 12,
    employeeNo: "30698701",
    employeeName: "Suresh Patil",
    department: "BIDP2/QAL",
    range: "TEF",
    presentMethod: "Workers stand on hard concrete floor for 8 hours",
    proposedMethod: "Install anti-fatigue rubber mats at all standing stations",
    benefits: "Reduce fatigue-related injuries by 40%, improve morale",
  },
  // #8: Approved & Closed
  {
    id: "8",
    suggestionNo: "CTF-2026-009",
    subject: "Emergency valve replacement on boiler line",
    type: "Cash The Flash",
    category: "Safety",
    status: "Approved & Closed",
    date: "2026-01-20",
    awardAmount: 750,
    awardCategory: "Silver",
    awardDate: "2026-01-28",
    assignedFlm: "30698710",
    evaluatedBy: "30698710",
    evaluatedByName: "Suresh M",
    evaluatedOn: "2026-01-22",
    approvedByBpsAdmin: "30698720",
    approvedByBpsAdminName: "Vijay Sharma",
    approvedByBpsAdminOn: "2026-01-26",
    employeeNo: "30698702",
    employeeName: "Anita Sharma",
    department: "BIDP1/MNT",
    range: "QAL",
    presentMethod: "Corroded valve causing minor steam leak",
    proposedMethod: "Replaced with stainless steel valve and added guard",
    benefits: "Prevented potential burn hazard, saved ₹12,000",
  },
  // #9: Approved & Closed (high-value, full pipeline)
  {
    id: "9",
    suggestionNo: "SFC-2026-018",
    subject: "Automated oil level monitoring",
    type: "Shop Floor CIP",
    category: "Productivity",
    status: "Approved & Closed",
    date: "2026-01-05",
    awardAmount: 2000,
    awardCategory: "Gold",
    awardDate: "2026-02-10",
    assignedFlm: "30698711",
    evaluatedBy: "30698711",
    evaluatedByName: "Ganesh R",
    evaluatedOn: "2026-01-08",
    approvedByManager: "30698702",
    approvedByManagerName: "Anita Sharma",
    approvedByManagerOn: "2026-01-15",
    approvedByBpsAdmin: "30698720",
    approvedByBpsAdminName: "Vijay Sharma",
    approvedByBpsAdminOn: "2026-01-25",
    approvedByBpsDh: "30698704",
    approvedByBpsDhName: "Priya Devi",
    approvedByBpsDhOn: "2026-02-05",
    employeeNo: "30698703",
    employeeName: "Vijay Reddy",
    department: "BIDP3/PRD",
    range: "TEF",
    presentMethod: "Manual dipstick check every 2 hours",
    proposedMethod: "IoT sensor with dashboard alert system",
    benefits: "Eliminated manual checks, prevented 3 machine failures/month",
  },
  // #10: Pending with BPS Admin (shows in BPS Admin's My Approvals)
  {
    id: "10",
    suggestionNo: "MIC-2026-007",
    subject: "Color-coded PPE storage bins",
    type: "My Idea Card",
    category: "Safety",
    status: "Pending BPS Admin",
    date: "2026-02-22",
    pendingWith: "BPS Admin",
    assignedFlm: "30698710",
    approvalLevel: "BPS Admin",
    awardAmount: 300,
    evaluatedBy: "30698710",
    evaluatedByName: "Suresh M",
    evaluatedOn: "2026-02-24",
    pendingSince: "2026-02-24",
    daysPending: 5,
    employeeNo: "30698704",
    employeeName: "Priya Devi",
    department: "BIDP1/SAF",
    range: "PRD",
    presentMethod: "PPE mixed together in single bin",
    proposedMethod: "Separate color-coded bins for each PPE type",
    benefits: "Faster PPE selection, reduced contamination risk",
  },
  // #11: Daily CIP — auto-closed
  {
    id: "11",
    suggestionNo: "DCP-2026-025",
    subject: "Shift handover digital checklist",
    type: "Daily CIP",
    category: "Quality",
    status: "Approved & Closed",
    date: "2026-02-10",
    awardAmount: 250,
    awardCategory: "Bronze",
    awardDate: "2026-02-20",
    employeeNo: "30698705",
    employeeName: "Ganesh Iyer",
    department: "BIDP1/TEF",
    range: "MNT",
    presentMethod: "Verbal handover with occasional missed items",
    proposedMethod: "Tablet-based checklist with photo evidence",
    benefits: "Zero missed handover items, 15 min time saving per shift",
  },
  // #12: Rejected by FLM
  {
    id: "12",
    suggestionNo: "SSS-2026-022",
    subject: "Compressed air leak detection program",
    type: "Simple Suggestion Scheme",
    category: "Energy Saving",
    status: "Rejected",
    date: "2026-01-15",
    assignedFlm: "30698710",
    approvalLevel: "FLM",
    evaluatedBy: "30698710",
    evaluatedByName: "Suresh M",
    evaluatedOn: "2026-01-17",
    rejectionReason: "Similar program already approved under SSS-2025-089. Please reference existing implementation.",
    rejectedBy: "30698710",
    rejectedByName: "Suresh M",
    rejectedOn: "2026-01-17",
    employeeNo: "30698706",
    employeeName: "Kavitha Nair",
    department: "BIDP2/QAL",
    range: "QAL",
    presentMethod: "No systematic air leak detection",
    proposedMethod: "Monthly ultrasonic leak detection rounds",
    benefits: "Estimated 20% compressed air cost saving",
  },
  // #13: Submitted → pending with FLM Suresh (another one for Suresh's My Approvals)
  {
    id: "13",
    suggestionNo: "CTF-2026-011",
    subject: "Guard rail repair on mezzanine floor",
    type: "Cash The Flash",
    category: "Safety",
    status: "Submitted",
    date: "2026-03-01",
    pendingWith: "FLM - Suresh M",
    assignedFlm: "30698710",
    approvalLevel: "FLM",
    daysPending: 5,
    employeeNo: "30698707",
    employeeName: "Mohan Das",
    department: "BIDP1/MNT",
    range: "TEF",
    presentMethod: "Loose guard rail bolts on mezzanine",
    proposedMethod: "Re-torqued all bolts and added locking washers",
    benefits: "Eliminated fall hazard for 15 workers",
  },
  // #14: Submitted → pending with FLM Suresh (SFC type)
  {
    id: "14",
    suggestionNo: "SFC-2026-030",
    subject: "Kanban system for spare parts inventory",
    type: "Shop Floor CIP",
    category: "Productivity",
    status: "Submitted",
    date: "2026-03-02",
    pendingWith: "FLM - Suresh M",
    assignedFlm: "30698710",
    approvalLevel: "FLM",
    daysPending: 4,
    employeeNo: "30698701",
    employeeName: "Suresh Patil",
    department: "BIDP2/QAL",
    range: "PRD",
    presentMethod: "Ad-hoc ordering when parts run out",
    proposedMethod: "Two-bin Kanban with visual reorder triggers",
    benefits: "Zero stockout incidents, 30% inventory reduction",
  },
  // #15: Approved & Closed (high-value)
  {
    id: "15",
    suggestionNo: "SSS-2026-028",
    subject: "Noise reduction in grinding area",
    type: "Simple Suggestion Scheme",
    category: "Environment",
    status: "Approved & Closed",
    date: "2025-12-15",
    awardAmount: 1500,
    awardCategory: "Gold",
    awardDate: "2026-01-20",
    assignedFlm: "30698711",
    evaluatedBy: "30698711",
    evaluatedByName: "Ganesh R",
    evaluatedOn: "2025-12-18",
    approvedByManager: "30698702",
    approvedByManagerName: "Anita Sharma",
    approvedByManagerOn: "2025-12-25",
    approvedByBpsAdmin: "30698720",
    approvedByBpsAdminName: "Vijay Sharma",
    approvedByBpsAdminOn: "2026-01-05",
    approvedByBpsDh: "30698704",
    approvedByBpsDhName: "Priya Devi",
    approvedByBpsDhOn: "2026-01-15",
    employeeNo: "30698703",
    employeeName: "Vijay Reddy",
    department: "BIDP3/PRD",
    range: "TEF",
    presentMethod: "Noise level exceeding 90dB in grinding bay",
    proposedMethod: "Acoustic enclosures and vibration dampening mounts",
    benefits: "Reduced noise to 72dB, improved worker comfort",
  },
  // #16: Pending BPS DH (high-value, shows in BPS DH's My Approvals)
  {
    id: "16",
    suggestionNo: "SSS-2026-035",
    subject: "Automated weld quality inspection system",
    type: "Simple Suggestion Scheme",
    category: "Quality",
    status: "Pending BPS DH",
    date: "2026-02-25",
    pendingWith: "BPS DH",
    assignedFlm: "30698710",
    approvalLevel: "BPS DH",
    awardAmount: 1200,
    evaluatedBy: "30698710",
    evaluatedByName: "Suresh M",
    evaluatedOn: "2026-02-27",
    approvedByManager: "30698702",
    approvedByManagerName: "Anita Sharma",
    approvedByManagerOn: "2026-03-02",
    approvedByBpsAdmin: "30698720",
    approvedByBpsAdminName: "Vijay Sharma",
    approvedByBpsAdminOn: "2026-03-05",
    pendingSince: "2026-03-05",
    daysPending: 2,
    employeeNo: "30698702",
    employeeName: "Anita Sharma",
    department: "BIDP1/MNT",
    range: "QAL",
    presentMethod: "Manual visual inspection of weld joints",
    proposedMethod: "Camera-based AI inspection with defect classification",
    benefits: "99% defect detection rate, 60% faster inspection",
  },

  // ═══ JaP (PLT-02) suggestions — covering all 6 workflow phases ═══
  {
    id: "jap-17",
    suggestionNo: "JAP-2026-017",
    type: "Improvement Suggestion", category: "Quality", plantCode: "PLT-02",
    subject: "Replace manual torque wrench with digital torque indicator",
    status: "Pending Feasibility Review",
    date: "2026-05-10", daysPending: 10, pendingWith: "Superior",
    employeeNo: "EMP-10237", employeeName: "Vijay Reddy", department: "Production",
    presentMethod: "Manual torque wrenches with no digital feedback; over-torquing common on assembly line",
    proposedMethod: "Digital torque indicator with buzzer alarm when target torque achieved; data logged per shift",
    benefits: "Reduce rework by 25%, eliminate customer complaints on loose joints, save ₹18,000/month",
    formData: { teamMembers: ["EMP-10239", "EMP-10238"] },
  },
  {
    id: "jap-18",
    suggestionNo: "JAP-2026-018",
    type: "Improvement Suggestion", category: "Safety", plantCode: "PLT-02",
    subject: "Install anti-fatigue mats at final inspection stations",
    status: "Pending Feasibility Review",
    date: "2026-05-12", daysPending: 8, pendingWith: "Superior",
    employeeNo: "EMP-10203", employeeName: "Priya S", department: "HR",
    presentMethod: "Concrete flooring at all inspection stations causing leg fatigue after 4-hour shifts",
    proposedMethod: "Anti-fatigue rubber mats (600×900mm) at each of the 12 inspection stations",
    benefits: "Reduce musculoskeletal complaints by ~40%, improve inspector alertness, lower absenteeism",
    formData: {},
  },
  {
    id: "jap-19",
    suggestionNo: "JAP-2026-019",
    type: "Improvement Suggestion", category: "Cost Reduction", plantCode: "PLT-02",
    subject: "Coolant recycling loop in CNC machining bay — Unit 3",
    status: "In Opinion Phase",
    date: "2026-04-28", daysPending: 12, pendingWith: "Planner",
    employeeNo: "EMP-10239", employeeName: "Ganesh Iyer", department: "Manufacturing",
    presentMethod: "Coolant drained and replaced fortnightly; no recycling. High disposal cost and environmental load.",
    proposedMethod: "Install closed-loop coolant recycling unit with centrifugal separator; top-up only 5% monthly",
    benefits: "Save ₹32,000/month on coolant procurement; reduce hazardous waste disposal by 80%",
    formData: {
      teamMembers: ["EMP-10241", "EMP-10234"],
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-05-05",
    },
  },
  {
    id: "jap-20",
    suggestionNo: "JAP-2026-020",
    type: "Improvement Suggestion", category: "Quality", plantCode: "PLT-02",
    subject: "Automated poka-yoke sensor on press machine #7",
    status: "In Implementation",
    date: "2026-04-01", daysPending: 29, pendingWith: "Implementer",
    employeeNo: "EMP-10201", employeeName: "Suresh M", department: "Production",
    presentMethod: "Press operator manually checks part orientation before each cycle. Mis-feeds occur ~3/day causing scrap.",
    proposedMethod: "Proximity sensor + PLC interlock: machine only fires if part is correctly seated. Auto-reject on misfeed.",
    benefits: "Eliminate press misfeeds entirely, save ₹9,000/month scrap cost, one-time install ₹14,000",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-04-08",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-04-15",
    },
  },
  {
    id: "jap-21",
    suggestionNo: "JAP-2026-021",
    type: "Improvement Suggestion", category: "Energy Saving", plantCode: "PLT-02",
    subject: "LED lighting upgrade in warehouse Zone B",
    status: "In Implementation",
    date: "2026-04-05", daysPending: 25, pendingWith: "Implementer",
    employeeNo: "EMP-10205", employeeName: "Deepa N", department: "Engineering",
    presentMethod: "250W metal-halide fittings; 80+ fittings in Zone B; high heat output and 60% of lamps due for replacement.",
    proposedMethod: "Replace with 100W LED high-bay fittings with daylight sensors; 5-year rated life.",
    benefits: "Save ₹45,000/year electricity; reduce maintenance cycles from quarterly to biennial",
    formData: {
      teamMembers: ["EMP-10234"],
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-04-12",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-04-20",
    },
  },
  {
    id: "jap-22",
    suggestionNo: "JAP-2026-022",
    type: "Improvement Suggestion", category: "5S / Housekeeping", plantCode: "PLT-02",
    subject: "5S visual management boards at assembly line entry",
    status: "In Evaluation",
    date: "2026-03-10", daysPending: 7, pendingWith: "Planner / CTG",
    implementedOn: "2026-05-01",
    employeeNo: "EMP-10202", employeeName: "Ganesh R", department: "Quality",
    presentMethod: "No standardised visual boards; shift changeover notes written on whiteboards erased daily.",
    proposedMethod: "Laminated A3 shadow boards at each line entry point with shift targets, pending items, and 5S scores.",
    benefits: "Reduce handover time by 15 min/shift, improve 5S audit score from 2.8 to 4.0",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-03-17",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-03-24",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
    },
  },
  {
    id: "jap-23",
    suggestionNo: "JAP-2026-023",
    type: "Improvement Suggestion", category: "Productivity", plantCode: "PLT-02",
    subject: "Kanban replenishment system for fasteners store",
    status: "In Award",
    date: "2026-02-15", daysPending: 2, pendingWith: "BPS / Finance",
    awardAmount: 2500, awardCategory: "Silver",
    implementedOn: "2026-04-10",
    employeeNo: "EMP-10206", employeeName: "Arjun B", department: "Manufacturing",
    presentMethod: "Manual daily count of fastener bins; stock-outs occur 3–4 times/week causing line stoppages.",
    proposedMethod: "Two-bin Kanban system: empty bin triggers automatic reorder signal to stores via barcode scan.",
    benefits: "Eliminate stock-outs; reduce line stoppages by ~85%; save 45 min/day of operator time",
    formData: {
      teamMembers: ["EMP-10234", "EMP-10207"],
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-02-22",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-03-01",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
      evaluatedBy: "EMP-10251", evaluatedByName: "Anita Sharma", evaluatedOn: "2026-04-25",
      evaluationType: "non-quantifiable", recommendedScore: 8, recommendedAward: 2500,
    },
  },
  {
    id: "jap-24",
    suggestionNo: "JAP-2026-024",
    type: "Improvement Suggestion", category: "Quality", plantCode: "PLT-02",
    subject: "Colour-coded wiring harness connectors on panel assembly",
    status: "Closed / Awarded",
    date: "2026-01-05", daysPending: 0,
    awardAmount: 5000, awardCategory: "Gold", awardDate: "2026-03-10",
    implementedOn: "2026-02-20",
    employeeNo: "EMP-10207", employeeName: "Meena T", department: "Safety",
    presentMethod: "All connectors same colour; wrong-insertion errors average 6/week; rework cost ₹12,000/month.",
    proposedMethod: "Custom colour-coded connector housings per circuit type; error-proofed by shape + colour.",
    benefits: "Zero wrong-insertion errors since implementation; monthly rework savings ₹12,000",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-01-12",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-01-19",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
      evaluatedBy: "EMP-10251", evaluatedByName: "Anita Sharma", evaluatedOn: "2026-03-05",
      evaluationType: "quantifiable", savingsAmount: 144000,
      awardApprovedBy: "EMP-ADMIN-02", awardApprovedByName: "Arun Joshi", awardApprovedOn: "2026-03-10",
    },
  },
  {
    id: "jap-25",
    suggestionNo: "JAP-2026-025",
    type: "Improvement Suggestion", category: "Productivity", plantCode: "PLT-02",
    subject: "Replace overhead conveyor belts with AGV system",
    status: "Rejected",
    date: "2026-01-20", daysPending: 0,
    employeeNo: "EMP-10204", employeeName: "Vikram K", department: "Finance",
    presentMethod: "Fixed overhead conveyor limits flexibility; bottleneck during model changeover",
    proposedMethod: "AGV fleet of 5 units with dynamic routing; changeover time reduced from 45 min to 8 min",
    benefits: "Productivity gain ₹2L/month, flexibility for future model introduction",
    rejectionReason: "Capital expenditure of ₹48L exceeds this year's plant budget. Deferred to FY2028 capital plan.",
    rejectedBy: "EMP-10250", rejectedByName: "Rajesh Kumar", rejectedOn: "2026-02-15",
  },

  // ─── Additional JaP suggestions for richer demo coverage ─────────────────
  {
    id: "jap-26",
    suggestionNo: "JAP-2026-026",
    type: "Improvement Suggestion", category: "Safety", plantCode: "PLT-02",
    subject: "Safety helmet rack at Unit-1 entrance with sign-in log",
    status: "Draft",
    date: "2026-05-20", daysPending: 0,
    employeeNo: "EMP-10201", employeeName: "Suresh M", department: "Production",
    presentMethod: "Helmets stored in a general cabinet; no logging of who took which helmet",
    proposedMethod: "Dedicated helmet rack with numbered slots and digital log-in sheet at Unit-1 entrance",
    benefits: "100% traceability; reduce missing/damaged helmet incidents by 70%",
    formData: {},
  },
  {
    id: "jap-27",
    suggestionNo: "JAP-2026-027",
    type: "Improvement Suggestion", category: "Quality", plantCode: "PLT-02",
    subject: "First-article inspection checklist digitisation",
    status: "Pending Feasibility Review",
    date: "2026-05-15", daysPending: 5, pendingWith: "Superior",
    employeeNo: "EMP-10201", employeeName: "Suresh M", department: "Production",
    presentMethod: "Paper FAI checklists; data entry into Excel after shift; prone to transcription errors",
    proposedMethod: "Tablet-based FAI form with auto-time-stamp; data pushed directly to QMS on completion",
    benefits: "Eliminate transcription errors; cut FAI reporting time from 40 min to 8 min per batch",
    formData: {},
  },
  {
    id: "jap-28",
    suggestionNo: "JAP-2026-028",
    type: "Improvement Suggestion", category: "Productivity", plantCode: "PLT-02",
    subject: "Cross-training matrix for assembly line flexibility",
    status: "Closed / Awarded",
    date: "2026-01-10", daysPending: 0,
    awardAmount: 3000, awardCategory: "Silver", awardDate: "2026-03-20",
    implementedOn: "2026-03-01",
    employeeNo: "EMP-10201", employeeName: "Suresh M", department: "Production",
    presentMethod: "Operators trained on single station only; absenteeism causes line stoppages",
    proposedMethod: "3×3 cross-training matrix: each operator certified for 3 adjacent stations over 90 days",
    benefits: "Line stoppages due to absenteeism cut from 8/month to 1/month; ₹22,000/month saving",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-01-17",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-01-24",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
      evaluatedBy: "EMP-10251", evaluatedByName: "Anita Sharma", evaluatedOn: "2026-03-10",
      evaluationType: "non-quantifiable", recommendedScore: 7, recommendedAward: 3000,
      awardApprovedBy: "EMP-ADMIN-02", awardApprovedByName: "Arun Joshi", awardApprovedOn: "2026-03-20",
    },
  },
  {
    id: "jap-29",
    suggestionNo: "JAP-2026-029",
    type: "Improvement Suggestion", category: "Quality", plantCode: "PLT-02",
    subject: "Automated SPC charting for lathe diameter control",
    status: "In Opinion Phase",
    date: "2026-04-20", daysPending: 15, pendingWith: "Planner",
    employeeNo: "EMP-10202", employeeName: "Ganesh R", department: "Quality",
    presentMethod: "Manual diameter readings every 30 parts; out-of-control conditions detected late",
    proposedMethod: "In-process digital calliper linked to SPC software; real-time control chart with alert on 2σ breach",
    benefits: "Reduce diameter non-conformances by 60%; save ₹15,000/month re-work",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-04-27",
    },
  },
  {
    id: "jap-30",
    suggestionNo: "JAP-2026-030",
    type: "Improvement Suggestion", category: "5S / Housekeeping", plantCode: "PLT-02",
    subject: "Tool shadow board standardisation across all machining bays",
    status: "Rejected",
    date: "2026-02-28", daysPending: 0,
    employeeNo: "EMP-10202", employeeName: "Ganesh R", department: "Quality",
    presentMethod: "Different setup in each bay; tools misplaced between bays",
    proposedMethod: "Uniform foam-insert tool boards with laser-cut profiles for all 9 machining bays",
    benefits: "Reduce tool-search time from 12 min/shift to 2 min; improve 5S scores",
    rejectionReason: "Currently under 5S improvement project led by Engineering; will be incorporated centrally.",
    rejectedBy: "EMP-10251", rejectedByName: "Anita Sharma", rejectedOn: "2026-03-15",
  },
  {
    id: "jap-31",
    suggestionNo: "JAP-2026-031",
    type: "Improvement Suggestion", category: "Safety", plantCode: "PLT-02",
    subject: "Ergonomic lift-assist for heavy casting handling in Unit-2",
    status: "Closed / Awarded",
    date: "2025-12-01", daysPending: 0,
    awardAmount: 1500, awardCategory: "Bronze", awardDate: "2026-02-10",
    implementedOn: "2026-01-20",
    employeeNo: "EMP-10203", employeeName: "Priya S", department: "HR",
    presentMethod: "Operators manually lift 18 kg castings 200+ times/shift; musculoskeletal injury rate 3/quarter",
    proposedMethod: "Pneumatic lift-assist with vacuum gripper; operator guides casting, no manual lifting",
    benefits: "Zero manual lift injuries; reduce MSD cases; improve operator morale",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2025-12-08",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2025-12-15",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
      evaluatedBy: "EMP-10252", evaluatedByName: "Praveen N", evaluatedOn: "2026-02-05",
      evaluationType: "non-quantifiable", recommendedScore: 6, recommendedAward: 1500,
      awardApprovedBy: "EMP-ADMIN-02", awardApprovedByName: "Arun Joshi", awardApprovedOn: "2026-02-10",
    },
  },
  {
    id: "jap-32",
    suggestionNo: "JAP-2026-032",
    type: "Improvement Suggestion", category: "Energy Saving", plantCode: "PLT-02",
    subject: "Variable frequency drives on compressor motors in Unit-2",
    status: "In Evaluation",
    date: "2026-03-25", daysPending: 9, pendingWith: "Planner / CTG",
    implementedOn: "2026-05-05",
    employeeNo: "EMP-10205", employeeName: "Deepa N", department: "Engineering",
    presentMethod: "Fixed-speed motors run at 100% even during low-demand periods; 35% energy wasted",
    proposedMethod: "VFD-controlled motors auto-adjust speed to demand; 30–50% energy reduction predicted",
    benefits: "Save ₹58,000/year in electricity; 6-month ROI on VFD investment",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-04-01",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-04-10",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
    },
  },
  {
    id: "jap-33",
    suggestionNo: "JAP-2026-033",
    type: "Improvement Suggestion", category: "Productivity", plantCode: "PLT-02",
    subject: "Single-minute exchange of die (SMED) on press line changeover",
    status: "Closed / Awarded",
    date: "2025-11-15", daysPending: 0,
    awardAmount: 4000, awardCategory: "Silver", awardDate: "2026-01-25",
    implementedOn: "2026-01-05",
    employeeNo: "EMP-10206", employeeName: "Arjun B", department: "Manufacturing",
    presentMethod: "Die changeover takes 85 min; internal/external activities not separated; tool hunt wastes 20 min",
    proposedMethod: "SMED methodology: pre-stage tooling, convert internal to external steps; target < 30 min",
    benefits: "Changeover reduced to 28 min (67%↓); 3 extra production runs/week; ₹35,000/month gain",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2025-11-22",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2025-11-29",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
      evaluatedBy: "EMP-10251", evaluatedByName: "Anita Sharma", evaluatedOn: "2026-01-15",
      evaluationType: "quantifiable", savingsAmount: 420000,
      awardApprovedBy: "EMP-ADMIN-02", awardApprovedByName: "Arun Joshi", awardApprovedOn: "2026-01-25",
    },
  },
  {
    id: "jap-34",
    suggestionNo: "JAP-2026-034",
    type: "Improvement Suggestion", category: "Quality", plantCode: "PLT-02",
    subject: "Gauge R&R study for CMM operators in quality lab",
    status: "In Implementation",
    date: "2026-04-10", daysPending: 20, pendingWith: "Implementer",
    employeeNo: "EMP-10237", employeeName: "Vijay Reddy", department: "Production",
    presentMethod: "CMM results vary ±0.02mm between operators; no repeatability study done in 3 years",
    proposedMethod: "Formal Gauge R&R study per AIAG MSA guidelines; re-train operators on identified issues",
    benefits: "Reduce measurement variation to <10% of tolerance; improve customer acceptance rate",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-04-17",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-04-25",
    },
  },
  {
    id: "jap-35",
    suggestionNo: "JAP-2026-035",
    type: "Improvement Suggestion", category: "Cost Reduction", plantCode: "PLT-02",
    subject: "In-house regrinding of HSS tooling instead of outsourcing",
    status: "In Award",
    date: "2026-02-01", daysPending: 3, pendingWith: "BPS / Finance",
    awardAmount: 3500, awardCategory: "Silver",
    implementedOn: "2026-04-15",
    employeeNo: "EMP-10239", employeeName: "Ganesh Iyer", department: "Manufacturing",
    presentMethod: "HSS drill bits and reamers sent to outside vendor for regrinding; 5-day turnaround, ₹280/tool",
    proposedMethod: "Purchase surface grinder + CNC tool grinder; train 2 tool-room operators; in-house regrind at ₹45/tool",
    benefits: "Save ₹85,000/year on tooling cost; 1-day turnaround; ROI within 14 months",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-02-08",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-02-15",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
      evaluatedBy: "EMP-10252", evaluatedByName: "Praveen N", evaluatedOn: "2026-04-20",
      evaluationType: "quantifiable", savingsAmount: 85000,
    },
  },
  {
    id: "jap-36",
    suggestionNo: "JAP-2026-036",
    type: "Improvement Suggestion", category: "Safety", plantCode: "PLT-02",
    subject: "Interlocked guard for belt conveyor nip points in Unit-3",
    status: "Pending Feasibility Review",
    date: "2026-05-18", daysPending: 3, pendingWith: "Superior",
    employeeNo: "EMP-10207", employeeName: "Meena T", department: "Safety",
    presentMethod: "Belt conveyor nip points guarded only by fixed covers; no electrical interlock; 2 near-miss incidents",
    proposedMethod: "Electromechanical interlocked guards with emergency pull-cord; machine stops if guard opened",
    benefits: "Eliminate conveyor entrapment hazard; compliance with ISO 13849 PLd; reduce insurance premium",
    formData: {},
  },
  {
    id: "jap-37",
    suggestionNo: "JAP-2026-037",
    type: "Improvement Suggestion", category: "Cost Reduction", plantCode: "PLT-02",
    subject: "Vendor consolidation for MRO consumables — single preferred supplier",
    status: "In Opinion Phase",
    date: "2026-04-15", daysPending: 18, pendingWith: "Planner",
    employeeNo: "EMP-10204", employeeName: "Vikram K", department: "Finance",
    presentMethod: "110 active MRO vendors; fragmented purchasing; no volume leverage; high admin overhead",
    proposedMethod: "Consolidate to 3 preferred MRO suppliers; negotiate annual blanket orders; reduce POs by 60%",
    benefits: "8% average price reduction; save ₹12,000/year admin; improved delivery reliability",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-04-22",
    },
  },
  {
    id: "jap-38",
    suggestionNo: "JAP-2026-038",
    type: "Improvement Suggestion", category: "Productivity", plantCode: "PLT-02",
    subject: "Shared tool crib with RFID checkout for Unit-2 and Unit-3",
    status: "Closed / Awarded",
    date: "2025-10-20", daysPending: 0,
    awardAmount: 2000, awardCategory: "Bronze", awardDate: "2025-12-15",
    implementedOn: "2025-12-01",
    employeeNo: "EMP-10241", employeeName: "Pooja K", department: "Engineering",
    presentMethod: "Separate tool cribs in Unit-2 and Unit-3; operators walk >150m for tools; avg 18 min/day lost",
    proposedMethod: "Shared tool crib between both units with RFID checkout terminal; auto-alert for overdue tools",
    benefits: "Save 18 min/operator/day × 40 operators = 720 min/day = 12 hrs/day; ₹28,000/month value",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2025-10-27",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2025-11-03",
      implementedBy: "EMP-10253", implementedByName: "Sanjay P",
      evaluatedBy: "EMP-10252", evaluatedByName: "Praveen N", evaluatedOn: "2025-12-08",
      evaluationType: "non-quantifiable", recommendedScore: 5, recommendedAward: 2000,
      awardApprovedBy: "EMP-ADMIN-02", awardApprovedByName: "Arun Joshi", awardApprovedOn: "2025-12-15",
    },
  },
  // #39: Reopened — a previously rejected suggestion sent back for re-evaluation
  {
    id: "jap-39",
    suggestionNo: "JAP-2026-039",
    type: "Improvement Suggestion", category: "Quality", plantCode: "PLT-02",
    subject: "Install vibration sensors on CNC spindles for predictive maintenance",
    status: "Reopened",
    date: "2026-03-01", daysPending: 10, pendingWith: "Feasibility Reviewer",
    employeeNo: "EMP-10206", employeeName: "Arjun B", department: "Manufacturing",
    presentMethod: "CNC spindle failures detected only after breakdown; avg 6 hrs downtime per event; 3 events/quarter",
    proposedMethod: "Retrofit 8 CNC spindles with wireless vibration sensors; threshold alerts via SCADA; plan maintenance proactively",
    benefits: "Reduce unplanned downtime by 80%; save ₹4.5 lakh/quarter in lost production and emergency spares",
    formData: {
      rejectedBy: "EMP-10250", rejectedByName: "Rajesh Kumar", rejectedOn: "2026-03-10",
      reopenedOn: "2026-03-15", reopenReason: "Revised proposal with lower-cost sensor option and phased rollout plan",
    },
  },
  // #40: On Hold — complex implementation requiring longer lead time
  {
    id: "jap-40",
    suggestionNo: "JAP-2026-040",
    type: "Improvement Suggestion", category: "Productivity", plantCode: "PLT-02",
    subject: "Automated conveyor line between Unit-1 and Unit-3 paint shop",
    status: "On Hold",
    date: "2026-02-10", daysPending: 0, pendingWith: "BPS (On Hold)",
    employeeNo: "EMP-10237", employeeName: "Vijay Reddy", department: "Production",
    presentMethod: "Manual trolley transfer between Unit-1 machining and Unit-3 paint shop; 4 operators; 45 min/batch",
    proposedMethod: "Install 120m overhead conveyor with accumulation zones; auto-dispatch via PLC; eliminate manual handling",
    benefits: "Save 4 operators/shift; reduce transfer time to 8 min/batch; eliminate damage from manual handling",
    formData: {
      feasibilityApprovedBy: "EMP-10250", feasibilityApprovedByName: "Rajesh Kumar", feasibilityApprovedOn: "2026-02-17",
      opinionApprovedBy: "EMP-10251", opinionApprovedByName: "Anita Sharma", opinionApprovedOn: "2026-02-24",
      statusBeforeHold: "In Implementation",
      holdReason: "Conveyor vendor lead time is 14 weeks; civil foundation work requires plant shutdown scheduling",
      heldBy: "EMP-ADMIN-02", heldByName: "Arun Joshi", heldOn: "2026-03-05",
    },
  },
];

export const mockAwards = mockSuggestions.filter(s => s.awardAmount);

// Mock memo data
export interface MemoEntry {
  id: string;
  suggestionNo: string;
  employeeName: string;
  employeeNo: string;
  department: string;
  type: string;
  status: string;
  submittedDate: string;
  evaluatedDate?: string;
  awardAmount?: number;
  remarks: string;
}

export const generateMemoData = (month: string, year: string, type: string): MemoEntry[] => {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthIdx = months.indexOf(month);
  if (monthIdx === -1) return [];

  return mockSuggestions
    .filter(s => {
      const sDate = new Date(s.date);
      const sMonth = sDate.getMonth();
      const sYear = sDate.getFullYear();
      const matchMonth = sMonth === monthIdx && sYear === parseInt(year);
      const prevMonth = monthIdx === 0 ? 11 : monthIdx - 1;
      const prevYear = monthIdx === 0 ? parseInt(year) - 1 : parseInt(year);
      const matchPrev = sMonth === prevMonth && sYear === prevYear && sDate.getDate() >= 16;
      const matchType = type === "all" || s.type === type;
      return (matchMonth || matchPrev) && matchType;
    })
    .map(s => ({
      id: s.id,
      suggestionNo: s.suggestionNo,
      employeeName: s.employeeName || "",
      employeeNo: s.employeeNo || "",
      department: s.department || "N/A",
      type: s.type,
      status: s.status,
      submittedDate: s.date,
      evaluatedDate: s.awardDate,
      awardAmount: s.awardAmount,
      remarks: s.status === "Approved" ? "Award sanctioned" : s.status === "Implemented" ? "Completed & awarded" : s.status === "Rejected" ? "Not feasible" : "Under process",
    }));
};

// Department-wise data for MIS
export const departmentStats = [
  { dept: "BIDP1/TEF", total: 45, implemented: 38, pending: 5, rejected: 2, participation: 92 },
  { dept: "BIDP2/QAL", total: 32, implemented: 25, pending: 4, rejected: 3, participation: 85 },
  { dept: "BIDP1/MNT", total: 28, implemented: 22, pending: 4, rejected: 2, participation: 78 },
  { dept: "BIDP3/PRD", total: 38, implemented: 30, pending: 6, rejected: 2, participation: 88 },
  { dept: "BIDP1/SAF", total: 15, implemented: 12, pending: 2, rejected: 1, participation: 72 },
  { dept: "BIDP1/HRD", total: 8, implemented: 5, pending: 2, rejected: 1, participation: 45 },
  { dept: "BIDP3/LOG", total: 12, implemented: 9, pending: 2, rejected: 1, participation: 60 },
];

export const categoryStats = [
  { name: "Safety", value: 35 },
  { name: "Quality", value: 28 },
  { name: "Productivity", value: 42 },
  { name: "Cost Reduction", value: 22 },
  { name: "Energy Saving", value: 18 },
  { name: "5S / Housekeeping", value: 15 },
  { name: "Ergonomics", value: 10 },
  { name: "Environment", value: 8 },
];

