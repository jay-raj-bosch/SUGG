// JaP — New Suggestion (Employee)
// Plant-specific suggestion form for Jaipur Plant employees.
// Independent of the BidP suggestion workflow.
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
import * as apiService from "@/lib/apiService";
import type { AuthorityAssignment } from "@/lib/apiService";
import { useVoiceEngine, VOICE_LANGUAGES } from "@/hooks/useVoiceEngine";
import VoiceHighlight from "@/components/VoiceHighlight";
import { toast } from "sonner";
import DuplicateAlertDialog from "@/components/bidp/DuplicateAlertDialog";
import { detectDuplicatesFull, type DuplicateMatch, type PendingMatch } from "@/lib/bidp/duplicateDetector";
import { registerPending, unregisterPending, getActivePending, createPendingId, clearExpiredPending } from "@/lib/bidp/pendingSubmissionsStore";
import {
  FilePlus, User, Building2, Wrench, Lightbulb, CheckCircle2,
  Hash, Tag, Users, RefreshCw, Mic, MicOff, Languages, X, Search, UserPlus, Save,
  Paperclip, ImageIcon, FileText as FileTextIcon, Trash2,
} from "lucide-react";
import { teamMemberOptions } from "@/lib/jap/suggestionConstants";
import { getInputMethodSettings } from "@/lib/jap/inputMethodStore";

// -- Theme masters — demo data (will be managed via admin later) ——————————————
const JAP_THEMES = [
  { value: "safety",           label: "Safety Improvement",           labelHi: "सुरक्षा सुधार" },
  { value: "quality",          label: "Quality Enhancement",          labelHi: "गुणवत्ता सुधार" },
  { value: "cost",             label: "Cost Reduction",               labelHi: "लागत कटौती" },
  { value: "productivity",     label: "Productivity Improvement",     labelHi: "उत्पादकता सुधार" },
  { value: "energy",           label: "Energy Conservation",          labelHi: "ऊर्जा संरक्षण" },
  { value: "5s",               label: "5S & Workplace Organization",  labelHi: "5S एवं कार्यस्थल व्यवस्था" },
  { value: "environment",      label: "Environment & Sustainability", labelHi: "पर्यावरण एवं स्थिरता" },
  { value: "delivery",         label: "Delivery & Logistics",         labelHi: "डिलीवरी एवं लॉजिस्टिक्स" },
  { value: "customer",         label: "Customer Satisfaction",        labelHi: "ग्राहक संतुष्टि" },
  { value: "innovation",       label: "Innovation & Technology",      labelHi: "नवाचार एवं प्रौद्योगिकी" },
  { value: "skill",            label: "Skill Development",            labelHi: "कौशल विकास" },
  { value: "kaizen",           label: "Kaizen",                       labelHi: "कैज़न" },
  { value: "standardization",  label: "Standardization",              labelHi: "मानकीकरण" },
  { value: "power_saving",     label: "Power Saving",                 labelHi: "बिजली बचत" },
  { value: "motion_waste",     label: "Motion Waste",                 labelHi: "गति अपव्यय" },
  { value: "time_saving",      label: "Time Saving",                  labelHi: "समय बचत" },
];

const JAP_AREAS = [
  "Ve Assembly",
  "QMM 8 Lab",
  "Component Audit",
  "Barrier Audit",
  "Std Room",
  "HT Shop",
  "Calibration",
  "Post Calibration",
  "Subassembly",
  "Plunger Hardstage",
  "Plunger Soft Stage",
  "Commissioning",
  "TEF Mechanical",
  "PI Lab",
  "NHA Assembly",
  "NHA Hardstage",
  "Roller Ring",
  "Drive Shaft",
  "Z-Stage",
  "Y-Stage",
  "Camplate",
  "Tool Room",
  "Feedpump",
  "Valv Spool Area",
];

// Voice field keys
const VOICE_FIELDS = ["presentMethod", "proposedMethod", "benefits"] as const;
type VoiceFieldKey = (typeof VOICE_FIELDS)[number];

const VOICE_FIELD_LABELS: Record<VoiceFieldKey, string> = {
  presentMethod:  "Present Method",
  proposedMethod: "Proposed Method",
  benefits:       "Expected Benefits",
};

type MachineRefType = "name" | "number" | "na";

function generateSuggNo(): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(100 + Math.random() * 900));
  return `JAP-${year}-${rand}`;
}

