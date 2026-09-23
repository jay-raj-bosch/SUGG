// Demo Application — New Suggestion (Employee)
// Implements plant & scheme customized line items (5 through 22).
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { detectDuplicatesFull, type DuplicateMatch, type PendingMatch } from "@/lib/bidp/duplicateDetector";
import { registerPending, unregisterPending, getActivePending, createPendingId, clearExpiredPending } from "@/lib/bidp/pendingSubmissionsStore";
import {
  FilePlus,
  User,
  Building2,
  Wrench,
  Lightbulb,
  CheckCircle2,
  Hash,
  Tag,
  Users,
  Mic,
  MicOff,
  Languages,
  X,
  Search,
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
} from "lucide-react";
import { teamMemberOptions } from "@/lib/jap/suggestionConstants";
import { getInputMethodSettings } from "@/lib/jap/inputMethodStore";
import { getDemoSelection, type DemoPlantKey } from "@/lib/demoConfig";
import { mockEmployees } from "@/lib/mockData";

// ── Item 10: Demo manufacturing areas / operations ─────────────────────────────
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

// ── Item 22: Auto-mapped Area Specific Planner based on Area ───────────────────
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

// ── Item 21: Auto-populated Superior Details based on Department ───────────────
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

// ── Item 15: Categories ────────────────────────────────────────────────────────
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

// ── Item 16: Campaign / Theme Master Options ──────────────────────────────────
const THEME_OPTIONS = [
  { value: "safety_month", label: "Safety Month Campaign", labelHi: "सुरक्षा माह अभियान" },
  { value: "zero_defect", label: "Zero Defect Mission", labelHi: "शून्य दोष मिशन" },
  { value: "cost_optimization", label: "Cost Optimization Drive", labelHi: "लागत अनुकूलन अभियान" },
  { value: "energy_saving", label: "Energy Conservation Sprint", labelHi: "ऊर्जा बचत अभियान" },
  { value: "5s_blitz", label: "5S Kaizen Blitz", labelHi: "5S कैज़न अभियान" },
  { value: "productivity_boost", label: "Productivity Acceleration", labelHi: "उत्पादकता वृद्धि अभियान" },
  { value: "ergonomics_care", label: "Operator Ergonomics Care", labelHi: "कार्य सुगमता अभियान" },
];

type MachineRefType = "name" | "number" | "na";
type VoiceFieldKey = "subject" | "presentMethod" | "proposedMethod" | "benefits";

const VOICE_FIELD_LABELS: Record<VoiceFieldKey, string> = {
  subject: "Subject",
  presentMethod: "Present Method",
  proposedMethod: "Proposed Method",
  benefits: "Expected Benefits",
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
  machineRef?: string;
  themeName?: string;
  implementationDate?: string;
  suggestionArea?: string;
  category?: string;
  mainSuggestor?: string;
}

