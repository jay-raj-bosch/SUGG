// Demo Application — New Suggestion (Employee)
// Clean, enterprise-grade suggestion submission form with active plant/scheme context
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { usePlant } from "@/contexts/PlantContext";
import { useVoiceEngine, VOICE_LANGUAGES } from "@/hooks/useVoiceEngine";
import VoiceHighlight from "@/components/VoiceHighlight";
import { toast } from "sonner";
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
  RotateCcw,
  Phone,
  Pencil,
  Search,
} from "lucide-react";
import { teamMemberOptions } from "@/lib/jap/suggestionConstants";
import { getInputMethodSettings } from "@/lib/jap/inputMethodStore";
import { getDemoSelection, type DemoPlantKey } from "@/lib/demoConfig";
import { mockEmployees, type MockEmployee } from "@/lib/mockData";

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

// Area Planning Engineers (Feasibility Reviewers) — Dropdown selectable directory
interface PlanningEngineer {
  empNo: string;
  name: string;
  department: string;
  designation: string;
}

const DEMO_PLANNING_ENGINEERS: PlanningEngineer[] = [
  {
    empNo: "PLN-101",
    name: "Rajesh Kumar",
    department: "Assembly Operations",
    designation: "Area Planning Engineer - Final Line",
  },
  {
    empNo: "PLN-102",
    name: "Sunil Verma",
    department: "Assembly Operations",
    designation: "Area Planning Engineer - Chassis Assembly",
  },
  {
    empNo: "PLN-103",
    name: "Anil Sharma",
    department: "Press & Stamping",
    designation: "Area Planning Engineer - Press Shop",
  },
  {
    empNo: "PLN-104",
    name: "Vikram Patel",
    department: "Machining Division",
    designation: "Area Planning Engineer - CNC Machining",
  },
  {
    empNo: "PLN-105",
    name: "Priya Nair",
    department: "Paint & Surface Finishing",
    designation: "Area Planning Engineer - Paint Shop",
  },
  {
    empNo: "PLN-106",
    name: "Deepak Joshi",
    department: "Welding & Body Shop",
    designation: "Area Planning Engineer - Welding Bay",
  },
  {
    empNo: "PLN-107",
    name: "Kavita Rao",
    department: "Packaging & Logistics",
    designation: "Area Planning Engineer - Dispatch & Packing",
  },
  {
    empNo: "PLN-108",
    name: "Meera Iyer",
    department: "Quality Assurance",
    designation: "Area Planning Engineer - QA & Metrology",
  },
  {
    empNo: "PLN-109",
    name: "Harish Gowda",
    department: "Plant Maintenance",
    designation: "Area Planning Engineer - Tool Room",
  },
  {
    empNo: "EMP-10251",
    name: "Anita Sharma",
    department: "Planning",
    designation: "Senior Planning Engineer",
  },
];

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

type MachineRefType = "name" | "number" | "na";
type ComponentRefType = "name" | "number" | "na";
type VoiceFieldKey = "subject" | "presentMethod" | "proposedMethod" | "benefits";

const VOICE_FIELD_LABELS: Record<VoiceFieldKey, string> = {
  subject: "Suggestion Subject / सुझाव विषय",
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
  planner?: string;
}

interface FileUploadItem {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

// Highlight matched search substring inside employee suggestions
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <span>
      {before}
      <span className="font-bold text-primary underline decoration-primary/50 underline-offset-2">
        {match}
      </span>
      {after}
    </span>
  );
}

// Searchable Employee Select Component with Real-Time Suggestions
interface EmployeeSearchSelectProps {
  placeholder?: string;
  selectedEmployee?: MockEmployee | null;
  onSelect: (employee: MockEmployee) => void;
  onClear?: () => void;
  excludeEmpNos?: string[];
  clearOnSelect?: boolean;
}

