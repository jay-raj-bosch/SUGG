// JaP — Non-Quantifiable Evaluation Form
// Admin fills qualitative assessment for suggestions with non-measurable outcomes.
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
import { toast } from "sonner";
import { CheckCircle2, Search, Download, FileText, X } from "lucide-react";
import * as apiService from "@/lib/apiService";
import type { Employee } from "@/lib/apiService";
import type { Suggestion } from "@/lib/mockData";
import { downloadCSV } from "@/lib/pdfUtils";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { addApprovalRecord, type ApprovalSlot } from "@/lib/jap/evalApprovalStore";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { mockEmployees } from "@/lib/mockData";

// ── Factor definitions ─────────────────────────────────────────────────────
type FactorDegree = "" | "small" | "medium" | "high" | "na";

const FACTORS = [
  {
    slNo: 1,
    name: "Customer Service and Quality Improvement",
    nameHi: "ग्राहक सेवा एवं गुणवत्ता सुधार",
    description: "Improves a product quality / customer service",
    descHi: "उत्पाद गुणवत्ता / ग्राहक सेवा में सुधार",
    small:  "Brings satisfaction",      smallHi:  "संतुष्टि लाता है",
    medium: "Fulfills expectations",    mediumHi: "अपेक्षाएं पूरी करता है",
    high:   "Resolves a complaint",     highHi:   "शिकायत का समाधान करता है",
  },
  {
    slNo: 2,
    name: "Machine / Equipment Utilisation Improvement",
    nameHi: "मशीन / उपकरण उपयोग सुधार",
    description: "Reduction in interruptions",
    descHi: "रुकावटों में कमी",
    small:  "On one machine",           smallHi:  "एक मशीन पर",
    medium: "Group of machines",        mediumHi: "मशीनों के समूह पर",
    high:   "More departments",         highHi:   "अधिक विभागों में",
  },
  {
    slNo: 3,
    name: "Safety and Environment",
    nameHi: "सुरक्षा एवं पर्यावरण",
    description: "Improves working condition",
    descHi: "कार्य स्थिति में सुधार",
    small:  "To some extent",           smallHi:  "कुछ हद तक",
    medium: "Much more",                mediumHi: "काफी अधिक",
    high:   "High standard",            highHi:   "उच्च मानक",
  },
  {
    slNo: 4,
    name: "Housekeeping, Organisation Methods and Procedure",
    nameHi: "हाउसकीपिंग, संगठन पद्धति एवं प्रक्रिया",
    description: "Improvement and satisfaction of employees",
    descHi: "कर्मचारियों की संतुष्टि एवं सुधार",
    small:  "One department",           smallHi:  "एक विभाग",
    medium: "More than one dept",       mediumHi: "एक से अधिक विभाग",
    high:   "Organization",             highHi:   "संगठन",
  },
];

interface EvalRecord {
  id: string;
  suggNo: string;
  empName: string;
  dept: string;
  factorRows: Array<{ factorName: string; degree: string; points: string }>;
  totalPoints: number;
  benefitFrequency: string;
  totalRewardAmount: number;
  implementationDate: string;
  opinionBy: string[];
  tefTeam: string[];
  implDoneBy: string[];
  processPlanner: string;
  remarks: string;
  deptCoord: { empNo: string; empName: string; dept: string; date: string };
  procPlanSign: { empNo: string; empName: string; dept: string; date: string; areaOfImpl: string };
  approvalAuth: { empNo: string; empName: string; dept: string; date: string };
  date: string;
  auditId: string;
}