interface FileUploadItem {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

// ── Read-only labelled field helper ───────────────────────────────────────────
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
  <div className="flex items-center gap-2.5 py-2 px-3 bg-muted/30 rounded-lg border text-xs">
    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <span className="text-[10px] text-muted-foreground block leading-tight">
        {label} {labelHi && <span className="opacity-70 font-normal">/ {labelHi}</span>}
      </span>
      <span className="font-medium text-foreground truncate block">{value || "—"}</span>
    </div>
    {badge && (
      <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
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

  // Item 13 condition:
  // JaP: Shown and required only when Scheme = "Kaizen"
  // BidP & NaP: Visible and applicable across all categories/schemes
  const showImplementationDate = isJaP ? isKaizenScheme : true;

  // BPS input method control
  const inputMethodSettings = getInputMethodSettings();

  // If we have ?draft=<id>, load that draft for editing
  const draftId = searchParams.get("draft");
  const draftSuggestion = draftId
    ? suggestions.find((s) => s.id === draftId && s.status === "Draft")
    : null;

  // ── Item 5: Sugg No. (Auto generated by default) ───────────────────────────
  const [suggNo] = useState(() => draftSuggestion?.suggestionNo ?? generateSuggNo(activePlant));

  // ── Item 12: Suggestion Date (Auto populated current date) ─────────────────
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ── Item 6: Self or On Behalf of others ─────────────────────────────────────
  const [suggestionFor, setSuggestionFor] = useState<"self" | "behalf">(
    (draftSuggestion?.formData as any)?.suggestionFor ?? "self"
  );
  const [selectedOnBehalfEmpNo, setSelectedOnBehalfEmpNo] = useState<string>(
    (draftSuggestion?.formData as any)?.onBehalfEmpNo ?? ""
  );
  const [onBehalfSearch, setOnBehalfSearch] = useState("");

  // Resolve suggestor based on suggestionFor
  const selectedBehalfEmployee = useMemo(
    () => mockEmployees.find((e) => e.employeeNo === selectedOnBehalfEmpNo),
    [selectedOnBehalfEmpNo]
  );

  // ── Item 20: Suggestor details (auto-fetched) ──────────────────────────────
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

  // ── Item 7: Suggestion Subject (clean text box, no AI) ──────────────────────
  const [subject, setSubject] = useState(
    draftSuggestion?.subject ?? (draftSuggestion?.formData as any)?.subject ?? ""
  );

  // ── Item 8: Machine No. (JaP style: Name, Number, N/A) ──────────────────────
  const [machineRefType, setMachineRefType] = useState<MachineRefType>(
    (draftSuggestion?.formData as any)?.machineRefType ?? "na"
  );
  const [machineRefValue, setMachineRefValue] = useState(
    (draftSuggestion?.formData as any)?.machineRefType === "na"
      ? ""
      : ((draftSuggestion?.formData as any)?.machineRef ?? "").replace(/^(Name|No\.): /, "")
  );

  // ── Item 9: Component / Tool No. (JaP style) ───────────────────────────────
  const [componentToolNo, setComponentToolNo] = useState(
    (draftSuggestion?.formData as any)?.componentToolNo ?? ""
  );

  // ── Item 10: Suggestion Area / Operation (Demo dropdown) ───────────────────
  const [suggestionArea, setSuggestionArea] = useState<string>(
    (draftSuggestion?.formData as any)?.suggestionArea ?? "Assembly Line 1 - Final Inspection"
  );

  // ── Item 11: Workshop / Dept. Name (Auto fetch) ────────────────────────────
  // Auto-derived from suggestor's department
  const workshopDeptName = suggestorDept;

  // ── Item 13: Idea Implementation Date ──────────────────────────────────────
  const [implementationDate, setImplementationDate] = useState<string>(
    (draftSuggestion?.formData as any)?.implementationDate ?? ""
  );

  // ── Item 15: Suggestion Category (Dropdown) ────────────────────────────────
  const [category, setCategory] = useState<string>(
    draftSuggestion?.category ?? "Productivity Improvement"
  );

  // ── Item 16: Theme / Campaign-based Idea ───────────────────────────────────
  const [themeBased, setThemeBased] = useState<"yes" | "no">(
    (draftSuggestion?.formData as any)?.themeBased ? "yes" : "no"
  );
  const [themeName, setThemeName] = useState<string>(
    (draftSuggestion?.formData as any)?.themeName ?? ""
  );

  // ── Item 17 & 18: Present Method & Proposed Method ─────────────────────────
  const [presentMethod, setPresentMethod] = useState(draftSuggestion?.presentMethod ?? "");
  const [proposedMethod, setProposedMethod] = useState(draftSuggestion?.proposedMethod ?? "");

  // NaP Dual Mode: Write vs Upload
  const [presentInputMode, setPresentInputMode] = useState<"write" | "upload">("write");
  const [proposedInputMode, setProposedInputMode] = useState<"write" | "upload">("write");
  const [presentMethodFiles, setPresentMethodFiles] = useState<FileUploadItem[]>(
    (draftSuggestion?.formData as any)?.presentMethodFiles ?? []
  );
  const [proposedMethodFiles, setProposedMethodFiles] = useState<FileUploadItem[]>(
    (draftSuggestion?.formData as any)?.proposedMethodFiles ?? []
  );

  // ── Item 19: Advantages / Benefits ─────────────────────────────────────────
  const [benefits, setBenefits] = useState(draftSuggestion?.benefits ?? "");

  // ── Item 21: Superior Details (Auto populated) ─────────────────────────────
  const superiorDetails = useMemo(() => {
    return DEPT_SUPERIOR_MAP[suggestorDept] || DEPT_SUPERIOR_MAP.default;
  }, [suggestorDept]);

  // ── Item 22: Area Specific Planner Details (Auto mapped from Item 10 Area) ─
  const plannerDetails = useMemo(() => {
    if (!suggestionArea) return null;
    return AREA_PLANNER_MAP[suggestionArea] || null;
  }, [suggestionArea]);

  // Co-suggestors / Team members
  const [isGroupSuggestion, setIsGroupSuggestion] = useState(
    !!(draftSuggestion?.formData as any)?.isGroupSuggestion
  );
  const [coSuggestors, setCoSuggestors] = useState<string[]>(
    ((draftSuggestion?.formData as any)?.coSuggestors ?? []).map((c: any) => c.empNo ?? c)
  );
  const [coSuggestorSearch, setCoSuggestorSearch] = useState("");

  // General attachments
  const [attachments, setAttachments] = useState<FileUploadItem[]>(
    (draftSuggestion?.formData as any)?.attachments ?? []
  );

  // Form errors
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Duplicate detection state
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [pendingMatchList, setPendingMatchList] = useState<PendingMatch[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const pendingIdRef = useRef<string | null>(null);
  const pendingSubmitRef = useRef(false);

  // Voice engine
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listeningField, setListeningField] = useState<VoiceFieldKey | null>(null);
  const listeningFieldRef = useRef<VoiceFieldKey | null>(null);

  const handleVoiceResult = useCallback((text: string) => {
    const key = listeningFieldRef.current;
    if (!key) return;
    if (key === "subject") setSubject((prev) => (prev ? `${prev} ${text}` : text));
    else if (key === "presentMethod") setPresentMethod((prev) => (prev ? `${prev} ${text}` : text));
    else if (key === "proposedMethod") setProposedMethod((prev) => (prev ? `${prev} ${text}` : text));
    else if (key === "benefits") setBenefits((prev) => (prev ? `${prev} ${text}` : text));
    setErrors((err) => ({ ...err, [key]: undefined }));
  }, []);

  const voiceEngine = useVoiceEngine({
    lang: "hi-IN",
    onResult: handleVoiceResult,
    enableTranslation: true,
  });

  const startVoiceForField = (field: VoiceFieldKey) => {
    if (!inputMethodSettings.voiceEnabled) return;
    if (listeningField === field && voiceEngine.isListening) {
      voiceEngine.stopListening();
      setListeningField(null);
      listeningFieldRef.current = null;
      return;
    }
    setListeningField(field);
    listeningFieldRef.current = field;
    voiceEngine.startListening();
  };

  const disableVoice = () => {
    voiceEngine.stopListening();
    setListeningField(null);
    listeningFieldRef.current = null;
    setVoiceEnabled(false);
  };

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

  // Validation
  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!subject.trim()) {
      errs.subject = "Suggestion subject is required / विषय आवश्यक है";
    }

    if (suggestionFor === "behalf" && !selectedOnBehalfEmpNo) {
      errs.mainSuggestor = "Please select an employee / कर्मचारी चुनें";
    }

    // Present method check
    if (isNaP && presentInputMode === "upload") {
      if (presentMethodFiles.length === 0 && !presentMethod.trim()) {
        errs.presentMethod = "Please upload a document or enter text for present method";
      }
    } else if (!presentMethod.trim()) {
      errs.presentMethod = "Present method is required / वर्तमान विधि आवश्यक है";
    }

    // Proposed method check
    if (isNaP && proposedInputMode === "upload") {
      if (proposedMethodFiles.length === 0 && !proposedMethod.trim()) {
        errs.proposedMethod = "Please upload a document or enter text for proposed method";
      }
    } else if (!proposedMethod.trim()) {
      errs.proposedMethod = "Proposed method is required / प्रस्तावित विधि आवश्यक है";
    }

    if (!benefits.trim()) {
      errs.benefits = "Expected benefits are required / अपेक्षित लाभ आवश्यक है";
    }

    if (themeBased === "yes" && !themeName) {
      errs.themeName = "Please select a theme / विषय-वस्तु चुनें";
    }

    if (showImplementationDate && isKaizenScheme && isJaP && !implementationDate) {
      errs.implementationDate = "Implementation date is mandatory for Kaizen / कैज़न के लिए आवश्यक है";
    }

    if (!suggestionArea) {
      errs.suggestionArea = "Please select suggestion area / क्षेत्र चुनें";
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
      presentMethod: presentMethod || (presentMethodFiles[0]?.name ? `Attached: ${presentMethodFiles[0].name}` : ""),
      proposedMethod: proposedMethod || (proposedMethodFiles[0]?.name ? `Attached: ${proposedMethodFiles[0].name}` : ""),
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
        componentToolNo,
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
        attachments,
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
      setDraftSaved(true);
      toast.success("Draft saved / ड्राफ्ट सहेजा गया", {
        description: `${suggNo} — you can resume editing from My Suggestions`,
      });
    } catch {
      toast.error("Failed to save draft — please try again");
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

    // Submit workflow
    setIsSubmitting(true);
    try {
      const payload = buildPayload("In Evaluation");
      if (draftId && draftSuggestion) {
        updateSuggestion(draftId, payload);
      } else {
        await addSuggestion(payload);
      }

      addNotification({
        title: "Suggestion Submitted / सुझाव जमा हुआ",
        message: `${suggNo} (${subject}) routed to superior ${superiorDetails.name} and area planner ${plannerDetails?.name ?? "Assigned Planner"}`,
        type: "info",
        suggestionId: suggNo,
      });

      if (pendingIdRef.current) {
        unregisterPending(pendingIdRef.current);
        pendingIdRef.current = null;
      }
      clearExpiredPending();

      toast.success("Suggestion Submitted Successfully!", {
        description: `${suggNo} is now registered under ${activePlant} (${activeScheme}).`,
      });
      navigate(`${plantPrefix}/employee/my-suggestions`);
    } catch {
      toast.error("Failed to submit suggestion — please try again");
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
    <div className="max-w-3xl space-y-5 pb-12">
      {/* ── Page Header & Environment Badge ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <FilePlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              {draftSuggestion ? "Edit Draft Suggestion" : "New Suggestion Form"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Customized line items (5–22) active for {activePlant} · Scheme: {activeScheme}
            </p>
          </div>
        </div>

        {/* Plant & Scheme Chip with switch link */}
        <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5 shadow-sm">
          <div className="text-xs">
            <span className="text-muted-foreground text-[10px] block">Active Configuration</span>
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Building2 className="h-3 w-3 text-primary" />
              <span>{activePlant}</span>
              <span className="text-muted-foreground">·</span>
              <Layers className="h-3 w-3 text-indigo-500" />
              <span className="capitalize">{activeScheme}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] gap-1 px-2 text-primary hover:text-primary"
            onClick={() => navigate("/demo/setup")}
          >
            <Sliders className="h-3 w-3" /> Change
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          CARD 1: REFERENCE & SUBMISSION MODE (Items 5, 12, 6, 7)
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow border-primary/20">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
              <Hash className="h-3.5 w-3.5" /> Suggestion Reference & Subject / संदर्भ एवं विषय
            </p>
            <Badge variant="outline" className="text-[10px] font-mono">
              Points 5, 6, 7, 12
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ── Item 5: Sugg No. ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                5. Suggestion No. <span className="text-[10px] text-muted-foreground font-normal">/ सुझाव संख्या (Auto)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={suggNo}
                  className="font-mono text-sm bg-muted/60 text-muted-foreground cursor-default font-medium"
                />
                <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 shrink-0">
                  By default from app
                </Badge>
              </div>
            </div>

            {/* ── Item 12: Suggestion Date ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                12. Suggestion Date <span className="text-[10px] text-muted-foreground font-normal">/ सुझाव तिथि</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={today}
                  className="bg-muted/60 text-muted-foreground cursor-default text-sm"
                />
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  Current Date
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Item 6: Self or On behalf of others (BidP style) ── */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              6. Self or On Behalf of Others <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ स्वयं या दूसरों की ओर से</span>
            </Label>
            <RadioGroup
              value={suggestionFor}
              onValueChange={(val: "self" | "behalf") => setSuggestionFor(val)}
              className="flex items-center gap-6 pt-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="self" id="opt-self" />
                <Label htmlFor="opt-self" className="text-xs cursor-pointer font-medium">
                  Self <span className="text-muted-foreground font-normal">({user?.name ?? "Alex Morgan"})</span>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="behalf" id="opt-behalf" />
                <Label htmlFor="opt-behalf" className="text-xs cursor-pointer font-medium">
                  On Behalf of Others <span className="text-muted-foreground font-normal">/ अन्य कर्मचारी</span>
                </Label>
              </div>
            </RadioGroup>

            {/* On behalf employee picker */}
            {suggestionFor === "behalf" && (
              <div className="p-3 bg-muted/40 border border-indigo-200/60 rounded-lg space-y-2 mt-2 animate-fade-in">
                <Label className="text-xs font-medium text-indigo-900 dark:text-indigo-300">
                  Select Employee on whose behalf suggestion is submitted <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedOnBehalfEmpNo}
                    onValueChange={(empNo) => {
                      setSelectedOnBehalfEmpNo(empNo);
                      setErrors((e) => ({ ...e, mainSuggestor: undefined }));
                    }}
                  >
                    <SelectTrigger className="text-xs bg-background">
                      <SelectValue placeholder="Search or select employee..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {mockEmployees.map((emp) => (
                        <SelectItem key={emp.employeeNo} value={emp.employeeNo}>
                          {emp.name} ({emp.employeeNo}) — {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.mainSuggestor && (
                  <p className="text-xs text-destructive">{errors.mainSuggestor}</p>
                )}
                {selectedBehalfEmployee && (
                  <p className="text-[11px] text-muted-foreground">
                    Selected: <strong className="text-foreground">{selectedBehalfEmployee.name}</strong> ({selectedBehalfEmployee.employeeNo}) · Dept: {selectedBehalfEmployee.department}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* ── Item 7: Suggestion Subject (Text box, no AI) ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject" className="text-xs font-medium">
                7. Suggestion Subject <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ सुझाव का विषय</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">Standard text input</span>
            </div>
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
            {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          CARD 2: MACHINE, COMPONENT & AREA (Items 8, 9, 10, 11)
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5" /> Machine, Tool & Location Details / मशीन एवं स्थान
            </p>
            <Badge variant="outline" className="text-[10px] font-mono">
              Points 8, 9, 10, 11
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ── Item 8: Machine No. (JaP module style) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  8. Machine Reference <span className="text-[10px] text-muted-foreground font-normal">(Non-mandatory)</span>
                </Label>
                <Badge variant="secondary" className="text-[9px]">JaP Style</Badge>
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
                    className={`px-2.5 py-1 rounded text-xs border transition-colors ${
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

            {/* ── Item 9: Component / Tool No. (JaP style) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  9. Component / Tool No. <span className="text-[10px] text-muted-foreground font-normal">(Non-mandatory)</span>
                </Label>
                <Badge variant="secondary" className="text-[9px]">JaP Style</Badge>
              </div>
              <Input
                value={componentToolNo}
                onChange={(e) => setComponentToolNo(e.target.value)}
                placeholder="e.g. TL-4402 / DIE-B-09 / FIXTURE-03"
                className="text-xs h-9"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ── Item 10: Suggestion Area / Operation (Demo dropdown) ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  10. Suggestion Area / Operation <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">Drives Item 22</span>
              </div>
              <Select
                value={suggestionArea}
                onValueChange={(val) => {
                  setSuggestionArea(val);
                  setErrors((e) => ({ ...e, suggestionArea: undefined }));
                }}
              >
                <SelectTrigger className={`text-xs h-10 ${errors.suggestionArea ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Choose plant area / operation..." />
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

            {/* ── Item 11: Workshop / Dept. Name (Auto fetch) ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                11. Workshop / Dept. Name <span className="text-[10px] text-muted-foreground font-normal">/ कार्यशाला / विभाग</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={workshopDeptName}
                  className="bg-muted/60 text-muted-foreground cursor-default text-xs h-10 font-medium"
                />
                <Badge className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 shrink-0">
                  Auto-fetched
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          CARD 3: CATEGORY, THEME & IMPLEMENTATION DATE (Items 15, 16, 13)
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" /> Category & Theme Classification / श्रेणी एवं थीम
            </p>
            <Badge variant="outline" className="text-[10px] font-mono">
              Points 13, 15, 16
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ── Item 15: Suggestion Category ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                15. Suggestion Category <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ सुझाव श्रेणी</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs h-10">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      <span>{c.label}</span>
                      <span className="text-muted-foreground ml-1.5 text-[10px]">/ {c.labelHi}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Item 13: Idea Implementation Date ── */}
            {/* JaP: Only for kaizen; BidP & NaP: For all schemes */}
            {showImplementationDate ? (
              <div className="space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    13. Implementation Date{" "}
                    {isJaP && isKaizenScheme ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                    )}
                  </Label>
                  <Badge variant="outline" className="text-[9px]">
                    {isJaP ? "JaP Kaizen" : `${activePlant} Visible`}
                  </Badge>
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
            ) : (
              <div className="space-y-1.5 opacity-60">
                <Label className="text-xs font-medium text-muted-foreground">
                  13. Implementation Date
                </Label>
                <div className="p-2.5 rounded-lg border bg-muted/30 text-[11px] text-muted-foreground italic">
                  Hidden for JaP standard suggestions (active for Kaizen only).
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Item 16: Theme / Campaign-based Idea (Radio Yes/No) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                16. Theme / Campaign-based Idea{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ थीम अथवा अभियान आधारित</span>
              </Label>
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
              <div className="pl-4 pt-1 space-y-1.5 border-l-2 border-primary/30 animate-fade-in">
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
                        {t.label} <span className="text-muted-foreground text-[10px]">/ {t.labelHi}</span>
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
          CARD 4: METHODS & BENEFITS (Items 17, 18, 19)
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5" /> Improvement Methods & Benefits / सुधार विधि एवं लाभ
            </p>
            <div className="flex items-center gap-2">
              {isNaP && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                  NaP Dual Mode: Write / Upload
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] font-mono">
                Points 17, 18, 19
              </Badge>
            </div>
          </div>

          {/* Voice Engine Toolbar */}
          {inputMethodSettings.voiceEnabled && (
            <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-xs">
              <div className="flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground text-[11px]">
                  Voice Dictation: tap mic on fields to speak in Hindi/English
                </span>
              </div>
              {voiceEngine.isListening && (
                <Badge className="bg-rose-500 text-white text-[9px] animate-pulse">
                  Listening...
                </Badge>
              )}
            </div>
          )}

          {/* ── Item 17: Present Method ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                17. Present Method <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ वर्तमान विधि — अभी कार्य कैसे हो रहा है?</span>
              </Label>

              {/* NaP Mode Toggle */}
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
                    Upload Document / File
                  </button>
                </div>
              )}
            </div>

            {/* If write mode (or JaP/BidP) */}
            {(!isNaP || presentInputMode === "write") && (
              <div className="relative">
                <Textarea
                  rows={3}
                  value={presentMethod}
                  onChange={(e) => {
                    setPresentMethod(e.target.value);
                    setErrors((err) => ({ ...err, presentMethod: undefined }));
                  }}
                  placeholder="Describe the current baseline method, difficulties, or observed bottlenecks..."
                  className={`text-xs ${errors.presentMethod ? "border-destructive" : ""}`}
                />
                {inputMethodSettings.voiceEnabled && (
                  <button
                    type="button"
                    onClick={() => startVoiceForField("presentMethod")}
                    className="absolute right-2.5 bottom-2.5 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted"
                    title="Speak Present Method"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* If upload mode (NaP) */}
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

          <Separator />

          {/* ── Item 18: Proposed Method ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                18. Proposed Method <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ प्रस्तावित विधि — क्या बदलाव करना चाहते हैं?</span>
              </Label>

              {/* NaP Mode Toggle */}
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
                    Upload Document / File
                  </button>
                </div>
              )}
            </div>

            {/* If write mode (or JaP/BidP) */}
            {(!isNaP || proposedInputMode === "write") && (
              <div className="relative">
                <Textarea
                  rows={3}
                  value={proposedMethod}
                  onChange={(e) => {
                    setProposedMethod(e.target.value);
                    setErrors((err) => ({ ...err, proposedMethod: undefined }));
                  }}
                  placeholder="Describe your suggested modification, fixture improvement, or new process..."
                  className={`text-xs ${errors.proposedMethod ? "border-destructive" : ""}`}
                />
                {inputMethodSettings.voiceEnabled && (
                  <button
                    type="button"
                    onClick={() => startVoiceForField("proposedMethod")}
                    className="absolute right-2.5 bottom-2.5 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted"
                    title="Speak Proposed Method"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* If upload mode (NaP) */}
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

          <Separator />

          {/* ── Item 19: Advantages / Benefits (Text field) ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="benefits" className="text-xs font-medium">
                19. Advantages / Benefits <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ अपेक्षित लाभ (सुरक्षा, गुणवत्ता, समय या लागत)</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">Input in text field</span>
            </div>
            <div className="relative">
              <Textarea
                id="benefits"
                rows={3}
                value={benefits}
                onChange={(e) => {
                  setBenefits(e.target.value);
                  setErrors((err) => ({ ...err, benefits: undefined }));
                }}
                placeholder="Specify anticipated savings in time, cost, safety improvements, or scrap reduction..."
                className={`text-xs ${errors.benefits ? "border-destructive" : ""}`}
              />
              {inputMethodSettings.voiceEnabled && (
                <button
                  type="button"
                  onClick={() => startVoiceForField("benefits")}
                  className="absolute right-2.5 bottom-2.5 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted"
                  title="Speak Benefits"
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {errors.benefits && <p className="text-xs text-destructive">{errors.benefits}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          CARD 5: STAKEHOLDERS (Items 20, 21, 22)
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Stakeholders & Approval Routing / हितधारक एवं अनुमोदन
            </p>
            <Badge variant="outline" className="text-[10px] font-mono">
              Points 20, 21, 22
            </Badge>
          </div>

          {/* ── Item 20: Suggestor Details (Auto fetched) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                20. Suggestor Details <span className="text-[10px] text-muted-foreground font-normal">(Auto-fetched from login / selection)</span>
              </Label>
              <Badge className="text-[9px] bg-emerald-100 text-emerald-800 border-emerald-300">
                Verified
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              <ReadonlyField
                icon={User}
                label="Suggestor Name"
                labelHi="सुझावकर्ता"
                value={suggestorName}
              />
              <ReadonlyField
                icon={Hash}
                label="Employee No."
                labelHi="कर्मचारी संख्या"
                value={suggestorEmpNo}
              />
              <ReadonlyField
                icon={Building2}
                label="Department"
                labelHi="विभाग"
                value={workshopDeptName}
              />
              <ReadonlyField
                icon={Tag}
                label="Emp. Category"
                labelHi="श्रेणी"
                value={suggestorCategory}
              />
              {isJaP && (
                <ReadonlyField
                  icon={Sparkles}
                  label="Mobile No."
                  labelHi="मोबाइल"
                  value={suggestorMobile}
                  badge="JaP Specific"
                />
              )}
            </div>
          </div>

          <Separator />

          {/* ── Item 21: Superior Details (Auto populated) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-indigo-500" />
                21. Superior Details <span className="text-[10px] text-muted-foreground font-normal">(Auto-populated for first-level review)</span>
              </Label>
              <Badge variant="outline" className="text-[10px]">
                Auto Mapped
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <ReadonlyField
                icon={User}
                label="Superior Name"
                labelHi="वरिष्ठ अधिकारी"
                value={superiorDetails.name}
              />
              <ReadonlyField
                icon={Hash}
                label="Superior E.No."
                labelHi="कर्मचारी संख्या"
                value={superiorDetails.empNo}
              />
              <ReadonlyField
                icon={Building2}
                label="Superior Dept."
                labelHi="विभाग"
                value={`${superiorDetails.department} (${superiorDetails.designation})`}
              />
            </div>
          </div>

          <Separator />

          {/* ── Item 22: Area Specific Planner Details (Auto mapped from Item 10) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-blue-500" />
                22. Area Specific Planner Details <span className="text-[10px] text-muted-foreground font-normal">(Auto-mapped based on Area #10)</span>
              </Label>
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                Area Driven
              </Badge>
            </div>

            {plannerDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fade-in">
                <ReadonlyField
                  icon={User}
                  label="Planner Name"
                  labelHi="योजनाकार"
                  value={plannerDetails.name}
                />
                <ReadonlyField
                  icon={Hash}
                  label="Planner E.No."
                  labelHi="कर्मचारी संख्या"
                  value={plannerDetails.empNo}
                />
                <ReadonlyField
                  icon={Building2}
                  label="Planner Dept & Role"
                  labelHi="विभाग"
                  value={`${plannerDetails.department} · ${plannerDetails.designation}`}
                />
              </div>
            ) : (
              <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground border italic">
                Select a Suggestion Area (Item 10) to automatically map the Area Planner.
              </div>
            )}
          </div>

          <Separator />

          {/* Optional Group / Team Co-suggestors */}
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
                Include Group Co-Suggestors / समूह सह-सुझावकर्ता जोड़ें
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
                      <SelectValue placeholder="Add co-suggestor from employee list..." />
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
                          <span>{emp?.name ?? id} ({id})</span>
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
          ACTION BUTTONS
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
          Save as Draft / ड्राफ्ट सहेजें
        </Button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
            className="w-1/2 sm:w-auto text-xs gap-1.5 shadow-md hover:shadow-lg font-medium"
          >
            {isScanning ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Scanning Duplicates...
              </>
            ) : isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Submit Suggestion / सुझाव जमा करें
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