const EmployeeSearchSelect = ({
  placeholder = "Type name or Employee No (e.g. Suresh, Ganesh, EMP-10201)...",
  selectedEmployee,
  onSelect,
  onClear,
  excludeEmpNos = [],
  clearOnSelect = false,
}: EmployeeSearchSelectProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const available = mockEmployees.filter(
      (emp) => !excludeEmpNos.includes(emp.employeeNo)
    );
    if (!q) {
      return available.slice(0, 8); // Display first 8 directory suggestions on focus
    }
    return available.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.employeeNo.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        (emp.category && emp.category.toLowerCase().includes(q))
    );
  }, [searchTerm, excludeEmpNos]);

  // If single employee is selected and not in editing/multi-select mode, show selected card
  if (selectedEmployee && !clearOnSelect && !isEditing) {
    return (
      <div className="flex items-center justify-between p-2.5 bg-background border border-primary/40 rounded-lg text-xs shadow-xs animate-fade-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
            {selectedEmployee.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground text-xs">
                {selectedEmployee.name}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                {selectedEmployee.employeeNo}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {selectedEmployee.department}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
              {selectedEmployee.category || "Management & Staff"} • {selectedEmployee.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(true);
              setIsOpen(true);
              setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
              }, 40);
            }}
            className="h-7 text-[11px] px-2 gap-1 text-primary hover:text-primary"
          >
            <Pencil className="h-3 w-3" />
            Change
          </Button>
          {onClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="h-9 text-xs pl-8 pr-8 bg-background border-border"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Live Suggestions Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 bg-muted/50 border-b flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>
              {searchTerm.trim()
                ? `Suggestions matching "${searchTerm}" (${filteredEmployees.length} found):`
                : `Employee Directory Suggestions (${filteredEmployees.length}):`}
            </span>
            <span className="text-[10px] opacity-75">Click suggestion to select</span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <button
                  key={emp.employeeNo}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(emp);
                    if (clearOnSelect) {
                      setSearchTerm("");
                    } else {
                      setIsEditing(false);
                    }
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-2 hover:bg-muted/80 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground">
                          {highlightMatch(emp.name, searchTerm)}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono py-0 px-1">
                          {highlightMatch(emp.employeeNo, searchTerm)}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {highlightMatch(emp.department, searchTerm)} • {emp.category || "M&SS"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0 opacity-80 group-hover:opacity-100 group-hover:bg-primary group-hover:text-primary-foreground">
                    {clearOnSelect ? "+ Add" : "Select"}
                  </Badge>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <p className="font-medium text-foreground">No matching employees</p>
                <p className="text-[11px] mt-0.5">
                  No directory member matches &ldquo;{searchTerm}&rdquo;. Try another name, employee number, or department.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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

  // Contact Phone pre-fill logic
  const defaultPhone = useMemo(() => {
    if (suggestionFor === "behalf" && selectedBehalfEmployee) {
      return (selectedBehalfEmployee as any).mobile ?? (selectedBehalfEmployee as any).phone ?? "+91 98765 43210";
    }
    return (user as any)?.mobile ?? (user as any)?.phone ?? "+91 98765 43210";
  }, [suggestionFor, selectedBehalfEmployee, user]);

  const [contactNumber, setContactNumber] = useState<string>(
    () =>
      (draftSuggestion?.formData as any)?.contactNumber ??
      (draftSuggestion?.formData as any)?.suggestorMobile ??
      defaultPhone
  );
  const [isEditingContact, setIsEditingContact] = useState(false);
  const contactInputRef = useRef<HTMLInputElement>(null);

  // Auto-sync contact number when switching suggestor on non-draft form
  useEffect(() => {
    if (!draftSuggestion) {
      setContactNumber(defaultPhone);
    }
  }, [defaultPhone, draftSuggestion]);

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

  // Auto-routed Superior Details
  const superiorDetails = useMemo(() => {
    return DEPT_SUPERIOR_MAP[suggestorDept] || DEPT_SUPERIOR_MAP.default;
  }, [suggestorDept]);

  // Area Planning Engineer (Feasibility Reviewer) — Dropdown selectable (not area derived)
  const [selectedPlannerEmpNo, setSelectedPlannerEmpNo] = useState<string>(
    () =>
      (draftSuggestion?.formData as any)?.plannerEmpNo ??
      (draftSuggestion?.formData as any)?.plannerDetails?.empNo ??
      ""
  );

  const plannerDetails = useMemo(() => {
    if (!selectedPlannerEmpNo) return null;
    return (
      DEMO_PLANNING_ENGINEERS.find((p) => p.empNo === selectedPlannerEmpNo) || null
    );
  }, [selectedPlannerEmpNo]);

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

  // Reset Dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);

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

  const handleResetForm = () => {
    setSubject("");
    setPresentMethod("");
    setProposedMethod("");
    setBenefits("");
    setSuggestionArea("");
    setMachineRefType("na");
    setMachineRefValue("");
    setComponentRefType("na");
    setComponentRefValue("");
    setPresentMethodFiles([]);
    setProposedMethodFiles([]);
    setThemeBased("no");
    setThemeName("");
    setImplementationDate("");
    setIsGroupSuggestion(false);
    setCoSuggestors([]);
    setContactNumber(defaultPhone);
    setIsEditingContact(false);
    setSelectedPlannerEmpNo("");
    setErrors({});
    setShowResetDialog(false);
    toast.info("Form has been reset to clean defaults");
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

    if (!selectedPlannerEmpNo) {
      errs.planner = "Please select an Area Planning Engineer (Feasibility Reviewer)";
    }

    setErrors(errs);
    const errKeys = Object.keys(errs);
    if (errKeys.length > 0) {
      const firstKey = errKeys[0];
      setTimeout(() => {
        const el = document.getElementById(firstKey) || document.querySelector(`[name="${firstKey}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLElement).focus?.();
        } else if (firstKey === "subject" || firstKey === "presentMethod" || firstKey === "proposedMethod" || firstKey === "benefits") {
          document.getElementById("section-improvements")?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (firstKey === "suggestionArea") {
          document.getElementById("section-location")?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (firstKey === "mainSuggestor") {
          document.getElementById("section-suggestor")?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (firstKey === "planner") {
          document.getElementById("section-reviewers")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
      return false;
    }

    return true;
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
        suggestorMobile: contactNumber,
        contactNumber,
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
        plannerEmpNo: selectedPlannerEmpNo,
        isGroupSuggestion,
        coSuggestors: coSuggestors.map((id) => ({
          empNo: id,
          name:
            mockEmployees.find((e) => e.employeeNo === id)?.name ??
            teamMemberOptions.find((o) => o.value === id)?.label ??
            id,
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
    if (isSubmitting) return;
    if (!validate()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload("Pending Feasibility Review");
      if (draftId && draftSuggestion) {
        await updateSuggestion(draftId, payload);
      } else {
        await addSuggestion(payload);
      }

      addNotification({
        title: "Suggestion Submitted",
        message: `${suggNo} routed to ${superiorDetails.name} and ${plannerDetails?.name ?? "Assigned Area Planner"}`,
        type: "info",
        suggestionId: suggNo,
      });

      toast.success("Suggestion Submitted Successfully", {
        description: `${suggNo} is now registered under ${activePlant} (${activeScheme.toUpperCase()}).`,
      });
      navigate(`${plantPrefix}/employee/my-suggestions`);
    } catch {
      toast.error("Failed to submit suggestion");
    } finally {
      setIsSubmitting(false);
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

      {/* Voice Assistant Live Banner when active */}
      {voiceEngine.isListening && (
        <div className="sticky top-2 z-30 flex items-center justify-between gap-3 p-3 bg-red-600 text-white rounded-lg shadow-lg border border-red-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs font-medium min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="truncate">
              Dictating into <strong>{listeningField ? VOICE_FIELD_LABELS[listeningField] : "Field"}</strong> in {currentLangOption.nativeName} ({currentLangOption.label})
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs bg-white text-red-700 hover:bg-white/90 shrink-0 font-medium"
            onClick={() => voiceEngine.stopListening()}
          >
            <MicOff className="h-3 w-3 mr-1" /> Stop Voice
          </Button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 1: SUGGESTOR DETAILS & SUBMISSION OWNERSHIP
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card id="section-suggestor" className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" />
                Suggestor Details
              </h2>
              <p className="text-xs text-muted-foreground">
                Employee profile, department affiliation, and submission ownership
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Date: {today}</span>
            </div>
          </div>

          {/* 1. Suggestor Profile Details (Name, Department, Category, Contact Number) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <ReadonlyField icon={User} label="Suggestor Name" value={`${suggestorName} (${suggestorEmpNo})`} />
            <ReadonlyField icon={Building2} label="Department" value={workshopDeptName} />
            <ReadonlyField icon={Tag} label="Category" value={suggestorCategory} />

            {/* Contact Number: Pre-filled editable textbox with edit option and tick symbol on Done */}
            <div
              className={`flex items-center gap-2 py-1.5 px-2.5 sm:px-3 rounded-lg border text-xs transition-colors min-w-0 ${
                isEditingContact
                  ? "bg-background border-primary shadow-xs ring-1 ring-primary/30"
                  : "bg-muted/40 border-border hover:bg-muted/60"
              }`}
            >
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="contactNumber"
                  className="text-[10px] text-muted-foreground block leading-tight cursor-pointer"
                >
                  Contact Number
                </label>
                <Input
                  id="contactNumber"
                  ref={contactInputRef}
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => {
                    setContactNumber(e.target.value);
                    if (!isEditingContact) setIsEditingContact(true);
                  }}
                  onFocus={() => setIsEditingContact(true)}
                  placeholder="+91 98765 43210"
                  className="h-6 w-full text-xs font-medium px-0 py-0 border-0 bg-transparent shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground tracking-tight"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingContact((prev) => {
                    const next = !prev;
                    if (next) {
                      setTimeout(() => {
                        contactInputRef.current?.focus();
                        contactInputRef.current?.select();
                      }, 40);
                    }
                    return next;
                  });
                }}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors shrink-0 ${
                  isEditingContact
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                    : "text-primary hover:text-primary/80 hover:bg-primary/10"
                }`}
                title={isEditingContact ? "Save contact number" : "Edit contact number"}
              >
                {isEditingContact ? (
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Pencil className="h-2.5 w-2.5" />
                )}
                <span>{isEditingContact ? "Done" : "Edit"}</span>
              </button>
            </div>
          </div>

          <Separator />

          {/* 2. Submission Mode: Self vs On Behalf (Below Name, Department, Category) */}
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
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Search & Select Employee <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Type name or Emp No</span>
                </div>
                <EmployeeSearchSelect
                  placeholder="Type employee name, ID (e.g. Suresh, Ganesh, 10201)..."
                  selectedEmployee={selectedBehalfEmployee}
                  onSelect={(emp) => {
                    setSelectedOnBehalfEmpNo(emp.employeeNo);
                    setErrors((e) => ({ ...e, mainSuggestor: undefined }));
                  }}
                  onClear={() => {
                    setSelectedOnBehalfEmpNo("");
                  }}
                  excludeEmpNos={[user?.employeeNo ?? ""]}
                />
                {errors.mainSuggestor && (
                  <p className="text-xs text-destructive">{errors.mainSuggestor}</p>
                )}
                {selectedBehalfEmployee && (
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    Submitting on behalf of: <strong className="text-foreground">{selectedBehalfEmployee.name}</strong> ({selectedBehalfEmployee.employeeNo}) · {selectedBehalfEmployee.department}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* 3. Add Team Co-Suggestors (Group Submission) — Below Submission Mode */}
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
              <div className="p-3 bg-muted/30 border rounded-lg space-y-3 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-medium">
                      Search & Add Team Co-Suggestor
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Type name to search directory</span>
                  </div>
                  <EmployeeSearchSelect
                    placeholder="Type colleague name or Emp No to add..."
                    onSelect={(emp) => {
                      if (!coSuggestors.includes(emp.employeeNo)) {
                        setCoSuggestors((prev) => [...prev, emp.employeeNo]);
                      }
                    }}
                    excludeEmpNos={[suggestorEmpNo, ...coSuggestors]}
                    clearOnSelect={true}
                  />
                </div>

                {coSuggestors.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Assigned Team Co-Suggestors ({coSuggestors.length}):</span>
                      <button
                        type="button"
                        onClick={() => setCoSuggestors([])}
                        className="text-[10px] text-destructive hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {coSuggestors.map((id) => {
                        const emp = mockEmployees.find((e) => e.employeeNo === id);
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="text-[11px] gap-1.5 py-1 px-2.5 bg-primary/10 border border-primary/20 text-foreground"
                          >
                            <UserPlus className="h-3 w-3 text-primary" />
                            <span>
                              {emp?.name ?? id} <span className="text-muted-foreground">({id})</span>
                              {emp?.department ? ` · ${emp.department}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCoSuggestors((cs) => cs.filter((c) => c !== id))}
                              className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove co-suggestor"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 2: CLASSIFICATION & CAMPAIGN
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card id="section-classification" className="card-shadow">
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
          SECTION 3: METHODS & BENEFITS (JaP Improvement Details + Voice)
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card id="section-improvements" className="card-shadow">
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

          {/* Suggestion Subject */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject" className="text-xs font-medium">
                Suggestion Subject <span className="text-destructive">*</span>{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  / सुझाव विषय — संक्षिप्त विवरण
                </span>
              </Label>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Concise headline describing the improvement
              </span>
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
                placeholder="e.g. Automated optical sensor for conveyor belt indexing..."
                className={`text-xs h-10 ${errors.subject ? "border-destructive" : ""}`}
              />
            </VoiceHighlight>
            {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
          </div>

          <Separator />

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
          SECTION 4: OPERATIONAL LOCATION & EQUIPMENT
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card id="section-location" className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-semibold text-foreground">Operational Location & Equipment</h2>
            <p className="text-xs text-muted-foreground">
              Station, machine, and component / tool reference
            </p>
          </div>

          {/* Suggestion Area / Operation */}
          <div className="space-y-1.5 max-w-xl">
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
          SECTION 5: REVIEWERS & APPROVAL ROUTING
          ══════════════════════════════════════════════════════════════════════════ */}
      <Card id="section-reviewers" className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-sm font-semibold text-foreground">Reviewers & Approval Routing</h2>
            <p className="text-xs text-muted-foreground">
              Automated routing matrix for feasibility evaluation and approvals
            </p>
          </div>

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

          {/* Area Planning Engineer (Feasibility Reviewer) — Dropdown Selectable */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="plannerSelect" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-blue-500" />
                Area Planning Engineer (Feasibility Reviewer) <span className="text-destructive">*</span>
              </Label>
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                Dropdown Selectable
              </Badge>
            </div>

            <Select
              value={selectedPlannerEmpNo}
              onValueChange={(val) => {
                setSelectedPlannerEmpNo(val);
                setErrors((err) => ({ ...err, planner: undefined }));
              }}
            >
              <SelectTrigger
                id="plannerSelect"
                className={`text-xs h-10 bg-background ${errors.planner ? "border-destructive ring-1 ring-destructive" : ""}`}
              >
                <SelectValue placeholder="Select Area Planning Engineer from directory..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {DEMO_PLANNING_ENGINEERS.map((engineer) => (
                  <SelectItem key={engineer.empNo} value={engineer.empNo} className="text-xs py-2">
                    <div className="flex flex-col text-left">
                      <span className="font-medium text-foreground">
                        {engineer.name} ({engineer.empNo})
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {engineer.department} • {engineer.designation}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.planner && (
              <p className="text-xs text-destructive">{errors.planner}</p>
            )}

            {plannerDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-fade-in">
                <ReadonlyField icon={User} label="Planner Name" value={`${plannerDetails.name} (${plannerDetails.empNo})`} />
                <ReadonlyField icon={Building2} label="Department" value={plannerDetails.department} />
                <ReadonlyField icon={Tag} label="Role" value={plannerDetails.designation} />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic px-0.5">
                Please select the designated Area Planning Engineer responsible for conducting technical feasibility review.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════════
          ACTION BAR
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="w-1/2 sm:w-auto text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            Save as Draft
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowResetDialog(true)}
            disabled={isSubmitting}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`${plantPrefix}/employee/my-suggestions`)}
            disabled={isSubmitting}
            className="w-1/2 sm:w-auto text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-1/2 sm:w-auto text-xs gap-1.5 shadow-sm font-medium"
          >
            {isSubmitting ? (
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

      {/* Reset Form Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              Reset Suggestion Form?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to reset this form? All entered text for subject, methods, and
              benefits will be cleared. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(false)}
              className="text-xs"
            >
              Continue Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleResetForm}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All Fields
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DemoNewSuggestion;
