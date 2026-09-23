// Demo Application — New Suggestion (Employee)
// Clean, enterprise-grade suggestion submission form with active plant/scheme context
import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { usePlant } from "@/contexts/PlantContext";
import { useVoiceEngine, VOICE_LANGUAGES } from "@/hooks/useVoiceEngine";
import VoiceHighlight from "@/components/VoiceHighlight";
import { toast } from "sonner";
import DuplicateAlertDialog from "@/components/bidp/DuplicateAlertDialog";
import {
  detectDuplicatesFull,
  type DuplicateMatch,
  type PendingMatch,
} from "@/lib/bidp/duplicateDetector";
import {
  registerPending,
  unregisterPending,
  getActivePending,
  createPendingId,
  clearExpiredPending,
} from "@/lib/bidp/pendingSubmissionsStore";
import {
  FilePlus,
  User,
  Building2,
  Wrench,
  Lightbulb,
  Tag,
  Mic,
  MicOff,
  Languages,
  CheckCircle2,
  X,
  UserPlus,
  Save,
  Paperclip,
  Upload,
  Calendar,
  Layers,
  MapPin,
  Check,
  FileText,
  Sliders,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { teamMemberOptions } from "@/lib/jap/suggestionConstants";
import { getInputMethodSettings } from "@/lib/jap/inputMethodStore";
import { getDemoSelection, type DemoPlantKey } from "@/lib/demoConfig";
import { mockEmployees } from "@/lib/mockData";

// Manufacturing Areas & Stations
const DEMO_AREAS = [
  "Assembly Line 1 - Final Inspection",
  "Assembly Line 2 - Main Chassis",
  "Press Shop - Stamping & Blanking",
  "Machine Shop - CNC Machining Cell 03",
  "Paint & Surface Treatment Booth",
  "Robotic Welding Bay 4",
  "Packaging & End-of-Line Dispatch",
  "Quality Control Lab & Metrology",
  "Maintenance & Tool Room",
];

// Area Specific Planner mapping
const AREA_PLANNER_MAP: Record<
  string,
  { name: string; empNo: string; department: string; designation: string }
> = {
  "Assembly Line 1 - Final Inspection": {
    name: "Rajesh Kumar",
    empNo: "PLN-101",
    department: "Assembly Operations",
    designation: "Area Planner - Final Line",
  },
  "Assembly Line 2 - Main Chassis": {
    name: "Sunil Verma",
    empNo: "PLN-102",
    department: "Assembly Operations",
    designation: "Area Planner - Chassis Assembly",
  },
  "Press Shop - Stamping & Blanking": {
    name: "Anil Sharma",
    empNo: "PLN-103",
    department: "Press & Stamping",
    designation: "Area Planner - Press Shop",
  },
  "Machine Shop - CNC Machining Cell 03": {
    name: "Vikram Patel",
    empNo: "PLN-104",
    department: "Machining Division",
    designation: "Area Planner - CNC Machining",
  },
  "Paint & Surface Treatment Booth": {
    name: "Priya Nair",
    empNo: "PLN-105",
    department: "Paint & Surface Finishing",
    designation: "Area Planner - Paint Shop",
  },
  "Robotic Welding Bay 4": {
    name: "Deepak Joshi",
    empNo: "PLN-106",
    department: "Welding & Body Shop",
    designation: "Area Planner - Welding Bay",
  },
  "Packaging & End-of-Line Dispatch": {
    name: "Kavita Rao",
    empNo: "PLN-107",
    department: "Packaging & Logistics",
    designation: "Area Planner - Dispatch & Packing",
  },
  "Quality Control Lab & Metrology": {
    name: "Meera Iyer",
    empNo: "PLN-108",
    department: "Quality Assurance",
    designation: "Area Planner - QA & Metrology",
  },
  "Maintenance & Tool Room": {
    name: "Harish Gowda",
    empNo: "PLN-109",
    department: "Plant Maintenance",
    designation: "Area Planner - Tool Room",
  },
};

// Department Superior mapping
const DEPT_SUPERIOR_MAP: Record<
  string,
  { name: string; empNo: string; department: string; designation: string }
> = {
  "Innovation & Ops": {
    name: "David Chen",
    empNo: "SUP-201",
    department: "Innovation & Ops",
    designation: "Head of Operations & Innovation",
  },
  Manufacturing: {
    name: "Ramesh Kulkarni",
    empNo: "SUP-202",
    department: "Manufacturing",
    designation: "General Manager - Production",
  },
  "Quality Assurance": {
    name: "Sunita Deshmukh",
    empNo: "SUP-203",
    department: "Quality Assurance",
    designation: "Head of Quality & Compliance",
  },
  Assembly: {
    name: "Arun Swaminathan",
    empNo: "SUP-204",
    department: "Assembly Operations",
    designation: "Production Head - Assembly",
  },
  "Plant Maintenance": {
    name: "K. Narayanan",
    empNo: "SUP-205",
    department: "Plant Maintenance",
    designation: "Chief Plant Engineer",
  },
  default: {
    name: "David Chen",
    empNo: "SUP-201",
    department: "Plant Leadership",
    designation: "Reporting Manager / HOD",
  },
};

// Category Options
const CATEGORY_OPTIONS = [
  { value: "Safety Improvement", label: "Safety Improvement", labelHi: "सुरक्षा सुधार" },
  { value: "Quality Enhancement", label: "Quality Enhancement", labelHi: "गुणवत्ता सुधार" },
  { value: "Cost Reduction", label: "Cost Reduction", labelHi: "लागत कटौती" },
  { value: "Productivity Improvement", label: "Productivity Improvement", labelHi: "उत्पादकता सुधार" },
  { value: "5S & Workplace Organization", label: "5S & Workplace Organization", labelHi: "5S एवं कार्यस्थल व्यवस्था" },
  { value: "Environment & Sustainability", label: "Environment & Sustainability", labelHi: "पर्यावरण एवं संधारणीयता" },
  { value: "Energy Conservation", label: "Energy Conservation", labelHi: "ऊर्जा संरक्षण" },
  { value: "Ergonomics & Work Ease", label: "Ergonomics & Work Ease", labelHi: "सुगमता एवं सहजता" },
];

// Theme & Campaign Options
const THEME_OPTIONS = [
  { value: "safety_month", label: "Safety Month Campaign", labelHi: "सुरक्षा माह अभियान" },
  { value: "zero_defect", label: "Zero Defect Mission", labelHi: "शून्य दोष मिशन" },
  { value: "cost_optimization", label: "Cost Optimization Drive", labelHi: "लागत अनुकूलन अभियान" },
  { value: "energy_saving", label: "Energy Conservation Sprint", labelHi: "ऊर्जा बचत अभियान" },
  { value: "5s_blitz", label: "5S Kaizen Blitz", labelHi: "5S कैज़न अभियान" },
  { value: "productivity_boost", label: "Productivity Acceleration", labelHi: "उत्पादकता वृद्धि अभियान" },
  { value: "ergonomics_care", label: "Operator Ergonomics Care", labelHi: "कार्य सुगमता अभियान" },
];

// Pre-filled Demo Templates for rapid enterprise testing
const ENTERPRISE_DEMO_TEMPLATES = [
  {
    name: "Conveyor Jam Auto-Stop (Safety)",
    subject: "Automated optical sensor for conveyor belt discharge stop mechanism",
    area: "Assembly Line 1 - Final Inspection",
    category: "Safety Improvement",
    machineRefType: "name" as const,
    machineRef: "Main Conveyor A-1",
    componentRefType: "number" as const,
    componentRefValue: "CV-OPT-88",
    themeBased: "yes" as const,
    themeName: "safety_month",
    presentMethod: "Currently, line operators must manually monitor the accumulation chute and step on a mechanical foot pedal whenever packages back up, causing occasional jams and potential pinch hazards.",
    proposedMethod: "Install a retroreflective optical sensor interlocked with the VFD motor drive. The conveyor stops automatically within 200ms when three consecutive boxes dwell on the sensor.",
    benefits: "Eliminates jam hazards completely, cuts downtime by 18 hours/month, and prevents repetitive ergonomic strain on operators.",
  },
  {
    name: "Tool Shadow Board (5S / Kaizen)",
    subject: "Modular magnetic shadow board for press die changeover tools",
    area: "Press Shop - Stamping & Blanking",
    category: "5S & Workplace Organization",
    machineRefType: "number" as const,
    machineRef: "PR-200-B",
    componentRefType: "number" as const,
    componentRefValue: "DIE-44-HEX",
    themeBased: "yes" as const,
    themeName: "5s_blitz",
    presentMethod: "Wrenches, torque sockets, and alignment pins are stored in a communal cabinet 15 meters away. Operators spend 8 to 12 minutes retrieving and returning tools during each die change.",
    proposedMethod: "Fabricate a dedicated magnetic mobile shadow board with custom CNC-cut EVA foam silhouettes located directly adjacent to Press B.",
    benefits: "Reduces die changeover time by 9 minutes per setup (saving 45 hrs/quarter) and completely eliminates misplaced tool incidents.",
  },
  {
    name: "Smart LED Sleep Cycle (Energy)",
    subject: "PIR motion sensor controlled intelligent lighting in inspection booths",
    area: "Quality Control Lab & Metrology",
    category: "Energy Conservation",
    machineRefType: "na" as const,
    machineRef: "",
    componentRefType: "na" as const,
    componentRefValue: "",
    themeBased: "yes" as const,
    themeName: "energy_saving",
    presentMethod: "Inspection booth overhead luminaires remain illuminated at 100% brightness (750 lux) around the clock, even when quality inspectors are out on the production floor.",
    proposedMethod: "Integrate a dual-channel PIR occupancy detector with 3-minute hold-time that dims the lighting to 15% standby brightness when the booth is unattended.",
    benefits: "Saves an estimated 480 kWh monthly per inspection station, extending LED driver lifespan by over 2.5 years.",
  },
];

type MachineRefType = "name" | "number" | "na";
type ComponentRefType = "name" | "number" | "na";
type VoiceFieldKey = "subject" | "presentMethod" | "proposedMethod" | "benefits";

const VOICE_FIELD_LABELS: Record<VoiceFieldKey, string> = {
  subject: "Suggestion Subject",
  presentMethod: "Present Method / वर्तमान विधि",
  proposedMethod: "Proposed Method / प्रस्तावित विधि",
  benefits: "Expected Benefits / अपेक्षित लाभ",
};

function generateSuggNo(plant: string): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(100 + Math.random() * 900));
  return `${plant.toUpperCase()}-${year}-${rand}`;
}