interface FormErrors {
  presentMethod?: string;
  proposedMethod?: string;
  benefits?: string;
  machineRef?: string;
  themeName?: string;
}

// -- Read-only labelled field helper —————————————————————————————————————————
const ReadonlyField = ({
  icon: Icon, label, labelHi, value,
}: {
  icon: React.ElementType; label: string; labelHi: string; value: string;
}) => (
  <div className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0">
    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-muted-foreground">
        {label} <span className="opacity-60">/ {labelHi}</span>
      </p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  </div>
);

const JaPNewSuggestion = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { suggestions, addSuggestion, updateSuggestion, getSuggestionsSnapshot } = useSuggestions();
  const { plantPrefix } = usePlant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // BPS input method control
  const inputMethodSettings = getInputMethodSettings();

  // If we have ?draft=<id>, load that draft for editing
  const draftId = searchParams.get("draft");
  const draftSuggestion = draftId
    ? suggestions.find(s => s.id === draftId && s.status === "Draft")
    : null;

  const [suggNo] = useState(() => draftSuggestion?.suggestionNo ?? generateSuggNo());

  // -- Core form fields (pre-fill from draft data if editing) ————————————————
  const [presentMethod,  setPresentMethod]  = useState(draftSuggestion?.presentMethod ?? "");
  const [proposedMethod, setProposedMethod] = useState(draftSuggestion?.proposedMethod ?? "");
  const [benefits,       setBenefits]       = useState(draftSuggestion?.benefits ?? "");

  // Machine reference
  const [machineRefType,  setMachineRefType]  = useState<MachineRefType>(
    (draftSuggestion?.formData as any)?.machineRefType ?? "na",
  );
  const [machineRefValue, setMachineRefValue] = useState(
    (draftSuggestion?.formData as any)?.machineRefType === "na"
      ? ""
      : ((draftSuggestion?.formData as any)?.machineRef ?? "").replace(/^(Name|No\.): /, ""),
  );

  // Theme
  const [themeBased, setThemeBased] = useState(
    !!(draftSuggestion?.formData as any)?.themeBased,
  );
  const [themeName, setThemeName] = useState(() => {
    const tn = (draftSuggestion?.formData as any)?.themeName;
    if (!tn) return "";
    return JAP_THEMES.find(t => t.label === tn)?.value ?? "";
  });

  // Suggestion area
  const [suggestionArea, setSuggestionArea] = useState(
    (draftSuggestion?.formData as any)?.suggestionArea ?? "",
  );

  // Co-suggestors
  const [isGroupSuggestion, setIsGroupSuggestion] = useState(
    !!(draftSuggestion?.formData as any)?.isGroupSuggestion,
  );
  const [coSuggestors, setCoSuggestors] = useState<string[]>(
    ((draftSuggestion?.formData as any)?.coSuggestors ?? []).map((c: any) => c.empNo ?? c),
  );
  const [coSuggestorSearch, setCoSuggestorSearch] = useState("");

  // Attachments (photos/documents)
  interface Attachment { name: string; type: string; size: number; dataUrl: string }
  const [attachments, setAttachments] = useState<Attachment[]>(() => {
    return (draftSuggestion?.formData as any)?.attachments ?? [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5 MB limit`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  // -- Authority data ————————————————————————————————————————————————————————
  const [authorities, setAuthorities] = useState<AuthorityAssignment[]>([]);
  useEffect(() => {
    apiService.fetchAuthority("jap").then(setAuthorities).catch(() => {});
  }, []);
  const planners  = authorities.filter(a => a.role === "FLM");
  const superiors = authorities.filter(a => a.role === "BPS" || a.role === "Admin");

  // -- Voice engine ——————————————————————————————————————————————————————————
  const [voiceEnabled,   setVoiceEnabled]   = useState(false);
  const [voiceLang,      setVoiceLang]      = useState("en-IN");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [listeningField, setListeningField] = useState<string | null>(null);
  const listeningFieldRef = useRef<string | null>(null);
  const langPickerRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node))
        setShowLangPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLangOption = VOICE_LANGUAGES.find(l => l.code === voiceLang) ?? VOICE_LANGUAGES[0];
  const isNonEnglish = !voiceLang.startsWith("en");

  const fieldSetters: Record<VoiceFieldKey, React.Dispatch<React.SetStateAction<string>>> = {
    presentMethod:  setPresentMethod,
    proposedMethod: setProposedMethod,
    benefits:       setBenefits,
  };

  const handleVoiceResult = useCallback((text: string) => {
    const key = listeningFieldRef.current as VoiceFieldKey | null;
    if (!key || !(key in fieldSetters)) return;
    fieldSetters[key](prev => prev ? `${prev} ${text}` : text);
    setErrors(err => ({ ...err, [key]: undefined }));
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

  const voiceEngine = useVoiceEngine(handleVoiceResult, { voiceLang, autoTranslate: true }, handleListeningStopped);

  const startVoiceForField = (key: string) => {
    if (!voiceEnabled) return;
    if (voiceEngine.isListening) {
      voiceEngine.stopListening();
      if (listeningFieldRef.current === key) {
        setListeningField(null);
        listeningFieldRef.current = null;
        return;
      }
    }
    listeningFieldRef.current = key;
    setListeningField(key);
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

  const activeVoiceField = (voiceEngine.isListening || voiceEngine.isTranslating) ? listeningField : null;

  // -- Validation & submission ————————————————————————————————————————————————
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [pendingMatchList, setPendingMatchList] = useState<PendingMatch[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const pendingSubmitRef = useRef(false);
  const pendingIdRef = useRef<string | null>(null);

  // Keep pending-submission registry clean for live conflict detection
  useEffect(() => {
    clearExpiredPending();
    return () => {
      if (pendingIdRef.current) {
        unregisterPending(pendingIdRef.current);
        pendingIdRef.current = null;
      }
    };
  }, []);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!presentMethod.trim())  e.presentMethod  = "Present method is required / वर्तमान विधि अनिवार्य है";
    if (!proposedMethod.trim()) e.proposedMethod = "Proposed method is required / प्रस्तावित विधि अनिवार्य है";
    if (!benefits.trim())       e.benefits       = "Expected benefits are required / अपेक्षित लाभ अनिवार्य हैं";
    if (machineRefType !== "na" && !machineRefValue.trim())
      e.machineRef = "Please enter the machine name / number";
    if (themeBased && !themeName)
      e.themeName = "Please select a theme / कृपया विषय-वस्तु चुनें";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** Build the common payload used by both save-draft and submit */
  const buildPayload = (status: string, pendingWith?: string) => {
    const selectedTheme = JAP_THEMES.find(t => t.value === themeName);
    const machineRef = machineRefType === "na"
      ? "N/A"
      : `${machineRefType === "name" ? "Name" : "No."}: ${machineRefValue}`;
    return {
      suggestionNo: suggNo,
      subject: proposedMethod.slice(0, 120) || presentMethod.slice(0, 120) || "Untitled Draft",
      type: "Improvement Suggestion" as const,
      category: selectedTheme ? selectedTheme.label : "General",
      status,
      date: new Date().toISOString().slice(0, 10),
      pendingWith,
      daysPending: 0,
      employeeNo:   user?.employeeNo ?? "",
      employeeName: user?.name       ?? "",
      department:   user?.department ?? "",
      plantCode: "PLT-02",
      presentMethod,
      proposedMethod,
      benefits,
      formData: {
        machineRefType,
        machineRef,
        themeBased,
        themeName:   selectedTheme?.label   ?? "",
        themeNameHi: selectedTheme?.labelHi ?? "",
        planners:  planners.map(p  => ({ empNo: p.employee_no, name: p.name })),
        superiors: superiors.map(s => ({ empNo: s.employee_no, name: s.name })),
        suggesterEmpNo: user?.employeeNo ?? "",
        suggesterName:  user?.name       ?? "",
        teamName:       user?.department  ?? "",
        isGroupSuggestion,
        coSuggestors: coSuggestors.map(id => ({
          empNo: id,
          name: teamMemberOptions.find(o => o.value === id)?.label ?? id,
        })),
        attachments,
        suggestionArea,
      },
    };
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildPayload("Draft");
      if (draftId && draftSuggestion) {
        // Update existing draft
        updateSuggestion(draftId, payload);
      } else {
        // Create new draft
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
    if (!validate()) { toast.error("Please fill all required fields"); return; }

    // Duplicate detection phase (same flow as BidP, scoped to JaP suggestions)
    if (!pendingSubmitRef.current) {
      if (!pendingIdRef.current) pendingIdRef.current = createPendingId();

      const selectedTheme = JAP_THEMES.find(t => t.value === themeName);
      const duplicateInput = {
        subject: proposedMethod.slice(0, 120) || presentMethod.slice(0, 120) || "Untitled Suggestion",
        presentMethod,
        proposedMethod,
        benefits,
        category: selectedTheme ? selectedTheme.label : "General",
        suggestionType: "Improvement Suggestion",
      };

      registerPending({
        id: pendingIdRef.current,
        employeeNo: user?.employeeNo,
        employeeName: user?.name,
        registeredAt: Date.now(),
        subject: duplicateInput.subject,
        presentMethod: duplicateInput.presentMethod,
        proposedMethod: duplicateInput.proposedMethod,
        benefits: duplicateInput.benefits,
        category: duplicateInput.category,
        suggestionType: duplicateInput.suggestionType,
      });

      setIsScanning(true);
      // Brief pause so the scanning indicator is visible to the user.
      await new Promise(r => setTimeout(r, 1200));

      // Use the in-memory context snapshot — it is already scoped to the
      // current plant (PLT-02) and includes all previously submitted JaP
      // suggestions (seed data + user submissions persisted in sessionStorage).
      // We do NOT call the backend API here: the auto-login JWT belongs to a
      // PLT-01 user, so the API would return BidP data, not JaP data.
      const snapshot = getSuggestionsSnapshot();
      // Safety filter in case the snapshot ever contains cross-plant data.
      const japSuggestions = snapshot.filter(
        s => (s.plantCode ?? (s as any).plant_code) === "PLT-02"
      );

      const detection = detectDuplicatesFull(
        duplicateInput,
        japSuggestions,
        getActivePending(pendingIdRef.current)
      );
      setIsScanning(false);

      if (detection.hasConflict) {
        setDuplicateMatches(detection.saved);
        setPendingMatchList(detection.pending);
        setShowDuplicateAlert(true);
        return;
      }
    }

    pendingSubmitRef.current = false;
    setIsSubmitting(true);
    try {
      const payload = buildPayload("Pending Feasibility Review", "Superior");
      if (draftId && draftSuggestion) {
        // Submit an existing draft — update in-place
        updateSuggestion(draftId, payload);
      } else {
        await addSuggestion(payload);
      }

      setSubmitted(true);
      toast.success("Suggestion submitted successfully / सुझाव सफलतापूर्वक जमा किया गया", {
        description: `${suggNo} — submitted for planner review`,
      });
      addNotification(`JaP suggestion ${suggNo} submitted — pending planner review`, "success");

      if (pendingIdRef.current) {
        unregisterPending(pendingIdRef.current);
        pendingIdRef.current = null;
      }
    } catch {
      toast.error("Submission failed — please try again");
      if (pendingIdRef.current) {
        unregisterPending(pendingIdRef.current);
        pendingIdRef.current = null;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPresentMethod(""); setProposedMethod(""); setBenefits("");
    setMachineRefType("na"); setMachineRefValue("");
    setThemeBased(false); setThemeName("");
    setIsGroupSuggestion(false); setCoSuggestors([]); setCoSuggestorSearch("");
    setAttachments([]);
    setErrors({}); setSubmitted(false);
    disableVoice();
  };

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="max-w-3xl space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <FilePlus className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {draftSuggestion ? "Edit Draft" : "New Suggestion"}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {draftSuggestion ? "ड्राफ्ट संपादित करें" : "नया सुझाव"}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {draftSuggestion
              ? `Editing draft ${suggNo} — complete and submit or save again`
              : "Submit a new improvement suggestion for Jaipur Plant"}
          </p>
        </div>
      </div>

      {/* Section 1: Suggestion Reference & Theme */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2 pl-0.5">
            <Hash className="h-3.5 w-3.5 shrink-0" /> Suggestion Reference / सुझाव संदर्भ
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Suggestion No <span className="text-[10px] text-muted-foreground font-normal">/ सुझाव संख्या</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={suggNo} className="font-mono text-sm bg-muted/50 text-muted-foreground cursor-default" />
                <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 shrink-0">Auto</Badge>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Date of Application <span className="text-[10px] text-muted-foreground font-normal">/ आवेदन की तिथि</span>
              </Label>
              <Input readOnly value={today} className="bg-muted/50 text-muted-foreground cursor-default text-sm" />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="themeBased"
                checked={themeBased}
                onCheckedChange={v => {
                  setThemeBased(!!v);
                  if (!v) { setThemeName(""); setErrors(e => ({ ...e, themeName: undefined })); }
                }}
              />
              <Label htmlFor="themeBased" className="text-sm cursor-pointer">
                Theme Based Suggestion{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ विषय-आधारित सुझाव</span>
              </Label>
              {themeBased && (
                <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">Theme Active</Badge>
              )}
            </div>

            {themeBased && (
              <div className="space-y-1.5 pl-7">
                <Label className="text-xs font-medium">
                  Select Theme <span className="text-destructive">*</span>{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ विषय-वस्तु चुनें</span>
                </Label>
                <Select value={themeName} onValueChange={v => { setThemeName(v); setErrors(e => ({ ...e, themeName: undefined })); }}>
                  <SelectTrigger className={`text-sm ${errors.themeName ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Select a theme..." />
                  </SelectTrigger>
                  <SelectContent>
                    {JAP_THEMES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <span>{t.label}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">/ {t.labelHi}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.themeName && <p className="text-xs text-destructive">{errors.themeName}</p>}
              </div>
            )}
          </div>

          <Separator />

          {/* Suggestion Area */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Suggestion Area{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ सुझाव क्षेत्र</span>
            </Label>
            <Select value={suggestionArea} onValueChange={setSuggestionArea}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select area..." />
              </SelectTrigger>
              <SelectContent>
                {JAP_AREAS.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Improvement Details + Voice */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-5">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2 pl-0.5">
            <Lightbulb className="h-3.5 w-3.5 shrink-0" /> Improvement Details / सुधार विवरण
          </p>

          {/* Voice toolbar */}
          {!inputMethodSettings.voiceEnabled ? (
            <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700">
              <Mic className="inline h-3 w-3 mr-1" /> Voice input has been disabled by BPS admin / वॉइस इनपुट अक्षम
            </div>
          ) : voiceEnabled ? (
            <div className="space-y-2">
              {/* Language picker row */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative" ref={langPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowLangPicker(v => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-background hover:bg-muted/50 text-xs font-medium transition-colors"
                  >
                    <span>{currentLangOption.flag}</span>
                    <span>{currentLangOption.label}</span>
                    <Languages className="h-3 w-3 text-muted-foreground ml-0.5" />
                  </button>
                  {showLangPicker && (
                    <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-popover border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                      {VOICE_LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => { setVoiceLang(lang.code); setShowLangPicker(false); }}
                          className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span className="font-medium">{lang.label}</span>
                            {lang.nativeName !== lang.label && (
                              <span className="text-muted-foreground/60">{lang.nativeName}</span>
                            )}
                          </div>
                          {voiceLang === lang.code && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      ))}
                      {isNonEnglish && (
                        <div className="px-3 py-1.5 mt-1 border-t border-border/50">
                          <p className="text-[10px] text-violet-500 flex items-center gap-1">
                            <Languages className="h-3 w-3" /> Auto-translates to English
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {isNonEnglish && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-violet-600 bg-violet-500/[0.08] border border-violet-400/20 px-2 py-1 rounded-lg">
                    <Languages className="h-3 w-3" />
                    Speak in {currentLangOption.nativeName} — auto-translates to English
                  </span>
                )}
              </div>

              {/* Status bar */}
              <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs transition-all duration-300 ${
                voiceEngine.isTranslating
                  ? "border-violet-400/40 bg-violet-500/[0.05] shadow-sm shadow-violet-500/5"
                  : voiceEngine.isListening
                    ? "border-rose-400/35 bg-rose-500/[0.04] shadow-sm shadow-rose-500/5"
                    : voiceEngine.status?.ok
                      ? "border-emerald-400/30 bg-emerald-500/[0.04]"
                      : voiceEngine.status
                        ? "border-amber-400/30 bg-amber-500/[0.04]"
                        : "border-primary/15 bg-primary/[0.03]"
              }`}>
                <div className={`relative h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  voiceEngine.isTranslating ? "bg-violet-500 shadow-sm shadow-violet-500/30"
                    : voiceEngine.isListening ? "bg-rose-500 shadow-sm shadow-rose-500/30"
                    : voiceEngine.status?.ok ? "bg-emerald-500/15" : "bg-primary/10"
                }`}>
                  {(voiceEngine.isListening || voiceEngine.isTranslating) && (
                    <span className={`absolute inset-0 rounded-full animate-ping pointer-events-none ${
                      voiceEngine.isTranslating ? "bg-violet-400/30" : "bg-rose-400/30"
                    }`} />
                  )}
                  {voiceEngine.isTranslating
                    ? <Languages className="h-3.5 w-3.5 text-white relative z-10 animate-pulse" />
                    : voiceEngine.isListening
                      ? <Mic className="h-3.5 w-3.5 text-white relative z-10" />
                      : voiceEngine.status?.ok
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        : <Mic className="h-3.5 w-3.5 text-primary" />
                  }
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
                      <p className={`font-medium ${voiceEngine.status.ok ? "text-emerald-600" : "text-amber-600"}`}>
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
                        <span className="ml-1 text-violet-500">({currentLangOption.label} → English)</span>
                      )}
                    </p>
                  )}
                </div>

                {voiceEngine.isListening || voiceEngine.isTranslating ? (
                  <button
                    type="button"
                    onClick={() => { voiceEngine.stopListening(); setListeningField(null); listeningFieldRef.current = null; }}
                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${
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
              onClick={() => { setVoiceEnabled(true); voiceEngine.setStatus(null); }}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-background hover:bg-primary/5 hover:border-primary/25 text-muted-foreground hover:text-primary text-[11px] font-medium transition-all w-fit shadow-sm"
            >
              <div className="h-5 w-5 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                <Mic className="h-3 w-3" />
              </div>
              Voice input
              <span className="text-[10px] text-muted-foreground/40 font-normal">
                — speak in any language, auto-translates to English
              </span>
            </button>
          )}

          {/* Present Method */}
          <div className="space-y-1.5">
            <Label htmlFor="presentMethod" className="text-xs font-medium">
              Present Method <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ वर्तमान विधि — कैसे काम हो रहा है अभी?</span>
            </Label>
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
                onChange={e => { setPresentMethod(e.target.value); setErrors(err => ({ ...err, presentMethod: undefined })); }}
                placeholder="Describe the current method or problem as it stands today..."
                className={errors.presentMethod ? "border-destructive" : ""}
              />
            </VoiceHighlight>
            {errors.presentMethod && <p className="text-xs text-destructive">{errors.presentMethod}</p>}
          </div>

          {/* Proposed Method */}
          <div className="space-y-1.5">
            <Label htmlFor="proposedMethod" className="text-xs font-medium">
              Proposed Method <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ प्रस्तावित विधि — क्या बदलाव करना चाहते हैं?</span>
            </Label>
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
                onChange={e => { setProposedMethod(e.target.value); setErrors(err => ({ ...err, proposedMethod: undefined })); }}
                placeholder="Describe the proposed improvement or solution..."
                className={errors.proposedMethod ? "border-destructive" : ""}
              />
            </VoiceHighlight>
            {errors.proposedMethod && <p className="text-xs text-destructive">{errors.proposedMethod}</p>}
          </div>

          {/* Expected Benefits */}
          <div className="space-y-1.5">
            <Label htmlFor="benefits" className="text-xs font-medium">
              Expected Benefits <span className="text-destructive">*</span>{" "}
              <span className="text-[10px] text-muted-foreground font-normal">/ अपेक्षित लाभ — क्या सुधार होगा?</span>
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
                onChange={e => { setBenefits(e.target.value); setErrors(err => ({ ...err, benefits: undefined })); }}
                placeholder="Describe the expected benefits (safety, cost, quality, productivity, etc.)..."
                className={errors.benefits ? "border-destructive" : ""}
              />
            </VoiceHighlight>
            {errors.benefits && <p className="text-xs text-destructive">{errors.benefits}</p>}
          </div>

          <Separator />

          {/* Machine Reference */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium">
              Machine Reference <span className="text-[10px] text-muted-foreground font-normal">/ मशीन संदर्भ</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {(["name", "number", "na"] as MachineRefType[]).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setMachineRefType(opt);
                    if (opt === "na") setMachineRefValue("");
                    setErrors(e => ({ ...e, machineRef: undefined }));
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                    machineRefType === opt
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input text-foreground hover:bg-muted/50"
                  }`}
                >
                  {opt === "name"   && <><Wrench className="inline h-3 w-3 mr-1" />Machine Name</>}
                  {opt === "number" && <><Hash   className="inline h-3 w-3 mr-1" />Machine Number</>}
                  {opt === "na"     && "N/A"}
                </button>
              ))}
            </div>
            {machineRefType !== "na" && (
              <div className="space-y-1.5">
                <Input
                  value={machineRefValue}
                  onChange={e => { setMachineRefValue(e.target.value); setErrors(err => ({ ...err, machineRef: undefined })); }}
                  placeholder={
                    machineRefType === "name"
                      ? "Enter machine name / मशीन का नाम दर्ज करें"
                      : "Enter machine number / मशीन नंबर दर्ज करें"
                  }
                  className={errors.machineRef ? "border-destructive" : ""}
                />
                {errors.machineRef && <p className="text-xs text-destructive">{errors.machineRef}</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Suggestor & Team Information */}
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2 pl-0.5">
            <Users className="h-3.5 w-3.5 shrink-0" /> Suggestor & Team Information / सुझावकर्ता एवं टीम जानकारी
          </p>

          <div className="border rounded-lg divide-y">
            <ReadonlyField
              icon={User}
              label="Suggestor's Name"  labelHi="सुझावकर्ता का नाम"
              value={`${user?.name ?? "—"}${user?.employeeNo ? ` (${user.employeeNo})` : ""}`}
            />
            <ReadonlyField
              icon={Building2}
              label="Team / Department" labelHi="टीम / विभाग"
              value={user?.department ?? "—"}
            />
          </div>

          {/* Group / Team Suggestion */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="isGroupSuggestion"
                checked={isGroupSuggestion}
                onCheckedChange={v => {
                  setIsGroupSuggestion(!!v);
                  if (!v) { setCoSuggestors([]); setCoSuggestorSearch(""); }
                }}
              />
              <Label htmlFor="isGroupSuggestion" className="text-sm cursor-pointer">
                Group / Team Suggestion{" "}
                <span className="text-[10px] text-muted-foreground font-normal">/ सामूहिक सुझाव</span>
              </Label>
              {isGroupSuggestion && (
                <Badge className="text-[9px] bg-indigo-100 text-indigo-700 border-indigo-200">Group Active</Badge>
              )}
            </div>

            {isGroupSuggestion && (
              <div className="pl-7 space-y-2.5">
                <Label className="text-xs font-medium">
                  Co-Suggestors{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">/ सह-सुझावकर्ता</span>
                </Label>

                {coSuggestors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {coSuggestors.map(id => {
                      const member = teamMemberOptions.find(m => m.value === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-[11px] gap-1 pl-2 pr-1">
                          <UserPlus className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                          {member?.label || id}
                          <button
                            type="button"
                            onClick={() => setCoSuggestors(cs => cs.filter(c => c !== id))}
                            className="ml-0.5 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <div className="border rounded-md">
                  <div className="flex items-center gap-2 px-3 py-2 border-b">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={coSuggestorSearch}
                      onChange={e => setCoSuggestorSearch(e.target.value)}
                      placeholder="Search by name or employee ID..."
                      className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="max-h-[140px] overflow-y-auto p-1.5 space-y-0.5">
                    {(() => {
                      const filtered = teamMemberOptions.filter(
                        m =>
                          m.value !== user?.employeeNo &&
                          (!coSuggestorSearch.trim() ||
                            m.label.toLowerCase().includes(coSuggestorSearch.toLowerCase()))
                      );
                      return filtered.length > 0 ? (
                        filtered.map(m => {
                          const selected = coSuggestors.includes(m.value);
                          return (
                            <div
                              key={m.value}
                              onClick={() =>
                                setCoSuggestors(cs =>
                                  selected ? cs.filter(c => c !== m.value) : [...cs, m.value]
                                )
                              }
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                                selected
                                  ? "bg-indigo-500/10 text-indigo-700 font-medium"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <div
                                className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                                  selected ? "bg-indigo-500 border-indigo-500" : "border-muted-foreground/40"
                                }`}
                              >
                                {selected && <span className="text-white text-[9px]">✓</span>}
                              </div>
                              {m.label}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">No employees found</p>
                      );
                    })()}
                  </div>
                </div>

                {coSuggestors.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Select one or more co-suggestors from the list above
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              Planners <span className="text-[10px] font-normal text-muted-foreground">/ योजनाकार — Auto-mapped from Authority</span>
            </p>
            {planners.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-5">No planners assigned for JaP — please contact admin</p>
            ) : (
              <div className="flex flex-wrap gap-2 pl-5">
                {planners.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] border bg-blue-50 border-blue-200 text-blue-700">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{p.name}</span>
                    <span className="font-mono opacity-70">({p.employee_no})</span>
                    {p.department && <span className="opacity-60">· {p.department}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              Superiors <span className="text-[10px] font-normal text-muted-foreground">/ वरिष्ठ अधिकारी — Auto-mapped from Authority</span>
            </p>
            {superiors.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-5">No superiors assigned for JaP — please contact admin</p>
            ) : (
              <div className="flex flex-wrap gap-2 pl-5">
                {superiors.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] border bg-amber-50 border-amber-200 text-amber-700">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{s.name}</span>
                    <span className="font-mono opacity-70">({s.employee_no})</span>
                    {s.department && <span className="opacity-60">· {s.department}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Attachments — Photos / Documents */}
      {inputMethodSettings.fileUploadEnabled ? (
      <Card className="card-shadow">
        <CardContent className="pt-5 space-y-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2 pl-0.5">
            <Paperclip className="h-3.5 w-3.5 shrink-0" /> Attachments / संलग्नक <span className="text-[10px] font-normal text-muted-foreground">(optional / वैकल्पिक)</span>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Click to upload photos or documents<br />
              <span className="text-[10px]">फ़ोटो या दस्तावेज़ अपलोड करें — Max 5 MB each — JPG, PNG, PDF, DOC, XLS</span>
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-1.5">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30">
                  {att.type.startsWith("image/") ? (
                    <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : (
                    <FileTextIcon className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium flex-1 truncate">{att.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {(att.size / 1024).toFixed(0)} KB
                  </span>
                  <button type="button" onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      ) : (
        <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700">
          <Paperclip className="inline h-3 w-3 mr-1" /> File upload has been disabled by BPS admin / फ़ाइल अपलोड अक्षम
        </div>
      )}

      {/* Success banner */}
      {submitted && (
        <div className="border border-green-300 bg-green-50 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-green-800">
              Suggestion Submitted! / सुझाव सफलतापूर्वक जमा हुआ!
            </p>
            <p className="text-xs text-green-700">
              {suggNo} — submitted for planner review. Track it under{" "}
              <button className="underline font-medium" onClick={() => navigate(`${plantPrefix}/employee/my-suggestions`)}>
                My Suggestions
              </button>.
            </p>
          </div>
        </div>
      )}

      {/* Draft saved banner */}
      {draftSaved && !submitted && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 flex items-start gap-3">
          <Save className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800">
              Draft Saved! / ड्राफ्ट सहेजा गया!
            </p>
            <p className="text-xs text-amber-700">
              {suggNo} — saved as draft. Resume editing from{" "}
              <button className="underline font-medium" onClick={() => navigate(`${plantPrefix}/employee/my-suggestions`)}>
                My Suggestions
              </button>.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pb-4">
        <Button onClick={handleSubmit} disabled={isSubmitting || isScanning || submitted} className="gap-1.5">
          {isScanning
            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking duplicates…</>
            : isSubmitting
            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
            : <><FilePlus className="h-3.5 w-3.5" /> Submit Suggestion / सुझाव जमा करें</>
          }
        </Button>
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting || isScanning || submitted}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" /> Save Draft / ड्राफ्ट सहेजें
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isSubmitting || isScanning}>
          Reset / रीसेट
        </Button>
      </div>

      <DuplicateAlertDialog
        open={showDuplicateAlert}
        matches={duplicateMatches}
        pendingMatches={pendingMatchList}
        onCancel={() => {
          setShowDuplicateAlert(false);
          setDuplicateMatches([]);
          setPendingMatchList([]);
          pendingSubmitRef.current = false;
          if (pendingIdRef.current) {
            unregisterPending(pendingIdRef.current);
            pendingIdRef.current = null;
          }
        }}
        onProceed={() => {
          setShowDuplicateAlert(false);
          setDuplicateMatches([]);
          setPendingMatchList([]);
          pendingSubmitRef.current = true;
          handleSubmit();
        }}
      />
    </div>
  );
};

export default JaPNewSuggestion;
