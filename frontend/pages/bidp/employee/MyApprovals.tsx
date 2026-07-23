import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlant } from "@/contexts/PlantContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { CheckSquare, Clock, User, Users, FileText, IndianRupee, XCircle, ChevronRight, ChevronLeft, Eye, Send, Lightbulb, Zap, Star, TrendingUp, Layers, Undo2, AlertTriangle, MessageSquare, RotateCcw, ArrowRightLeft, Paperclip, Download, ZoomIn, Image as ImageIcon, Award, Info, Calculator, Upload, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusColors, Suggestion, mockEmployees } from "@/lib/mockData";
import { type AttachmentItem, formatFileSize, isImageMime, filesToAttachmentItems } from "@/lib/attachmentUtils";
import * as apiService from "@/lib/apiService";
import { toast } from "sonner";
import { flmOptions, teamMemberOptions } from "@/lib/bidp/suggestionConstants";
import {
  roleToApprovalLevel,
  getStatusesForLevel,
  buildApprovalUpdate,
  buildRejectionUpdate,
  buildSendBackUpdate,
  buildRerouteUpdate,
  getPreviousStep,
  getNextStep,
  getPipeline,
  getPipelineDisplay,
  calculateDaysPending,
  calculateCtfAward,
  MIC_FIXED_AMOUNT,
  type ApprovalLevel,
} from "@/lib/bidp/approvalPipeline";

// ── SFC Evaluation constants (moved to module scope) ──────────────────────
const SFC_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const SFC_MONTH_POINTS = [25, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2] as const;
const SFC_WEIGHTAGE_OPTIONS = [
  { label: "x1 (1st Kaizen)", value: 1 },
  { label: "x1.25 (2nd Kaizen)", value: 1.25 },
  { label: "x1.5 (3rd Kaizen)", value: 1.5 },
  { label: "x1.75 (4th Kaizen)", value: 1.75 },
] as const;
const SFC_GEMBA_ROWS = [
  { label: "Importance of the project to the value stream", max: 30, options: [{ label: "Directly linked to business case", pts: 30 }, { label: "Safety / Department objectives", pts: 20 }, { label: "No Relation", pts: 10 }] },
  { label: "Sustenance of actions", max: 5, options: [{ label: "Long term", pts: 5 }, { label: "Mid term", pts: 3 }, { label: "Short term", pts: 2 }, { label: "Nil", pts: 0 }] },
  { label: "Horizontal Deployment", max: 5, options: [{ label: "Implemented", pts: 5 }, { label: "Implementation initiated", pts: 3 }, { label: "Implementation initiated", pts: 2 }, { label: "None", pts: 0 }] },
  { label: "Evaluation of project / Kaizen Sheet", max: 30, options: [{ label: "Exemplary", pts: 30 }, { label: "Good", pts: 20 }, { label: "Average", pts: 10 }, { label: "Not done", pts: 0 }] },
  { label: "Standardization", max: 15, options: [{ label: "100% adherence", pts: 15 }, { label: "0.5", pts: 5 }, { label: "0.25", pts: 3 }, { label: "Nil", pts: 0 }] },
  { label: "Presentation of project to RC/RH", max: 15, options: [{ label: "Presented", pts: 15 }, { label: "Presentation slot finalized", pts: 3 }, { label: "Not ready", pts: 2 }, { label: "Nil", pts: 0 }] },
] as const;