interface FormErrors {
  subject?: string;
  presentMethod?: string;
  proposedMethod?: string;
  benefits?: string;
  themeName?: string;
  implementationDate?: string;
  suggestionArea?: string;
  mainSuggestor?: string;
}

interface FileUploadItem {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

const ReadonlyField = ({
  icon: Icon,
  label,
  labelHi,
  value,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  labelHi?: string;
  value: string;
  badge?: string;
}) => (
  <div className="flex items-center gap-2.5 py-2 px-3 bg-muted/40 rounded-lg border text-xs">
    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <span className="text-[10px] text-muted-foreground block leading-tight">
        {label} {labelHi && <span className="opacity-70 font-normal">/ {labelHi}</span>}
      </span>
      <span className="font-medium text-foreground truncate block">{value || "—"}</span>
    </div>
    {badge && (
      <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0 font-normal">
        {badge}
      </Badge>
    )}
  </div>
);

const DemoNewSuggestion = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { suggestions, addSuggestion, updateSuggestion, getSuggestionsSnapshot } = useSuggestions();
  const { plantPrefix } = usePlant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active configuration (Plant & Scheme)
  const demoSelection = getDemoSelection();
  const activePlant: DemoPlantKey = (demoSelection?.plant as DemoPlantKey) || "JaP";
  const activeScheme = (demoSelection?.scheme || "suggestion").toLowerCase();

  const isKaizenScheme = activeScheme.includes("kaizen");
  const isNaP = activePlant === "NaP";
  const isJaP = activePlant === "JaP";

  // Implementation date logic:
  // JaP: Shown only for Kaizen schemes
  // BidP & NaP: Visible across all schemes
  const showImplementationDate = isJaP ? isKaizenScheme : true;

  // BPS input method control
  const inputMethodSettings = getInputMethodSettings();

  // Check if editing a draft
  const draftId = searchParams.get("draft");
  const draftSuggestion = draftId
    ? suggestions.find((s) => s.id === draftId && s.status === "Draft")
    : null;

  // Form State
  const [suggNo] = useState(() => draftSuggestion?.suggestionNo ?? generateSuggNo(activePlant));
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Submission Mode (Self vs On Behalf)
  const [suggestionFor, setSuggestionFor] = useState<"self" | "behalf">(
    (draftSuggestion?.formData as any)?.suggestionFor ?? "self"
  );
  const [selectedOnBehalfEmpNo, setSelectedOnBehalfEmpNo] = useState<string>(
    (draftSuggestion?.formData as any)?.onBehalfEmpNo ?? ""
  );

  const selectedBehalfEmployee = useMemo(
    () => mockEmployees.find((e) => e.employeeNo === selectedOnBehalfEmpNo),
    [selectedOnBehalfEmpNo]
  );

  // Suggestor Details
  const suggestorName =
    suggestionFor === "behalf" && selectedBehalfEmployee
      ? selectedBehalfEmployee.name
      : user?.name ?? "Alex Morgan";

