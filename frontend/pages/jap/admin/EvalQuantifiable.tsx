// JaP — Quantifiable Evaluation Form
// Admin fills in quantifiable metrics for a suggestion that is in the Evaluation stage.
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Search, Download, ClipboardList, X } from "lucide-react";
import * as apiService from "@/lib/apiService";
import type { Employee } from "@/lib/apiService";
import type { Suggestion } from "@/lib/mockData";
import { downloadCSV } from "@/lib/pdfUtils";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { addApprovalRecord, type ApprovalSlot } from "@/lib/jap/evalApprovalStore";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { mockEmployees } from "@/lib/mockData";

const JUDGEMENT_OPTIONS = [
  "Cost Reduction / लागत में कमी",
  "Quality Improvement / गुणवत्ता सुधार",
  "Productivity Enhancement / उत्पादकता वृद्धि",
  "Safety Improvement / सुरक्षा सुधार",
  "Waste Reduction / अपव्यय में कमी",
  "Cycle Time Reduction / चक्र समय में कमी",
  "Energy Saving / ऊर्जा बचत",
  "Others / अन्य",
] as const;

interface EvalRecord {
  id: string;
  suggNo: string;
  empName: string;
  dept: string;
  judgement: string;
  othersSpecify: string;
  implementationDate: string;
  opinionBy: string[];
  tefTeam: string[];
  implDoneBy: string[];
  processPlanner: string;
  savingsMaterial: string;
  repairRework: string;
  presentMtlWeight: string;
  proposedMtlWeight: string;
  presentVT: string;
  proposedVT: string;
  timeSaved: string;
  jobCategory: string;
  runningTimeBefore: string;
  runningTimeAfter: string;
  loadFactorBefore: string;
  loadFactorAfter: string;
  rating: string;
  motorCount: string;
  areaSaved: string;
  spaceUtilisationPlan: string;
  manpowerCategory: string;
  manpowerRangeFrom: string;
  manpowerRangeTo: string;
  costTools: string;
  costJigs: string;
  costMcEquipment: string;
  costManhours: string;
  costEquipLife: string;
  costOthers: string;
  remarks: string;
  pointsRows: Array<{ empNo: string; empName: string; dept: string; points: string }>;
  qpsSignedBy: string;
  qpsSignedAt: string;
  deptCoord: { empNo: string; empName: string; dept: string; date: string };
  procPlanSign: { empNo: string; empName: string; dept: string; date: string; areaOfImpl: string };
  fcmHead: { empNo: string; empName: string; dept: string; date: string };
  approvalAuth: { empNo: string; empName: string; dept: string; date: string };
  date: string;
  auditId: string;
}