const MyApprovals = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { plant } = usePlant();
  const { suggestions, updateSuggestion } = useSuggestions();
  const { addNotification } = useNotifications();

  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackReason, setSendBackReason] = useState("");
  const [sendBackTargetLevel, setSendBackTargetLevel] = useState<string>("");
  const [sendBackAttachFiles, setSendBackAttachFiles] = useState<AttachmentItem[]>([]);
  const sendBackFileInputRef = useRef<HTMLInputElement>(null);
  const [rerouteOpen, setRerouteOpen] = useState(false);
  const [rerouteLevel, setRerouteLevel] = useState<string>("");
  const [rerouteTargetEmpNo, setRerouteTargetEmpNo] = useState("");
  const [rerouteReason, setRerouteReason] = useState("");
  const [awardAmount, setAwardAmount] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("all");
  const [sentBackFilter, setSentBackFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [activeTypeFilter, sentBackFilter]);

  // Lightbox state for attachment images inside the review dialog
  const [lightboxImages, setLightboxImages] = useState<AttachmentItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // ── SSS Evaluation form state (FLM only, SSS suggestions) ─────────────────
  // 10 criteria rows; each score is null (unset) or a number
  const SSS_CRITERIA = [
    { label: "Position or Grade Factor", optA: { label: "1 – Workmen", pts: 0.5 }, optB: { label: "2 – Supervisor & Above", pts: 1 } },
    { label: "Merit Factor", optA: { label: "0.5 – Routine", pts: 0.5 }, optB: { label: "1 – Innovative", pts: 1 } },
    { label: "Technical Value of Suggestion", optA: { label: "0.5 – Routine", pts: 0.5 }, optB: { label: "1 – Innovative", pts: 1 } },
    { label: "Effort Factor", optA: { label: "0.5 – Normal Effort", pts: 0.5 }, optB: { label: "1 – Extra Effort", pts: 1 } },
    { label: "Safety Factor", optA: { label: "0.5 – Good", pts: 0.5 }, optB: { label: "1 – Excellent", pts: 1 } },
    { label: "Applicability", optA: { label: "0 – Wider Operation", pts: 0 }, optB: { label: "1 – Wider Application", pts: 1 } },
    { label: "Recurring Benefit", optA: { label: "0 – One Time Benefit", pts: 0 }, optB: { label: "1 – Benefits is Recurring in Nature", pts: 1 } },
    { label: "Customer Satisfaction", optA: { label: "0 – NA", pts: 0 }, optB: { label: "1 – Result in Customer Satisfaction", pts: 1 } },
    { label: "Cycle Time Reduction", optA: { label: "0 – NA", pts: 0 }, optB: { label: "1 – Result in Cycle Time Reduction", pts: 1 } },
    { label: "Systems & Procedures", optA: { label: "0 – NA", pts: 0 }, optB: { label: "1 – Improves System & Procedure", pts: 1 } },
  ] as const;
  // selections[i] = "A" | "B" | null
  const [sssSelections, setSssSelections] = useState<(null | "A" | "B")[]>(Array(10).fill(null));
  const [sssWeightage, setSssWeightage] = useState("");
  const [sssCalculatedAmount, setSssCalculatedAmount] = useState<number | null>(null);
  const [sssComments, setSssComments] = useState("");
  const [sssForwardTo, setSssForwardTo] = useState("");
  const [sssAttachFiles, setSssAttachFiles] = useState<AttachmentItem[]>([]);
  const [sssAttachCount, setSssAttachCount] = useState("");
  const sssFileInputRef = useRef<HTMLInputElement>(null);
  // Fallback authority data — used when backend is unreachable so the forward dropdown is never empty
  const FALLBACK_AUTHORITY: apiService.AuthorityAssignment[] = [
    { id: 110, plant_code: "PLT-01", employee_no: "30698710", name: "Suresh M", department: "BIDP1/TEF", role: "FLM", type: "Internal" },
    { id: 111, plant_code: "PLT-01", employee_no: "30698711", name: "Ganesh R", department: "BIDP2/QAL", role: "FLM", type: "Internal" },
    { id: 112, plant_code: "PLT-01", employee_no: "30698712", name: "Priya S", department: "BIDP1/HRD", role: "FLM", type: "Internal" },
    { id: 113, plant_code: "PLT-01", employee_no: "30698702", name: "Anita Sharma", department: "BIDP1/MNT", role: "Manager", type: "Internal" },
    { id: 114, plant_code: "PLT-01", employee_no: "30698720", name: "Vijay Sharma", department: "BIDP1/ADM", role: "BPS Admin", type: "Internal" },
    { id: 115, plant_code: "PLT-01", employee_no: "30698704", name: "Priya Devi", department: "BIDP1/SAF", role: "BPS DH", type: "Internal" },
    { id: 119, plant_code: "PLT-01", employee_no: "30698749", name: "Rahul Joshi", department: "BIDP1/HRD", role: "Implementation", type: "Internal" },
    { id: 120, plant_code: "PLT-01", employee_no: "30698752", name: "Geeta Bansal", department: "BIDP1/ADM", role: "CTG", type: "Internal" },
    { id: 118, plant_code: "PLT-01", employee_no: "30698740", name: "Deepak Verma", department: "BIDP1/ADM", role: "VS RC", type: "Internal" },
  ];
  const [sssApprovers, setSssApprovers] = useState<apiService.AuthorityAssignment[]>(FALLBACK_AUTHORITY);

  // Load authority list for Forward-For-Approval dropdown
  useEffect(() => {
    apiService.fetchAuthority(plant as "bidp" | "jap").then(list => {
      // Load all approvers; forward dropdown filters dynamically by next pipeline level
      if (list.length > 0) setSssApprovers(list);
    }).catch(() => { /* keep fallback */ });
  }, [plant]);

  const sssTotalPoints = sssSelections.reduce<number>((sum, sel, i) => {
    if (sel === null) return sum;
    return sum + (sel === "A" ? SSS_CRITERIA[i].optA.pts : SSS_CRITERIA[i].optB.pts);
  }, 0);

  const resetSssForm = () => {
    setSssSelections(Array(10).fill(null));
    setSssWeightage("");
    setSssCalculatedAmount(null);
    setSssComments("");
    setSssForwardTo("");
    setSssAttachFiles([]);
    setSssAttachCount("");
  };

  // ── SFC Evaluation form state (FLM only, Shop Floor CIP) ──────────────────
  const [sfcSelectedMonth, setSfcSelectedMonth] = useState<number | null>(null); // index 0-11
  const [sfcSelectedWeightage, setSfcSelectedWeightage] = useState<number | null>(null); // index 0-3
  const [sfcGembaSelections, setSfcGembaSelections] = useState<(number | null)[]>(Array(6).fill(null)); // points scored per row
  const [sfcFinalPoints, setSfcFinalPoints] = useState<number | null>(null);
  const [sfcForwardTo, setSfcForwardTo] = useState("");
  const [sfcComments, setSfcComments] = useState("");
  const [sfcAttachFiles, setSfcAttachFiles] = useState<AttachmentItem[]>([]);
  const sfcFileInputRef = useRef<HTMLInputElement>(null);

  // Kaizen Project Points — computed automatically as soon as both a month
  // and a weightage factor are selected (no separate "Calculate" click needed).
  const sfcKaizenPoints = useMemo<number | null>(() => {
    if (sfcSelectedMonth === null || sfcSelectedWeightage === null) return null;
    const pts = SFC_MONTH_POINTS[sfcSelectedMonth] * SFC_WEIGHTAGE_OPTIONS[sfcSelectedWeightage].value;
    return parseFloat(pts.toFixed(2));
  }, [sfcSelectedMonth, sfcSelectedWeightage]);

  // GEMBA total — computed automatically once all 6 rows have a selection.
  const sfcGembaTotal = useMemo<number | null>(() => {
    if (sfcGembaSelections.some(s => s === null)) return null;
    return sfcGembaSelections.reduce<number>((s, v) => s + (v ?? 0), 0);
  }, [sfcGembaSelections]);

  // Any change to the underlying Kaizen/GEMBA inputs invalidates a previously
  // calculated Final Points value — FLM must click "Calculate Final Points" again.
  useEffect(() => {
    setSfcFinalPoints(null);
  }, [sfcKaizenPoints, sfcGembaTotal]);

  // General forward-to state for non-SSS/SFC types and non-FLM levels
  const [forwardTo, setForwardTo] = useState("");
  // General comments — used for Manager / BPS Admin / BPS DH review (and MIC/CTF at FLM level)
  const [reviewComments, setReviewComments] = useState("");
  // General attachments — used for Manager / BPS Admin / BPS DH review (and MIC/CTF at FLM level)
  const [reviewAttachFiles, setReviewAttachFiles] = useState<AttachmentItem[]>([]);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  const resetSfcForm = () => {
    setSfcSelectedMonth(null);
    setSfcSelectedWeightage(null);
    setSfcGembaSelections(Array(6).fill(null));
    setSfcFinalPoints(null);
    setSfcForwardTo("");
    setSfcComments("");
    setSfcAttachFiles([]);
  };

  const TYPE_FILTERS = [
    { key: "all", label: "All", short: "All", icon: Layers, color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", activeColor: "bg-slate-700 text-white border-slate-700 dark:bg-slate-300 dark:text-slate-900" },
    { key: "Simple Suggestion Scheme", label: "Simple Suggestion", short: "SSS", icon: Lightbulb, color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800", activeColor: "bg-blue-600 text-white border-blue-600" },
    { key: "Shop Floor CIP", label: "Shop Floor CIP", short: "SFC", icon: TrendingUp, color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800", activeColor: "bg-orange-500 text-white border-orange-500" },
    { key: "My Idea Card", label: "My Idea Card", short: "MIC", icon: Star, color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800", activeColor: "bg-purple-600 text-white border-purple-600" },
    { key: "Cash The Flash", label: "Cash The Flash", short: "CTF", icon: Zap, color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800", activeColor: "bg-amber-500 text-white border-amber-500" },
  ];

  const currentLevel = user?.bidpRole ? roleToApprovalLevel(user.bidpRole) : null;

  // Determine the effective award amount for pipeline routing (SSS/SFC use evaluated amount)
  // Returns null when FLM hasn't calculated/entered the amount yet (so we can disable the forward dropdown)
  const effectiveAmount = useMemo((): number | null => {
    if (!selected) return 0;
    if (currentLevel === "FLM" && selected.type === "Simple Suggestion Scheme") {
      // null means "not yet calculated" — don't fall back to 0
      return sssCalculatedAmount ?? (selected.awardAmount != null ? selected.awardAmount : null);
    }
    if (currentLevel === "FLM" && selected.type === "Shop Floor CIP") {
      return sfcFinalPoints ?? (selected.awardAmount != null ? selected.awardAmount : null);
    }
    // MIC: always fixed ₹250
    if (selected.type === "My Idea Card") {
      return MIC_FIXED_AMOUNT;
    }
    // CTF at FLM level: no evaluation — forward with 0 amount (CTG does eval later)
    if (currentLevel === "FLM" && selected.type === "Cash The Flash") {
      return 0;
    }
    // CTF at CTG level: CTG enters net savings → route is based on calculateCtfAward(netSavings)
    // selected.awardAmount at this stage is 0 (FLM placeholder) — always derive from the CTG input
    if (currentLevel === "CTG" && selected.type === "Cash The Flash") {
      const netSavings = parseFloat(awardAmount);
      if (!Number.isFinite(netSavings) || netSavings <= 0) return null; // not yet entered
      return calculateCtfAward(netSavings);
    }
    // CTF and other types at FLM: amount is entered manually
    if (currentLevel === "FLM") {
      const amt = parseFloat(awardAmount);
      // If the suggestion already has an award amount (e.g. send-back), use it; otherwise null until entered
      return selected.awardAmount != null ? selected.awardAmount : (Number.isFinite(amt) && amt > 0 ? amt : null);
    }
    // Non-FLM levels: use existing award amount
    return (selected.awardAmount ?? parseFloat(awardAmount)) || 0;
  }, [selected, currentLevel, sssCalculatedAmount, sfcFinalPoints, awardAmount]);

  // Whether the FLM still needs to calculate the amount before forwarding
  const amountNotYetCalculated = effectiveAmount === null;

  // Next approval level based on type + effective amount
  const nextApprovalLevel = useMemo(() => {
    if (!selected) return null;
    if (effectiveAmount === null) return null; // not yet calculated
    // CTF self-implementation: user IS the implementer — route from "Implementation" level
    const isSelfImpl =
      selected.type === "Cash The Flash" &&
      selected.status === "Pending Implementation" &&
      selected.employeeNo === user?.employeeNo &&
      user?.bidpRole !== "bps_admin" &&
      user?.bidpRole !== "bps_dh";
    const level = isSelfImpl ? "Implementation" : currentLevel;
    if (!level) return null;
    return getNextStep(selected.type, effectiveAmount, level)?.level ?? null;
  }, [selected, currentLevel, effectiveAmount, user]);

  // Approvers filtered to just the next pipeline level, preferring the
  // suggestion's own two departments (submitter's department or the
  // suggestion's target department). Falls back to all approvers at that
  // level when none match those departments, so the dropdown is never
  // empty (the demo seed data only has one Manager/BPS Admin/BPS DH persona
  // each, fixed to a single department).
  const forwardCandidates = useMemo(() => {
    if (!nextApprovalLevel || !selected) return [];
    const atLevel = sssApprovers.filter(a => a.role === nextApprovalLevel && a.employee_no !== selected.employeeNo);
    // Resolve suggestion department from top-level OR formData (some suggestions
    // only store it inside formData, e.g. when loaded from backend seed data)
    const suggDept = selected.suggestionDepartment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      || (selected.formData as Record<string, any> | undefined)?.suggestionDepartment;
    const relevantDepts = [selected.department, suggDept].filter(Boolean) as string[];
    if (relevantDepts.length === 0) return atLevel;
    const deptMatched = atLevel.filter(a => relevantDepts.includes(a.department!));
    return deptMatched.length > 0 ? deptMatched : atLevel;
  }, [sssApprovers, nextApprovalLevel, selected]);

  const myApprovals = useMemo(() => {
    if (!user?.employeeNo) return [];
    // CTF self-implementation: the suggester handles the "Pending Implementation" step for
    // their own CTF suggestion. Any non-BPS role (including plain "employee") qualifies.
    const ctfSelfImpl = (user.bidpRole !== "bps_admin" && user.bidpRole !== "bps_dh")
      ? suggestions.filter(s =>
        s.type === "Cash The Flash" &&
        s.status === "Pending Implementation" &&
        s.employeeNo === user.employeeNo
      )
      : [];
    if (user.bidpRole === "employee" || !currentLevel) return ctfSelfImpl;
    const validStatuses = getStatusesForLevel(currentLevel);
    // Approvers at this level across all departments — used to detect whether
    // ANY persona actually covers a given suggestion's department(s). If none
    // do (demo seed data only has one Manager/BPS Admin/BPS DH persona each,
    // fixed to a single department), fall back to showing it to this approver
    // anyway so the suggestion never gets stuck with nobody able to act on it.
    const levelApprovers = sssApprovers.filter(a => a.role === currentLevel);
    const regular = suggestions.filter(s => {
      // Self-exclusion: own suggestions never appear in the regular approval queue
      // (CTF self-impl items are collected separately above and merged at the end)
      if (s.employeeNo === user.employeeNo) return false;
      // FLM: must be assigned to this FLM specifically
      if (currentLevel === "FLM") {
        if (s.assignedFlm === user.employeeNo && validStatuses.includes(s.status)) return true;
        // Also include sent-back suggestions targeted to FLM for this FLM
        if (s.status === "Sent Back" && s.assignedFlm === user.employeeNo && s.sendBackHistory?.length) {
          const lastSb = s.sendBackHistory[s.sendBackHistory.length - 1];
          if (lastSb.to === "FLM") return true;
        }
        return false;
      }
      // Manager/BPS Admin/BPS DH: prefer suggestions belonging to one of the
      // suggestion's two departments (submitter's own department OR the
      // suggestion's target/subject department) that matches this approver's
      // own department. If no approver at this level covers either
      // department, fall back to showing it (see comment above).
      // Exception: if this suggestion was explicitly rerouted to THIS person,
      // always show it to them regardless of department (BPS deliberately
      // chose them, overriding the normal department-based routing).
      if (validStatuses.includes(s.status) && s.rerouteTargetEmpNo === user.employeeNo) return true;
      const suggDept = s.suggestionDepartment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        || (s.formData as Record<string, any> | undefined)?.suggestionDepartment;
      const deptMatches = !!user.department &&
        (s.department === user.department || suggDept === user.department);
      if (!deptMatches) {
        const anyApproverCoversDept = levelApprovers.some(a =>
          a.department === s.department || a.department === suggDept
        );
        if (anyApproverCoversDept) return false;
      }
      if (validStatuses.includes(s.status)) return true;
      // Also include sent-back suggestions targeted to this level
      if (s.status === "Sent Back" && s.sendBackHistory?.length) {
        const lastSb = s.sendBackHistory[s.sendBackHistory.length - 1];
        if (lastSb.to === currentLevel) return true;
      }
      return false;
    });
    // Merge: ctfSelfImpl are the user's own suggestions (excluded from `regular` by self-exclusion)
    return [...ctfSelfImpl, ...regular];
  }, [suggestions, user, currentLevel, sssApprovers]);

  // Helper: check if a suggestion was sent back to the current approver's level
  const isSentBackToMe = (s: Suggestion) => {
    if (s.status !== "Sent Back" || !s.sendBackHistory?.length) return false;
    return s.sendBackHistory[s.sendBackHistory.length - 1].to === currentLevel;
  };

  const sentBackCount = myApprovals.filter(s => isSentBackToMe(s)).length;

  const pendingApprovals = myApprovals.filter(s =>
    s.status !== "Rejected" && s.status !== "Approved & Closed" && s.status !== "Closed" &&
    (activeTypeFilter === "all" || s.type === activeTypeFilter) &&
    (sentBackFilter === "all" || isSentBackToMe(s))
  );
  const processedApprovals = useMemo(() => {
    if (!user?.employeeNo) return [];
    if (!currentLevel) {
      // Employee role (no approval level): show CTF self-implementation history
      return suggestions.filter(s => s.implementedBy === user.employeeNo);
    }
    // Show items this user has already acted on
    return suggestions.filter(s => {
      if (currentLevel === "FLM") return s.evaluatedBy === user.employeeNo;
      if (currentLevel === "Manager") return s.approvedByManager === user.employeeNo;
      if (currentLevel === "BPS Admin") return s.approvedByBpsAdmin === user.employeeNo;
      if (currentLevel === "CTG") return s.ctgEvaluatedBy === user.employeeNo;
      if (currentLevel === "VS RC") return s.approvedByVsRc === user.employeeNo;
      if (currentLevel === "BPS DH") return s.approvedByBpsDh === user.employeeNo;
      // CTF self-implemented (any non-BPS role can be the implementer)
      if (s.implementedBy === user.employeeNo) return true;
      return false;
    });
  }, [suggestions, user, currentLevel]);

  const openReview = (s: Suggestion) => {
    setSelected(s);
    setAwardAmount(s.awardAmount?.toString() || "");
    resetSssForm();
    resetSfcForm();
    setForwardTo("");
    setReviewComments("");
    setReviewAttachFiles([]);
    setDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selected || !user) {
      toast.error("You do not have an approval role configured");
      return;
    }

    const isMIC = selected.type === "My Idea Card";
    const isSSS = selected.type === "Simple Suggestion Scheme";
    const isSFC = selected.type === "Shop Floor CIP";
    const isCTF = selected.type === "Cash The Flash";
    // CTF self-implementation: the suggester handles their own Pending Implementation step
    // Any non-BPS role (including "employee") can be the implementer — these users have
    // no bidpRole approval level (currentLevel is null), so they must be exempted below.
    const isSelfImpl = isCTF &&
      selected.status === "Pending Implementation" &&
      selected.employeeNo === user.employeeNo &&
      user.bidpRole !== "bps_admin" &&
      user.bidpRole !== "bps_dh";

    if (!currentLevel && !isSelfImpl) {
      toast.error("You do not have an approval role configured");
      return;
    }

    // For SSS FLM: use the calculated evaluation amount
    let amount: number;
    if (currentLevel === "FLM" && isSSS) {
      if (sssSelections.some(s => s === null)) {
        toast.error("Please select an option for all 10 evaluation criteria");
        return;
      }
      if (!sssComments.trim()) {
        toast.error("Please enter comments before approving");
        return;
      }
      if (sssCalculatedAmount === null) {
        toast.error("Please click Calculate to compute the award amount first");
        return;
      }
      amount = sssCalculatedAmount;
    } else if (currentLevel === "FLM" && isSFC) {
      if (sfcFinalPoints === null) {
        toast.error("Please calculate Final Points before forwarding");
        return;
      }
      if (!sfcComments.trim()) {
        toast.error("Please enter comments before approving");
        return;
      }
      amount = sfcFinalPoints;
    } else if (currentLevel === "FLM" && isMIC) {
      // MIC: fixed ₹250 — no manual input needed
      amount = MIC_FIXED_AMOUNT;
    } else if (isSelfImpl) {
      // CTF self-implementation: suggester forwards to BPS Admin with implementation notes
      if (!reviewComments.trim()) {
        toast.error("Please enter implementation comments before forwarding");
        return;
      }
      amount = selected.awardAmount ?? 0;
    } else if (currentLevel === "FLM" && isCTF) {
      // CTF at FLM (not the suggester): forward to suggester for implementation with 0 amount
      amount = 0;
    } else if (currentLevel === "CTG" && isCTF) {
      // CTG evaluates net savings and calculates award
      const netSavings = parseFloat(awardAmount);
      if (!Number.isFinite(netSavings) || netSavings <= 0) {
        toast.error("Please enter valid Net Savings amount");
        return;
      }
      amount = calculateCtfAward(netSavings);
    } else if (currentLevel === "FLM") {
      amount = parseFloat(awardAmount) || 0;
      if (!awardAmount.trim()) {
        toast.error("Please enter award amount before approving");
        return;
      }
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error("Award amount must be a valid non-negative number");
        return;
      }
      if (amount > 1_000_000) {
        toast.error("Award amount exceeds the maximum allowed (₹10,00,000)");
        return;
      }
    } else {
      amount = selected.awardAmount ?? 0;
    }

    let updates;
    try {
      // Gather comments and metadata for audit trail.
      // IMPORTANT: the SSS/SFC-specific evaluation sheet (with its own comments/
      // attachments/forward-to fields) only renders at the FLM level for those
      // types — at every other level (Manager / BPS Admin / BPS DH) those
      // suggestions use the generic review block instead, so the level must be
      // checked too, not just the type. Otherwise a BPS Admin's comments and
      // attachments on an SSS/SFC suggestion would be silently dropped.
      const isSSS = selected.type === "Simple Suggestion Scheme";
      const isSFC = selected.type === "Shop Floor CIP";
      const isSSSFLM = isSSS && currentLevel === "FLM";
      const isSFCFLM = isSFC && currentLevel === "FLM";
      const auditComments = isSSSFLM ? sssComments : isSFCFLM ? sfcComments : (reviewComments.trim() || undefined);
      const auditAttachments = isSSSFLM
        ? sssAttachFiles.map(f => ({ name: f.name, type: f.type, url: f.url }))
        : isSFCFLM
          ? sfcAttachFiles.map(f => ({ name: f.name, type: f.type, url: f.url }))
          : reviewAttachFiles.map(f => ({ name: f.name, type: f.type, url: f.url }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const auditMetadata: Record<string, any> | undefined = isSSSFLM
        ? {
          evaluationType: "SSS",
          selections: sssSelections,
          totalPoints: sssTotalPoints,
          weightage: sssWeightage,
          calculatedAmount: sssCalculatedAmount,
          forwardTo: sssForwardTo,
        }
        : isSFCFLM
          ? {
            evaluationType: "SFC",
            selectedMonth: sfcSelectedMonth,
            selectedWeightage: sfcSelectedWeightage,
            kaizenPoints: sfcKaizenPoints,
            gembaSelections: sfcGembaSelections,
            gembaTotal: sfcGembaTotal,
            finalPoints: sfcFinalPoints,
            forwardTo: sfcForwardTo,
          }
          : forwardTo
            ? { forwardTo }
            : undefined;

      // ── Build award distribution breakdown for audit trail ──
      // Rules: on-behalf → mainSuggestor + team; self → registering employee + team
      if (currentLevel === "FLM" && amount > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fd: Record<string, any> = selected.formData || {};
        const isOnBehalf = fd.suggestionFor === "behalf" && fd.mainSuggestor;
        const isGroup = fd.groupSuggestion === "yes";
        const teamMembers: string[] = fd.teamMembers || [];

        const primaryEmpNo = isOnBehalf ? fd.mainSuggestor : (selected.employeeNo || "");
        const recipients: string[] = [];
        if (primaryEmpNo) recipients.push(primaryEmpNo);
        if (isGroup && teamMembers.length > 0) {
          for (const m of teamMembers) {
            if (m && !recipients.includes(m)) recipients.push(m);
          }
        }

        if (recipients.length > 0) {
          const perPerson = Math.round(amount / recipients.length);
          const distribution = recipients.map((empNo, idx) => ({
            empNo,
            share: idx === 0 ? amount - perPerson * (recipients.length - 1) : perPerson,
            sharePercent: Math.round((100 / recipients.length) * 100) / 100,
          }));

          const meta = auditMetadata || {};
          meta.awardDistribution = distribution;
          meta.distributionType = isOnBehalf ? "on-behalf" : "self";
          meta.isGroup = isGroup;
          meta.totalRecipients = recipients.length;
          // Reassign if it was undefined before
          if (!auditMetadata) {
            // We need to pass this, so assign to a mutable ref
            Object.assign(meta, { forwardTo: forwardTo || undefined });
          }
        }
      }

      // Resolve the display name for the forwarded-to person
      const forwardedToName = isSSSFLM
        ? (sssApprovers.find(a => a.employee_no === sssForwardTo)?.name || sssForwardTo || undefined)
        : isSFCFLM
          ? (sssApprovers.find(a => a.employee_no === sfcForwardTo)?.name || sfcForwardTo || undefined)
          : forwardTo
            ? (sssApprovers.find(a => a.employee_no === forwardTo)?.name || forwardTo)
            : undefined;

      // For CTF self-implementation, act as "Implementation" level in the pipeline
      const buildLevel: ApprovalLevel = isSelfImpl ? "Implementation" : (currentLevel as ApprovalLevel);
      updates = buildApprovalUpdate(
        selected,
        buildLevel,
        user.employeeNo,
        user.name,
        // FLM/CTG set the award amount — other levels preserve the existing value
        (buildLevel === "FLM" || buildLevel === "CTG") ? amount : undefined,
        {
          comments: auditComments,
          department: user.department,
          forwardedTo: forwardedToName,
          attachments: auditAttachments?.length ? auditAttachments : undefined,
          metadata: auditMetadata,
        },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval not allowed at this stage");
      return;
    }

    try {
      await updateSuggestion(selected.id, updates);
    } catch {
      toast.error("Approval failed. Please try again.");
      return;
    }
    toast.success("Suggestion approved", {
      description: updates.status === "Approved & Closed"
        ? `${selected.suggestionNo} has been closed.`
        : `${selected.suggestionNo} forwarded to ${updates.pendingWith}.`,
    });
    addNotification(
      updates.status === "Approved & Closed"
        ? `${selected.suggestionNo} approved & closed by ${user.name} (${currentLevel})`
        : `${selected.suggestionNo} approved by ${user.name} (${currentLevel}) — forwarded to ${updates.pendingWith}`,
      "success"
    );
    setDialogOpen(false);
    setSelected(null);
  };

  const openReject = () => {
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleReject = () => {
    if (!selected || !user) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    const updates = buildRejectionUpdate(user.employeeNo, user.name, rejectReason.trim(), selected, { department: user.department, role: currentLevel || undefined });
    updateSuggestion(selected.id, updates);
    toast.success("Suggestion rejected", {
      description: `${selected.suggestionNo} has been rejected.`,
    });
    addNotification(
      `${selected.suggestionNo} rejected by ${user.name} (${currentLevel}) — Reason: ${rejectReason.trim()}`,
      "error"
    );
    setRejectOpen(false);
    setDialogOpen(false);
    setSelected(null);
  };

  // All approval roles can send back (FLM sends to Employee, others to prior levels)
  const canSendBack = !!(selected && currentLevel);

  // Only BPS Admin / BPS DH can reroute — they can redirect a suggestion to
  // ANY specific person at ANY pipeline level (e.g. if the wrong FLM
  // evaluated it), unlike send-back which only targets a previous LEVEL
  // generically for revision.
  const canReroute = !!(selected && currentLevel) &&
    (user?.bidpRole === "bps_admin" || user?.bidpRole === "bps_dh");

  // Derive whether the Evaluate/Approve button should be enabled
  const canApprove = useMemo(() => {
    if (!selected) return false;
    // CTF self-implementation for users without an approval level (e.g. "employee" role)
    if (
      !currentLevel &&
      selected.type === "Cash The Flash" &&
      selected.status === "Pending Implementation" &&
      selected.employeeNo === user?.employeeNo &&
      user?.bidpRole !== "bps_admin" &&
      user?.bidpRole !== "bps_dh"
    ) return !!reviewComments.trim();
    if (!currentLevel) return false;
    const isSSSFLM = currentLevel === "FLM" && selected.type === "Simple Suggestion Scheme";
    const isSFCFLM = currentLevel === "FLM" && selected.type === "Shop Floor CIP";
    const isMIC = selected.type === "My Idea Card";
    const isCTF = selected.type === "Cash The Flash";
    if (isSSSFLM) {
      return (
        sssSelections.every(s => s !== null) &&
        !!sssWeightage.trim() &&
        sssCalculatedAmount !== null &&
        !!sssComments.trim()
      );
    }
    if (isSFCFLM) {
      return sfcFinalPoints !== null && !!sfcComments.trim();
    }
    // CTF at FLM: no evaluation needed — just forward (always enabled)
    if (currentLevel === "FLM" && isCTF) {
      return true;
    }
    // CTF at CTG: needs net savings entered + comment
    if (currentLevel === "CTG" && isCTF) {
      return !!awardAmount.trim() && parseFloat(awardAmount) > 0 && !!reviewComments.trim();
    }
    // CTF at FLM: needs comment
    if (currentLevel === "FLM" && isCTF) {
      return !!reviewComments.trim();
    }
    // CTF at Implementation: needs comment
    if (currentLevel === "Implementation" && isCTF) {
      return !!reviewComments.trim();
    }
    if (currentLevel === "FLM" && !isMIC) {
      return !!awardAmount.trim();
    }
    return true;
  }, [selected, currentLevel, sssSelections, sssWeightage, sssCalculatedAmount, sssComments, awardAmount, sfcFinalPoints, sfcComments, reviewComments, user]);

  const openSendBack = () => {
    setSendBackReason("");
    setSendBackTargetLevel("");
    setSendBackAttachFiles([]);
    setSendBackOpen(true);
  };

  // Compute which levels the suggestion can be sent back to, with names
  const sendBackLevelOptions = useMemo(() => {
    if (!selected || !currentLevel) return [];
    const amount = selected.awardAmount ?? 0;
    const pipeline = getPipeline(selected.type, amount);
    const currentIndex = pipeline.findIndex(s => s.level === currentLevel);
    const options: Array<{ value: string; label: string; name: string; sublabel?: string }> = [];

    // Employee option — the original suggestor (available for all levels including FLM)
    options.push({
      value: "Employee",
      label: "Employee",
      name: selected.employeeName || selected.employeeNo || "Employee",
      sublabel: selected.employeeNo ? `(${selected.employeeNo}) ${selected.department || ""}` : undefined,
    });

    // All pipeline levels before the current one
    for (let i = 0; i < currentIndex; i++) {
      const step = pipeline[i];
      let personName = "";
      let personNo = "";
      let personDept = "";
      if (step.level === "FLM") {
        personName = selected.evaluatedByName || "";
        personNo = selected.evaluatedBy || selected.assignedFlm || "";
      } else if (step.level === "Manager") {
        personName = selected.approvedByManagerName || "";
        personNo = selected.approvedByManager || "";
      } else if (step.level === "BPS Admin") {
        personName = selected.approvedByBpsAdminName || "";
        personNo = selected.approvedByBpsAdmin || "";
      } else if (step.level === "BPS DH") {
        personName = selected.approvedByBpsDhName || "";
        personNo = selected.approvedByBpsDh || "";
      }
      // Also check if there's a name in the approvers list
      if (!personName && personNo) {
        const approver = sssApprovers.find(a => a.employee_no === personNo);
        if (approver) {
          personName = approver.name;
          personDept = approver.department || "";
        }
      }
      options.push({
        value: step.level,
        label: step.level,
        name: personName || step.level,
        sublabel: personNo ? `(${personNo})${personDept ? ` ${personDept}` : ""}` : undefined,
      });
    }

    return options;
  }, [selected, currentLevel, sssApprovers]);

  // Resolve name of the selected send-back target
  const sendBackTargetName = useMemo(() => {
    if (!sendBackTargetLevel) return "";
    const opt = sendBackLevelOptions.find(o => o.value === sendBackTargetLevel);
    return opt?.name || sendBackTargetLevel;
  }, [sendBackTargetLevel, sendBackLevelOptions]);

  const handleSendBack = () => {
    if (!selected || !user || !currentLevel) return;
    if (!sendBackReason.trim()) {
      toast.error("Please provide a reason for sending back");
      return;
    }
    if (!sendBackTargetLevel) {
      toast.error("Please select which level to send back to");
      return;
    }
    const targetLevel = sendBackTargetLevel as ApprovalLevel | "Employee";
    const attachments = sendBackAttachFiles.map(f => ({ name: f.name, type: f.type, url: f.url }));
    const updates = buildSendBackUpdate(
      selected,
      currentLevel,
      user.employeeNo,
      user.name,
      sendBackReason.trim(),
      {
        department: user.department,
        targetLevel,
        toName: sendBackTargetName,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
    );
    updateSuggestion(selected.id, updates);
    toast.success("Suggestion sent back successfully", {
      description: `${selected.suggestionNo} has been sent back to ${sendBackTargetName} (${targetLevel}) for review.`,
      duration: 5000,
    });
    addNotification(
      `${selected.suggestionNo} sent back by ${user.name} (${currentLevel}) to ${sendBackTargetName} (${targetLevel}) — Reason: ${sendBackReason.trim()}`,
      "warning"
    );
    setSendBackOpen(false);
    setDialogOpen(false);
    setSelected(null);
  };

  // Every pipeline level applicable to this suggestion's type/amount — the
  // reroute target can be ANY of these, not just previous/next ones.
  const rerouteLevelOptions = useMemo(() => {
    if (!selected) return [] as ApprovalLevel[];
    const amount = selected.awardAmount ?? 0;
    return getPipeline(selected.type, amount).map(s => s.level);
  }, [selected]);

  // People available at the currently-chosen reroute level — unfiltered by
  // department, since BPS explicitly wants to pick ANY person at that level.
  // The original suggester is always excluded — suggester and approver must
  // never be the same person.
  const rerouteTargetOptions = useMemo(() => {
    if (!rerouteLevel) return [];
    return sssApprovers.filter(a => a.role === rerouteLevel && a.employee_no !== selected?.employeeNo);
  }, [rerouteLevel, sssApprovers, selected]);

  const openReroute = () => {
    setRerouteLevel("");
    setRerouteTargetEmpNo("");
    setRerouteReason("");
    setRerouteOpen(true);
  };

  const handleReroute = () => {
    if (!selected || !user || !currentLevel) return;
    if (!rerouteLevel) {
      toast.error("Please select a level to reroute to");
      return;
    }
    if (!rerouteTargetEmpNo) {
      toast.error("Please select a person to reroute to");
      return;
    }
    if (!rerouteReason.trim()) {
      toast.error("Please provide a reason for rerouting");
      return;
    }
    const target = sssApprovers.find(a => a.employee_no === rerouteTargetEmpNo);
    if (!target) {
      toast.error("Selected person not found");
      return;
    }
    const updates = buildRerouteUpdate(
      selected,
      user.employeeNo,
      user.name,
      rerouteLevel as ApprovalLevel,
      target.employee_no,
      target.name,
      rerouteReason.trim(),
      { department: user.department, fromLevel: currentLevel },
    );
    updateSuggestion(selected.id, updates);
    toast.success("Suggestion rerouted successfully", {
      description: `${selected.suggestionNo} has been rerouted to ${target.name} (${rerouteLevel}).`,
      duration: 5000,
    });
    addNotification(
      `${selected.suggestionNo} rerouted by ${user.name} (${currentLevel}) to ${target.name} (${rerouteLevel}) — Reason: ${rerouteReason.trim()}`,
      "warning"
    );
    setRerouteOpen(false);
    setDialogOpen(false);
    setSelected(null);
  };

  // Pipeline step indicator
  const PipelineIndicator = ({ type, amount, currentStatus }: { type: string; amount: number; currentStatus: string }) => {
    const steps = getPipelineDisplay(type, amount);
    // Determine active step index
    const statusToStep: Record<string, string> = {
      "Submitted": "FLM",
      "Pending Manager": "Manager",
      "Pending BPS Admin": "BPS Admin",
      "Pending BPS DH": "BPS DH",
      "Approved & Closed": "Close",
      "Closed": "Close",
      "Rejected": "Rejected",
    };
    const activeStep = statusToStep[currentStatus] || "Employee";
    const activeIndex = steps.indexOf(activeStep);

    return (
      <div className="flex items-center gap-0.5 flex-wrap">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${i < activeIndex ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                i === activeIndex ? "bg-primary text-primary-foreground font-semibold" :
                  "bg-muted text-muted-foreground"
              }`}>{step}</span>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
          </div>
        ))}
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd: Record<string, any> = selected?.formData || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tf: Record<string, any> = fd.typeFields || {};

  // Build a combined lookup (empNo → {name, dept}) from all options + mockEmployees
  const allEmpOptions = [...teamMemberOptions, ...flmOptions];
  const optByEmpNo: Record<string, { name: string; dept: string }> = {};
  for (const o of allEmpOptions) {
    if (o.value && !optByEmpNo[o.value]) optByEmpNo[o.value] = { name: o.name, dept: o.dept };
  }
  for (const e of mockEmployees) {
    if (!optByEmpNo[e.employeeNo]) optByEmpNo[e.employeeNo] = { name: e.name, dept: e.department };
  }
  const avatarColors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500"];

  // ── Section helpers for the review dialog ──────────────────────────────────
  const SectionHead = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    </div>
  );

  const Row = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex gap-3 py-1.5 border-b border-border/40 last:border-0 items-start">
      <span className="text-[10px] text-muted-foreground w-40 shrink-0 leading-relaxed">{label}</span>
      <span className="text-[11px] text-foreground font-medium flex-1 leading-relaxed whitespace-pre-wrap break-words">{value || "—"}</span>
    </div>
  );

  const Block = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="space-y-1 rounded-lg border bg-muted/20 p-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
      </div>
    ) : null;

  const fmtDate = (d?: string) => {
    if (!d) return undefined;
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  // Render type-specific fields (mirrors SuggestionDetailDialog logic)
  const renderTypeFields = (suggestion: Suggestion) => {
    const type = suggestion.type;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sfd: Record<string, any> = suggestion.formData || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stf: Record<string, any> = sfd.typeFields || {};

    if (type === "Simple Suggestion Scheme") return (
      <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
        <Row label="Subject" value={stf.subject || suggestion.subject} />
        <Row label="Category" value={stf.category || suggestion.category} />
        <Row label="Date of Implementation" value={fmtDate(stf.dateOfImplementation)} />
        <Row label="FLM" value={stf.flm
          ? (() => {
            const found = sssApprovers.find(a => a.employee_no === stf.flm) ||
              flmOptions.find(f => f.value === stf.flm);
            const name = found ? found.name : undefined;
            return name ? `${name} (${stf.flm})` : stf.flm;
          })()
          : undefined} />
        <div className="py-2 space-y-2">
          <Block label="Present Method / Problem" value={stf.presentMethod || suggestion.presentMethod} />
          <Block label="Proposed Method / Solution" value={stf.proposedMethod || suggestion.proposedMethod} />
          <Block label="Benefits" value={stf.benefits || suggestion.benefits} />
        </div>
      </div>
    );

    if (type === "Shop Floor CIP") {
      const mods: string[] = stf.moderators || (stf.moderator ? [stf.moderator] : []);
      return (
        <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
          <Row label="Kaizen Theme" value={stf.kaizenTheme} />
          <Row label="Category" value={stf.category || suggestion.category} />
          <Row label="Date of Implementation" value={fmtDate(stf.dateOfImplementation)} />
          <Row label="Moderator(s)" value={mods.length ? mods.join(", ") : undefined} />
          <Row label="How many places this kaizen is deployed horizontally" value={stf.horizontalDeployment} />
          <div className="py-2 space-y-2">
            <Block label="Problem / Present Status" value={stf.problemStatus || suggestion.presentMethod} />
            <Block label="Before Improvement" value={stf.beforeImprovement} />
            <Block label="After Improvement" value={stf.afterImprovement || suggestion.proposedMethod} />
            <Block label="Root Cause" value={stf.rootCause} />
            <Block label="Action Taken" value={stf.actionTaken} />
            <Block label="Standardization" value={stf.standardization} />
            <Block label="Benefits" value={stf.benefits || suggestion.benefits} />
          </div>
          {/* Shop Floor CIP before/after photos */}
          {(stf.photosBefore?.length > 0 || stf.photosAfter?.length > 0) && (
            <div className="py-2 space-y-3">
              {stf.photosBefore?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Photos Before</p>
                  <div className="flex flex-wrap gap-2">
                    {(stf.photosBefore as AttachmentItem[]).map((item, i) => (
                      <button key={item.id} type="button"
                        onClick={() => { setLightboxImages(stf.photosBefore as AttachmentItem[]); setLightboxIndex(i); setLightboxOpen(true); }}
                        className="relative group focus:outline-none rounded">
                        <img src={item.url} alt={item.name} className="h-16 w-16 object-cover rounded border hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                          <ZoomIn className="h-4 w-4 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {stf.photosAfter?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Photos After</p>
                  <div className="flex flex-wrap gap-2">
                    {(stf.photosAfter as AttachmentItem[]).map((item, i) => (
                      <button key={item.id} type="button"
                        onClick={() => { setLightboxImages(stf.photosAfter as AttachmentItem[]); setLightboxIndex(i); setLightboxOpen(true); }}
                        className="relative group focus:outline-none rounded">
                        <img src={item.url} alt={item.name} className="h-16 w-16 object-cover rounded border hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                          <ZoomIn className="h-4 w-4 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (type === "My Idea Card") return (
      <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
        <Row label="Subject" value={stf.subject || suggestion.subject} />
        <Row label="Category" value={stf.category || suggestion.category} />
        <Row label="Date of Implementation" value={fmtDate(stf.dateOfImplementation)} />
        <Row label="FLM" value={stf.flm
          ? (() => {
            const found = sssApprovers.find(a => a.employee_no === stf.flm) ||
              flmOptions.find(f => f.value === stf.flm);
            const name = found ? found.name : undefined;
            return name ? `${name} (${stf.flm})` : stf.flm;
          })()
          : undefined} />
        <div className="py-2 space-y-2">
          <Block label="Description – Idea / Problem" value={stf.descriptionProblem || suggestion.presentMethod} />
          <Block label="Description – Improvement Done" value={stf.descriptionImprovement || suggestion.proposedMethod} />
          <Block label="Benefits" value={stf.benefits || suggestion.benefits} />
        </div>
      </div>
    );

    if (type === "Daily CIP") return (
      <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
        <Row label="Date of Implementation" value={fmtDate(stf.dateOfImplementation)} />
        <Row label="Category" value={stf.category || suggestion.category} />
        <Row label="Machine No / Area" value={stf.machineNoArea || suggestion.subject} />
        <div className="py-2 space-y-2">
          <Block label="Suggestion Description" value={stf.suggestionDescription || suggestion.presentMethod} />
          <Block label="Action Taken" value={stf.actionTaken || suggestion.proposedMethod} />
          <Block label="Benefits" value={stf.benefits || suggestion.benefits} />
        </div>
      </div>
    );

    if (type === "Cash The Flash") return (
      <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
        <Row label="Subject" value={stf.subject || suggestion.subject} />
        <Row label="Category" value={stf.category || suggestion.category} />
        <Row label="FLM" value={stf.flm
          ? (() => {
            const found = sssApprovers.find(a => a.employee_no === stf.flm) ||
              flmOptions.find(f => f.value === stf.flm);
            const name = found ? found.name : undefined;
            return name ? `${name} (${stf.flm})` : stf.flm;
          })()
          : undefined} />
        <div className="py-2 space-y-2">
          <Block label="Present / Before Method" value={stf.presentMethod || suggestion.presentMethod} />
          <Block label="Proposed / After Method" value={stf.proposedMethod || suggestion.proposedMethod} />
          <Block label="Benefits" value={stf.benefits || suggestion.benefits} />
        </div>
      </div>
    );

    // Fallback
    return (
      <div className="rounded-lg border bg-muted/10 px-3 py-2 space-y-0">
        <Row label="Subject" value={suggestion.subject} />
        <Row label="Category" value={suggestion.category} />
        <div className="py-2 space-y-2">
          <Block label="Present Method / Problem" value={suggestion.presentMethod} />
          <Block label="Proposed Method / Solution" value={suggestion.proposedMethod} />
          <Block label="Benefits" value={suggestion.benefits} />
        </div>
      </div>
    );
  };

  // Render global attachments (stored in formData.attachmentItems)
  const renderAttachments = (suggestion: Suggestion) => {
    const sfd = suggestion.formData || {};
    const allAttachments: AttachmentItem[] = sfd.attachmentItems || [];
    // Also show legacy single attachment string
    const legacyAttachment = suggestion.attachment;

    if (allAttachments.length === 0 && !legacyAttachment) return null;

    const images = allAttachments.filter(a => isImageMime(a.type));
    const docs = allAttachments.filter(a => !isImageMime(a.type));

    return (
      <>
        <SectionHead icon={Paperclip} title="Attachments" />
        <div className="rounded-lg border bg-muted/10 px-3 py-3 space-y-3">
          {images.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" /> Images ({images.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {images.map((att, i) => (
                  <div key={att.id} className="relative group">
                    <button type="button"
                      onClick={() => { setLightboxImages(images); setLightboxIndex(i); setLightboxOpen(true); }}
                      className="focus:outline-none rounded">
                      <img src={att.url} alt={att.name} className="h-20 w-20 object-cover rounded border hover:opacity-80 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                        <ZoomIn className="h-5 w-5 text-white" />
                      </div>
                    </button>
                    {/* Download button */}
                    <a href={att.url} download={att.name}
                      className="absolute top-1 right-1 h-5 w-5 rounded bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}
                      title={`Download ${att.name}`}>
                      <Download className="h-3 w-3 text-white" />
                    </a>
                    <p className="text-[8px] text-muted-foreground truncate max-w-[80px] mt-0.5 text-center">{att.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {docs.length > 0 && (
            <div className="space-y-1.5">
              {images.length > 0 && <Separator />}
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Documents ({docs.length})
              </p>
              <div className="space-y-1.5">
                {docs.map(att => (
                  <div key={att.id} className="flex items-center gap-2.5 p-2 rounded-md border bg-background hover:bg-muted/40 transition-colors group">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium flex-1 truncate">{att.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(att.size)}</span>
                    <a href={att.url} download={att.name}
                      className="shrink-0 inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
                      onClick={e => e.stopPropagation()}>
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Legacy attachment filename */}
          {legacyAttachment && allAttachments.length === 0 && (
            <div className="flex items-center gap-2.5 p-2 rounded-md border bg-background">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium flex-1">{legacyAttachment}</span>
              <span className="text-[10px] text-muted-foreground italic shrink-0">File reference</span>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="w-full space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)" }}>
      <h2 className="text-xl font-bold text-foreground">
        My Approvals
        <span className="text-sm font-normal text-muted-foreground"> / {t("My Approvals")}</span>
        {currentLevel && (
          <Badge variant="outline" className="ml-2 text-xs">{currentLevel}</Badge>
        )}
      </h2>

      {/* Summary — single card */}
      <div className="flex items-center gap-3">
        <Card className="flex-1">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{pendingApprovals.length}</p>
              <p className="text-[10px] text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Table */}
      <Card>
        <CardContent className="pt-4 pb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending for your Review
              {activeTypeFilter !== "all" && (
                <Badge variant="secondary" className="text-[10px] ml-1">{activeTypeFilter}</Badge>
              )}
            </h3>
            {/* Type filter dropdown */}
            {myApprovals.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={activeTypeFilter} onValueChange={setActiveTypeFilter}>
                  <SelectTrigger className={`w-52 h-8 text-xs ${activeTypeFilter !== "all" ? "filter-active" : ""}`}>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_FILTERS.map(f => {
                      const count = f.key === "all"
                        ? myApprovals.filter(s => s.status !== "Rejected" && s.status !== "Approved & Closed" && s.status !== "Closed").length
                        : myApprovals.filter(s => s.type === f.key && s.status !== "Rejected" && s.status !== "Approved & Closed" && s.status !== "Closed").length;
                      if (f.key !== "all" && count === 0) return null;
                      return (
                        <SelectItem key={f.key} value={f.key} className="text-xs">
                          {f.label} ({count})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Select value={sentBackFilter} onValueChange={setSentBackFilter}>
                  <SelectTrigger className={`w-44 h-8 text-xs ${sentBackFilter !== "all" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                    <SelectValue placeholder="Sent Back" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Status</SelectItem>
                    <SelectItem value="sent-back" className="text-xs font-semibold text-amber-700 dark:text-amber-400">Sent Back ({sentBackCount})</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{pendingApprovals.length} record{pendingApprovals.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Scrollable table */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(pendingApprovals.length / rowsPerPage));
            const safePage = Math.min(currentPage, totalPages);
            const pageRows = pendingApprovals.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

            return (
              <>
                <div className="overflow-auto rounded-md border" style={{ maxHeight: "calc(100vh - 230px)" }}>
                  <table className="min-w-[700px] w-full text-xs">
                    <thead className="sticky top-0 z-20">
                      <tr className="border-b bg-muted text-left">
                        <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap w-8 text-center">#</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap w-14">Type</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground">Subject</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">Employee</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">Suggestion No</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap text-center">Days</th>
                        <th className="py-2 px-3 font-medium text-muted-foreground whitespace-nowrap text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-muted-foreground">
                            {myApprovals.length === 0 ? "No approvals assigned to you" : `No pending ${activeTypeFilter === "all" ? "" : activeTypeFilter + " "}suggestions`}
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((s, idx) => {
                          const tf = TYPE_FILTERS.find(f => f.key === s.type);
                          const days = calculateDaysPending(s);
                          const slNo = (safePage - 1) * rowsPerPage + idx + 1;
                          return (
                            <tr
                              key={s.id}
                              onClick={() => openReview(s)}
                              className={`border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/40 group ${s.sendBackHistory?.length ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
                            >
                              <td className="py-2.5 px-3 text-center text-muted-foreground font-medium">{slNo}</td>
                              <td className="py-2.5 px-3">
                                {tf && (
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${tf.color}`}>
                                    <tf.icon className="h-2.5 w-2.5" />{tf.short}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 max-w-[220px]">
                                <p className="font-medium truncate" title={s.subject}>{s.subject}</p>
                                {s.sendBackHistory && s.sendBackHistory.length > 0 && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                    <Undo2 className="h-2.5 w-2.5" /> Sent back
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap" title={s.employeeName || ""}>{s.employeeName || "—"}</td>
                              <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">{s.suggestionNo}</td>
                              <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{s.date}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`font-semibold ${days > 10 ? "text-destructive" : days > 5 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                                  {days}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1 opacity-70 group-hover:opacity-100">
                                  <Eye className="h-3 w-3" /> Review
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination bar */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rows per page:</span>
                    <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {pendingApprovals.length > 0
                        ? `${(safePage - 1) * rowsPerPage + 1}–${Math.min(safePage * rowsPerPage, pendingApprovals.length)} of ${pendingApprovals.length}`
                        : "0 records"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Empty state — only shown when no approvals at all */}
      {myApprovals.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground">
                {user?.bidpRole === "employee"
                  ? "Employees cannot approve suggestions"
                  : "No approvals assigned to you"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {user?.bidpRole === "employee"
                  ? "Only FLM, Manager, and Admin roles can review approvals."
                  : "When suggestions reach your approval level, they will appear here."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Review Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[96vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl [&>button:last-child]:hidden">

          {/* ── Header ── */}
          <div className="shrink-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 shrink-0 opacity-80" />
                <span className="text-sm font-semibold">Review Suggestion</span>
                {selected && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-medium">{selected.status}</span>
                )}
              </div>
              {selected && (
                <p className="text-[11px] opacity-75 mt-0.5 truncate">{selected.suggestionNo} · {selected.type} · {selected.subject}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-white/15 text-white hover:text-white hover:bg-white/30 border border-white/20 transition-all"
              onClick={() => setDialogOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* ── Scrollable body ── */}
          {selected && (
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="px-8 py-6 space-y-5">

                {/* Pipeline — use the right amount per type so the path preview is accurate */}
                {(() => {
                  let displayAmount: number;
                  if (selected.type === "My Idea Card") {
                    // MIC: always fixed ₹250
                    displayAmount = MIC_FIXED_AMOUNT;
                  } else if (currentLevel === "FLM" && selected.type === "Simple Suggestion Scheme") {
                    // SSS: amount is the calculated monetary award (sssWeightage × totalPoints)
                    displayAmount = sssCalculatedAmount ?? selected.awardAmount ?? 0;
                  } else if (currentLevel === "FLM" && selected.type === "Shop Floor CIP") {
                    // SFC: amount is the final evaluation points (kaizen + gemba) × 20
                    displayAmount = sfcFinalPoints ?? selected.awardAmount ?? 0;
                  } else {
                    displayAmount = parseFloat(awardAmount) || selected.awardAmount || 0;
                  }
                  return (
                    <PipelineIndicator
                      type={selected.type}
                      amount={displayAmount}
                      currentStatus={selected.status}
                    />
                  );
                })()}




                {selected.reopenRemark && (
                  <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Reopened</p>
                    </div>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 pl-5">
                      By {selected.reopenedBy || "Admin"}{selected.reopenedOn ? ` on ${selected.reopenedOn}` : ""} — {selected.reopenRemark}
                    </p>
                  </div>
                )}

                {selected.transferHistory && selected.transferHistory.length > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 space-y-1">
                    <p className="text-[10px] font-semibold text-blue-700 uppercase flex items-center gap-1">
                      <ArrowRightLeft className="h-3 w-3" /> Transferred
                    </p>
                    {selected.transferHistory.map((tr, i) => (
                      <div key={i} className="text-[11px] border-l-2 border-blue-300 pl-2">
                        <span className="font-medium">{tr.fromName}</span> → <span className="font-medium">{tr.toName}</span>
                        <span className="text-muted-foreground ml-1">({tr.date})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Identification & Employee — side by side ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <SectionHead icon={FileText} title="Identification" />
                    <div className="rounded-lg border bg-muted/10 px-3 py-2 mt-1.5">
                      <Row label="Suggestion No" value={selected.suggestionNo} />
                      <Row label="Date" value={fmtDate(selected.date)} />
                      <Row label="Type" value={selected.type} />
                      <Row label="Range" value={selected.range} />
                      <Row label="Suggestion Dept" value={selected.suggestionDepartment || "—"} />
                      <Row label="Days Pending" value={String(calculateDaysPending(selected))} />
                    </div>
                  </div>
                  <div>
                    <SectionHead icon={User} title="Employee" />
                    <div className="rounded-lg border bg-muted/10 px-3 py-2 mt-1.5">
                      <Row label="Employee Name" value={selected.employeeName || "—"} />
                      <Row label="Employee No" value={selected.employeeNo} />
                      <Row label="Department" value={selected.department || optByEmpNo[selected.employeeNo || ""]?.dept || "—"} />
                      {fd.suggestionFor && <Row label="Suggestion For" value={fd.suggestionFor === "behalf" ? "On Behalf" : "Self"} />}
                      {fd.groupSuggestion && <Row label="Group Suggestion" value={fd.groupSuggestion === "yes" ? "Yes" : "No"} />}
                    </div>

                    {/* Moderator Details */}
                    {tf.moderator && (() => {
                      const modId = String(tf.moderator);
                      const modOpt = optByEmpNo[modId];
                      return (
                        <div className="mt-2">
                          <SectionHead icon={ShieldCheck} title="Moderator" />
                          <div className="rounded-lg border bg-muted/10 px-3 py-2 mt-1.5">
                            <Row label="Name" value={modOpt?.name || modId} />
                            <Row label="Employee No" value={modId} />
                            <Row label="Department" value={modOpt?.dept || "—"} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* On Behalf — Main Suggestor table */}
                {fd.suggestionFor === "behalf" && fd.mainSuggestor && (() => {
                  const ms = String(fd.mainSuggestor);
                  const msInfo = optByEmpNo[ms];
                  const msName = msInfo?.name || ms;
                  const msInitials = msName.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <>
                      <SectionHead icon={User} title="Main Suggestor (On Behalf)" />
                      <div className="rounded-lg border overflow-hidden">
                        <div className="grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-1.5 bg-muted/40 border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <span>Name</span>
                          <span>Employee No</span>
                          <span>Department</span>
                        </div>
                        <div className="grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-2.5 items-center">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-white text-[10px] font-bold">{msInitials}</span>
                            </div>
                            <span className="text-xs font-medium truncate">{msName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{ms}</span>
                          <span className="text-xs text-muted-foreground">{msInfo?.dept || "—"}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Team Members — share/amount only shown after FLM evaluation */}
                {(fd.teamMembers as string[] | undefined)?.length ? (() => {
                  const isOnBehalf = fd.suggestionFor === "behalf" && fd.mainSuggestor;
                  const award = selected.awardAmount || 0;
                  const hasAward = award > 0;
                  const teamMembersList = fd.teamMembers as string[];

                  // Build correct recipients: primary person + team members
                  const primaryEmpNo = isOnBehalf ? fd.mainSuggestor : (selected.employeeNo || "");
                  const recipientSet = new Set<string>();
                  if (primaryEmpNo) recipientSet.add(primaryEmpNo);
                  for (const m of teamMembersList) { if (m) recipientSet.add(m); }
                  const recipients = Array.from(recipientSet);
                  const count = recipients.length;

                  return (
                    <>
                      <SectionHead icon={Users} title={hasAward ? "Team Members & Share Distribution" : "Team Members"} />
                      <div className="rounded-lg border overflow-hidden">
                        <div className={`grid ${hasAward ? "grid-cols-[1fr_100px_100px_80px]" : "grid-cols-[1fr_100px_100px]"} gap-2 px-3 py-2 bg-muted/40 border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`}>
                          <span>Name</span>
                          <span>Employee No</span>
                          <span>Department</span>
                          {hasAward && <span className="text-right">Share</span>}
                        </div>
                        {recipients.map((m: string, i: number) => {
                          // Equal split (only relevant when award exists)
                          const base = Math.floor(100 / count);
                          const sharePct = i === 0 ? base + (100 - base * count) : base;
                          const shareAmt = hasAward ? Math.round((award * sharePct) / 100) : 0;

                          const di = m.indexOf("\u2013");
                          let mName: string;
                          let mNo: string;
                          if (di !== -1) {
                            mName = m.slice(0, di).trim();
                            mNo = m.slice(di + 1).trim();
                          } else {
                            const found = optByEmpNo[m];
                            mName = found?.name || "";
                            mNo = m;
                          }
                          if (m === primaryEmpNo && !isOnBehalf && !mName) {
                            mName = selected.employeeName || mNo;
                          }
                          const dept = optByEmpNo[mNo]?.dept || "—";
                          const initials = (mName || mNo).split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                          const color = avatarColors[i % avatarColors.length];
                          const isPrimary = m === primaryEmpNo;
                          return (
                            <div key={i} className={`grid ${hasAward ? "grid-cols-[1fr_100px_100px_80px]" : "grid-cols-[1fr_100px_100px]"} gap-2 px-3 py-2.5 border-b last:border-0 items-center hover:bg-muted/20 ${isPrimary ? "bg-primary/5" : ""}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`h-7 w-7 rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                                  <span className="text-white text-[10px] font-bold">{initials}</span>
                                </div>
                                <span className="text-xs font-medium truncate">{mName || mNo}</span>
                                {isPrimary && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0">
                                    {isOnBehalf ? "Main Suggestor" : "Suggestor"}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">{mNo || "—"}</span>
                              <span className="text-xs text-muted-foreground">{dept}</span>
                              {hasAward && (
                                <span className="text-xs font-bold text-right text-emerald-600 dark:text-emerald-400">
                                  ₹{shareAmt.toLocaleString()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {!hasAward && (
                          <div className="px-3 py-2 text-[10px] text-muted-foreground/70 italic bg-muted/10">
                            Share distribution will be calculated after evaluation
                          </div>
                        )}
                      </div>
                    </>
                  );
                })() : null}

                {/* Type-specific details */}
                <SectionHead icon={Info} title="Suggestion Details" />
                {renderTypeFields(selected)}

                {/* Attachments */}
                {renderAttachments(selected)}

                {/* ── Previous Approvers' Remarks & Attachments ── */}
                {(() => {
                  const trail = selected.auditTrail || [];
                  // Show entries from prior approvers that have comments or attachments
                  const priorEntries = trail.filter(e =>
                    (e.action === "Approved" || e.action === "Evaluated" || e.action === "Sent Back" || e.action === "Rerouted" || e.action === "Submitted") &&
                    (!!e.comments?.trim() || (e.attachments && e.attachments.length > 0))
                  );
                  // Also include send-back entries (may already be in auditTrail, but also in sendBackHistory)
                  const sendBacks = selected.sendBackHistory || [];
                  if (priorEntries.length === 0 && sendBacks.length === 0) return null;
                  return (
                    <>
                      <Separator className="my-1" />
                      <SectionHead icon={MessageSquare} title="Remarks from Previous Approvers" />
                      <div className="space-y-2.5">
                        {priorEntries.map((entry) => {
                          const isSendBack = entry.action === "Sent Back";
                          const isRerouted = entry.action === "Rerouted";
                          return (
                            <div key={entry.id}
                              className={`rounded-lg border px-3 py-3 space-y-2 ${isRerouted
                                  ? "border-violet-200 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/20"
                                  : isSendBack
                                    ? "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
                                    : "border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20"
                                }`}>
                              {/* Header */}
                              <div className="flex items-center justify-between flex-wrap gap-1.5">
                                <div className="flex items-center gap-2">
                                  {isRerouted
                                    ? <ArrowRightLeft className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                                    : isSendBack
                                      ? <Undo2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                      : <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                                  <span className="text-xs font-semibold">
                                    {entry.performedByName || entry.performedBy}
                                  </span>
                                  {entry.role && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${isRerouted
                                        ? "bg-violet-100 border-violet-300 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                                        : isSendBack
                                          ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                          : "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                      }`}>
                                      {entry.role}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isRerouted ? "text-violet-600 dark:text-violet-400" : isSendBack ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                                    }`}>
                                    {entry.action}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {entry.date ? new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                </span>
                              </div>
                              {/* Status transition */}
                              {entry.fromStatus && entry.toStatus && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <span className="px-1.5 py-0.5 rounded bg-muted border text-[9px]">{entry.fromStatus}</span>
                                  <ChevronRight className="h-3 w-3" />
                                  <span className="px-1.5 py-0.5 rounded bg-muted border text-[9px]">{entry.toStatus}</span>
                                </div>
                              )}
                              {/* Comments */}
                              {entry.comments?.trim() && (
                                <div className="rounded-md bg-background/80 border px-2.5 py-2">
                                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Comments</p>
                                  <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{entry.comments}</p>
                                </div>
                              )}
                              {/* Forwarded to */}
                              {entry.forwardedTo && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <Send className="h-3 w-3" />
                                  <span>Forwarded to: <strong className="text-foreground">{entry.forwardedTo}</strong></span>
                                </div>
                              )}
                              {/* Attachments */}
                              {entry.attachments && entry.attachments.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                    <Paperclip className="h-2.5 w-2.5" /> Attachments ({entry.attachments.length})
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {entry.attachments.map((att, i) => (
                                      att.url ? (
                                        <a key={i} href={att.url} download={att.name} target="_blank" rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-[10px] bg-background border px-2 py-1 rounded-md hover:bg-muted transition-colors max-w-[180px]">
                                          <Download className="h-2.5 w-2.5 shrink-0 text-primary" />
                                          <span className="truncate">{att.name}</span>
                                        </a>
                                      ) : (
                                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-muted border px-2 py-1 rounded-md max-w-[180px]">
                                          <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                          <span className="truncate">{att.name}</span>
                                        </span>
                                      )
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Send-back entries from sendBackHistory not yet in auditTrail */}
                        {sendBacks.filter(sb =>
                          !trail.some(e => e.action === "Sent Back" && e.comments === sb.reason && e.performedByName === sb.fromName)
                        ).map((sb, idx) => (
                          <div key={`sb-${idx}`} className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-3 space-y-1.5">
                            <div className="flex items-center justify-between flex-wrap gap-1.5">
                              <div className="flex items-center gap-2">
                                <Undo2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-semibold">{sb.fromName || sb.from}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium border bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{sb.from}</span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400">Sent Back</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{sb.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <ChevronRight className="h-3 w-3" />
                              <span>Sent back to: <strong className="text-foreground">{sb.toName || sb.to}</strong> ({sb.to})</span>
                            </div>
                            {sb.reason && (
                              <div className="rounded-md bg-background/80 border px-2.5 py-2">
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Reason</p>
                                <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{sb.reason}</p>
                              </div>
                            )}
                            {sb.attachments && sb.attachments.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                  <Paperclip className="h-2.5 w-2.5" /> Attachments ({sb.attachments.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {sb.attachments.map((att, ai) => (
                                    att.url ? (
                                      <a key={ai} href={att.url} download={att.name} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] bg-background border px-2 py-1 rounded-md hover:bg-muted transition-colors max-w-[180px]">
                                        <Download className="h-2.5 w-2.5 shrink-0 text-primary" />
                                        <span className="truncate">{att.name}</span>
                                      </a>
                                    ) : (
                                      <span key={ai} className="inline-flex items-center gap-1 text-[10px] bg-muted border px-2 py-1 rounded-md max-w-[180px]">
                                        <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate">{att.name}</span>
                                      </span>
                                    )
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                <Separator className="my-2" />

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* ── FLM EVALUATION SECTION ── */}
                {/* ═══════════════════════════════════════════════════════════ */}

                {/* SSS Evaluation (FLM only) */}
                {currentLevel === "FLM" && selected.type === "Simple Suggestion Scheme" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                          <Calculator className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">SSS Evaluation</h3>
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                        {sssSelections.filter(s => s !== null).length}/10 criteria filled
                      </span>
                    </div>

                    {/* Criteria table — full width */}
                    <div className="rounded-xl border shadow-sm overflow-hidden">
                      {/* Table header */}
                      <div className="grid items-center bg-primary text-primary-foreground text-[11px] font-semibold px-4 py-2.5"
                        style={{ gridTemplateColumns: "2.5rem 1fr 1fr 4rem" }}>
                        <span className="text-center">Sr.</span>
                        <span>Criteria</span>
                        <span className="text-center">Options (select one)</span>
                        <span className="text-center">Score</span>
                      </div>

                      {SSS_CRITERIA.map((row, i) => {
                        const filled = sssSelections[i] !== null;
                        return (
                          <div key={i} className={`grid items-start px-4 py-3 border-b last:border-0 gap-x-3 transition-colors ${i % 2 === 0 ? "bg-background" : "bg-muted/15"} ${!filled ? "border-l-3 border-l-amber-300" : "border-l-3 border-l-emerald-400"}`}
                            style={{ gridTemplateColumns: "2.5rem 1fr 1fr 4rem" }}>
                            {/* Sr. */}
                            <span className="text-center text-xs text-muted-foreground font-semibold pt-0.5">{i + 1}</span>
                            {/* Criteria label */}
                            <span className="text-xs font-medium leading-snug pt-0.5">{row.label}</span>
                            {/* Options */}
                            <div className="flex flex-col gap-1.5">
                              {(["A", "B"] as const).map(opt => {
                                const option = opt === "A" ? row.optA : row.optB;
                                const isSelected = sssSelections[i] === opt;
                                return (
                                  <label key={opt} className={`flex items-center gap-2 cursor-pointer px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${isSelected ? "bg-primary/10 border-primary/50 text-primary font-medium shadow-sm" : "border-transparent hover:bg-muted/40 text-muted-foreground"}`}>
                                    <input
                                      type="radio"
                                      name={`sss-${i}`}
                                      checked={isSelected}
                                      onChange={() => {
                                        const next = [...sssSelections] as (null | "A" | "B")[];
                                        next[i] = opt;
                                        setSssSelections(next);
                                        setSssCalculatedAmount(null);
                                      }}
                                      className="accent-primary h-3.5 w-3.5 shrink-0"
                                    />
                                    <span className="leading-snug">{option.label} <span className="font-bold">({option.pts} pts)</span></span>
                                  </label>
                                );
                              })}
                            </div>
                            {/* Score */}
                            <div className="flex justify-center pt-1">
                              <span className={`w-11 text-center rounded-lg border-2 py-1 text-xs font-black transition-all ${filled ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/20 text-muted-foreground/40 border-dashed border-muted-foreground/20"}`}>
                                {filled ? (sssSelections[i] === "A" ? row.optA.pts : row.optB.pts) : "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Total row */}
                      <div className="grid items-center px-4 py-3 bg-primary/5 border-t-2 border-primary/20"
                        style={{ gridTemplateColumns: "2.5rem 1fr 1fr 4rem" }}>
                        <span />
                        <span className="text-xs font-black uppercase tracking-wide">Total Points</span>
                        <div className="flex justify-end pr-4">
                          {/* progress bar */}
                          <div className="w-full max-w-[200px] h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(sssSelections.filter(s => s !== null).length / 10) * 100}%` }} />
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <span className="w-11 text-center rounded-lg border-2 border-primary/50 bg-primary/15 text-primary py-1 text-sm font-black">
                            {sssTotalPoints}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Weightage + Calculate — in a card */}
                    <div className="rounded-xl border bg-muted/5 p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <IndianRupee className="h-3 w-3 text-muted-foreground" />
                            Weightage Factor <span className="text-muted-foreground font-normal">(₹/point)</span>
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="e.g. 100"
                            value={sssWeightage}
                            onChange={e => { setSssWeightage(e.target.value); setSssCalculatedAmount(null); }}
                            className={`h-9 text-sm ${!sssWeightage.trim() ? "border-amber-300 dark:border-amber-600" : ""}`}
                          />
                        </div>
                        <div>
                          <Button
                            type="button"
                            size="sm"
                            className="h-9 gap-1.5 w-full"
                            onClick={() => {
                              const w = parseFloat(sssWeightage);
                              if (!sssWeightage.trim() || !Number.isFinite(w) || w < 0) {
                                toast.error("Enter a valid Weightage Factor first");
                                return;
                              }
                              if (sssSelections.some(s => s === null)) {
                                toast.error("Please select options for all 10 criteria first");
                                return;
                              }
                              setSssCalculatedAmount(parseFloat((sssTotalPoints * w).toFixed(2)));
                            }}>
                            <Calculator className="h-3.5 w-3.5" /> Calculate Award
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 h-9 px-4 rounded-lg border bg-muted/20">
                          <Award className="h-4 w-4 text-primary" />
                          <span className={`text-base font-black ${sssCalculatedAmount !== null ? "text-primary" : "text-muted-foreground/40"}`}>
                            {sssCalculatedAmount !== null ? `₹${sssCalculatedAmount.toFixed(2)}` : "—"}
                          </span>
                        </div>
                      </div>
                      {/* Routing hint */}
                      {sssCalculatedAmount !== null && (
                        <div className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border ${sssCalculatedAmount > 500
                            ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-700 dark:text-orange-400"
                            : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400"
                          }`}>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          {sssCalculatedAmount > 500
                            ? <span>Award &gt; ₹500 — Full pipeline: <strong>FLM → Manager → BPS Admin → BPS DH → Close</strong></span>
                            : <span>Award ≤ ₹500 — Short pipeline: <strong>FLM → BPS Admin → Close</strong></span>
                          }
                        </div>
                      )}
                    </div>

                    {/* Forward + Comments + Attachments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Forward */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Forward For Approval <span className="text-[10px] text-muted-foreground font-normal">/ ಅನುಮೋದನೆಗಾಗಿ ಫಾರ್ವರ್ಡ್ ಮಾಡಿ</span>
                        </Label>
                        {amountNotYetCalculated ? (
                          <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20">
                            <span className="text-xs text-muted-foreground/60 italic">Calculate award amount first to determine approval route</span>
                          </div>
                        ) : nextApprovalLevel ? (
                          <Select value={sssForwardTo} onValueChange={setSssForwardTo}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder={`Select ${nextApprovalLevel}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {forwardCandidates.map(a => (
                                <SelectItem key={a.id} value={a.employee_no} className="text-xs">
                                  {a.name}{a.department ? ` (${a.department})` : ""}
                                </SelectItem>
                              ))}
                              {forwardCandidates.length === 0 && (
                                <SelectItem value="_none" disabled className="text-xs text-muted-foreground">No {nextApprovalLevel} approvers configured</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs text-muted-foreground px-2 py-2 rounded border bg-muted/20">Final approval level — will close after your approval</p>
                        )}
                      </div>

                      {/* Attachments */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1">
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                          Attachments
                          <span className="text-[10px] text-muted-foreground font-normal">(Max 5 · &lt;4 MB each)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg bg-background hover:bg-muted transition-colors cursor-pointer shadow-sm">
                            <Upload className="h-3.5 w-3.5" />
                            Choose Files
                            <input
                              ref={sssFileInputRef}
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
                              className="hidden"
                              onChange={e => {
                                const files = Array.from(e.target.files || []);
                                const combined = sssAttachFiles.length + files.length;
                                if (combined > 5) {
                                  toast.error(`Max 5 files total. You can add ${5 - sssAttachFiles.length} more.`);
                                  e.target.value = "";
                                  return;
                                }
                                const oversized = files.filter(f => f.size > 4 * 1024 * 1024);
                                if (oversized.length > 0) {
                                  toast.error(`File(s) exceed 4 MB: ${oversized.map(f => f.name).join(", ")}`);
                                  e.target.value = "";
                                  return;
                                }
                                setSssAttachFiles(prev => [...prev, ...filesToAttachmentItems(files)]);
                                toast.success(`${files.length} file(s) attached`);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <span className="text-[10px] text-muted-foreground">{sssAttachFiles.length}/5</span>
                        </div>
                        {sssAttachFiles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {sssAttachFiles.map((f, i) => (
                              <span key={f.id} className="inline-flex items-center gap-1 text-[10px] bg-muted border px-2 py-1 rounded-md max-w-[160px]">
                                <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{f.name}</span>
                                <button type="button" onClick={() => setSssAttachFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Comments <span className="text-[10px] text-muted-foreground font-normal">/ ಕಮೆಂಟ್ ಬರೆಯಿರಿ</span>
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Textarea
                        placeholder="Enter your evaluation comments..."
                        value={sssComments}
                        onChange={e => setSssComments(e.target.value)}
                        className={`text-xs min-h-[72px] resize-none ${!sssComments.trim() ? "border-amber-300 dark:border-amber-600" : ""}`}
                      />
                    </div>
                  </div>
                ) : currentLevel === "FLM" && selected.type === "Shop Floor CIP" ? (
                  /* ═══ SFC Evaluation (FLM only) ═══ */
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">SFC — Kaizen Project Evaluation</h3>
                    </div>

                    {/* ── Section 1: Speed Factor – Kaizen Project Points ── */}
                    <div className="rounded-xl border shadow-sm overflow-hidden">
                      <div className="bg-primary text-primary-foreground px-4 py-2 text-[11px] font-semibold uppercase tracking-wide">
                        Section 1: Speed Factor – Kaizen Project Points
                      </div>

                      {/* Month selection */}
                      <div className="px-4 py-3 space-y-3">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Kaizen Project Month (select one)</p>
                          <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
                            {SFC_MONTHS.map((month, idx) => (
                              <label key={month} className={`flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg border cursor-pointer transition-all text-center ${sfcSelectedMonth === idx ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30" : "border-muted hover:bg-muted/30"}`}>
                                <input
                                  type="radio"
                                  name="sfc-month"
                                  checked={sfcSelectedMonth === idx}
                                  onChange={() => setSfcSelectedMonth(idx)}
                                  className="accent-primary h-3 w-3"
                                />
                                <span className="text-[9px] font-bold">{month}</span>
                                <span className={`text-[10px] font-black ${sfcSelectedMonth === idx ? "text-primary" : "text-muted-foreground"}`}>{SFC_MONTH_POINTS[idx]}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Weightage Factor */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Weightage Factor (select one)</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {SFC_WEIGHTAGE_OPTIONS.map((opt, idx) => (
                              <label key={idx} className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${sfcSelectedWeightage === idx ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30" : "border-muted hover:bg-muted/30"}`}>
                                <input
                                  type="radio"
                                  name="sfc-weightage"
                                  checked={sfcSelectedWeightage === idx}
                                  onChange={() => setSfcSelectedWeightage(idx)}
                                  className="accent-primary h-3.5 w-3.5"
                                />
                                <span className="text-[10px] font-bold">{opt.label}</span>

                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Kaizen Points — computed automatically once month + weightage are selected */}
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Kaizen Project Points</span>
                          <div className="flex items-center gap-2 h-9 px-4 rounded-lg border bg-muted/20 min-w-[100px]">
                            <span className={`text-sm font-black ${sfcKaizenPoints !== null ? "text-primary" : "text-muted-foreground/40"}`}>
                              {sfcKaizenPoints !== null ? sfcKaizenPoints : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Section 2: GEMBA Evaluation ── */}
                    <div className="rounded-xl border shadow-sm overflow-hidden">
                      <div className="bg-primary text-primary-foreground px-4 py-2 text-[11px] font-semibold uppercase tracking-wide">
                        Section 2: Project Quality Evaluation at GEMBA
                      </div>

                      {/* Table header */}
                      <div className="grid items-center bg-primary/10 text-[10px] font-semibold px-4 py-2 border-b"
                        style={{ gridTemplateColumns: "2rem 1fr 1fr 4.5rem 4.5rem" }}>
                        <span className="text-center">Sr.</span>
                        <span>Evaluation Topic</span>
                        <span className="text-center">Criteria [Points]</span>
                        <span className="text-center">Max Pts</span>
                        <span className="text-center">Scored</span>
                      </div>

                      {SFC_GEMBA_ROWS.map((row, i) => (
                        <div key={i} className={`grid items-start px-4 py-3 border-b last:border-0 gap-x-2 ${i % 2 === 0 ? "bg-background" : "bg-muted/10"} ${sfcGembaSelections[i] !== null ? "border-l-3 border-l-emerald-400" : "border-l-3 border-l-amber-300"}`}
                          style={{ gridTemplateColumns: "2rem 1fr 1fr 4.5rem 4.5rem" }}>
                          <span className="text-center text-xs text-muted-foreground font-semibold pt-1">{i + 1}</span>
                          <span className="text-xs font-medium leading-snug pt-1">{row.label}</span>
                          <div className="flex flex-col gap-1">
                            {row.options.map((opt, j) => {
                              const isSelected = sfcGembaSelections[i] === opt.pts;
                              return (
                                <label key={j} className={`flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-md border text-[10px] transition-all ${isSelected ? "bg-primary/10 border-primary/40 text-primary font-medium" : "border-transparent hover:bg-muted/30 text-muted-foreground"}`}>
                                  <input
                                    type="radio"
                                    name={`sfc-gemba-${i}`}
                                    checked={isSelected}
                                    onChange={() => {
                                      const next = [...sfcGembaSelections];
                                      next[i] = opt.pts;
                                      setSfcGembaSelections(next);
                                    }}
                                    className="accent-primary h-3 w-3 shrink-0"
                                  />
                                  <span>{opt.label} [{opt.pts}]</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="flex justify-center pt-1">
                            <span className="text-xs font-bold text-muted-foreground">{row.max}</span>
                          </div>
                          <div className="flex justify-center pt-1">
                            <span className={`w-10 text-center rounded-lg border-2 py-1 text-xs font-black ${sfcGembaSelections[i] !== null ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/20 text-muted-foreground/40 border-dashed border-muted-foreground/20"}`}>
                              {sfcGembaSelections[i] !== null ? sfcGembaSelections[i] : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* GEMBA total (auto) + Final Points */}
                    <div className="rounded-xl border bg-muted/5 p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">GEMBA Total</span>
                        <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg border bg-muted/20 min-w-[80px]">
                          <span className={`text-sm font-black ${sfcGembaTotal !== null ? "text-primary" : "text-muted-foreground/40"}`}>
                            {sfcGembaTotal !== null ? sfcGembaTotal : "—"}
                          </span>
                        </div>
                        {sfcGembaTotal === null && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400">Select criteria for all 6 rows above</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 gap-1.5"
                          disabled={sfcKaizenPoints === null || sfcGembaTotal === null}
                          onClick={() => {
                            if (sfcKaizenPoints === null) { toast.error("Select Kaizen Project month and weightage first"); return; }
                            if (sfcGembaTotal === null) { toast.error("Please select criteria for all 6 GEMBA rows first"); return; }
                            setSfcFinalPoints(parseFloat(((sfcKaizenPoints + sfcGembaTotal) * 20).toFixed(2)));
                          }}>
                          <Calculator className="h-3.5 w-3.5" /> Calculate Final Points
                        </Button>
                        <p className="text-[10px] text-muted-foreground"></p>
                        <div className="flex items-center gap-2 h-9 px-4 rounded-lg border-2 border-primary/30 bg-primary/5 min-w-[120px]">
                          <Award className="h-4 w-4 text-primary" />
                          <span className={`text-base font-black ${sfcFinalPoints !== null ? "text-primary" : "text-muted-foreground/40"}`}>
                            {sfcFinalPoints !== null ? sfcFinalPoints : "0"}
                          </span>
                        </div>
                      </div>
                      {/* Routing hint */}
                      {sfcFinalPoints !== null && (
                        <div className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border ${sfcFinalPoints > 500
                            ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-700 dark:text-orange-400"
                            : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400"
                          }`}>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          {sfcFinalPoints > 500
                            ? <span>Points &gt; 500 — Full pipeline: <strong>FLM → Manager → BPS Admin → BPS DH → Close</strong></span>
                            : <span>Points ≤ 500 — Short pipeline: <strong>FLM → BPS Admin → Close</strong></span>
                          }
                        </div>
                      )}
                    </div>

                    {/* ── Section 3: Forward, Comments, Attachments ── */}
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Forward */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Forward for opinion to <span className="text-[10px] text-muted-foreground font-normal">/ ಅನುಮೋದನೆಗಾಗಿ ಫಾರ್ವರ್ಡ್ ಮಾಡಿ</span>
                        </Label>
                        {amountNotYetCalculated ? (
                          <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20">
                            <span className="text-xs text-muted-foreground/60 italic">Calculate final points first to determine approval route</span>
                          </div>
                        ) : nextApprovalLevel ? (
                          <Select value={sfcForwardTo} onValueChange={setSfcForwardTo}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder={`Select ${nextApprovalLevel}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {forwardCandidates.map(a => (
                                <SelectItem key={a.id} value={a.employee_no} className="text-xs">
                                  <span className="font-medium">{a.name}</span>
                                  <span className="text-muted-foreground ml-1 font-mono">({a.employee_no})</span>
                                  {a.department && <span className="text-muted-foreground ml-1">· {a.department}</span>}
                                </SelectItem>
                              ))}
                              {forwardCandidates.length === 0 && (
                                <SelectItem value="_none" disabled className="text-xs text-muted-foreground">No {nextApprovalLevel} approvers configured</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs text-muted-foreground px-2 py-2 rounded border bg-muted/20">Final approval level — will close after your approval</p>
                        )}
                      </div>

                      {/* Attachments */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1">
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                          Attachments
                          <span className="text-[10px] text-muted-foreground font-normal">(Max 5 · &lt;4 MB each) / (ಗರಿಷ್ಠ 5 ಫೈಲ್‌ಗಳು – ಪ್ರತಿಯೊಂದರ ಗಾತ್ರ 4MB ಗಿಂತ ಕಡಿಮೆ)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg bg-background hover:bg-muted transition-colors cursor-pointer shadow-sm">
                            <Upload className="h-3.5 w-3.5" />
                            Choose Files
                            <input
                              ref={sfcFileInputRef}
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
                              className="hidden"
                              onChange={e => {
                                const files = Array.from(e.target.files || []);
                                const combined = sfcAttachFiles.length + files.length;
                                if (combined > 5) {
                                  toast.error(`Max 5 files total. You can add ${5 - sfcAttachFiles.length} more.`);
                                  e.target.value = "";
                                  return;
                                }
                                const oversized = files.filter(f => f.size > 4 * 1024 * 1024);
                                if (oversized.length > 0) {
                                  toast.error(`File(s) exceed 4 MB: ${oversized.map(f => f.name).join(", ")}`);
                                  e.target.value = "";
                                  return;
                                }
                                setSfcAttachFiles(prev => [...prev, ...filesToAttachmentItems(files)]);
                                toast.success(`${files.length} file(s) attached`);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <span className="text-[10px] text-muted-foreground">{sfcAttachFiles.length}/5</span>
                        </div>
                        {sfcAttachFiles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {sfcAttachFiles.map((f, i) => (
                              <span key={f.id} className="inline-flex items-center gap-1 text-[10px] bg-muted border px-2 py-1 rounded-md max-w-[160px]">
                                <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{f.name}</span>
                                <button type="button" onClick={() => setSfcAttachFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Comments <span className="text-[10px] text-muted-foreground font-normal">/ ಕಮೆಂಟ್ ಬರೆಯಿರಿ</span>
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Textarea
                        placeholder="Enter your evaluation comments..."
                        value={sfcComments}
                        onChange={e => setSfcComments(e.target.value)}
                        className={`text-xs min-h-[72px] resize-none ${!sfcComments.trim() ? "border-amber-300 dark:border-amber-600" : ""}`}
                      />
                    </div>
                  </div>
                ) : (
                  /* Non-SSS/SFC or non-FLM: award amount + forward to next level */
                  <div className="space-y-4">
                    {/* CTF at CTG: net savings input with auto-calculated award */}
                    {selected.type === "Cash The Flash" && currentLevel === "CTG" && (
                      <div className="rounded-xl border shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center gap-2">
                          <Calculator className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wide">CTG Evaluation — Net Savings</span>
                        </div>
                        <div className="p-4 space-y-4 bg-card">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <IndianRupee className="h-3.5 w-3.5 text-primary" />
                              Net Saving in INR / year
                              <span className="text-destructive ml-0.5">*</span>
                            </Label>
                            <p className="text-[10px] text-muted-foreground">Enter the total net annual savings achieved by implementing this suggestion.</p>
                            <div className="relative max-w-sm">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground select-none">₹</span>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                placeholder="0"
                                value={awardAmount}
                                onChange={e => setAwardAmount(e.target.value)}
                                className={`pl-7 h-10 text-base font-semibold ${!awardAmount.trim() ? "border-amber-400 dark:border-amber-500 focus-visible:ring-amber-400" : "border-primary/50 focus-visible:ring-primary"
                                  }`}
                              />
                            </div>
                            {!awardAmount.trim() && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <span className="font-semibold">Required</span> — enter net savings to calculate award
                              </p>
                            )}
                          </div>

                          {/* Calculated Award */}
                          {awardAmount.trim() && parseFloat(awardAmount) > 0 ? (
                            <div className="rounded-lg border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Calculated Award Amount</p>
                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                                  ₹{calculateCtfAward(parseFloat(awardAmount)).toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border ${calculateCtfAward(parseFloat(awardAmount)) > 5000
                                  ? "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-950/30 dark:border-orange-600 dark:text-orange-400"
                                  : "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/30 dark:border-blue-600 dark:text-blue-400"
                                }`}>
                                <ChevronRight className="h-3 w-3" />
                                {calculateCtfAward(parseFloat(awardAmount)) > 5000
                                  ? "→ VS RC → BPS DH"
                                  : "→ BPS DH directly"}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-3 flex items-center gap-2">
                              <Calculator className="h-4 w-4 text-muted-foreground/40" />
                              <span className="text-xs text-muted-foreground/60 italic">Award will be calculated once you enter net savings above</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CTF at FLM (not the suggester): no evaluation needed, auto-routes to suggester */}
                    {selected.type === "Cash The Flash" && currentLevel === "FLM" && !(selected.status === "Pending Implementation" && selected.employeeNo === user?.employeeNo) && (
                      <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>CTF suggestions do not require FLM evaluation — forward to suggester for implementation.</span>
                      </div>
                    )}
                    {/* CTF self-implementation: suggester is their own implementer */}
                    {selected.type === "Cash The Flash" && selected.status === "Pending Implementation" && selected.employeeNo === user?.employeeNo && user?.bidpRole !== "bps_admin" && user?.bidpRole !== "bps_dh" && (
                      <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>You are the implementer — add your implementation details and forward to BPS Admin.</span>
                      </div>
                    )}

                    {/* Non-CTF award amount input */}
                    {selected.type !== "My Idea Card" && selected.type !== "Cash The Flash" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          Award Amount (₹)
                        </Label>
                        {currentLevel === "FLM" ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min={0}
                              max={1000000}
                              step={1}
                              placeholder="Enter award amount"
                              value={awardAmount}
                              onChange={e => setAwardAmount(e.target.value)}
                              className={`h-9 text-sm max-w-xs ${!awardAmount.trim() ? "border-amber-300 dark:border-amber-600" : ""}`}
                            />
                            {awardAmount.trim() && Number.isFinite(parseFloat(awardAmount)) && parseFloat(awardAmount) > 0 ? (
                              <p className="text-[10px] text-muted-foreground">
                                {parseFloat(awardAmount) > 500
                                  ? "Amount > ₹500 → will require Manager approval before BPS"
                                  : "Amount ≤ ₹500 → will go directly to BPS Admin"}
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground/50 italic">
                                Enter amount to determine approval route
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border bg-muted/30 w-fit">
                            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-semibold">{selected.awardAmount ?? 0}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Forward to next level */}
                    {amountNotYetCalculated ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-2">
                          <Send className="h-3 w-3 text-muted-foreground" />
                          Forward For Approval <span className="text-[10px] text-muted-foreground font-normal">/ ಅನುಮೋದನೆಗಾಗಿ ಫಾರ್ವರ್ಡ್ ಮಾಡಿ</span>
                        </Label>
                        <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20">
                          <span className="text-xs text-muted-foreground/60 italic">Enter award amount first to determine approval route</span>
                        </div>
                      </div>
                    ) : selected.type === "Cash The Flash" && nextApprovalLevel === "Implementation" ? (
                      // CTF at FLM — implementation goes to the suggester automatically
                      <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-700 dark:text-indigo-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>Will be sent to the <strong>suggester</strong> for implementation — no manual selection needed.</span>
                      </div>
                    ) : nextApprovalLevel ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-2">
                          <Send className="h-3 w-3 text-muted-foreground" />
                          Forward to <span className="font-bold text-primary">{nextApprovalLevel}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">(next approval step)</span>
                        </Label>
                        <Select value={forwardTo} onValueChange={setForwardTo}>
                          <SelectTrigger className="h-9 text-xs max-w-sm">
                            <SelectValue placeholder={`Select ${nextApprovalLevel} approver`} />
                          </SelectTrigger>
                          <SelectContent>
                            {forwardCandidates.map(a => (
                              <SelectItem key={a.id} value={a.employee_no} className="text-xs">
                                <span className="font-medium">{a.name}</span>
                                <span className="text-muted-foreground ml-1 font-mono">({a.employee_no})</span>
                                {a.department && <span className="text-muted-foreground ml-1">· {a.department}</span>}
                              </SelectItem>
                            ))}
                            {forwardCandidates.length === 0 && (
                              <SelectItem value="_none" disabled className="text-xs text-muted-foreground">
                                No {nextApprovalLevel} approvers configured
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        <span>This is the final approval step — suggestion will be <strong>Approved & Closed</strong> after your action.</span>
                      </div>
                    )}

                    {/* Attachments — Manager / BPS Admin / BPS DH review (and MIC/CTF at FLM level) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        Attachments
                        <span className="text-[10px] text-muted-foreground font-normal">(Max 5 · &lt;4 MB each)</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg bg-background hover:bg-muted transition-colors cursor-pointer shadow-sm">
                          <Upload className="h-3.5 w-3.5" />
                          Choose Files
                          <input
                            ref={reviewFileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
                            className="hidden"
                            onChange={e => {
                              const files = Array.from(e.target.files || []);
                              const combined = reviewAttachFiles.length + files.length;
                              if (combined > 5) {
                                toast.error(`Max 5 files total. You can add ${5 - reviewAttachFiles.length} more.`);
                                e.target.value = "";
                                return;
                              }
                              const oversized = files.filter(f => f.size > 4 * 1024 * 1024);
                              if (oversized.length > 0) {
                                toast.error(`File(s) exceed 4 MB: ${oversized.map(f => f.name).join(", ")}`);
                                e.target.value = "";
                                return;
                              }
                              setReviewAttachFiles(prev => [...prev, ...filesToAttachmentItems(files)]);
                              toast.success(`${files.length} file(s) attached`);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <span className="text-[10px] text-muted-foreground">{reviewAttachFiles.length}/5</span>
                      </div>
                      {reviewAttachFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {reviewAttachFiles.map((f, i) => (
                            <span key={f.id} className="inline-flex items-center gap-1 text-[10px] bg-muted border px-2 py-1 rounded-md max-w-[160px]">
                              <Paperclip className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{f.name}</span>
                              <button type="button" onClick={() => setReviewAttachFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comments — Manager / BPS Admin / BPS DH review (and MIC/CTF at all levels) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Comments <span className="text-[10px] text-muted-foreground font-normal">/ ಕಮೆಂಟ್ ಬರೆಯಿರಿ</span>
                        {selected.type === "Cash The Flash" && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Textarea
                        placeholder={selected.type === "Cash The Flash" ? "Enter your evaluation comments (required)..." : "Enter your review comments..."}
                        value={reviewComments}
                        onChange={e => setReviewComments(e.target.value)}
                        className={`text-xs min-h-[72px] resize-none ${selected.type === "Cash The Flash" && !reviewComments.trim()
                            ? "border-amber-300 dark:border-amber-600"
                            : ""
                          }`}
                      />
                      {selected.type === "Cash The Flash" && !reviewComments.trim() && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">Comments are required for CTF suggestions</p>
                      )}
                    </div>
                  </div>
                )}

                {/* MIC — fixed amount notice */}
                {selected.type === "My Idea Card" && (
                  <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 p-3 flex items-center gap-3">
                    <Info className="h-4 w-4 text-purple-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-purple-800 dark:text-purple-300">My Idea Card — Fixed Award</p>
                      <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">MIC has a fixed award of <strong>Rs.{MIC_FIXED_AMOUNT}</strong>. No manual evaluation required.</p>
                    </div>
                    <div className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700">
                      <span className="text-sm font-bold text-purple-800 dark:text-purple-300">Rs.{MIC_FIXED_AMOUNT}</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* ── Sticky Footer ── */}
          {selected && (
            <div className="shrink-0 border-t bg-background px-6 py-3 space-y-2">
              {/* Readiness chips for SSS */}
              {currentLevel === "FLM" && selected.type === "Simple Suggestion Scheme" && (
                <div className="flex flex-wrap gap-1.5 text-[9px]">
                  {[
                    { label: "All criteria", done: sssSelections.every(s => s !== null) },
                    { label: "Weightage", done: !!sssWeightage.trim() },
                    { label: "Calculated", done: sssCalculatedAmount !== null },
                    { label: "Comments", done: !!sssComments.trim() },
                  ].map(({ label, done }) => (
                    <span key={label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${done ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                      {done ? "✓" : "○"} {label}
                    </span>
                  ))}
                </div>
              )}
              {/* Readiness chips for SFC */}
              {currentLevel === "FLM" && selected.type === "Shop Floor CIP" && (
                <div className="flex flex-wrap gap-1.5 text-[9px]">
                  {[
                    { label: "Kaizen Points", done: sfcKaizenPoints !== null },
                    { label: "GEMBA Evaluation", done: sfcGembaTotal !== null },
                    { label: "Final Points", done: sfcFinalPoints !== null },
                    { label: "Comments", done: !!sfcComments.trim() },
                  ].map(({ label, done }) => (
                    <span key={label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${done ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                      {done ? "✓" : "○"} {label}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" className="gap-1.5 h-9" onClick={openReject} disabled={!currentLevel}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
                {canSendBack && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9 relative overflow-hidden border-amber-400/60 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 shadow-sm hover:shadow-md hover:from-amber-100 hover:to-orange-100 hover:border-amber-500 dark:from-amber-950/40 dark:to-orange-950/30 dark:text-amber-300 dark:border-amber-600/50 dark:hover:from-amber-950/60 dark:hover:to-orange-950/50 dark:hover:border-amber-500 transition-all duration-200 group"
                    onClick={openSendBack}
                  >
                    <Undo2 className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-rotate-12" />
                    <span className="font-semibold">Send Back</span>
                  </Button>
                )}
                {canReroute && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9 relative overflow-hidden border-violet-400/60 bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 shadow-sm hover:shadow-md hover:from-violet-100 hover:to-purple-100 hover:border-violet-500 dark:from-violet-950/40 dark:to-purple-950/30 dark:text-violet-300 dark:border-violet-600/50 dark:hover:from-violet-950/60 dark:hover:to-purple-950/50 dark:hover:border-violet-500 transition-all duration-200 group"
                    onClick={openReroute}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    <span className="font-semibold">Reroute</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1.5 h-9 ml-auto"
                  onClick={handleApprove}
                  disabled={!canApprove}
                  title={!canApprove ? "Fill all required fields to enable" : undefined}>
                  <Send className="h-3.5 w-3.5" />
                  {currentLevel === "FLM" ? "Evaluate & Forward" : "Approve & Forward"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* ── Lightbox for attachment images ── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-0 bg-black/90 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {lightboxImages[lightboxIndex] && (
              <img
                src={lightboxImages[lightboxIndex].url}
                alt={lightboxImages[lightboxIndex].name}
                className="max-h-[80vh] max-w-full object-contain"
              />
            )}
            {lightboxImages.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white transition-colors"
                  onClick={() => setLightboxIndex(i => (i - 1 + lightboxImages.length) % lightboxImages.length)}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white transition-colors"
                  onClick={() => setLightboxIndex(i => (i + 1) % lightboxImages.length)}>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/70 text-xs">
              {lightboxImages[lightboxIndex]?.name}
              {lightboxImages.length > 1 && ` (${lightboxIndex + 1} / ${lightboxImages.length})`}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Reject Suggestion</DialogTitle>
            <DialogDescription className="text-xs">
              {selected?.suggestionNo} — Provide a reason for rejection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Reason for Rejection *</Label>
            <Textarea
              placeholder="Enter the reason for rejecting this suggestion..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" className="gap-1" onClick={handleReject}>
              <XCircle className="h-3.5 w-3.5" /> Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send Back Dialog ── */}
      <Dialog open={sendBackOpen} onOpenChange={setSendBackOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Undo2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Send Back for Revision</h3>
                <p className="text-[11px] opacity-80 mt-0.5">{selected?.suggestionNo}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Compact info strip */}
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
              <div className="space-y-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
                <p className="text-[11px] font-medium text-foreground truncate" title={selected?.subject}>{selected?.subject}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Employee</p>
                <p className="text-[11px] font-medium text-foreground">{selected?.employeeName}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Your Level</p>
                <Badge variant="outline" className="text-[10px] h-5 font-semibold">{currentLevel}</Badge>
              </div>
            </div>

            {/* Send Back To — Level selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                Send Back To
                <span className="text-[10px] text-muted-foreground font-normal">/ ಯಾರಿಗೆ ಹಿಂತಿರುಗಿಸಿ</span>
                <span className="text-destructive">*</span>
              </Label>
              <Select value={sendBackTargetLevel} onValueChange={setSendBackTargetLevel}>
                <SelectTrigger className={`h-10 text-xs ${!sendBackTargetLevel ? "border-amber-300 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/10" : "border-emerald-300 dark:border-emerald-600"}`}>
                  <SelectValue placeholder="Select level to send back to" />
                </SelectTrigger>
                <SelectContent>
                  {sendBackLevelOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] h-4 shrink-0 border-amber-300 text-amber-700 dark:text-amber-400">
                          {opt.label}
                        </Badge>
                        <span className="font-medium">{opt.name}</span>
                        {opt.sublabel && <span className="text-muted-foreground text-[10px]">{opt.sublabel}</span>}
                      </div>
                    </SelectItem>
                  ))}
                  {sendBackLevelOptions.length === 0 && (
                    <SelectItem value="_none" disabled className="text-xs text-muted-foreground">
                      No levels available to send back to
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {sendBackTargetLevel && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <ChevronRight className="h-3 w-3" />
                  <span>Will be sent back to <strong>{sendBackTargetName}</strong> ({sendBackTargetLevel})</span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                Reason / Comments
                <span className="text-[10px] text-muted-foreground font-normal">/ ಕಾರಣ</span>
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Please provide clear instructions on what needs to be corrected..."
                value={sendBackReason}
                onChange={e => setSendBackReason(e.target.value)}
                rows={3}
                className={`text-sm resize-none ${!sendBackReason.trim() ? "border-amber-300 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/10" : ""}`}
              />
              <p className="text-[10px] text-muted-foreground italic">
                This reason will be visible to the recipient for necessary corrections.
              </p>
            </div>

            {/* Previous send-back history (if any) */}
            {selected?.sendBackHistory && selected.sendBackHistory.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Previous Send-Backs ({selected.sendBackHistory.length})
                </p>
                {selected.sendBackHistory.map((sb, idx) => (
                  <div key={idx} className="text-[11px] text-muted-foreground pl-2 border-l-2 border-amber-300 dark:border-amber-600 space-y-0.5">
                    <div>
                      <span className="font-medium text-foreground">{sb.fromName || sb.from}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-foreground">{sb.toName || sb.to}</span>
                      <span className="text-[10px] ml-1.5 opacity-60">({sb.date})</span>
                    </div>
                    {sb.reason && <p className="italic text-[10px]">"{sb.reason}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-3 flex justify-end gap-2 bg-muted/10">
            <Button variant="outline" size="sm" onClick={() => setSendBackOpen(false)} className="hover:bg-muted/60">Cancel</Button>
            <Button
              size="sm"
              className="gap-1.5 relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSendBack}
              disabled={!sendBackReason.trim() || !sendBackTargetLevel}
            >
              <Undo2 className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-rotate-12" />
              <span className="font-semibold">Confirm Send Back</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reroute Dialog (BPS Admin / BPS DH only) ── */}
      <Dialog open={rerouteOpen} onOpenChange={setRerouteOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Reroute to Another Person</h3>
                <p className="text-[11px] opacity-80 mt-0.5">{selected?.suggestionNo}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Compact info strip */}
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
              <div className="space-y-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
                <p className="text-[11px] font-medium text-foreground truncate" title={selected?.subject}>{selected?.subject}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Employee</p>
                <p className="text-[11px] font-medium text-foreground">{selected?.employeeName}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Your Level</p>
                <Badge variant="outline" className="text-[10px] h-5 font-semibold">{currentLevel}</Badge>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-md px-2.5 py-2">
              Use this if the wrong person evaluated/approved this suggestion. Reroute directly assigns it to a
              different specific person at any stage — it does not require the employee to revise anything.
            </p>

            {/* Level selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                Reroute to Level
                <span className="text-destructive">*</span>
              </Label>
              <Select value={rerouteLevel} onValueChange={(v) => { setRerouteLevel(v); setRerouteTargetEmpNo(""); }}>
                <SelectTrigger className={`h-10 text-xs ${!rerouteLevel ? "border-violet-300 dark:border-violet-600 bg-violet-50/30 dark:bg-violet-950/10" : "border-emerald-300 dark:border-emerald-600"}`}>
                  <SelectValue placeholder="Select pipeline level" />
                </SelectTrigger>
                <SelectContent>
                  {rerouteLevelOptions.map(level => (
                    <SelectItem key={level} value={level} className="text-xs">{level}</SelectItem>
                  ))}
                  {rerouteLevelOptions.length === 0 && (
                    <SelectItem value="_none" disabled className="text-xs text-muted-foreground">
                      No levels available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Person selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                Reroute to Person
                <span className="text-destructive">*</span>
              </Label>
              <Select value={rerouteTargetEmpNo} onValueChange={setRerouteTargetEmpNo} disabled={!rerouteLevel}>
                <SelectTrigger className={`h-10 text-xs ${!rerouteTargetEmpNo ? "border-violet-300 dark:border-violet-600 bg-violet-50/30 dark:bg-violet-950/10" : "border-emerald-300 dark:border-emerald-600"}`}>
                  <SelectValue placeholder={rerouteLevel ? "Select person" : "Select a level first"} />
                </SelectTrigger>
                <SelectContent>
                  {rerouteTargetOptions.map(a => (
                    <SelectItem key={a.employee_no} value={a.employee_no} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.name}</span>
                        <span className="text-muted-foreground text-[10px]">({a.employee_no}) {a.department}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {rerouteLevel && rerouteTargetOptions.length === 0 && (
                    <SelectItem value="_none" disabled className="text-xs text-muted-foreground">
                      No one found at this level
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {rerouteTargetEmpNo && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <ChevronRight className="h-3 w-3" />
                  <span>Will be rerouted to <strong>{rerouteTargetOptions.find(a => a.employee_no === rerouteTargetEmpNo)?.name}</strong> ({rerouteLevel})</span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                Reason
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Why is this being rerouted? (e.g. wrong FLM evaluated it)"
                value={rerouteReason}
                onChange={e => setRerouteReason(e.target.value)}
                rows={3}
                className={`text-sm resize-none ${!rerouteReason.trim() ? "border-violet-300 dark:border-violet-600 bg-violet-50/30 dark:bg-violet-950/10" : ""}`}
              />
            </div>

            {/* Previous reroute history (if any) */}
            {selected?.rerouteHistory && selected.rerouteHistory.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Previous Reroutes ({selected.rerouteHistory.length})
                </p>
                {selected.rerouteHistory.map((rr, idx) => (
                  <div key={idx} className="text-[11px] text-muted-foreground pl-2 border-l-2 border-violet-300 dark:border-violet-600 space-y-0.5">
                    <div>
                      <span className="font-medium text-foreground">{rr.reroutedByName}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-foreground">{rr.toName}</span>
                      <span className="text-[10px] ml-1.5 opacity-60">({rr.toLevel}, {rr.date})</span>
                    </div>
                    {rr.reason && <p className="italic text-[10px]">"{rr.reason}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-3 flex justify-end gap-2 bg-muted/10">
            <Button variant="outline" size="sm" onClick={() => setRerouteOpen(false)} className="hover:bg-muted/60">Cancel</Button>
            <Button
              size="sm"
              className="gap-1.5 relative overflow-hidden bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleReroute}
              disabled={!rerouteReason.trim() || !rerouteLevel || !rerouteTargetEmpNo}
            >
              <ArrowRightLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              <span className="font-semibold">Confirm Reroute</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyApprovals;