  const suggestorEmpNo =
    suggestionFor === "behalf" && selectedBehalfEmployee
      ? selectedBehalfEmployee.employeeNo
      : user?.employeeNo ?? "DEMO-1001";

  const suggestorDept =
    suggestionFor === "behalf" && selectedBehalfEmployee
      ? selectedBehalfEmployee.department
      : user?.department ?? "Innovation & Ops";

  const suggestorCategory =
    suggestionFor === "behalf" && selectedBehalfEmployee
      ? selectedBehalfEmployee.category ?? "Management & Staff (M&SS)"
      : "Management & Staff (M&SS)";

  const suggestorMobile =
    suggestionFor === "behalf" && selectedBehalfEmployee
      ? (selectedBehalfEmployee as any).mobile ?? "+91 98765 43210"
      : "+91 98765 43210";

  // Suggestion Subject
  const [subject, setSubject] = useState(
    draftSuggestion?.subject ?? (draftSuggestion?.formData as any)?.subject ?? ""
  );

  // Machine Reference
  const [machineRefType, setMachineRefType] = useState<MachineRefType>(
    (draftSuggestion?.formData as any)?.machineRefType ?? "na"
  );
  const [machineRefValue, setMachineRefValue] = useState(
    (draftSuggestion?.formData as any)?.machineRefType === "na"
      ? ""
      : ((draftSuggestion?.formData as any)?.machineRef ?? "").replace(/^(Name|No\.): /, "")
  );

  // Component / Tool Reference
  const [componentRefType, setComponentRefType] = useState<ComponentRefType>(
    (draftSuggestion?.formData as any)?.componentRefType ??
      ((draftSuggestion?.formData as any)?.componentToolNo &&
      (draftSuggestion?.formData as any)?.componentToolNo !== "N/A"
        ? (draftSuggestion?.formData as any)?.componentToolNo.startsWith?.("Name:")
          ? "name"
          : "number"
        : "na")
  );
  const [componentRefValue, setComponentRefValue] = useState(
    (draftSuggestion?.formData as any)?.componentRefType === "na"
      ? ""
      : ((draftSuggestion?.formData as any)?.componentRefValue ??
         ((draftSuggestion?.formData as any)?.componentToolNo ?? "").replace(/^(Name|No\.): /, ""))
  );

  // Suggestion Area
  const [suggestionArea, setSuggestionArea] = useState<string>(
    (draftSuggestion?.formData as any)?.suggestionArea ?? "Assembly Line 1 - Final Inspection"
  );

  // Workshop / Dept. Name
  const workshopDeptName = suggestorDept;

  // Implementation Date
  const [implementationDate, setImplementationDate] = useState<string>(
    (draftSuggestion?.formData as any)?.implementationDate ?? ""
  );

  // Category
  const [category, setCategory] = useState<string>(
    draftSuggestion?.category ?? "Productivity Improvement"
  );

  // Campaign / Theme
  const [themeBased, setThemeBased] = useState<"yes" | "no">(
    (draftSuggestion?.formData as any)?.themeBased ? "yes" : "no"
  );
  const [themeName, setThemeName] = useState<string>(
    (draftSuggestion?.formData as any)?.themeName ?? ""
  );

  // Methods & Benefits
  const [presentMethod, setPresentMethod] = useState(draftSuggestion?.presentMethod ?? "");
  const [proposedMethod, setProposedMethod] = useState(draftSuggestion?.proposedMethod ?? "");
  const [benefits, setBenefits] = useState(draftSuggestion?.benefits ?? "");

  // NaP Dual Mode (Write / Upload)
  const [presentInputMode, setPresentInputMode] = useState<"write" | "upload">("write");
  const [proposedInputMode, setProposedInputMode] = useState<"write" | "upload">("write");
  const [presentMethodFiles, setPresentMethodFiles] = useState<FileUploadItem[]>(
    (draftSuggestion?.formData as any)?.presentMethodFiles ?? []
  );
  const [proposedMethodFiles, setProposedMethodFiles] = useState<FileUploadItem[]>(
    (draftSuggestion?.formData as any)?.proposedMethodFiles ?? []
  );

  // Auto-routed Superior and Planner Details
  const superiorDetails = useMemo(() => {
    return DEPT_SUPERIOR_MAP[suggestorDept] || DEPT_SUPERIOR_MAP.default;
  }, [suggestorDept]);

  const plannerDetails = useMemo(() => {
    if (!suggestionArea) return null;
    return AREA_PLANNER_MAP[suggestionArea] || null;
  }, [suggestionArea]);

  // Group Co-suggestors
  const [isGroupSuggestion, setIsGroupSuggestion] = useState(
    !!(draftSuggestion?.formData as any)?.isGroupSuggestion
  );
  const [coSuggestors, setCoSuggestors] = useState<string[]>(
    ((draftSuggestion?.formData as any)?.coSuggestors ?? []).map((c: any) => c.empNo ?? c)
  );

  // Form errors & state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate detection state
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [pendingMatchList, setPendingMatchList] = useState<PendingMatch[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const pendingIdRef = useRef<string | null>(null);
  const pendingSubmitRef = useRef(false);

  // Voice Engine — matching JaP New Suggestion
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceLang, setVoiceLang] = useState("hi-IN");
  const [listeningField, setListeningField] = useState<VoiceFieldKey | null>(null);
  const listeningFieldRef = useRef<VoiceFieldKey | null>(null);

  const currentLangOption =
    VOICE_LANGUAGES.find((l) => l.code === voiceLang) ?? VOICE_LANGUAGES[2];
  const isNonEnglish = !voiceLang.startsWith("en");

  const fieldSetters: Record<VoiceFieldKey, React.Dispatch<React.SetStateAction<string>>> = {
    subject: setSubject,
    presentMethod: setPresentMethod,
    proposedMethod: setProposedMethod,
    benefits: setBenefits,
  };