const JaPEvalNonQuantifiable = () => {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedSuggNo = searchParams.get("sugg") || "";

  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(() =>
    mockEmployees.filter(e => e.plantCode === "PLT-02").map(e => ({
      employee_no: e.employeeNo, name: e.name, department: e.department,
      plant_code: e.plantCode, role: "employee", ntid: e.ntid, email: e.email,
    }))
  );
  const [selectedSuggNo, setSelectedSuggNo] = useState(preselectedSuggNo);
  const [submitted, setSubmitted] = useState(false);

  const [opinionBy,  setOpinionBy]  = useState<string[]>(["" , "", ""]);
  const [tefTeam,    setTefTeam]    = useState<string[]>(["" , "", ""]);
  const [implDoneBy, setImplDoneBy] = useState<string[]>(["" , "", ""]);
  const [processPlanner, setProcessPlanner] = useState("");

  const [deptCoord,    setDeptCoord]    = useState({ empNo: "", date: "" });
  const [procPlanSign, setProcPlanSign] = useState({ empNo: "", date: "", areaOfImpl: "" });
  const [approvalAuth, setApprovalAuth] = useState({ empNo: "", date: "" });

  const [factorRows, setFactorRows] = useState<Array<{ degree: FactorDegree; points: string }>>(
    FACTORS.map(() => ({ degree: "" as FactorDegree, points: "" }))
  );
  const [remarks, setRemarks] = useState("");
  const [implementationDate, setImplementationDate] = useState("");
  const [benefitFrequency, setBenefitFrequency] = useState<"" | "onetime" | "repetitive">("" );

  const [evalLog, setEvalLog] = useState<EvalRecord[]>([]);
  const [searchLog, setSearchLog] = useState("");

  const totalPoints = factorRows.reduce((sum, r) => {
    if (r.degree === "na" || r.degree === "") return sum;
    return sum + (parseFloat(r.points) || 0);
  }, 0);

  const totalRewardAmount =
    benefitFrequency === "onetime" ? totalPoints * 0.5 * 100 :
    benefitFrequency === "repetitive" ? totalPoints * 1.0 * 100 : 0;

  const setDegree = (idx: number, degree: FactorDegree) => {
    setFactorRows(prev => prev.map((r, i) =>
      i === idx ? { ...r, degree, points: degree === "na" ? "" : r.points } : r
    ));
  };

  const setPoints = (idx: number, points: string) => {
    setFactorRows(prev => prev.map((r, i) => i === idx ? { ...r, points } : r));
  };

  const { suggestions: contextSuggestions, updateSuggestion } = useSuggestions();

  useEffect(() => {
    const ctx = contextSuggestions.filter(s => s.plantCode === "PLT-02");
    setAllSuggestions(ctx);
    apiService.fetchSuggestions("jap", { limit: 2000 })
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

  // Only suggestions in Evaluation with non-quantifiable classification (or unclassified)
  const evalCandidates = allSuggestions.filter(s => {
    if (s.status !== "In Evaluation") return false;
    const fd = s.formData as any;
    return fd?.evaluationType === "non-quantifiable" || !fd?.evaluationType;
  });

  const suggestionOptions = evalCandidates.map(s => ({
    value: s.suggestionNo,
    label: `${s.suggestionNo} — ${s.subject.slice(0, 45)}`,
    sublabel: `${s.employeeName} • ${s.department || ""}`,
  }));

  const suggestion = allSuggestions.find(s => s.suggestionNo === selectedSuggNo);

  const handleReset = () => {
    setSelectedSuggNo("");
    setFactorRows(FACTORS.map(() => ({ degree: "" as FactorDegree, points: "" })));
    setOpinionBy(["", "", ""]);
    setTefTeam(["", "", ""]);
    setImplDoneBy(["", "", ""]);
    setProcessPlanner("");
    setDeptCoord({ empNo: "", date: "" });
    setProcPlanSign({ empNo: "", date: "", areaOfImpl: "" });
    setApprovalAuth({ empNo: "", date: "" });
    setRemarks("");
    setImplementationDate("");
    setBenefitFrequency("");
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!selectedSuggNo) { toast.error("Please select a suggestion"); return; }
    if (!benefitFrequency) { toast.error("Please select Benefit Frequency in the Award section"); return; }

    const auditId = `JAP-NEV-${Date.now().toString().slice(-6)}`;

    if (suggestion) {
      const evalData = {
        evaluationType: "non-quantifiable",
        evaluatedBy: user?.employeeNo || "",
        evaluatedByName: user?.name || "",
        evaluatedOn: new Date().toISOString().split("T")[0],
        totalPoints,
        benefitFrequency,
        totalRewardAmount,
        auditId,
      };
      updateSuggestion(suggestion.id, {
        status: "In Award",
        pendingWith: "BPS / Finance",
        daysPending: 0,
        formData: { ...(suggestion.formData as any), ...evalData },
      });
      try {
        await apiService.patchSuggestionStatus("jap", suggestion.id, "In Award");
      } catch { /* local fallback */ }
    }

    const record: EvalRecord = {
      id: String(Date.now()),
      suggNo: selectedSuggNo,
      empName: suggestion?.employeeName || "",
      dept: suggestion?.department || "",
      factorRows: FACTORS.map((f, i) => ({
        factorName: f.name,
        degree: factorRows[i].degree,
        points: factorRows[i].points,
      })),
      totalPoints,
      benefitFrequency,
      totalRewardAmount,
      implementationDate,
      opinionBy: opinionBy.filter(Boolean),
      tefTeam: tefTeam.filter(Boolean),
      implDoneBy: implDoneBy.filter(Boolean),
      processPlanner,
      remarks,
      deptCoord: {
        ...deptCoord,
        empName: employees.find(e => e.employee_no === deptCoord.empNo)?.name || "",
        dept: employees.find(e => e.employee_no === deptCoord.empNo)?.department || "",
      },
      procPlanSign: {
        ...procPlanSign,
        empName: employees.find(e => e.employee_no === procPlanSign.empNo)?.name || "",
        dept: employees.find(e => e.employee_no === procPlanSign.empNo)?.department || "",
      },
      approvalAuth: {
        ...approvalAuth,
        empName: employees.find(e => e.employee_no === approvalAuth.empNo)?.name || "",
        dept: employees.find(e => e.employee_no === approvalAuth.empNo)?.department || "",
      },
      date: new Date().toISOString().slice(0, 10),
      auditId,
    };

    setEvalLog(prev => [record, ...prev]);

    // Save to approval store so named approvers see this in their Approval Inbox
    const approvalSlots: ApprovalSlot[] = [
      deptCoord.empNo    ? { role: "deptCoord",    label: "Dept Suggestion Co-ordinator", empNo: deptCoord.empNo,    empName: employees.find(e => e.employee_no === deptCoord.empNo)?.name    || "", approved: false, approvedAt: null } : null,
      procPlanSign.empNo ? { role: "procPlanSign", label: "Process Planner Sign",          empNo: procPlanSign.empNo, empName: employees.find(e => e.employee_no === procPlanSign.empNo)?.name || "", approved: false, approvedAt: null } : null,
      approvalAuth.empNo ? { role: "approvalAuth", label: "Planning Head / Manager+",     empNo: approvalAuth.empNo, empName: employees.find(e => e.employee_no === approvalAuth.empNo)?.name || "", approved: false, approvedAt: null } : null,
    ].filter((s): s is ApprovalSlot => s !== null);
    if (approvalSlots.length > 0) {
      addApprovalRecord({
        id: auditId,
        evalType: "nonquantifiable",
        auditId,
        suggNo: selectedSuggNo,
        suggesterName: suggestion?.employeeName || "",
        dept: suggestion?.department || "",
        submittedBy: user ? `${user.name} (${user.employeeNo})` : "Unknown",
        submittedAt: new Date().toISOString(),
        summary: `Total Points: ${totalPoints} | Award: ₹${totalRewardAmount} | Impl: ${implementationDate}`,
        approvals: approvalSlots,
      });
    }

    setSubmitted(true);
    toast.success(`Non-Quantifiable evaluation submitted — Audit ID: ${auditId}`);
    addNotification(`JaP Non-Quantifiable evaluation: ${selectedSuggNo}`, "success");
  };

  const CSV_HEADERS = [
    "Sugg No", "Employee", "Department",
    ...FACTORS.flatMap(f => [`${f.name} — Degree`, `${f.name} — Points`]),
    "Total Points", "Benefit Frequency", "Total Reward Amount (INR)",
    "Date of Implementation", "Opinion By", "TEF Team", "Impl Done By", "Process Planner",
    "Dept Coord (Name)", "Dept Coord (ENo)", "Dept Coord (Date)",
    "Proc Planner Sign (Name)", "Proc Planner Sign (ENo)", "Proc Planner Sign (Date)", "Area of Impl",
    "Approval Auth (Name)", "Approval Auth (ENo)", "Approval Auth (Date)",
    "Remarks", "Date", "Audit ID",
  ];

  const recordToRow = (r: EvalRecord) => [
    r.suggNo, r.empName, r.dept,
    ...r.factorRows.flatMap(f => [f.degree || "—", f.points || "0"]),
    String(r.totalPoints), r.benefitFrequency || "—", String(r.totalRewardAmount),
    r.implementationDate || "—",
    r.opinionBy.join("; "), r.tefTeam.join("; "), r.implDoneBy.join("; "), r.processPlanner,
    r.deptCoord.empName, r.deptCoord.empNo, r.deptCoord.date,
    r.procPlanSign.empName, r.procPlanSign.empNo, r.procPlanSign.date, r.procPlanSign.areaOfImpl,
    r.approvalAuth.empName, r.approvalAuth.empNo, r.approvalAuth.date,
    r.remarks, r.date, r.auditId,
  ];

  const handleExportRecord = (r: EvalRecord) => {
    downloadCSV(CSV_HEADERS, [recordToRow(r)], `JaP_NQEval_${r.suggNo}_${r.auditId}.csv`);
    toast.success("Record exported!");
  };

  const handleExport = () => {
    downloadCSV(
      CSV_HEADERS,
      evalLog.map(recordToRow),
      `JaP_NonQuantifiable_Eval_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success("Evaluation log exported!");
  };

  const filteredLog = evalLog.filter(r =>
    r.suggNo.toLowerCase().includes(searchLog.toLowerCase()) ||
    r.empName.toLowerCase().includes(searchLog.toLowerCase())
  );

  // ── Employee combobox helpers ───────────────────────────────────────────
  const empOptions = employees.map(e => ({
    value: e.employee_no,
    label: `${e.employee_no} — ${e.name}`,
    sublabel: e.department,
  }));

  const availableFor = (group: string[], slotIdx: number) =>
    empOptions.filter(o => !group.some((v, i) => i !== slotIdx && v === o.value));

  const setSlot = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) =>
    setter(prev => prev.map((v, i) => (i === idx ? val : v)));

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
    const displayLabel = current ? (empOptions.find(o => o.value === current)?.label ?? current) : "";

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
        <div className="relative">
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

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Non-Quantifiable Evaluation <span className="text-sm font-normal text-muted-foreground">/ गैर-मापनीय मूल्यांकन</span>
          </h2>
          <p className="text-xs text-muted-foreground">Fill qualitative assessment for suggestions with non-measurable outcomes</p>
        </div>
        <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200">Non-Quantifiable / गैर-मापनीय</Badge>
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

          {/* ── Factors Table ── */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-primary">
              Applicable Degree of Influence / प्रभाव की लागू मात्रा
            </p>
            <p className="text-[10px] text-muted-foreground">
              For each factor, select the applicable degree (Small / Medium / High) or mark Not Applicable, then enter the points.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/60 border-b">
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-10">
                    Sl.<br/>No
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground min-w-[200px]">
                    Factor / कारक
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-36">
                    Small<br/><span className="text-[10px] font-normal">(1–3)</span>
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-36">
                    Medium<br/><span className="text-[10px] font-normal">(4–7)</span>
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-36">
                    High<br/><span className="text-[10px] font-normal">(8–10)</span>
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-28">
                    Not<br/>Applicable
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-24">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {FACTORS.map((factor, idx) => {
                  const row = factorRows[idx];
                  const isNA = row.degree === "na";
                  return (
                    <tr key={factor.slNo} className={`border-b last:border-0 transition-colors ${isNA ? "bg-muted/20 opacity-60" : "hover:bg-muted/20"}`}>

                      {/* Sl.No */}
                      <td className="px-3 py-4 text-center font-semibold text-muted-foreground align-middle">
                        {factor.slNo}
                      </td>

                      {/* Factor: name + description */}
                      <td className="px-3 py-4 align-middle">
                        <p className="font-semibold text-foreground text-[11px] leading-snug">{factor.name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{factor.nameHi}</p>
                        <p className="text-[10px] text-foreground/70 mt-2 italic">{factor.description}</p>
                        <p className="text-[9px] text-muted-foreground">{factor.descHi}</p>
                      </td>

                      {/* Small */}
                      <td className="px-3 py-4 text-center align-middle">
                        <label className="flex flex-col items-center gap-1.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary cursor-pointer"
                            checked={row.degree === "small"}
                            disabled={isNA}
                            onChange={() => setDegree(idx, row.degree === "small" ? "" : "small")}
                          />
                          <span className="text-[10px] text-muted-foreground leading-tight text-center group-hover:text-foreground transition-colors">
                            {factor.small}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 leading-tight text-center">
                            {factor.smallHi}
                          </span>
                        </label>
                      </td>

                      {/* Medium */}
                      <td className="px-3 py-4 text-center align-middle">
                        <label className="flex flex-col items-center gap-1.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary cursor-pointer"
                            checked={row.degree === "medium"}
                            disabled={isNA}
                            onChange={() => setDegree(idx, row.degree === "medium" ? "" : "medium")}
                          />
                          <span className="text-[10px] text-muted-foreground leading-tight text-center group-hover:text-foreground transition-colors">
                            {factor.medium}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 leading-tight text-center">
                            {factor.mediumHi}
                          </span>
                        </label>
                      </td>

                      {/* High */}
                      <td className="px-3 py-4 text-center align-middle">
                        <label className="flex flex-col items-center gap-1.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary cursor-pointer"
                            checked={row.degree === "high"}
                            disabled={isNA}
                            onChange={() => setDegree(idx, row.degree === "high" ? "" : "high")}
                          />
                          <span className="text-[10px] text-muted-foreground leading-tight text-center group-hover:text-foreground transition-colors">
                            {factor.high}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 leading-tight text-center">
                            {factor.highHi}
                          </span>
                        </label>
                      </td>

                      {/* Not Applicable */}
                      <td className="px-3 py-4 text-center align-middle">
                        <label className="flex flex-col items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-orange-500 cursor-pointer"
                            checked={isNA}
                            onChange={() => setDegree(idx, isNA ? "" : "na")}
                          />
                          <span className="text-[9px] text-muted-foreground">N/A</span>
                        </label>
                      </td>

                      {/* Points */}
                      <td className="px-3 py-4 text-center align-middle">
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          step="1"
                          placeholder="0"
                          className="h-8 text-xs text-center w-16 mx-auto"
                          value={isNA ? "" : row.points}
                          disabled={isNA || !row.degree}
                          onChange={e => setPoints(idx, e.target.value)}
                        />
                        {!isNA && !row.degree && (
                          <p className="text-[9px] text-muted-foreground/50 mt-0.5">select degree</p>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Total row */}
                <tr className="bg-muted/40 border-t-2 border-muted">
                  <td colSpan={6} className="px-3 py-2.5 text-right font-semibold text-xs">
                    Total Points / कुल अंक
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-sm font-bold text-primary">{totalPoints}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <Separator />

          {/* ── Award ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-primary">
                Award / पुरस्कार
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Tick the benefit frequency{" "}
                <span className="text-destructive font-medium">*</span>{" "}
                / लाभ की आवृत्ति चुनें (अनिवार्य)
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">

                {/* One-time application */}
                <label className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                  benefitFrequency === "onetime" ? "bg-blue-50" : "hover:bg-muted/30"
                }`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-0.5 accent-primary cursor-pointer shrink-0"
                    checked={benefitFrequency === "onetime"}
                    onChange={() => setBenefitFrequency(benefitFrequency === "onetime" ? "" : "onetime")}
                  />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground">For One Time Application</p>
                    <p className="text-[10px] text-muted-foreground">/ एकबारगी आवेदन (यदि लाभ एक बार के हों)</p>
                    <p className="text-[11px] text-blue-700 font-mono mt-1.5">
                      = Total Points × 0.5 × ₹100
                    </p>
                    {totalPoints > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        = {totalPoints} × 0.5 × 100 ={" "}
                        <span className="font-semibold text-foreground">
                          ₹ {(totalPoints * 0.5 * 100).toLocaleString("en-IN")}
                        </span>
                      </p>
                    )}
                  </div>
                </label>

                {/* Repetitive application */}
                <label className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                  benefitFrequency === "repetitive" ? "bg-green-50" : "hover:bg-muted/30"
                }`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-0.5 accent-primary cursor-pointer shrink-0"
                    checked={benefitFrequency === "repetitive"}
                    onChange={() => setBenefitFrequency(benefitFrequency === "repetitive" ? "" : "repetitive")}
                  />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground">For Repetitive Application</p>
                    <p className="text-[10px] text-muted-foreground">/ बारंबार आवेदन (यदि लाभ दोहराए जाने वाले हों)</p>
                    <p className="text-[11px] text-green-700 font-mono mt-1.5">
                      = Total Points × 1.0 × ₹100
                    </p>
                    {totalPoints > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        = {totalPoints} × 1.0 × 100 ={" "}
                        <span className="font-semibold text-foreground">
                          ₹ {(totalPoints * 1.0 * 100).toLocaleString("en-IN")}
                        </span>
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {/* Total Reward Amount */}
              <div className="border-t bg-muted/40 px-4 py-3 flex items-center justify-between">
                <p className="text-xs font-semibold">
                  Total Reward Amount{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ कुल पुरस्कार राशि</span>
                </p>
                <p className={`text-base font-bold ${
                  benefitFrequency ? "text-primary" : "text-muted-foreground"
                }`}>
                  {benefitFrequency
                    ? `₹ ${totalRewardAmount.toLocaleString("en-IN")}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Implementation Details + Remarks ──────────────────────── */}
          <p className="text-xs font-semibold text-primary">
            Implementation Details / कार्यान्वयन विवरण
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Date of Implementation{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ क्रियान्वयन की तिथि</span>
              </Label>
              <Input
                type="date"
                className="w-48"
                value={implementationDate}
                onChange={e => setImplementationDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Evaluator Remarks{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ मूल्यांकनकर्ता टिप्पणी</span>
              </Label>
              <Textarea rows={3} placeholder="Optional notes..." value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
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
                TEF Implementation Team{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ TEF कार्यान्वयन टीम</span>
                <span className="text-[9px] text-muted-foreground font-normal ml-1">(if applicable)</span>
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
              {/* Process Planner */}
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">Process Planner / प्रक्रिया योजनाकार</Label>
                <EmpCombobox
                  groupValues={[processPlanner, ...implDoneBy]}
                  groupSetter={(updater) => {
                    const next = typeof updater === "function" ? updater([processPlanner, ...implDoneBy]) : updater;
                    setProcessPlanner(next[0]);
                  }}
                  slotIdx={0}
                  placeholder="Process Planner"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Approval Sign-offs ──────────────────────────────────── */}
          <p className="text-xs font-semibold text-primary">
            Approvals <span className="text-[10px] font-normal text-muted-foreground">/ अनुमोदन</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* 1. Dept Suggestion Co-ordinator */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-primary leading-snug">
                1. Dept Suggestion Co-ordinator
                <span className="block text-muted-foreground font-normal">/ विभागीय सुझाव समन्वयक</span>
              </p>
              <EmpCombobox
                groupValues={[deptCoord.empNo, procPlanSign.empNo, approvalAuth.empNo]}
                groupSetter={(updater) => {
                  const next = typeof updater === "function" ? updater([deptCoord.empNo, procPlanSign.empNo, approvalAuth.empNo]) : updater;
                  setDeptCoord(prev => ({ ...prev, empNo: next[0] }));
                }}
                slotIdx={0}
                placeholder="Search employee..."
              />
              {deptCoord.empNo && (
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-mono">{deptCoord.empNo}</p>
                  <p>{employees.find(e => e.employee_no === deptCoord.empNo)?.name}</p>
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
              <EmpCombobox
                groupValues={[procPlanSign.empNo, deptCoord.empNo, approvalAuth.empNo]}
                groupSetter={(updater) => {
                  const next = typeof updater === "function" ? updater([procPlanSign.empNo, deptCoord.empNo, approvalAuth.empNo]) : updater;
                  setProcPlanSign(prev => ({ ...prev, empNo: next[0] }));
                }}
                slotIdx={0}
                placeholder="Search employee..."
              />
              {procPlanSign.empNo && (
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-mono">{procPlanSign.empNo}</p>
                  <p>{employees.find(e => e.employee_no === procPlanSign.empNo)?.name}</p>
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

            {/* 3. Planning Head / Manager+ */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-primary leading-snug">
                3. Planning Head / Manager+
                <span className="block text-muted-foreground font-normal">/ प्लानिंग प्रमुख / प्रबंधक</span>
                <span className="block text-muted-foreground font-normal text-[9px]">(Responsible for area where benefit occurred)</span>
              </p>
              <EmpCombobox
                groupValues={[approvalAuth.empNo, deptCoord.empNo, procPlanSign.empNo]}
                groupSetter={(updater) => {
                  const next = typeof updater === "function" ? updater([approvalAuth.empNo, deptCoord.empNo, procPlanSign.empNo]) : updater;
                  setApprovalAuth(prev => ({ ...prev, empNo: next[0] }));
                }}
                slotIdx={0}
                placeholder="Search employee..."
              />
              {approvalAuth.empNo && (
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-mono">{approvalAuth.empNo}</p>
                  <p>{employees.find(e => e.employee_no === approvalAuth.empNo)?.name}</p>
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

          {/* Success banner */}
          {submitted && evalLog[0] && (
            <div className="border border-green-300 bg-green-50 rounded-lg p-3 flex items-center gap-3 text-xs text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                Non-Quantifiable evaluation submitted for <strong>{selectedSuggNo}</strong>
                <span className="ml-2 text-[10px] text-green-600 font-mono">{evalLog[0].auditId}</span>
                {" — "}<span className="font-semibold">{totalPoints} pts</span>
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
              Submit Evaluation / मूल्यांकन जमा करें
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
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">Total Points / कुल अंक</th>
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
                    <td className="py-2 px-2 text-xs font-semibold text-primary">{r.totalPoints}</td>
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

export default JaPEvalNonQuantifiable;