const JaPEvalQuantifiable = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedSuggNo = searchParams.get("sugg") || "";
  const isCtg = user?.japRole === "ctg";
  const isPlanner = user?.japRole === "planner";

  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(() =>
    mockEmployees.filter(e => e.plantCode === "PLT-02").map(e => ({
      employee_no: e.employeeNo, name: e.name, department: e.department,
      plant_code: e.plantCode, role: "employee", ntid: e.ntid, email: e.email,
    }))
  );
  const [selectedSuggNo, setSelectedSuggNo] = useState(preselectedSuggNo);
  const [submitted, setSubmitted] = useState(false);

  const [judgement, setJudgement] = useState("");
  const [othersSpecify, setOthersSpecify] = useState("");
  const [implementationDate, setImplementationDate] = useState("");

  // 3-column team selectors — each is an array of 3 slots (empty string = unselected)
  const [opinionBy,   setOpinionBy]   = useState<string[]>(["" , "", ""]);
  const [tefTeam,     setTefTeam]     = useState<string[]>(["" , "", ""]);
  const [implDoneBy,  setImplDoneBy]  = useState<string[]>(["" , "", ""]);
  const [processPlanner, setProcessPlanner] = useState("");
  const [pointsRows, setPointsRows] = useState<Array<{ empNo: string; points: string }>>([{ empNo: "", points: "" }]);

  const [deptCoord,    setDeptCoord]    = useState({ empNo: "", date: "" });
  const [procPlanSign, setProcPlanSign] = useState({ empNo: "", date: "", areaOfImpl: "" });
  const [fcmHead,      setFcmHead]      = useState({ empNo: "", date: "" });
  const [approvalAuth, setApprovalAuth] = useState({ empNo: "", date: "" });

  const [savingsMaterial,   setSavingsMaterial]   = useState("");
  const [repairRework,      setRepairRework]      = useState("");
  const [presentMtlWeight,  setPresentMtlWeight]  = useState("");
  const [proposedMtlWeight, setProposedMtlWeight] = useState("");

  const [presentVT,   setPresentVT]   = useState("");
  const [proposedVT,  setProposedVT]  = useState("");
  const [timeSaved,   setTimeSaved]   = useState("");
  const [jobCategory, setJobCategory] = useState("");

  const [runningTimeBefore, setRunningTimeBefore] = useState("");
  const [runningTimeAfter,  setRunningTimeAfter]  = useState("");
  const [loadFactorBefore,  setLoadFactorBefore]  = useState("");
  const [loadFactorAfter,   setLoadFactorAfter]   = useState("");
  const [rating,      setRating]      = useState("");
  const [motorCount,  setMotorCount]  = useState("");

  const [areaSaved,            setAreaSaved]            = useState("");
  const [spaceUtilisationPlan, setSpaceUtilisationPlan] = useState("");

  const [manpowerCategory,  setManpowerCategory]  = useState("");
  const [manpowerRangeFrom, setManpowerRangeFrom] = useState("");
  const [manpowerRangeTo,   setManpowerRangeTo]   = useState("");

  const [costTools,       setCostTools]       = useState("");
  const [costJigs,        setCostJigs]        = useState("");
  const [costMcEquipment, setCostMcEquipment] = useState("");
  const [costManhours,    setCostManhours]    = useState("");
  const [costEquipLife,   setCostEquipLife]   = useState("");
  const [costOthers,      setCostOthers]      = useState("");

  const totalCost = [
    costTools, costJigs, costMcEquipment, costManhours, costOthers,
  ].reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  const [remarks, setRemarks] = useState("");

  const isOthers = judgement === "Others / अन्य";

  const [evalLog, setEvalLog] = useState<EvalRecord[]>([]);
  const [searchLog, setSearchLog] = useState("");

  const { suggestions: contextSuggestions, updateSuggestion } = useSuggestions();

  useEffect(() => {
    const ctx = contextSuggestions.filter(s => s.plantCode === "PLT-02");
    setAllSuggestions(ctx);
    apiService.fetchSuggestions({ plantCode: "jap", limit: 2000 })
      .then(r => {
        if (r.data?.length) {
          const japOnly = r.data.filter(s => s.plantCode === "PLT-02");
          if (japOnly.length) setAllSuggestions(japOnly);
        }
      })
      .catch(() => {});
    apiService.fetchEmployees("jap")
      .then(list => {
        const jap = list.filter(e => e.plant_code === "PLT-02");
        if (jap.length) setEmployees(jap);
      })
      .catch(() => {});
  }, []);

  // Only suggestions in Evaluation with quantifiable classification
  // CTG: only sees suggestions where planner has already filled basic details
  const evalCandidates = allSuggestions.filter(s => {
    if (s.status !== "In Evaluation") return false;
    const fd = s.formData as any;
    if (isCtg) return fd?.evaluationType === "quantifiable" && fd?.plannerEvalDone;
    return fd?.evaluationType === "quantifiable" || !fd?.evaluationType;
  });

  const suggestionOptions = evalCandidates.map(s => ({
    value: s.suggestionNo,
    label: `${s.suggestionNo} — ${s.subject.slice(0, 45)}`,
    sublabel: `${s.employeeName} • ${s.department || ""}`,
  }));

  // When CTG selects a suggestion, load any data already filled by the planner
  useEffect(() => {
    if (!suggestion || !isCtg) return;
    const fd = suggestion.formData as any;
    if (!fd?.plannerEvalDone) return;
    if (fd.judgement) setJudgement(fd.judgement);
    if (fd.othersSpecify) setOthersSpecify(fd.othersSpecify);
    if (fd.implementationDate) setImplementationDate(fd.implementationDate);
    if (fd.opinionBy) setOpinionBy(fd.opinionBy);
    if (fd.tefTeam) setTefTeam(fd.tefTeam);
    if (fd.implDoneBy) setImplDoneBy(fd.implDoneBy);
    if (fd.processPlanner) setProcessPlanner(fd.processPlanner);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSuggNo, isCtg]);

  const suggestion = allSuggestions.find(s => s.suggestionNo === selectedSuggNo);

  const handleReset = () => {
    setSelectedSuggNo(""); setJudgement(""); setOthersSpecify("");
    setImplementationDate("");
    setOpinionBy(["", "", ""]); setTefTeam(["", "", ""]);
    setImplDoneBy(["", "", ""]); setProcessPlanner("");
    setSavingsMaterial(""); setRepairRework("");
    setPresentMtlWeight(""); setProposedMtlWeight("");
    setPresentVT(""); setProposedVT(""); setTimeSaved(""); setJobCategory("");
    setRunningTimeBefore(""); setRunningTimeAfter("");
    setLoadFactorBefore(""); setLoadFactorAfter("");
    setRating(""); setMotorCount("");
    setAreaSaved(""); setSpaceUtilisationPlan("");
    setManpowerCategory(""); setManpowerRangeFrom(""); setManpowerRangeTo("");
    setCostTools(""); setCostJigs(""); setCostMcEquipment("");
    setCostManhours(""); setCostEquipLife(""); setCostOthers("");
    setPointsRows([{ empNo: "", points: "" }]);
    setDeptCoord({ empNo: "", date: "" });
    setProcPlanSign({ empNo: "", date: "", areaOfImpl: "" });
    setFcmHead({ empNo: "", date: "" });
    setApprovalAuth({ empNo: "", date: "" });
    setRemarks(""); setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!selectedSuggNo) { toast.error("Please select a suggestion"); return; }
    if (!judgement) { toast.error("Please select a Judgement of Acceptance"); return; }
    if (isOthers && !othersSpecify.trim()) { toast.error("Please specify the aspect under 'Others'"); return; }
    if (!implementationDate) { toast.error("Please enter the Date of Implementation"); return; }

    const auditId = `JAP-QEV-${Date.now().toString().slice(-6)}`;

    // ─── Planner flow: save basic details, keep "In Evaluation", route to CTG ───
    if (!isCtg && suggestion) {
      const plannerData = {
        evaluationType: "quantifiable",
        plannerEvalDone: true,
        plannerEvalBy: user?.employeeNo || "",
        plannerEvalByName: user?.name || "",
        plannerEvalOn: new Date().toISOString().split("T")[0],
        judgement: isOthers ? `Others: ${othersSpecify}` : judgement,
        othersSpecify: isOthers ? othersSpecify : "",
        implementationDate,
        opinionBy: opinionBy.filter(Boolean),
        tefTeam: tefTeam.filter(Boolean),
        implDoneBy: implDoneBy.filter(Boolean),
        processPlanner,
        auditId,
      };
      const mergedFormData = { ...(suggestion.formData as any), ...plannerData };
      updateSuggestion(suggestion.id, {
        pendingWith: "CTG",
        formData: mergedFormData,
      });
      try {
        await apiService.patchSuggestionStatus(suggestion.id, "In Evaluation");
      } catch { /* local fallback */ }
      setSubmitted(true);
      toast.success(`Basic evaluation saved — routed to CTG for savings calculation`);
      addNotification(`JaP Quantifiable eval (planner): ${selectedSuggNo} → CTG`, "success");
      return;
    }

    // ─── CTG flow: save savings calculations, advance to "In Award" ───
    if (suggestion) {
      const ctgData = {
        ctgEvalBy: user?.employeeNo || "",
        ctgEvalByName: user?.name || "",
        ctgEvalOn: new Date().toISOString().split("T")[0],
        savingsMaterial, repairRework, presentMtlWeight, proposedMtlWeight,
        presentVT, proposedVT, timeSaved, jobCategory,
        runningTimeBefore, runningTimeAfter, loadFactorBefore, loadFactorAfter,
        rating, motorCount, areaSaved, spaceUtilisationPlan,
        manpowerCategory, manpowerRangeFrom, manpowerRangeTo,
        costTools, costJigs, costMcEquipment, costManhours, costEquipLife, costOthers,
        totalCost,
        evaluatedBy: user?.employeeNo || "",
        evaluatedByName: user?.name || "",
        evaluatedOn: new Date().toISOString().split("T")[0],
      };
      const mergedFormData = { ...(suggestion.formData as any), ...ctgData };
      updateSuggestion(suggestion.id, {
        status: "In Award",
        pendingWith: "BPS / Finance",
        daysPending: 0,
        formData: mergedFormData,
      });
      try {
        await apiService.patchSuggestionStatus(suggestion.id, "In Award");
      } catch { /* local fallback */ }
    }

    const record: EvalRecord = {
      id: String(Date.now()),
      suggNo: selectedSuggNo,
      empName: suggestion?.employeeName || "",
      dept: suggestion?.department || "",
      judgement: isOthers ? `Others: ${othersSpecify}` : judgement,
      othersSpecify: isOthers ? othersSpecify : "",
      implementationDate,
      opinionBy: opinionBy.filter(Boolean),
      tefTeam: tefTeam.filter(Boolean),
      implDoneBy: implDoneBy.filter(Boolean),
      processPlanner,
      savingsMaterial,
      repairRework,
      presentMtlWeight,
      proposedMtlWeight,
      presentVT,
      proposedVT,
      timeSaved,
      jobCategory,
      runningTimeBefore,
      runningTimeAfter,
      loadFactorBefore,
      loadFactorAfter,
      rating,
      motorCount,
      areaSaved,
      spaceUtilisationPlan,
      manpowerCategory,
      manpowerRangeFrom,
      manpowerRangeTo,
      costTools,
      costJigs,
      costMcEquipment,
      costManhours,
      costEquipLife,
      costOthers,
      remarks,
      pointsRows: pointsRows.map(r => ({
        empNo: r.empNo,
        empName: employees.find(e => e.employee_no === r.empNo)?.name || "",
        dept: employees.find(e => e.employee_no === r.empNo)?.department || "",
        points: r.points,
      })),
      qpsSignedBy: user ? `${user.name} (${user.employeeNo})` : "Unknown",
      qpsSignedAt: new Date().toISOString(),
      deptCoord: { ...deptCoord, empName: employees.find(e => e.employee_no === deptCoord.empNo)?.name || "", dept: employees.find(e => e.employee_no === deptCoord.empNo)?.department || "" },
      procPlanSign: { ...procPlanSign, empName: employees.find(e => e.employee_no === procPlanSign.empNo)?.name || "", dept: employees.find(e => e.employee_no === procPlanSign.empNo)?.department || "" },
      fcmHead: { ...fcmHead, empName: employees.find(e => e.employee_no === fcmHead.empNo)?.name || "", dept: employees.find(e => e.employee_no === fcmHead.empNo)?.department || "" },
      approvalAuth: { ...approvalAuth, empName: employees.find(e => e.employee_no === approvalAuth.empNo)?.name || "", dept: employees.find(e => e.employee_no === approvalAuth.empNo)?.department || "" },
      date: new Date().toISOString().slice(0, 10),
      auditId,
    };

    setEvalLog(prev => [record, ...prev]);

    // Save to approval store so named approvers see this in their Approval Inbox
    const approvalSlots: ApprovalSlot[] = [
      deptCoord.empNo    ? { role: "deptCoord",    label: "Dept Suggestion Co-ordinator", empNo: deptCoord.empNo,    empName: employees.find(e => e.employee_no === deptCoord.empNo)?.name    || "", approved: false, approvedAt: null } : null,
      procPlanSign.empNo ? { role: "procPlanSign", label: "Process Planner Sign",          empNo: procPlanSign.empNo, empName: employees.find(e => e.employee_no === procPlanSign.empNo)?.name || "", approved: false, approvedAt: null } : null,
      fcmHead.empNo      ? { role: "fcmHead",      label: "FCM Head",                     empNo: fcmHead.empNo,      empName: employees.find(e => e.employee_no === fcmHead.empNo)?.name      || "", approved: false, approvedAt: null } : null,
      approvalAuth.empNo ? { role: "approvalAuth", label: "Planning Head / Manager+",     empNo: approvalAuth.empNo, empName: employees.find(e => e.employee_no === approvalAuth.empNo)?.name || "", approved: false, approvedAt: null } : null,
    ].filter((s): s is ApprovalSlot => s !== null);
    if (approvalSlots.length > 0) {
      addApprovalRecord({
        id: auditId,
        evalType: "quantifiable",
        auditId,
        suggNo: selectedSuggNo,
        suggesterName: suggestion?.employeeName || "",
        dept: suggestion?.department || "",
        submittedBy: user ? `${user.name} (${user.employeeNo})` : "Unknown",
        submittedAt: new Date().toISOString(),
        summary: `Judgement: ${isOthers ? `Others: ${othersSpecify}` : judgement.split(" / ")[0]} | Impl: ${implementationDate}`,
        approvals: approvalSlots,
      });
    }

    setSubmitted(true);
    toast.success(`Quantifiable evaluation submitted — Audit ID: ${auditId}`);
    addNotification(`JaP Quantifiable evaluation: ${selectedSuggNo}`, "success");
  };

  const CSV_HEADERS = ["Sugg No", "Employee", "Department", "Judgement", "Others Specify", "Implementation Date", "Opinion By", "TEF Team", "Impl Done By", "Process Planner", "Savings Material (STK)", "Repair & Rework", "Present Mtl Weight (kg/100pcs)", "Proposed Mtl Weight (kg/100pcs)", "Present VT (min/100pcs)", "Proposed VT (min/100pcs)", "Time Saved (min/100pcs)", "Job Category", "Running Time Before (hrs)", "Running Time After (hrs)", "Load Factor Before (%)", "Load Factor After (%)", "Rating (kWh)", "No. of Motors", "Area Saved (sq.mtrs)", "Space Utilisation Plan", "Manpower Category", "Manpower Range From", "Manpower Range To", "Cost Tools (INR)", "Cost Jigs/Fixtures (INR)", "Cost M/C Equipment (INR)", "Cost Manhours (hrs)", "Life of Equipment (yrs)", "Cost Others (INR)", "Total Cost (INR)", "Team Points", "QPS Signed By", "Dept Coord (Name)", "Dept Coord (ENo)", "Dept Coord (Date)", "Proc Planner Sign (Name)", "Proc Planner Sign (ENo)", "Proc Planner Sign (Date)", "Area of Impl", "FCM Head (Name)", "FCM Head (ENo)", "FCM Head (Date)", "Approval Auth (Name)", "Approval Auth (ENo)", "Approval Auth (Date)", "Remarks", "Date", "Audit ID"];

  const recordToRow = (r: EvalRecord) => [r.suggNo, r.empName, r.dept, r.judgement, r.othersSpecify || "—", r.implementationDate, r.opinionBy.join("; "), r.tefTeam.join("; "), r.implDoneBy.join("; "), r.processPlanner, r.savingsMaterial, r.repairRework, r.presentMtlWeight, r.proposedMtlWeight, r.presentVT, r.proposedVT, r.timeSaved, r.jobCategory, r.runningTimeBefore, r.runningTimeAfter, r.loadFactorBefore, r.loadFactorAfter, r.rating, r.motorCount, r.areaSaved, r.spaceUtilisationPlan, r.manpowerCategory, r.manpowerRangeFrom, r.manpowerRangeTo, r.costTools, r.costJigs, r.costMcEquipment, r.costManhours, r.costEquipLife, r.costOthers, String([r.costTools,r.costJigs,r.costMcEquipment,r.costManhours,r.costOthers].reduce((s,v)=>s+(parseFloat(v)||0),0)), r.pointsRows.map(p=>`${p.empName}:${p.points}`).join("; "), r.qpsSignedBy, r.deptCoord.empName, r.deptCoord.empNo, r.deptCoord.date, r.procPlanSign.empName, r.procPlanSign.empNo, r.procPlanSign.date, r.procPlanSign.areaOfImpl, r.fcmHead.empName, r.fcmHead.empNo, r.fcmHead.date, r.approvalAuth.empName, r.approvalAuth.empNo, r.approvalAuth.date, r.remarks, r.date, r.auditId];

  const handleExportRecord = (r: EvalRecord) => {
    downloadCSV(CSV_HEADERS, [recordToRow(r)], `JaP_QEval_${r.suggNo}_${r.auditId}.csv`);
    toast.success("Record exported!");
  };

  const handleExport = () => {
    downloadCSV(
      CSV_HEADERS,
      evalLog.map(recordToRow),
      `JaP_Quantifiable_Eval_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success("Evaluation log exported!");
  };

  const filteredLog = evalLog.filter(r =>
    r.suggNo.toLowerCase().includes(searchLog.toLowerCase()) ||
    r.empName.toLowerCase().includes(searchLog.toLowerCase())
  );

  // ── Employee combobox helpers ───────────────────────────────────────────────
  const empOptions = employees.map(e => ({
    value: e.employee_no,
    label: `${e.employee_no} — ${e.name}`,
    sublabel: e.department,
  }));

  // Returns options excluding already-selected sibling slots (no-repeat within same group)
  const availableFor = (group: string[], slotIdx: number) =>
    empOptions.filter(o => !group.some((v, i) => i !== slotIdx && v === o.value));

  const setSlot = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) =>
    setter(prev => prev.map((v, i) => (i === idx ? val : v)));

  // Small inline combobox for employee slots
  const EmpCombobox = ({
    groupValues, groupSetter, slotIdx, placeholder,
  }: {
    groupValues: string[];
    groupSetter: React.Dispatch<React.SetStateAction<string[]>>;
    slotIdx: number;
    placeholder: string;
  }) => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = groupValues[slotIdx];
    const opts = availableFor(groupValues, slotIdx);
    const filtered = opts.filter(o =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
    );
    const displayLabel = current
      ? (empOptions.find(o => o.value === current)?.label ?? current)
      : "";

    useEffect(() => { setQuery(current ? displayLabel : ""); }, [current]);

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
      <div ref={ref} className="relative">
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-7 pr-6"
              placeholder={placeholder}
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
            />
            {current && (
              <button
                type="button"
                className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => { setSlot(groupSetter, slotIdx, ""); setQuery(""); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {open && filtered.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
            {filtered.slice(0, 20).map(o => (
              <button
                key={o.value}
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-accent text-xs"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setSlot(groupSetter, slotIdx, o.value); setQuery(o.label); setOpen(false); }}
              >
                <span className="font-medium">{o.value}</span>
                <span className="text-muted-foreground ml-1.5">{employees.find(e => e.employee_no === o.value)?.name}</span>
                {o.sublabel && <span className="text-muted-foreground ml-1.5 text-[10px]">• {o.sublabel}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Single-select employee combobox for the Points table
  const PointsEmpCombobox = ({
    value, onChange, usedEmpNos,
  }: {
    value: string;
    onChange: (val: string) => void;
    usedEmpNos: string[];
  }) => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const opts = empOptions.filter(o => o.value === value || !usedEmpNos.includes(o.value));
    const filtered = opts.filter(o =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
    );
    const displayLabel = value ? (empOptions.find(o => o.value === value)?.label ?? value) : "";
    useEffect(() => { setQuery(value ? displayLabel : ""); }, [value]);
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
    return (
      <div ref={ref} className="relative">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 text-xs pl-7 pr-6"
            placeholder="Search employee..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {value && (
            <button
              type="button"
              className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-destructive"
              onClick={() => { onChange(""); setQuery(""); }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {open && filtered.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
            {filtered.slice(0, 20).map(o => (
              <button
                key={o.value}
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-accent text-xs"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(o.value); setQuery(o.label); setOpen(false); }}
              >
                <span className="font-medium">{o.value}</span>
                <span className="text-muted-foreground ml-1.5">{employees.find(e => e.employee_no === o.value)?.name}</span>
                {o.sublabel && <span className="text-muted-foreground ml-1.5 text-[10px]">• {o.sublabel}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Quantifiable Evaluation <span className="text-sm font-normal text-muted-foreground">/ मापनीय मूल्यांकन</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {isCtg
              ? "Fill savings calculations for suggestions classified as quantifiable by the planner"
              : "Fill evaluation metrics for suggestions with measurable outcomes"}
          </p>
        </div>
        <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200">
          {isCtg ? "CTG — Savings" : "Quantifiable / मापनीय"}
        </Badge>
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-5">

          {/* Suggestion selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Suggestion No <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ सुझाव संख्या — (In Evaluation stage)</span>
            </Label>
            <SuggestionCombobox
              options={suggestionOptions}
              value={selectedSuggNo}
              onChange={v => { setSelectedSuggNo(v); setSubmitted(false); }}
              placeholder="Type suggestion number or keyword..."
            />
          </div>

          {/* Suggestion preview */}
          {suggestion && (
            <div className="bg-muted/40 border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{suggestion.subject}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.category}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{suggestion.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <p><span className="text-muted-foreground">Employee:</span> {suggestion.employeeName} ({suggestion.employeeNo})</p>
                <p><span className="text-muted-foreground">Dept:</span> {suggestion.department || "N/A"}</p>
                <p><span className="text-muted-foreground">Date:</span> {suggestion.date}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* ── Judgement of Acceptance ── */}
          <p className="text-xs font-semibold text-primary">Judgement of Acceptance / स्वीकृति का निर्णय</p>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Indicate the Appropriate Aspect <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ उपयुक्त पहलू चुनें</span>
            </Label>
            <Select value={judgement} onValueChange={v => { setJudgement(v); setOthersSpecify(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select an aspect..." />
              </SelectTrigger>
              <SelectContent>
                {JUDGEMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Others → specify text box, shown only when "Others" is selected */}
          {isOthers && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                If Others, Please Specify <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ यदि अन्य, कृपया बताएं</span>
              </Label>
              <Input
                placeholder="Describe the aspect..."
                value={othersSpecify}
                onChange={e => setOthersSpecify(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* ── Date of Implementation + Team Members ───────────────── */}
          <Separator />
          <p className="text-xs font-semibold text-primary">Implementation Details / कार्यान्वयन विवरण</p>

          {/* Date of Implementation */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Date of Implementation <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ क्रियान्वयन की तिथि</span>
            </Label>
            <Input
              type="date"
              className="w-48"
              value={implementationDate}
              onChange={e => setImplementationDate(e.target.value)}
            />
          </div>

          {/* Team Members sub-heading */}
          <p className="text-xs font-medium text-muted-foreground pt-1">Team Members / टीम सदस्य</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Column 1: Opinion Given By */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                Opinion Given By <span className="text-[10px] text-muted-foreground font-normal">/ राय देने वाले</span>
              </p>
              {[0, 1, 2].map(i => (
                <div key={i} className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Member {i + 1}</Label>
                  <EmpCombobox
                    groupValues={opinionBy}
                    groupSetter={setOpinionBy}
                    slotIdx={i}
                    placeholder={`Employee ${i + 1}`}
                  />
                </div>
              ))}
            </div>

            {/* Column 2: TEF Implementation Team */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                TEF Implementation Team <span className="text-[10px] text-muted-foreground font-normal">/ TEF कार्यान्वयन टीम</span>
              </p>
              {[0, 1, 2].map(i => (
                <div key={i} className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Member {i + 1}</Label>
                  <EmpCombobox
                    groupValues={tefTeam}
                    groupSetter={setTefTeam}
                    slotIdx={i}
                    placeholder={`Employee ${i + 1}`}
                  />
                </div>
              ))}
            </div>

            {/* Column 3: Implementation Done By + Process Planner */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                Implementation Done By <span className="text-[10px] text-muted-foreground font-normal">/ क्रियान्वयन करने वाले</span>
              </p>
              {[0, 1, 2].map(i => (
                <div key={i} className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Member {i + 1}</Label>
                  <EmpCombobox
                    groupValues={implDoneBy}
                    groupSetter={setImplDoneBy}
                    slotIdx={i}
                    placeholder={`Employee ${i + 1}`}
                  />
                </div>
              ))}
              {/* 4th slot: Process Planner */}
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">Process Planner / प्रक्रिया योजनाकार</Label>
                <EmpCombobox
                  groupValues={[processPlanner, ...implDoneBy]}
                  groupSetter={(updater) => {
                    // Only update the processPlanner slot (index 0 of this virtual group)
                    const next = typeof updater === "function" ? updater([processPlanner, ...implDoneBy]) : updater;
                    setProcessPlanner(next[0]);
                  }}
                  slotIdx={0}
                  placeholder="Process Planner"
                />
              </div>
            </div>
          </div>

          {/* ── Savings & Material Weight ─────────────────────────────── */}
          {/* CTG/BPS-only savings sections — hidden for planner */}
          {isCtg || !isPlanner ? (
          <>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Column 1 */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Savings Material (STK){" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ बचत सामग्री (STK)</span>
                </Label>
                <Input
                  placeholder="e.g. Steel sheet, Grade A bolt..."
                  value={savingsMaterial}
                  onChange={e => setSavingsMaterial(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Repair and Rework{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ मरम्मत और पुनर्कार्य</span>
                </Label>
                <Input
                  placeholder="Describe repair / rework details..."
                  value={repairRework}
                  onChange={e => setRepairRework(e.target.value)}
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Present Material Weight{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ वर्तमान सामग्री वजन</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-36"
                    value={presentMtlWeight}
                    onChange={e => setPresentMtlWeight(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">kg / 100 pcs</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Proposed Material Weight{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ प्रस्तावित सामग्री वजन</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-36"
                    value={proposedMtlWeight}
                    onChange={e => setProposedMtlWeight(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">kg / 100 pcs</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Savings in Processing Time ──────────────────────────── */}
          <Separator />
          <p className="text-xs font-semibold text-primary">
            Savings in Processing Time / प्रसंस्करण समय में बचत
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Column 1: a & b */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  a) Present VT{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ वर्तमान VT</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-36"
                    value={presentVT}
                    onChange={e => setPresentVT(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">min / 100 pcs</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  b) Proposed VT{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ प्रस्तावित VT</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-36"
                    value={proposedVT}
                    onChange={e => setProposedVT(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">min / 100 pcs</span>
                </div>
              </div>
            </div>

            {/* Column 2: c & d */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  c) Time Saved{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ बचा समय</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-36"
                    value={timeSaved}
                    onChange={e => setTimeSaved(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">min / 100 pcs</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  d) Job Category{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ कार्य श्रेणी</span>
                </Label>
                <Input
                  placeholder="e.g. Machining, Assembly..."
                  value={jobCategory}
                  onChange={e => setJobCategory(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Power Saving ───────────────────────────────────────── */}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary">
              Power Saving / बिजली बचत
            </p>
            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              ⚠️ Note: Load factor and running time should be studied at least for a week / लोड फैक्टर और चलने का समय कम से कम एक सप्ताह तक अध्ययन किया जाना चाहिए
            </p>
          </div>

          {/* Row 1: Running Time | Load Factor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* a) Running Time */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                a) Running Time (hrs){" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ चलने का समय</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Before / पहले</p>
                  <Input type="number" min="0" step="0.01" placeholder="0.00"
                    value={runningTimeBefore} onChange={e => setRunningTimeBefore(e.target.value)} />
                </div>
                <span className="text-muted-foreground mt-4">/</span>
                <div className="flex-1 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">After / बाद</p>
                  <Input type="number" min="0" step="0.01" placeholder="0.00"
                    value={runningTimeAfter} onChange={e => setRunningTimeAfter(e.target.value)} />
                </div>
              </div>
            </div>

            {/* b) Load Factor */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                b) Load Factor (%){" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ लोड फैक्टर</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Before / पहले</p>
                  <Input type="number" min="0" max="100" step="0.1" placeholder="0.0"
                    value={loadFactorBefore} onChange={e => setLoadFactorBefore(e.target.value)} />
                </div>
                <span className="text-muted-foreground mt-4">/</span>
                <div className="flex-1 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">After / बाद</p>
                  <Input type="number" min="0" max="100" step="0.1" placeholder="0.0"
                    value={loadFactorAfter} onChange={e => setLoadFactorAfter(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Rating | No. of Motor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* c) Rating */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                c) Rating{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ रेटिंग</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  className="w-36"
                  value={rating} onChange={e => setRating(e.target.value)} />
                <span className="text-xs text-muted-foreground">kWh</span>
              </div>
            </div>

            {/* d) No. of Motor */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                d) No. of Motor{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ मोटर की संख्या</span>
              </Label>
              <Input type="number" min="0" step="1" placeholder="0"
                className="w-36"
                value={motorCount} onChange={e => setMotorCount(e.target.value)} />
            </div>
          </div>

          {/* ── Space Saving ──────────────────────────────────────────── */}
          <Separator />
          <p className="text-xs font-semibold text-primary">
            Space Saving / स्थान बचत
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* a) Area saved */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                a) Area Saved{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ बचाया गया क्षेत्र</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="w-36"
                  value={areaSaved}
                  onChange={e => setAreaSaved(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">sq. mtrs</span>
              </div>
            </div>

            {/* b) Plans for utilising saved space */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                b) Plans for Utilising Saved Space{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ बचे स्थान के उपयोग की योजना</span>
              </Label>
              <Input
                placeholder="Describe utilisation plan..."
                value={spaceUtilisationPlan}
                onChange={e => setSpaceUtilisationPlan(e.target.value)}
              />
            </div>
          </div>

          {/* ── Existing Stock ──────────────────────────────────────────── */}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary">
              Existing Stock / मौजूदा स्टॉक
            </p>
            <div className="border border-dashed border-muted-foreground/30 rounded-lg px-4 py-6 text-center text-xs text-muted-foreground">
              Content to be defined — fields will be added here
            </div>
          </div>

          {/* ── Manpower Saving ─────────────────────────────────────────── */}
          <Separator />
          <p className="text-xs font-semibold text-primary">
            Manpower Saving / जनशक्ति बचत
          </p>

          {/* a) Category */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              a) Category of Employee Carrying Out Operation{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ ऑपरेशन करने वाले कर्मचारी की श्रेणी</span>
            </Label>
            <Input
              placeholder="e.g. Operator, Technician, Engineer..."
              value={manpowerCategory}
              onChange={e => setManpowerCategory(e.target.value)}
            />
          </div>

          {/* b) Range from / to */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              b) In Case of More Than One Category — Specify Range{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ एक से अधिक श्रेणी होने पर परिसर बताएं</span>
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">From / से</span>
                <Input
                  placeholder="e.g. Grade A"
                  className="w-40"
                  value={manpowerRangeFrom}
                  onChange={e => setManpowerRangeFrom(e.target.value)}
                />
              </div>
              <span className="text-muted-foreground">—</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">To / तक</span>
                <Input
                  placeholder="e.g. Grade C"
                  className="w-40"
                  value={manpowerRangeTo}
                  onChange={e => setManpowerRangeTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Cost of Implementation ───────────────────────────────────── */}
          {/* Only shown when Date of Implementation is set AND at least one Implementation team member is selected */}
          {(implementationDate && implDoneBy.some(v => v)) ? (
          <>
          <Separator />
          <p className="text-xs font-semibold text-primary">
            Cost of Implementation / कार्यान्वयन की लागत
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">

            {/* a) Tools */}
            <div className="space-y-1.5">
              <Label className="text-xs">a) Tools <span className="text-[10px] text-muted-foreground">/ उपकरण</span></Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">₹</span>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={costTools} onChange={e => setCostTools(e.target.value)} />
              </div>
            </div>

            {/* b) Jigs / Fixtures */}
            <div className="space-y-1.5">
              <Label className="text-xs">b) Jigs / Fixtures <span className="text-[10px] text-muted-foreground">/ जिग / फिक्सचर</span></Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">₹</span>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={costJigs} onChange={e => setCostJigs(e.target.value)} />
              </div>
            </div>

            {/* c) M/C Equipment */}
            <div className="space-y-1.5">
              <Label className="text-xs">c) M/C Equipment <span className="text-[10px] text-muted-foreground">/ मशीन उपकरण</span></Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">₹</span>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={costMcEquipment} onChange={e => setCostMcEquipment(e.target.value)} />
              </div>
            </div>

            {/* d) Manhours */}
            <div className="space-y-1.5">
              <Label className="text-xs">d) Manhours Spent by Implementation Team <span className="text-[10px] text-muted-foreground">/ मानव-घंटे</span></Label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="0.5" placeholder="0"
                  value={costManhours} onChange={e => setCostManhours(e.target.value)} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">hrs</span>
              </div>
            </div>

            {/* e) Life of equipment */}
            <div className="space-y-1.5">
              <Label className="text-xs">e) Life of Equipment / Tools / Jigs / Fixtures <span className="text-[10px] text-muted-foreground">/ उपकरण जीवन</span></Label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="0.5" placeholder="0"
                  className="w-28"
                  value={costEquipLife} onChange={e => setCostEquipLife(e.target.value)} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">years</span>
              </div>
            </div>

            {/* f) Others */}
            <div className="space-y-1.5">
              <Label className="text-xs">f) Others <span className="text-[10px] text-muted-foreground">/ अन्य</span></Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">₹</span>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={costOthers} onChange={e => setCostOthers(e.target.value)} />
              </div>
            </div>
          </div>

          {/* g) Total — auto-computed */}
          <div className="bg-muted/50 border rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-xs font-semibold">
              g) Total Cost of Implementation <span className="text-[10px] text-muted-foreground font-normal">/ कुल कार्यान्वयन लागत (a+b+c+f)</span>
            </p>
            <p className="text-sm font-bold text-primary">₹ {totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          </>
          ) : (
          <>
          <Separator />
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-dashed text-xs text-muted-foreground">
            <span className="text-base">🔒</span>
            <span>
              <strong>Cost of Implementation</strong> will appear once{" "}
              <span className={implementationDate ? "line-through opacity-40" : "text-foreground font-medium"}>Date of Implementation</span>
              {" "}and{" "}
              <span className={implDoneBy.some(v => v) ? "line-through opacity-40" : "text-foreground font-medium"}>at least one Implementation team member</span>
              {" "}are filled in.
            </span>
          </div>
          </>
          )}
          </>
          ) : null}

          {/* ── End of CTG savings sections ── */}
          {isPlanner && !isCtg && (
            <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 mt-2">
              <span className="text-base">📋</span>
              <span>
                <strong>Savings Calculation</strong> sections (Material, Processing Time, Power, Space, Manpower, Cost of Implementation) will be filled by the <strong>CTG</strong> after you submit the basic evaluation details above.
              </span>
            </div>
          )}

          {/* ── Points Awarded + QPS Co-ordinator Stamp ─────────────── */}
          <Separator />
          <div className="flex items-start gap-5">

            {/* Left: Points table */}
            <div className="flex-1 space-y-2 min-w-0">
              <p className="text-xs font-semibold text-primary">
                Points Awarded to Team Members <span className="text-[10px] font-normal text-muted-foreground">/ टीम सदस्यों को दिए गए अंक</span>
              </p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name of Team Member</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Emp No</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-32">Department</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Points Awarded</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsRows.map((row, idx) => {
                      const emp = employees.find(e => e.employee_no === row.empNo);
                      const usedEmpNos = pointsRows.map(r => r.empNo).filter((v, i) => v && i !== idx);
                      return (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1.5">
                            <PointsEmpCombobox
                              value={row.empNo}
                              onChange={val => setPointsRows(prev => prev.map((r, i) => i === idx ? { ...r, empNo: val } : r))}
                              usedEmpNos={usedEmpNos}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground font-mono text-[10px]">
                            {emp ? emp.employee_no : <span className="opacity-30">—</span>}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {emp ? emp.department : <span className="opacity-30">—</span>}
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number" min="0" step="1" placeholder="0"
                              className="h-7 text-xs w-20"
                              value={row.points}
                              onChange={e => setPointsRows(prev => prev.map((r, i) => i === idx ? { ...r, points: e.target.value } : r))}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            {pointsRows.length > 1 && (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setPointsRows(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Button
                type="button" variant="outline" size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setPointsRows(prev => [...prev, { empNo: "", points: "" }])}
              >
                + Add Member
              </Button>
            </div>

            {/* Right: QPS / WEP Co-ordinator stamp */}
            <div className="w-52 shrink-0 self-start space-y-2">
              <p className="text-xs font-semibold text-primary">Sign of Plant QPS / WEP Co-ordinator</p>
              <div className="border rounded-lg p-3 bg-muted/30 space-y-1.5">
                {submitted ? (
                  <>
                    <p className="text-[10px] text-muted-foreground">Digitally confirmed by</p>
                    <p className="text-xs font-semibold">{user?.name ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{user?.employeeNo}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date().toLocaleString("en-IN")}</p>
                    <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200 mt-0.5">✓ Signed</Badge>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground">Will be auto-signed on submit by</p>
                    <p className="text-xs font-medium text-foreground/60">{user?.name ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono">{user?.employeeNo}</p>
                    <Badge variant="outline" className="text-[9px] mt-0.5">Pending</Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Approval Sign-offs ───────────────────────────────── */}
          <Separator />
          <p className="text-xs font-semibold text-primary">
            Approvals <span className="text-[10px] font-normal text-muted-foreground">/ अनुमोदन</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            {/* 1. Dept Suggestion Co-ordinator */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-primary leading-snug">
                1. Dept Suggestion Co-ordinator
                <span className="block text-muted-foreground font-normal">/ विभागीय सुझाव समन्वयक</span>
              </p>
              <PointsEmpCombobox
                value={deptCoord.empNo}
                onChange={val => setDeptCoord(prev => ({ ...prev, empNo: val }))}
                usedEmpNos={[procPlanSign.empNo, fcmHead.empNo, approvalAuth.empNo].filter(Boolean)}
              />
              {deptCoord.empNo && (
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-mono">{deptCoord.empNo}</p>
                  <p>{employees.find(e => e.employee_no === deptCoord.empNo)?.department}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">Date / तिथि</p>
                <Input type="date" className="h-7 text-xs" value={deptCoord.date} onChange={e => setDeptCoord(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              {submitted && deptCoord.empNo && (
                <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200">✓ Signed</Badge>
              )}
            </div>

            {/* 2. Process Planner */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-primary leading-snug">
                2. Process Planner
                <span className="block text-muted-foreground font-normal">/ प्रक्रिया योजनाकार</span>
              </p>
              <PointsEmpCombobox
                value={procPlanSign.empNo}
                onChange={val => setProcPlanSign(prev => ({ ...prev, empNo: val }))}
                usedEmpNos={[deptCoord.empNo, fcmHead.empNo, approvalAuth.empNo].filter(Boolean)}
              />
              {procPlanSign.empNo && (
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-mono">{procPlanSign.empNo}</p>
                  <p>{employees.find(e => e.employee_no === procPlanSign.empNo)?.department}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">Date / तिथि</p>
                <Input type="date" className="h-7 text-xs" value={procPlanSign.date} onChange={e => setProcPlanSign(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">Area of Implementation / कार्यान्वयन क्षेत्र</p>
                <Input className="h-7 text-xs" placeholder="e.g. Shop Floor A..." value={procPlanSign.areaOfImpl} onChange={e => setProcPlanSign(prev => ({ ...prev, areaOfImpl: e.target.value }))} />
              </div>
              {submitted && procPlanSign.empNo && (
                <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200">✓ Signed</Badge>
              )}
            </div>

            {/* 3. FCM Head */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-primary leading-snug">
                3. FCM Head
                <span className="block text-muted-foreground font-normal">/ FCM प्रमुख</span>
              </p>
              <PointsEmpCombobox
                value={fcmHead.empNo}
                onChange={val => setFcmHead(prev => ({ ...prev, empNo: val }))}
                usedEmpNos={[deptCoord.empNo, procPlanSign.empNo, approvalAuth.empNo].filter(Boolean)}
              />
              {fcmHead.empNo && (
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-mono">{fcmHead.empNo}</p>
                  <p>{employees.find(e => e.employee_no === fcmHead.empNo)?.department}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">Date / तिथि</p>
                <Input type="date" className="h-7 text-xs" value={fcmHead.date} onChange={e => setFcmHead(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              {submitted && fcmHead.empNo && (
                <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200">✓ Signed</Badge>
              )}
            </div>

            {/* 4. Approval Authority */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-primary leading-snug">
                4. Approval
                <span className="block text-muted-foreground font-normal">Planning Head / Manager+</span>
                <span className="block text-muted-foreground font-normal text-[9px]">(Responsible for area where benefit occurred)</span>
              </p>
              <PointsEmpCombobox
                value={approvalAuth.empNo}
                onChange={val => setApprovalAuth(prev => ({ ...prev, empNo: val }))}
                usedEmpNos={[deptCoord.empNo, procPlanSign.empNo, fcmHead.empNo].filter(Boolean)}
              />
              {approvalAuth.empNo && (
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-mono">{approvalAuth.empNo}</p>
                  <p>{employees.find(e => e.employee_no === approvalAuth.empNo)?.department}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">Date / तिथि</p>
                <Input type="date" className="h-7 text-xs" value={approvalAuth.date} onChange={e => setApprovalAuth(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              {submitted && approvalAuth.empNo && (
                <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200">✓ Signed</Badge>
              )}
            </div>
          </div>

          {/* Evaluator Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Evaluator Remarks{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ मूल्यांकनकर्ता टिप्पणी</span>
            </Label>
            <Textarea rows={3} placeholder="Optional notes..." value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          {/* Success banner */}
          {submitted && evalLog[0] && (
            <div className="border border-green-300 bg-green-50 rounded-lg p-3 flex items-center gap-3 text-xs text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                Quantifiable evaluation submitted successfully for <strong>{selectedSuggNo}</strong>
                <span className="ml-2 text-[10px] text-green-600 font-mono">{evalLog[0].auditId}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-100"
                onClick={() => handleExportRecord(evalLog[0])}
              >
                <Download className="h-3 w-3" /> Export This Record
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button className="gap-1.5" onClick={handleSubmit} disabled={submitted || !selectedSuggNo}>
              {isCtg
                ? "Submit Savings & Advance to Award / बचत जमा करें"
                : isPlanner
                  ? "Save & Route to CTG / सहेजें और CTG को भेजें"
                  : "Submit Evaluation / मूल्यांकन जमा करें"}
            </Button>
            <Button variant="outline" onClick={handleReset}>Reset / {t("Reset")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Evaluation Log / मूल्यांकन लॉग</h3>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search..." value={searchLog} onChange={e => setSearchLog(e.target.value)} />
            </div>
            {evalLog.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={handleExport}>
                <Download className="h-3 w-3" /> Export
              </Button>
            )}
          </div>
        </div>
        <Card className="card-shadow">
          <CardContent className="pt-3 pb-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Suggestion" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Employee" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Department" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Judgement / निर्णय</th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground"><TH en="Date" /></th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Audit ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">No evaluations submitted yet</td>
                  </tr>
                ) : filteredLog.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2 text-xs font-medium">{r.suggNo}</td>
                    <td className="py-2 px-2 text-xs">{r.empName}</td>
                    <td className="py-2 px-2 text-xs">{r.dept || "—"}</td>
                    <td className="py-2 px-2 text-xs max-w-[180px] truncate" title={r.judgement}>{r.judgement || "—"}</td>
                    <td className="py-2 px-2 text-xs">{r.date}</td>
                    <td className="py-2 px-2 text-xs font-mono text-[10px] text-muted-foreground">{r.auditId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JaPEvalQuantifiable;