  const handleVoiceResult = useCallback((text: string) => {
    const key = listeningFieldRef.current;
    if (!key || !(key in fieldSetters)) return;
    fieldSetters[key]((prev) => (prev ? `${prev} ${text}` : text));
    setErrors((err) => ({ ...err, [key]: undefined }));
    voiceEngine.setStatus({ text: `✓ ${VOICE_FIELD_LABELS[key] ?? key} filled`, ok: true });
    voiceEngine.stopListening();
    setListeningField(null);
    listeningFieldRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleListeningStopped = useCallback(() => {
    setListeningField(null);
    listeningFieldRef.current = null;
  }, []);

  const voiceEngine = useVoiceEngine(
    handleVoiceResult,
    {
      voiceLang,
      autoTranslate: true,
      translationProvider: "azure",
      translationFallbackProvider: null,
    },
    handleListeningStopped
  );

  const startVoiceForField = (field: VoiceFieldKey) => {
    if (!voiceEnabled) setVoiceEnabled(true);
    if (voiceEngine.isListening) {
      voiceEngine.stopListening();
      if (listeningFieldRef.current === field) {
        setListeningField(null);
        listeningFieldRef.current = null;
        return;
      }
    }
    listeningFieldRef.current = field;
    setListeningField(field);
    voiceEngine.setStatus(null);
    voiceEngine.startListening();
  };

  const disableVoice = () => {
    voiceEngine.stopListening();
    setVoiceEnabled(false);
    setListeningField(null);
    listeningFieldRef.current = null;
    voiceEngine.setStatus(null);
  };

  const activeVoiceField =
    voiceEngine.isListening || voiceEngine.isTranslating ? listeningField : null;

  // Helper file uploader
  const handleSingleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<FileUploadItem[]>>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 8MB limit`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setter((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: reader.result as string,
          },
        ]);
        toast.success(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // Populate enterprise demo sample
  const applyDemoTemplate = (template: (typeof ENTERPRISE_DEMO_TEMPLATES)[0]) => {
    setSubject(template.subject);
    setSuggestionArea(template.area);
    setCategory(template.category);
    setMachineRefType(template.machineRefType);
    setMachineRefValue(template.machineRef);
    setComponentRefType(template.componentRefType);
    setComponentRefValue(template.componentRefValue);
    setThemeBased(template.themeBased);
    setThemeName(template.themeName);
    setPresentMethod(template.presentMethod);
    setProposedMethod(template.proposedMethod);
    setBenefits(template.benefits);
    setErrors({});
    toast.info(`Loaded demo template: ${template.name}`, {
      description: "Form populated with enterprise manufacturing data.",
    });
  };

  // Validation
  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!subject.trim()) {
      errs.subject = "Suggestion subject is required";
    }

    if (suggestionFor === "behalf" && !selectedOnBehalfEmpNo) {
      errs.mainSuggestor = "Please select an employee";
    }

    if (isNaP && presentInputMode === "upload") {
      if (presentMethodFiles.length === 0 && !presentMethod.trim()) {
        errs.presentMethod = "Please upload a document or enter text for present method";
      }
    } else if (!presentMethod.trim()) {
      errs.presentMethod = "Present method description is required";
    }

    if (isNaP && proposedInputMode === "upload") {
      if (proposedMethodFiles.length === 0 && !proposedMethod.trim()) {
        errs.proposedMethod = "Please upload a document or enter text for proposed method";
      }
    } else if (!proposedMethod.trim()) {
      errs.proposedMethod = "Proposed method description is required";
    }

    if (!benefits.trim()) {
      errs.benefits = "Expected advantages and benefits are required";
    }

    if (themeBased === "yes" && !themeName) {
      errs.themeName = "Please select a campaign theme";
    }

    if (showImplementationDate && isKaizenScheme && isJaP && !implementationDate) {
      errs.implementationDate = "Implementation date is mandatory for Kaizen scheme";
    }

    if (!suggestionArea) {
      errs.suggestionArea = "Please select an operational area";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = (status: string) => {
    return {
      suggestionNo: suggNo,
      type: isKaizenScheme ? "Kaizen" : "Improvement Suggestion",
      category,
      subject: subject.trim() || "Untitled Suggestion",
      status,
      date: today,
      daysPending: 0,
      employeeNo: suggestorEmpNo,
      employeeName: suggestorName,
      department: workshopDeptName,
      plantCode: "PLT-03",
      presentMethod:
        presentMethod || (presentMethodFiles[0]?.name ? `Attached: ${presentMethodFiles[0].name}` : ""),
      proposedMethod:
        proposedMethod || (proposedMethodFiles[0]?.name ? `Attached: ${proposedMethodFiles[0].name}` : ""),
      benefits,
      formData: {
        suggestionFor,
        onBehalfEmpNo: suggestionFor === "behalf" ? selectedOnBehalfEmpNo : "",
        suggestorCategory,
        suggestorMobile,
        subject,
        machineRefType,
        machineRef:
          machineRefType === "name"
            ? `Name: ${machineRefValue}`
            : machineRefType === "number"
            ? `No.: ${machineRefValue}`
            : "N/A",
        componentRefType,
        componentRefValue,
        componentToolNo:
          componentRefType === "name"
            ? `Name: ${componentRefValue}`
            : componentRefType === "number"
            ? `No.: ${componentRefValue}`
            : "N/A",
        suggestionArea,
        workshopDeptName,
        suggestionDate: today,
        implementationDate,
        themeBased: themeBased === "yes",
        themeName,
        presentMethodFiles,
        proposedMethodFiles,
        superiorDetails,
        plannerDetails,
        isGroupSuggestion,
        coSuggestors: coSuggestors.map((id) => ({
          empNo: id,
          name: teamMemberOptions.find((o) => o.value === id)?.label ?? id,
        })),
      },
    };
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildPayload("Draft");
      if (draftId && draftSuggestion) {
        updateSuggestion(draftId, payload);
      } else {
        await addSuggestion(payload);
      }
      toast.success("Draft saved", {
        description: `${suggNo} saved. You can resume editing from My Suggestions.`,
      });
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || isScanning) return;
    if (!validate()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    if (!pendingSubmitRef.current) {
      if (!pendingIdRef.current) pendingIdRef.current = createPendingId();

      const duplicateInput = {
        subject,
        presentMethod,
        proposedMethod,
        benefits,
        category,
        suggestionType: isKaizenScheme ? "Kaizen" : "Improvement Suggestion",
      };

      registerPending({
        id: pendingIdRef.current,
        employeeNo: suggestorEmpNo,
        employeeName: suggestorName,
        registeredAt: Date.now(),
        subject: duplicateInput.subject,
        presentMethod: duplicateInput.presentMethod,
        proposedMethod: duplicateInput.proposedMethod,
        benefits: duplicateInput.benefits,
        category: duplicateInput.category,
        suggestionType: duplicateInput.suggestionType,
      });

      setIsScanning(true);
      await new Promise((r) => setTimeout(r, 600));

      const snapshot = getSuggestionsSnapshot();
      const demoSuggestions = snapshot.filter(
        (s) => (s.plantCode ?? (s as any).plant_code) === "PLT-03"
      );

      const detection = detectDuplicatesFull(
        duplicateInput,
        demoSuggestions,
        getActivePending(pendingIdRef.current)
      );
      setIsScanning(false);

      if (detection.hasConflict) {
        setDuplicateMatches(detection.saved);
        setPendingMatchList(detection.pending);
        setShowDuplicateModal(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload("In Evaluation");
      if (draftId && draftSuggestion) {
        updateSuggestion(draftId, payload);
      } else {
        await addSuggestion(payload);
      }

      addNotification({
        title: "Suggestion Submitted",
        message: `${suggNo} routed to ${superiorDetails.name} and ${plannerDetails?.name ?? "Assigned Area Planner"}`,
        type: "info",
        suggestionId: suggNo,
      });

      if (pendingIdRef.current) {
        unregisterPending(pendingIdRef.current);
        pendingIdRef.current = null;
      }
      clearExpiredPending();

      toast.success("Suggestion Submitted Successfully", {
        description: `${suggNo} is now registered under ${activePlant} (${activeScheme.toUpperCase()}).`,
      });
      navigate(`${plantPrefix}/employee/my-suggestions`);
    } catch {
      toast.error("Failed to submit suggestion");
    } finally {
      setIsSubmitting(false);
      pendingSubmitRef.current = false;
    }
  };

  const handleDuplicateProceed = () => {
    setShowDuplicateModal(false);
    pendingSubmitRef.current = true;
    handleSubmit();
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateModal(false);
    if (pendingIdRef.current) {
      unregisterPending(pendingIdRef.current);
      pendingIdRef.current = null;
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* ── Enterprise Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
            <FilePlus className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {draftSuggestion ? "Edit Draft Suggestion" : "Submit Suggestion"}
              </h1>
              <Badge variant="outline" className="text-xs font-mono py-0 h-5">
                {suggNo}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Employee Continuous Improvement & Kaizen Portal
            </p>
          </div>
        </div>

        {/* Plant & Scheme Active Badge with quick switch */}
        <div className="flex items-center gap-2.5 bg-muted/50 border rounded-lg px-3.5 py-2">
          <div className="text-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider block">
              Active Environment
            </span>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>{activePlant}</span>
              <span className="text-muted-foreground font-normal">/</span>
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              <span className="capitalize">{activeScheme}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 ml-1"
            onClick={() => navigate("/demo/setup")}
          >
            <Sliders className="h-3 w-3" /> Change
          </Button>
        </div>
      </div>

      {/* ── Enterprise Demo Data Loader Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 rounded-xl p-3.5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-foreground">Auto-fill Enterprise Demo Data:</span>{" "}
            <span className="text-muted-foreground">Load authentic shopfloor improvement scenarios</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ENTERPRISE_DEMO_TEMPLATES.map((tmpl) => (
            <Button
              key={tmpl.name}
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-[11px] px-2.5 gap-1 bg-background hover:bg-muted border shadow-2xs"
              onClick={() => applyDemoTemplate(tmpl)}
            >
              <ClipboardList className="h-3 w-3 text-primary" />
              {tmpl.name}
            </Button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 1: SUBMISSION OVERVIEW & SUBJECT
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Suggestion Overview</h2>
              <p className="text-xs text-muted-foreground">
                Submission identity, employee ownership, and core subject
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Date: {today}</span>
            </div>
          </div>

          {/* Submission Mode: Self vs On Behalf */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Submission Mode</Label>
            <RadioGroup
              value={suggestionFor}
              onValueChange={(val: "self" | "behalf") => setSuggestionFor(val)}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="self" id="mode-self" />
                <Label htmlFor="mode-self" className="text-xs cursor-pointer font-medium">
                  Self <span className="text-muted-foreground font-normal">({user?.name ?? "Alex Morgan"})</span>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="behalf" id="mode-behalf" />
                <Label htmlFor="mode-behalf" className="text-xs cursor-pointer font-medium">
                  On Behalf of Others
                </Label>
              </div>
            </RadioGroup>

            {suggestionFor === "behalf" && (
              <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2 mt-2 animate-fade-in">
                <Label className="text-xs font-medium">
                  Select Employee <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedOnBehalfEmpNo}
                  onValueChange={(empNo) => {
                    setSelectedOnBehalfEmpNo(empNo);
                    setErrors((e) => ({ ...e, mainSuggestor: undefined }));
                  }}
                >
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue placeholder="Search or select employee from directory..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {mockEmployees.map((emp) => (
                      <SelectItem key={emp.employeeNo} value={emp.employeeNo}>
                        {emp.name} ({emp.employeeNo}) — {emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.mainSuggestor && (
                  <p className="text-xs text-destructive">{errors.mainSuggestor}</p>
                )}
                {selectedBehalfEmployee && (
                  <p className="text-[11px] text-muted-foreground">
                    Selected suggestor: <strong className="text-foreground">{selectedBehalfEmployee.name}</strong> ({selectedBehalfEmployee.employeeNo}) · {selectedBehalfEmployee.department}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Suggestion Subject */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject" className="text-xs font-medium">
                Suggestion Subject <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">Concise headline describing the improvement</span>
            </div>
            <VoiceHighlight
              active={activeVoiceField === "subject"}
              voiceMode={voiceEnabled}
              onActivate={() => startVoiceForField("subject")}
              isTranslating={voiceEngine.isTranslating && activeVoiceField === "subject"}
              translatingLang={isNonEnglish ? currentLangOption.nativeName : undefined}
            >
              <Input
                id="subject"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setErrors((err) => ({ ...err, subject: undefined }));
                }}
                placeholder="e.g. Automated optical sensor for conveyor belt indexing"
                className={errors.subject ? "border-destructive text-sm" : "text-sm"}
              />
            </VoiceHighlight>
            {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 2: LOCATION & EQUIPMENT DETAILS
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-semibold text-foreground">Operational Location & Equipment</h2>
            <p className="text-xs text-muted-foreground">
              Station, machine, tool reference, and department affiliation
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Suggestion Area / Operation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Operational Area / Station <span className="text-destructive">*</span>
              </Label>
              <Select
                value={suggestionArea}
                onValueChange={(val) => {
                  setSuggestionArea(val);
                  setErrors((e) => ({ ...e, suggestionArea: undefined }));
                }}
              >
                <SelectTrigger className={`text-xs h-10 ${errors.suggestionArea ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Choose operational area..." />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_AREAS.map((area) => (
                    <SelectItem key={area} value={area} className="text-xs">
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.suggestionArea && (
                <p className="text-xs text-destructive">{errors.suggestionArea}</p>
              )}
            </div>

            {/* Workshop / Dept. Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Department / Workshop</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={workshopDeptName}
                  className="bg-muted/50 text-muted-foreground cursor-default text-xs h-10 font-medium"
                />
                <Badge variant="secondary" className="text-[10px] shrink-0 font-normal">
                  Auto-populated
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Machine Reference */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Machine Reference</Label>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["name", "number", "na"] as MachineRefType[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setMachineRefType(opt);
                      if (opt === "na") setMachineRefValue("");
                    }}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${
                      machineRefType === opt
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-background border-input text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {opt === "name" && "Machine Name"}
                    {opt === "number" && "Machine No."}
                    {opt === "na" && "N/A"}
                  </button>
                ))}
              </div>
              {machineRefType !== "na" && (
                <Input
                  value={machineRefValue}
                  onChange={(e) => setMachineRefValue(e.target.value)}
                  placeholder={
                    machineRefType === "name"
                      ? "Enter Machine Name (e.g. CNC Mill HP-02)"
                      : "Enter Machine Number (e.g. MC-704)"
                  }
                  className="text-xs h-9"
                />
              )}
            </div>

