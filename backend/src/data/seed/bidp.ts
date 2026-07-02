/**
 * BidP (PLT-01) seed data.
 * This file is owned by the BidP team — only BidP-specific employees,
 * suggestions, and stats live here. Never add JaP data to this file.
 *
 * Git conflict prevention: if a colleague is adding BidP data and you
 * are adding JaP data, you edit different files — no conflict.
 */

// ─── Employee seed (no password_hash — store.ts applies DEFAULT_HASH on merge) ─

export interface SeedEmployee {
  employee_no: string;
  name: string;
  department: string;
  area: string;
  plant_code: string;
  role: "employee" | "admin";
  ntid: string;
  email: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_name?: string;
  is_active: boolean;
}

export const bidpEmployees: SeedEmployee[] = [
  { employee_no: "30698665", name: "Karthik",      department: "BIDP1/TEF", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "karthik",  email: "karthik@company.com",       is_active: true },
  { employee_no: "30698701", name: "Suresh Patil", department: "BIDP2/QAL", area: "RBIN/BIDP2", plant_code: "PLT-01", role: "employee", ntid: "spatil",   email: "suresh.patil@company.com",  is_active: true },
  { employee_no: "30698702", name: "Anita Sharma", department: "BIDP1/MNT", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "asharma",  email: "anita.sharma@company.com",  is_active: true },
  { employee_no: "30698704", name: "Priya Devi",   department: "BIDP1/SAF", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "pdevi",    email: "priya.devi@company.com",    is_active: true },
  { employee_no: "30698706", name: "Kavitha Nair", department: "BIDP2/QAL", area: "RBIN/BIDP3", plant_code: "PLT-01", role: "employee", ntid: "knair",    email: "kavitha.nair@company.com",  is_active: true },
  // FLM / BPS authority employees
  { employee_no: "30698710", name: "Suresh M",     department: "BIDP1/TEF", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "ssuresh",  email: "suresh@company.com",        is_active: true },
  { employee_no: "30698711", name: "Ganesh R",     department: "BIDP2/QAL", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "rganesh",  email: "ganesh@company.com",        is_active: true },
  { employee_no: "30698712", name: "Priya S",      department: "BIDP1/HRD", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "spriya",   email: "priya@company.com",         is_active: true },
  { employee_no: "30698730", name: "Ramesh Iyer",  department: "BIDP1/MNT", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "riyer",    email: "ramesh.iyer@company.com",   is_active: true },
  { employee_no: "30698731", name: "Lakshmi Rao",  department: "BIDP1/ADM", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "lrao",     email: "lakshmi.rao@company.com",   is_active: true },
  // Admin
  { employee_no: "30698720", name: "Vijay Sharma", department: "BIDP1/ADM", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "admin",    ntid: "vsharma",  email: "vijay.sharma@company.com",  is_active: true },
  { employee_no: "30698740", name: "Deepak Verma", department: "BIDP1/ADM", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "admin",    ntid: "dverma",   email: "deepak.verma@company.com", is_active: true },
  // Additional manpower — a few regular employees added to every department
  // so the employee directory (Assign Authority lookup, General Enquiry
  // search, team-member/co-suggestor pickers) has staff across all depts.
  { employee_no: "30698741", name: "Manoj Kumar",     department: "BIDP1/TEF", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "mkumar",     email: "manoj.kumar@company.com",     is_active: true },
  { employee_no: "30698742", name: "Divya Reddy",     department: "BIDP1/TEF", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "dreddy",     email: "divya.reddy@company.com",     is_active: true },
  { employee_no: "30698743", name: "Arun Prasad",     department: "BIDP2/QAL", area: "RBIN/BIDP2", plant_code: "PLT-01", role: "employee", ntid: "aprasad",    email: "arun.prasad@company.com",     is_active: true },
  { employee_no: "30698744", name: "Meera Krishnan",  department: "BIDP2/QAL", area: "RBIN/BIDP2", plant_code: "PLT-01", role: "employee", ntid: "mkrishnan",  email: "meera.krishnan@company.com",  is_active: true },
  { employee_no: "30698745", name: "Sanjay Gupta",    department: "BIDP1/MNT", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "sgupta",     email: "sanjay.gupta@company.com",    is_active: true },
  { employee_no: "30698746", name: "Pooja Mehta",     department: "BIDP1/MNT", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "pmehta",     email: "pooja.mehta@company.com",     is_active: true },
  { employee_no: "30698747", name: "Vikas Singh",     department: "BIDP1/SAF", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "vsingh",     email: "vikas.singh@company.com",     is_active: true },
  { employee_no: "30698748", name: "Nandini Rao",     department: "BIDP1/SAF", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "nrao",       email: "nandini.rao@company.com",     is_active: true },
  { employee_no: "30698749", name: "Rahul Joshi",     department: "BIDP1/HRD", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "rjoshi",     email: "rahul.joshi@company.com",     is_active: true },
  { employee_no: "30698750", name: "Swathi Menon",    department: "BIDP1/HRD", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "smenon",     email: "swathi.menon@company.com",    is_active: true },
  { employee_no: "30698751", name: "Ashok Pillai",    department: "BIDP1/ADM", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "apillai",    email: "ashok.pillai@company.com",    is_active: true },
  { employee_no: "30698752", name: "Geeta Bansal",    department: "BIDP1/ADM", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "gbansal",    email: "geeta.bansal@company.com",    is_active: true },
  { employee_no: "30698753", name: "Naveen Kumar",    department: "BIDP3/LOG", area: "RBIN/BIDP3", plant_code: "PLT-01", role: "employee", ntid: "nkumar",     email: "naveen.kumar@company.com",    is_active: true },
  { employee_no: "30698754", name: "Shalini Devi",    department: "BIDP3/LOG", area: "RBIN/BIDP3", plant_code: "PLT-01", role: "employee", ntid: "sdevi",      email: "shalini.devi@company.com",    is_active: true },
  { employee_no: "30698755", name: "Rajiv Menon",     department: "BIDP3/LOG", area: "RBIN/BIDP3", plant_code: "PLT-01", role: "employee", ntid: "rmenon",     email: "rajiv.menon@company.com",     is_active: true },
  { employee_no: "30698756", name: "Abhishek Rao",    department: "BIDP2/RND", area: "RBIN/BIDP2", plant_code: "PLT-01", role: "employee", ntid: "arao",       email: "abhishek.rao@company.com",    is_active: true },
  { employee_no: "30698757", name: "Kavya Iyer",      department: "BIDP2/RND", area: "RBIN/BIDP2", plant_code: "PLT-01", role: "employee", ntid: "kiyer",      email: "kavya.iyer@company.com",      is_active: true },
  { employee_no: "30698758", name: "Siddharth Nair",  department: "BIDP2/RND", area: "RBIN/BIDP2", plant_code: "PLT-01", role: "employee", ntid: "snair",      email: "siddharth.nair@company.com",  is_active: true },
  { employee_no: "30698759", name: "Neha Kapoor",     department: "BIDP1/FIN", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "nkapoor",    email: "neha.kapoor@company.com",     is_active: true },
  { employee_no: "30698760", name: "Vinod Shetty",    department: "BIDP1/FIN", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "vshetty",    email: "vinod.shetty@company.com",    is_active: true },
  { employee_no: "30698761", name: "Anjali Verma",    department: "BIDP1/FIN", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "averma",     email: "anjali.verma@company.com",    is_active: true },
  { employee_no: "30698762", name: "Rohit Malhotra",  department: "BIDP1/ITS", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "rmalhotra",  email: "rohit.malhotra@company.com",  is_active: true },
  { employee_no: "30698763", name: "Sneha Pillai",    department: "BIDP1/ITS", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "spillai",    email: "sneha.pillai@company.com",    is_active: true },
  { employee_no: "30698764", name: "Karan Bhatt",     department: "BIDP1/ITS", area: "RBIN/BIDP1", plant_code: "PLT-01", role: "employee", ntid: "kbhatt",     email: "karan.bhatt@company.com",     is_active: true },
];