            {/* Component / Tool Reference */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Component / Tool No.</Label>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["name", "number", "na"] as ComponentRefType[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setComponentRefType(opt);
                      if (opt === "na") setComponentRefValue("");
                    }}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${
                      componentRefType === opt
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-background border-input text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {opt === "name" && "Component Name"}
                    {opt === "number" && "Component / Tool No."}
                    {opt === "na" && "N/A"}
                  </button>
                ))}
              </div>
              {componentRefType !== "na" && (
                <Input
                  value={componentRefValue}
                  onChange={(e) => setComponentRefValue(e.target.value)}
                  placeholder={
                    componentRefType === "name"
                      ? "Enter Component / Tool Name (e.g. Optical Sensor Bracket)"
                      : "Enter Component / Tool No. (e.g. CV-OPT-88 / DIE-44-HEX)"
                  }
                  className="text-xs h-9"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 3: CLASSIFICATION & IMPLEMENTATION
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-semibold text-foreground">Classification & Campaign</h2>
            <p className="text-xs text-muted-foreground">
              Categorize the idea and link to ongoing plant improvement initiatives
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Suggestion Category <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs h-10">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Implementation Date (Conditionally rendered) */}
            {showImplementationDate ? (
              <div className="space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Implementation Date{" "}
                    {isJaP && isKaizenScheme ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                    )}
                  </Label>
                  {isJaP && isKaizenScheme && (
                    <Badge variant="outline" className="text-[9px] font-normal">
                      Required for Kaizen
                    </Badge>
                  )}
                </div>
                <Input
                  type="date"
                  value={implementationDate}
                  onChange={(e) => {
                    setImplementationDate(e.target.value);
                    setErrors((err) => ({ ...err, implementationDate: undefined }));
                  }}
                  className={`text-xs h-10 ${errors.implementationDate ? "border-destructive" : ""}`}
                />
                {errors.implementationDate && (
                  <p className="text-xs text-destructive">{errors.implementationDate}</p>
                )}
              </div>
            ) : null}
          </div>

          <Separator />

          {/* Theme / Campaign-based Idea */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Is this idea part of a themed campaign?</Label>
              <RadioGroup
                value={themeBased}
                onValueChange={(val: "yes" | "no") => {
                  setThemeBased(val);
                  if (val === "no") setThemeName("");
                }}
                className="flex items-center gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="yes" id="theme-yes" />
                  <Label htmlFor="theme-yes" className="text-xs cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="no" id="theme-no" />
                  <Label htmlFor="theme-no" className="text-xs cursor-pointer">
                    No
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {themeBased === "yes" && (
              <div className="pl-4 pt-1 space-y-1.5 border-l-2 border-primary/40 animate-fade-in">
                <Label className="text-xs font-medium">
                  Select Campaign / Theme <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={themeName}
                  onValueChange={(v) => {
                    setThemeName(v);
                    setErrors((e) => ({ ...e, themeName: undefined }));
                  }}
                >
                  <SelectTrigger className={`text-xs h-10 ${errors.themeName ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Choose campaign or theme..." />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.themeName && <p className="text-xs text-destructive">{errors.themeName}</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 4: METHODS & BENEFITS (JaP Improvement Details + Voice)
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2 pl-0.5">
                <Lightbulb className="h-3.5 w-3.5 shrink-0" /> Improvement Details / सुधार विवरण
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Baseline conditions, proposed countermeasures, and anticipated gains / वर्तमान स्थिति, प्रस्तावित सुधार एवं अपेक्षित लाभ
              </p>
            </div>
            {isNaP && (
              <Badge variant="secondary" className="text-[10px] w-fit">
                NaP Mode: Text / Document Upload
              </Badge>
            )}
          </div>

          {/* Voice toolbar — right at the top of improvement details */}
          {!inputMethodSettings.voiceEnabled ? (
            <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700">
              <Mic className="inline h-3 w-3 mr-1" /> Voice input has been disabled by BPS admin / वॉइस इनपुट अक्षम
            </div>
          ) : voiceEnabled ? (
            <div className="space-y-2">
              {/* Language selection & Azure Translation Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={voiceLang}
                    onValueChange={(val) => {
                      setVoiceLang(val);
                      voiceEngine.setStatus(null);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[170px] text-xs bg-background">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="text-xs">
                          {lang.flag} {lang.label}{" "}
                          {lang.nativeName !== lang.label ? `(${lang.nativeName})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="flex items-center gap-1 text-[10px] font-medium text-violet-600 bg-violet-500/[0.08] border border-violet-400/20 px-2 py-1 rounded-lg">
                    <Languages className="h-3 w-3" />
                    Speak in {currentLangOption.nativeName} — auto-translates to English (Azure)
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disableVoice}
                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-2"
                >
                  <X className="h-3 w-3 mr-1" /> Hide Voice Bar
                </Button>
              </div>

              {/* Status bar */}
              <div
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs transition-all duration-300 ${
                  voiceEngine.isTranslating
                    ? "border-violet-400/40 bg-violet-500/[0.05] shadow-sm shadow-violet-500/5"
                    : voiceEngine.isListening
                    ? "border-rose-400/35 bg-rose-500/[0.04] shadow-sm shadow-rose-500/5"
                    : voiceEngine.status?.ok
                    ? "border-emerald-400/30 bg-emerald-500/[0.04]"
                    : voiceEngine.status
                    ? "border-amber-400/30 bg-amber-500/[0.04]"
                    : "border-primary/15 bg-primary/[0.03]"
                }`}
              >
                <div
                  className={`relative h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    voiceEngine.isTranslating
                      ? "bg-violet-500 shadow-sm shadow-violet-500/30"
                      : voiceEngine.isListening
                      ? "bg-rose-500 shadow-sm shadow-rose-500/30"
                      : voiceEngine.status?.ok
                      ? "bg-emerald-500/15"
                      : "bg-primary/10"
                  }`}
                >
                  {(voiceEngine.isListening || voiceEngine.isTranslating) && (
                    <span
                      className={`absolute inset-0 rounded-full animate-ping pointer-events-none ${
                        voiceEngine.isTranslating ? "bg-violet-400/30" : "bg-rose-400/30"
                      }`}
                    />
                  )}
                  {voiceEngine.isTranslating ? (
                    <Languages className="h-3.5 w-3.5 text-white relative z-10 animate-pulse" />
                  ) : voiceEngine.isListening ? (
                    <Mic className="h-3.5 w-3.5 text-white relative z-10" />
                  ) : voiceEngine.status?.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Mic className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {voiceEngine.isTranslating ? (
                    <p className="font-semibold text-violet-600 truncate">
                      Translating from {currentLangOption.label} to English…
                      {voiceEngine.originalText && (
                        <span className="block text-[10px] font-normal text-muted-foreground/70 mt-0.5 italic truncate">
                          "{voiceEngine.originalText}"
                        </span>
                      )}
                    </p>
                  ) : voiceEngine.isListening ? (
                    <p className="font-semibold text-foreground truncate">
                      Listening —{" "}
                      <span className="text-rose-500 font-bold">
                        {VOICE_FIELD_LABELS[activeVoiceField as VoiceFieldKey] ?? activeVoiceField}
                      </span>
                      <span className="font-normal text-muted-foreground/60 ml-1">
                        {voiceEngine.interimText
                          ? "typing in field…"
                          : isNonEnglish
                          ? `speak in ${currentLangOption.nativeName}…`
                          : "speak now…"}
                      </span>
                    </p>
                  ) : voiceEngine.status ? (
                    <div>
                      <p
                        className={`font-medium ${
                          voiceEngine.status.ok ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {voiceEngine.status.text}
                      </p>
                      {voiceEngine.status.ok && voiceEngine.originalText && isNonEnglish && (
                        <p className="text-[10px] text-violet-500 mt-0.5 flex items-center gap-1">
                          <Languages className="h-2.5 w-2.5" /> Translated from: "{voiceEngine.originalText}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground/70">
                      Tap{" "}
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted border border-border/50 text-foreground font-medium">
                        <Mic className="h-2.5 w-2.5" /> speak
                      </span>{" "}
                      on any field below to fill it by voice
                      {isNonEnglish && (
                        <span className="ml-1 text-violet-500">
                          ({currentLangOption.label} → English)
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {voiceEngine.isListening || voiceEngine.isTranslating ? (
                  <button
                    type="button"
                    onClick={() => {
                      voiceEngine.stopListening();
                      setListeningField(null);
                      listeningFieldRef.current = null;
                    }}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                      voiceEngine.isTranslating
                        ? "bg-violet-500/10 border-violet-400/25 text-violet-500 hover:bg-violet-500/20"
                        : "bg-rose-500/10 border-rose-400/25 text-rose-500 hover:bg-rose-500/20"
                    }`}
                  >
                    <MicOff className="h-3 w-3" />
                    <span className="text-[10px] font-medium">stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={disableVoice}
                    className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors"
                    title="Exit voice mode"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setVoiceEnabled(true);
                voiceEngine.setStatus(null);
              }}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-background hover:bg-primary/5 hover:border-primary/25 text-muted-foreground hover:text-primary text-[11px] font-medium transition-all w-fit shadow-sm"
            >
              <div className="h-5 w-5 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                <Mic className="h-3 w-3" />
              </div>
              Voice input
              <span className="text-[10px] text-muted-foreground/40 font-normal">
                — speak in Hindi or any language, auto-translates to English
              </span>
            </button>
          )}

          {/* Present Method */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="presentMethod" className="text-xs font-medium">
                Present Method <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  / वर्तमान विधि — कैसे काम हो रहा है अभी?
                </span>
              </Label>

              {isNaP && (
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPresentInputMode("write")}
                    className={`px-2 py-0.5 rounded ${
                      presentInputMode === "write"
                        ? "bg-background text-foreground shadow-xs font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Write Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresentInputMode("upload")}
                    className={`px-2 py-0.5 rounded ${
                      presentInputMode === "upload"
                        ? "bg-background text-foreground shadow-xs font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Upload Document
                  </button>
                </div>
              )}
            </div>

            {(!isNaP || presentInputMode === "write") && (
              <VoiceHighlight
                active={activeVoiceField === "presentMethod"}
                voiceMode={voiceEnabled}
                onActivate={() => startVoiceForField("presentMethod")}
                isTranslating={voiceEngine.isTranslating && activeVoiceField === "presentMethod"}
                translatingLang={isNonEnglish ? currentLangOption.nativeName : undefined}
              >
                <Textarea
                  id="presentMethod"
                  rows={4}
                  value={presentMethod}
                  onChange={(e) => {
                    setPresentMethod(e.target.value);
                    setErrors((err) => ({ ...err, presentMethod: undefined }));
                  }}
                  placeholder="Describe the current method or problem as it stands today..."
                  className={`text-xs ${errors.presentMethod ? "border-destructive" : ""}`}
                />
              </VoiceHighlight>
            )}

            {isNaP && presentInputMode === "upload" && (
              <div className="p-4 border-2 border-dashed rounded-lg bg-muted/20 text-center space-y-2">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-foreground">
                  Upload file for Present Method (PDF, Word, Excel, or Photo)
                </p>
                <input
                  type="file"
                  id="presentMethodFile"
                  className="hidden"
                  onChange={(e) => handleSingleFileUpload(e, setPresentMethodFiles)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => document.getElementById("presentMethodFile")?.click()}
                  className="text-xs gap-1.5"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Choose Document
                </Button>
                {presentMethodFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {presentMethodFiles.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-[11px] gap-1.5 py-1 px-2.5">
                        <FileText className="h-3 w-3 text-primary" />
                        <span>{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setPresentMethodFiles((pf) => pf.filter((_, idx) => idx !== i))}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.presentMethod && <p className="text-xs text-destructive">{errors.presentMethod}</p>}
          </div>

          {/* Proposed Method */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="proposedMethod" className="text-xs font-medium">
                Proposed Method <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  / प्रस्तावित विधि — क्या बदलाव करना चाहते हैं?
                </span>
              </Label>

              {isNaP && (
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setProposedInputMode("write")}
                    className={`px-2 py-0.5 rounded ${
                      proposedInputMode === "write"
                        ? "bg-background text-foreground shadow-xs font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Write Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setProposedInputMode("upload")}
                    className={`px-2 py-0.5 rounded ${
                      proposedInputMode === "upload"
                        ? "bg-background text-foreground shadow-xs font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Upload Document
                  </button>
                </div>
              )}
            </div>

            {(!isNaP || proposedInputMode === "write") && (
              <VoiceHighlight
                active={activeVoiceField === "proposedMethod"}
                voiceMode={voiceEnabled}
                onActivate={() => startVoiceForField("proposedMethod")}
                isTranslating={voiceEngine.isTranslating && activeVoiceField === "proposedMethod"}
                translatingLang={isNonEnglish ? currentLangOption.nativeName : undefined}
              >
                <Textarea
                  id="proposedMethod"
                  rows={4}
                  value={proposedMethod}
                  onChange={(e) => {
                    setProposedMethod(e.target.value);
                    setErrors((err) => ({ ...err, proposedMethod: undefined }));
                  }}
                  placeholder="Describe the proposed improvement or solution..."
                  className={`text-xs ${errors.proposedMethod ? "border-destructive" : ""}`}
                />
              </VoiceHighlight>
            )}

            {isNaP && proposedInputMode === "upload" && (
              <div className="p-4 border-2 border-dashed rounded-lg bg-muted/20 text-center space-y-2">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-foreground">
                  Upload file for Proposed Method (PDF, Word, CAD snapshot, or Photo)
                </p>
                <input
                  type="file"
                  id="proposedMethodFile"
                  className="hidden"
                  onChange={(e) => handleSingleFileUpload(e, setProposedMethodFiles)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => document.getElementById("proposedMethodFile")?.click()}
                  className="text-xs gap-1.5"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Choose Document
                </Button>
                {proposedMethodFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {proposedMethodFiles.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-[11px] gap-1.5 py-1 px-2.5">
                        <FileText className="h-3 w-3 text-primary" />
                        <span>{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setProposedMethodFiles((pf) => pf.filter((_, idx) => idx !== i))}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.proposedMethod && <p className="text-xs text-destructive">{errors.proposedMethod}</p>}
          </div>

          {/* Expected Benefits */}
          <div className="space-y-1.5">
            <Label htmlFor="benefits" className="text-xs font-medium">
              Expected Benefits <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">
                / अपेक्षित लाभ — क्या सुधार होगा?
              </span>
            </Label>
            <VoiceHighlight
              active={activeVoiceField === "benefits"}
              voiceMode={voiceEnabled}
              onActivate={() => startVoiceForField("benefits")}
              isTranslating={voiceEngine.isTranslating && activeVoiceField === "benefits"}
              translatingLang={isNonEnglish ? currentLangOption.nativeName : undefined}
            >
              <Textarea
                id="benefits"
                rows={3}
                value={benefits}
                onChange={(e) => {
                  setBenefits(e.target.value);
                  setErrors((err) => ({ ...err, benefits: undefined }));
                }}
                placeholder="Describe the expected benefits (safety, cost, quality, productivity, etc.)..."
                className={`text-xs ${errors.benefits ? "border-destructive" : ""}`}
              />
            </VoiceHighlight>
            {errors.benefits && <p className="text-xs text-destructive">{errors.benefits}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 5: STAKEHOLDERS & REVIEW ROUTING
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-semibold text-foreground">Stakeholders & Review Routing</h2>
            <p className="text-xs text-muted-foreground">
              Automated routing matrix for feasibility evaluation and approvals
            </p>
          </div>

          {/* Suggestor Details */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Suggestor Details
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <ReadonlyField icon={User} label="Suggestor Name" value={suggestorName} />
              <ReadonlyField icon={Building2} label="Department" value={workshopDeptName} />
              <ReadonlyField icon={Tag} label="Category" value={suggestorCategory} />
              {isJaP && (
                <ReadonlyField
                  icon={Sparkles}
                  label="Contact Mobile"
                  value={suggestorMobile}
                  badge="Verified"
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Superior Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-indigo-500" />
                Reporting Superior (First-Level Approver)
              </Label>
              <Badge variant="outline" className="text-[10px] font-normal">
                Auto-assigned
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <ReadonlyField icon={User} label="Superior Name" value={superiorDetails.name} />
              <ReadonlyField icon={Building2} label="Department" value={superiorDetails.department} />
              <ReadonlyField icon={Tag} label="Designation" value={superiorDetails.designation} />
            </div>
          </div>

          <Separator />

          {/* Area Specific Planner Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-blue-500" />
                Area Planning Engineer (Feasibility Reviewer)
              </Label>
              <Badge variant="secondary" className="text-[10px] font-normal">
                Area-derived
              </Badge>
            </div>

            {plannerDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fade-in">
                <ReadonlyField icon={User} label="Planner Name" value={plannerDetails.name} />
                <ReadonlyField icon={Building2} label="Department" value={plannerDetails.department} />
                <ReadonlyField icon={Tag} label="Role" value={plannerDetails.designation} />
              </div>
            ) : (
              <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground border italic">
                Select an operational area above to automatically assign the designated area planner.
              </div>
            )}
          </div>

          <Separator />

          {/* Optional Group Co-Suggestors */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="groupSuggestToggle"
                checked={isGroupSuggestion}
                onChange={(e) => {
                  setIsGroupSuggestion(e.target.checked);
                  if (!e.target.checked) setCoSuggestors([]);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="groupSuggestToggle" className="text-xs cursor-pointer font-medium">
                Add Team Co-Suggestors (Group Submission)
              </Label>
            </div>

            {isGroupSuggestion && (
              <div className="p-3 bg-muted/30 border rounded-lg space-y-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(val) => {
                      if (!coSuggestors.includes(val)) {
                        setCoSuggestors((prev) => [...prev, val]);
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs bg-background h-9">
                      <SelectValue placeholder="Add co-suggestor from employee directory..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockEmployees
                        .filter((e) => e.employeeNo !== suggestorEmpNo)
                        .map((emp) => (
                          <SelectItem key={emp.employeeNo} value={emp.employeeNo} className="text-xs">
                            {emp.name} ({emp.employeeNo}) — {emp.department}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {coSuggestors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {coSuggestors.map((id) => {
                      const emp = mockEmployees.find((e) => e.employeeNo === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-[11px] gap-1 py-1 px-2">
                          <UserPlus className="h-3 w-3 text-primary" />
                          <span>
                            {emp?.name ?? id} ({id})
                          </span>
                          <button
                            type="button"
                            onClick={() => setCoSuggestors((cs) => cs.filter((c) => c !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          ACTION BAR
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting || isScanning}
          className="w-full sm:w-auto text-xs gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Save as Draft
        </Button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`${plantPrefix}/employee/my-suggestions`)}
            disabled={isSubmitting || isScanning}
            className="w-1/2 sm:w-auto text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isScanning}
            className="w-1/2 sm:w-auto text-xs gap-1.5 shadow-sm font-medium"
          >
            {isScanning ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Validating Duplicates...
              </>
            ) : isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Submit Suggestion
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Duplicate alert dialog */}
      <DuplicateAlertDialog
        open={showDuplicateModal}
        matches={duplicateMatches}
        pendingMatches={pendingMatchList}
        onProceed={handleDuplicateProceed}
        onCancel={handleDuplicateCancel}
      />
    </div>
  );
};

export default DemoNewSuggestion;