// ─── Suggestion seed ──────────────────────────────────────────────────────────

export const bidpSuggestions = [
  // ═══ Karthik's suggestions — showing different pipeline stages ═══
  // #1: Submitted → pending with FLM Suresh M
  { id: 1,  suggestion_no: "SSS-2026-001", type: "Simple Suggestion Scheme", type_code: "SSS", subject: "Improve conveyor belt alignment",          category: "Productivity",    status: "Submitted",         date: "2026-02-20", range: "TEF", suggestion_for: "self", group_suggestion: "no", employee_no: "30698665", employee_name: "Karthik",      department: "BIDP1/TEF", pending_with: "FLM - Suresh M",  assigned_flm: "30698710", approval_level: "FLM", days_pending: 10, plant_code: "PLT-01", present_method: "Manual alignment of conveyor belt every shift", proposed_method: "Install auto-alignment sensor system", benefits: "Reduce downtime by 30%, save 2 hours per shift", attachment: "conveyor_alignment_proposal.pdf", created_at: "2026-02-20T10:00:00Z", updated_at: "2026-02-20T10:00:00Z" },
  // #2: FLM evaluated → pending Manager (high value)
  { id: 2,  suggestion_no: "SFC-2026-012", type: "Shop Floor CIP",           type_code: "SFC", subject: "Reduce coolant wastage in CNC area",        category: "Cost Reduction",  status: "Pending Manager",   date: "2026-02-15", range: "QAL", suggestion_for: "self", group_suggestion: "no", employee_no: "30698665", employee_name: "Karthik",      department: "BIDP1/TEF", pending_with: "Manager",         assigned_flm: "30698710", approval_level: "Manager", award_amount: 800, evaluated_by: "30698710", evaluated_by_name: "Suresh M", evaluated_on: "2026-02-18", days_pending: 3, pending_since: "2026-02-18", plant_code: "PLT-01", present_method: "Coolant flows continuously during non-cutting operations", proposed_method: "Install proximity sensor to auto-stop coolant when idle", benefits: "Save 200L coolant/month, reduce cost by ₹15,000/month", created_at: "2026-02-15T10:00:00Z", updated_at: "2026-02-18T10:00:00Z" },
  // #3: Fully approved & closed
  { id: 3,  suggestion_no: "CTF-2026-005", type: "Cash The Flash",           type_code: "CTF", subject: "Quick fix for pneumatic leak",               category: "Safety",          status: "Approved & Closed", date: "2026-01-28", range: "TEF", suggestion_for: "self", group_suggestion: "no", employee_no: "30698665", employee_name: "Karthik",      department: "BIDP1/TEF", assigned_flm: "30698710", evaluated_by: "30698710", evaluated_by_name: "Suresh M", evaluated_on: "2026-01-30", approved_by_bps_admin: "30698720", approved_by_bps_admin_name: "Vijay Sharma", approved_by_bps_admin_on: "2026-02-03", days_pending: 0, plant_code: "PLT-01", present_method: "Air leak in pneumatic line causing pressure drop", proposed_method: "Replaced worn O-ring and added sealant tape", benefits: "Prevented line shutdown, saved ₹5,000 in downtime", attachment: "pneumatic_fix_photo.jpg", award_amount: 500, award_category: "Silver", award_date: "2026-02-05", created_at: "2026-01-28T10:00:00Z", updated_at: "2026-02-05T10:00:00Z" },
  // #4: Draft
  { id: 4,  suggestion_no: "MIC-2026-003", type: "My Idea Card",             type_code: "MIC", subject: "Better tool storage organization",           category: "5S / Housekeeping", status: "Draft",           date: "2026-02-28", range: "PRD", suggestion_for: "self", group_suggestion: "no", employee_no: "30698665", employee_name: "Karthik",      department: "BIDP1/TEF", days_pending: 0, plant_code: "PLT-01", present_method: "Tools scattered on workbench", proposed_method: "Shadow board with labeled slots for each tool", benefits: "Reduce tool search time by 50%", created_at: "2026-02-28T10:00:00Z", updated_at: "2026-02-28T10:00:00Z" },
  // #5: Fully approved high-value (full pipeline including BPS DH)
  { id: 5,  suggestion_no: "SSS-2026-008", type: "Simple Suggestion Scheme", type_code: "SSS", subject: "LED lighting upgrade in assembly area",     category: "Energy Saving",   status: "Approved & Closed", date: "2026-01-10", range: "TEF", suggestion_for: "self", group_suggestion: "no", employee_no: "30698665", employee_name: "Karthik",      department: "BIDP1/TEF", assigned_flm: "30698710", evaluated_by: "30698710", evaluated_by_name: "Suresh M", evaluated_on: "2026-01-12", approved_by_manager: "30698702", approved_by_manager_name: "Anita Sharma", approved_by_manager_on: "2026-01-18", approved_by_bps_admin: "30698720", approved_by_bps_admin_name: "Vijay Sharma", approved_by_bps_admin_on: "2026-01-25", approved_by_bps_dh: "30698704", approved_by_bps_dh_name: "Priya Devi", approved_by_bps_dh_on: "2026-02-01", days_pending: 0, plant_code: "PLT-01", present_method: "Fluorescent tube lights with high energy consumption", proposed_method: "Replace with energy-efficient LED panels", benefits: "40% energy savings, better illumination, reduced maintenance", attachment: "led_upgrade_report.pdf", award_amount: 1000, award_category: "Gold", award_date: "2026-02-01", created_at: "2026-01-10T10:00:00Z", updated_at: "2026-02-01T10:00:00Z" },
  // #6: Daily CIP — auto-closed
  { id: 6,  suggestion_no: "DCP-2026-020", type: "Daily CIP",                type_code: "DCP", subject: "Daily cleanup checklist for workstation",    category: "5S / Housekeeping", status: "Approved & Closed", date: "2026-02-27", range: "QAL", suggestion_for: "self", group_suggestion: "no", employee_no: "30698665", employee_name: "Karthik",      department: "BIDP1/TEF", days_pending: 0, plant_code: "PLT-01", present_method: "No structured cleanup process at end of shift", proposed_method: "Implement 5-point daily cleanup checklist", benefits: "Improved workplace hygiene and reduced next-shift setup time", created_at: "2026-02-27T10:00:00Z", updated_at: "2026-02-27T10:00:00Z" },
  // ═══ Other employees' submissions pending with Suresh (FLM) ═══
  // #7: Submitted by Suresh Patil → FLM Suresh M
  { id: 7,  suggestion_no: "SSS-2026-015", type: "Simple Suggestion Scheme", type_code: "SSS", subject: "Anti-fatigue mats for assembly stations",    category: "Ergonomics",      status: "Submitted",         date: "2026-02-18", range: "TEF", suggestion_for: "self", group_suggestion: "no", employee_no: "30698701", employee_name: "Suresh Patil", department: "BIDP2/QAL", pending_with: "FLM - Suresh M",  assigned_flm: "30698710", approval_level: "FLM", days_pending: 12, plant_code: "PLT-01", present_method: "Workers stand on hard concrete floor for 8 hours", proposed_method: "Install anti-fatigue rubber mats at all standing stations", benefits: "Reduce fatigue-related injuries by 40%, improve morale", created_at: "2026-02-18T10:00:00Z", updated_at: "2026-02-18T10:00:00Z" },
  // #8: Approved & Closed
  { id: 8,  suggestion_no: "CTF-2026-009", type: "Cash The Flash",           type_code: "CTF", subject: "Emergency valve replacement on boiler line", category: "Safety",          status: "Approved & Closed", date: "2026-01-20", range: "QAL", suggestion_for: "self", group_suggestion: "no", employee_no: "30698702", employee_name: "Anita Sharma", department: "BIDP1/MNT", assigned_flm: "30698710", evaluated_by: "30698710", evaluated_by_name: "Suresh M", evaluated_on: "2026-01-22", approved_by_bps_admin: "30698720", approved_by_bps_admin_name: "Vijay Sharma", approved_by_bps_admin_on: "2026-01-26", days_pending: 0, plant_code: "PLT-01", present_method: "Corroded valve causing minor steam leak", proposed_method: "Replaced with stainless steel valve and added guard", benefits: "Prevented potential burn hazard, saved ₹12,000", award_amount: 750, award_category: "Silver", award_date: "2026-01-28", created_at: "2026-01-20T10:00:00Z", updated_at: "2026-01-28T10:00:00Z" },
  // #9: Approved & Closed (full pipeline)
  { id: 9,  suggestion_no: "SFC-2026-018", type: "Shop Floor CIP",           type_code: "SFC", subject: "Automated oil level monitoring",             category: "Productivity",    status: "Approved & Closed", date: "2026-01-05", range: "TEF", suggestion_for: "self", group_suggestion: "no", employee_no: "30698701", employee_name: "Suresh Patil", department: "BIDP2/QAL", assigned_flm: "30698711", evaluated_by: "30698711", evaluated_by_name: "Ganesh R", evaluated_on: "2026-01-08", approved_by_manager: "30698702", approved_by_manager_name: "Anita Sharma", approved_by_manager_on: "2026-01-15", approved_by_bps_admin: "30698720", approved_by_bps_admin_name: "Vijay Sharma", approved_by_bps_admin_on: "2026-01-25", approved_by_bps_dh: "30698704", approved_by_bps_dh_name: "Priya Devi", approved_by_bps_dh_on: "2026-02-05", days_pending: 0, plant_code: "PLT-01", present_method: "Manual dipstick check every 2 hours", proposed_method: "IoT sensor with dashboard alert system", benefits: "Eliminated manual checks, prevented 3 machine failures/month", award_amount: 2000, award_category: "Gold", award_date: "2026-02-10", created_at: "2026-01-05T10:00:00Z", updated_at: "2026-02-10T10:00:00Z" },
  // #10: Pending BPS Admin
  { id: 10, suggestion_no: "MIC-2026-007", type: "My Idea Card",             type_code: "MIC", subject: "Color-coded PPE storage bins",               category: "Safety",          status: "Pending BPS Admin", date: "2026-02-22", range: "PRD", suggestion_for: "self", group_suggestion: "no", employee_no: "30698704", employee_name: "Priya Devi",   department: "BIDP1/SAF", pending_with: "BPS Admin",       assigned_flm: "30698710", approval_level: "BPS Admin", award_amount: 300, evaluated_by: "30698710", evaluated_by_name: "Suresh M", evaluated_on: "2026-02-24", days_pending: 5, pending_since: "2026-02-24", plant_code: "PLT-01", present_method: "PPE mixed together in single bin", proposed_method: "Separate color-coded bins for each PPE type", benefits: "Faster PPE selection, reduced contamination risk", created_at: "2026-02-22T10:00:00Z", updated_at: "2026-02-24T10:00:00Z" },
  // #11: Daily CIP — auto-closed
  { id: 11, suggestion_no: "DCP-2026-025", type: "Daily CIP",                type_code: "DCP", subject: "Shift handover digital checklist",           category: "Quality",         status: "Approved & Closed", date: "2026-02-10", range: "MNT", suggestion_for: "self", group_suggestion: "no", employee_no: "30698710", employee_name: "Suresh M",     department: "BIDP1/TEF", days_pending: 0, plant_code: "PLT-01", present_method: "Verbal handover with occasional missed items", proposed_method: "Tablet-based checklist with photo evidence", benefits: "Zero missed handover items, 15 min time saving per shift", award_amount: 250, award_category: "Bronze", award_date: "2026-02-20", created_at: "2026-02-10T10:00:00Z", updated_at: "2026-02-20T10:00:00Z" },
  // #12: Rejected by FLM
  { id: 12, suggestion_no: "SSS-2026-022", type: "Simple Suggestion Scheme", type_code: "SSS", subject: "Compressed air leak detection program",      category: "Energy Saving",   status: "Rejected",          date: "2026-01-15", range: "QAL", suggestion_for: "self", group_suggestion: "no", employee_no: "30698706", employee_name: "Kavitha Nair", department: "BIDP2/QAL", assigned_flm: "30698710", approval_level: "FLM", evaluated_by: "30698710", evaluated_by_name: "Suresh M", evaluated_on: "2026-01-17", rejection_reason: "Similar program already approved under SSS-2025-089.", rejected_by: "30698710", rejected_by_name: "Suresh M", rejected_on: "2026-01-17", days_pending: 0, plant_code: "PLT-01", present_method: "No systematic air leak detection", proposed_method: "Monthly ultrasonic leak detection rounds", benefits: "Estimated 20% compressed air cost saving", created_at: "2026-01-15T10:00:00Z", updated_at: "2026-01-17T10:00:00Z" },
  // #13: Submitted → pending with FLM Suresh M (CTF)
  { id: 13, suggestion_no: "CTF-2026-011", type: "Cash The Flash",           type_code: "CTF", subject: "Guard rail repair on mezzanine floor",       category: "Safety",          status: "Submitted",         date: "2026-03-01", range: "TEF", suggestion_for: "self", group_suggestion: "no", employee_no: "30698702", employee_name: "Anita Sharma", department: "BIDP1/MNT", pending_with: "FLM - Suresh M",  assigned_flm: "30698710", approval_level: "FLM", days_pending: 5, plant_code: "PLT-01", present_method: "Loose guard rail bolts on mezzanine", proposed_method: "Re-torqued all bolts and added locking washers", benefits: "Eliminated fall hazard for 15 workers", created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  // #14: Submitted → pending with FLM Suresh M (SFC)
  { id: 14, suggestion_no: "SFC-2026-030", type: "Shop Floor CIP",           type_code: "SFC", subject: "Kanban system for spare parts inventory",    category: "Productivity",    status: "Submitted",         date: "2026-03-02", range: "PRD", suggestion_for: "self", group_suggestion: "no", employee_no: "30698701", employee_name: "Suresh Patil", department: "BIDP2/QAL", pending_with: "FLM - Suresh M",  assigned_flm: "30698710", approval_level: "FLM", days_pending: 4, plant_code: "PLT-01", present_method: "Ad-hoc ordering when parts run out", proposed_method: "Two-bin Kanban with visual reorder triggers", benefits: "Zero stockout incidents, 30% inventory reduction", created_at: "2026-03-02T10:00:00Z", updated_at: "2026-03-02T10:00:00Z" },
  // #15: Approved & Closed (high-value, full pipeline)
  { id: 15, suggestion_no: "SSS-2026-028", type: "Simple Suggestion Scheme", type_code: "SSS", subject: "Noise reduction in grinding area",           category: "Environment",     status: "Approved & Closed", date: "2025-12-15", range: "TEF", suggestion_for: "self", group_suggestion: "no", employee_no: "30698702", employee_name: "Anita Sharma", department: "BIDP1/MNT", assigned_flm: "30698711", evaluated_by: "30698711", evaluated_by_name: "Ganesh R", evaluated_on: "2025-12-18", approved_by_manager: "30698702", approved_by_manager_name: "Anita Sharma", approved_by_manager_on: "2025-12-25", approved_by_bps_admin: "30698720", approved_by_bps_admin_name: "Vijay Sharma", approved_by_bps_admin_on: "2026-01-05", approved_by_bps_dh: "30698704", approved_by_bps_dh_name: "Priya Devi", approved_by_bps_dh_on: "2026-01-15", days_pending: 0, plant_code: "PLT-01", present_method: "Noise level exceeding 90dB in grinding bay", proposed_method: "Acoustic enclosures and vibration dampening mounts", benefits: "Reduced noise to 72dB, improved worker comfort", award_amount: 1500, award_category: "Gold", award_date: "2026-01-20", created_at: "2025-12-15T10:00:00Z", updated_at: "2026-01-20T10:00:00Z" },
  // #16: Pending BPS DH
  { id: 16, suggestion_no: "SSS-2026-035", type: "Simple Suggestion Scheme", type_code: "SSS", subject: "Automated weld quality inspection system",   category: "Quality",         status: "Pending BPS DH",    date: "2026-02-25", range: "QAL", suggestion_for: "self", group_suggestion: "no", employee_no: "30698702", employee_name: "Anita Sharma", department: "BIDP1/MNT", pending_with: "BPS DH",          assigned_flm: "30698710", approval_level: "BPS DH", award_amount: 1200, evaluated_by: "30698710", evaluated_by_name: "Suresh M", evaluated_on: "2026-02-27", approved_by_manager: "30698702", approved_by_manager_name: "Anita Sharma", approved_by_manager_on: "2026-03-02", approved_by_bps_admin: "30698720", approved_by_bps_admin_name: "Vijay Sharma", approved_by_bps_admin_on: "2026-03-05", days_pending: 2, pending_since: "2026-03-05", plant_code: "PLT-01", present_method: "Manual visual inspection of weld joints", proposed_method: "Camera-based AI inspection with defect classification", benefits: "99% defect detection rate, 60% faster inspection", created_at: "2026-02-25T10:00:00Z", updated_at: "2026-03-05T10:00:00Z" },
];

// ─── BidP-specific report stats ───────────────────────────────────────────────

export const bidpDeptStats = [
  { dept: "BIDP1/TEF", total: 45, implemented: 38, pending: 5, rejected: 2, participation: 92 },
  { dept: "BIDP2/QAL", total: 32, implemented: 25, pending: 4, rejected: 3, participation: 85 },
  { dept: "BIDP1/MNT", total: 28, implemented: 22, pending: 4, rejected: 2, participation: 78 },
  { dept: "BIDP1/SAF", total: 15, implemented: 12, pending: 2, rejected: 1, participation: 72 },
  { dept: "BIDP1/HRD", total: 8,  implemented: 5,  pending: 2, rejected: 1, participation: 45 },
];

export const bidpCategoryStats = [
  { name: "Safety",          value: 35 },
  { name: "Quality",         value: 28 },
  { name: "Productivity",    value: 42 },
  { name: "Cost Reduction",  value: 22 },
  { name: "Energy Saving",   value: 18 },
  { name: "5S / Housekeeping", value: 15 },
  { name: "Ergonomics",      value: 10 },
  { name: "Environment",     value: 8  },
];

// ─── BidP authority assignments — roles match pipeline level names ────────────
export const bidpAuthorityAssignments = [
  { id: 110, plant_code: "PLT-01", employee_no: "30698710", name: "Suresh M",     department: "BIDP1/TEF", role: "FLM",       type: "Internal", email: "suresh@company.com",       ntid: "ssuresh"  },
  { id: 111, plant_code: "PLT-01", employee_no: "30698711", name: "Ganesh R",     department: "BIDP2/QAL", role: "FLM",       type: "Internal", email: "ganesh@company.com",       ntid: "rganesh"  },
  { id: 112, plant_code: "PLT-01", employee_no: "30698712", name: "Priya S",      department: "BIDP1/HRD", role: "FLM",       type: "Internal", email: "priya@company.com",        ntid: "spriya"   },
  { id: 113, plant_code: "PLT-01", employee_no: "30698702", name: "Anita Sharma", department: "BIDP1/MNT", role: "Manager",   type: "Internal", email: "anita.sharma@company.com", ntid: "asharma"  },
  { id: 114, plant_code: "PLT-01", employee_no: "30698720", name: "Vijay Sharma", department: "BIDP1/ADM", role: "BPS Admin", type: "Internal", email: "vijay.sharma@company.com", ntid: "vsharma"  },
  { id: 115, plant_code: "PLT-01", employee_no: "30698704", name: "Priya Devi",   department: "BIDP1/SAF", role: "BPS DH",    type: "Internal", email: "priya.devi@company.com",   ntid: "pdevi"    },
  { id: 116, plant_code: "PLT-01", employee_no: "30698730", name: "Ramesh Iyer",  department: "BIDP1/MNT", role: "Dept General Manager", type: "Internal", email: "ramesh.iyer@company.com", ntid: "riyer" },
  { id: 117, plant_code: "PLT-01", employee_no: "30698731", name: "Lakshmi Rao",  department: "BIDP1/ADM", role: "General Manager",      type: "Internal", email: "lakshmi.rao@company.com", ntid: "lrao"  },
  { id: 118, plant_code: "PLT-01", employee_no: "30698740", name: "Deepak Verma", department: "BIDP1/ADM", role: "VS RC",               type: "Internal", email: "deepak.verma@company.com", ntid: "dverma" },
];
