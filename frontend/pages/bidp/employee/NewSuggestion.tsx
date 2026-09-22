import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { suggestionTypes, categories } from "@/lib/mockData";
import { schemaMap } from "@/lib/bidp/suggestionSchemas";
import { flmOptions, moderatorOptions, kaizenThemes } from "@/lib/bidp/suggestionConstants";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { useVoiceEngine, VOICE_LANGUAGES } from "@/hooks/useVoiceEngine";
import VoiceHighlight from "@/components/VoiceHighlight";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeptMappings } from "@/contexts/DeptMappingContext";
import { toast } from "sonner";
import { Save, Send, FileText, RotateCcw, Upload, X, Info, Paperclip, Mic, MicOff, CheckCircle2, Languages } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { ZodError } from "zod";

import GlobalFields from "@/components/bidp/suggestion-forms/GlobalFields";
import SimpleSuggestionFields from "@/components/bidp/suggestion-forms/SimpleSuggestionFields";
import ShopFloorCIPFields from "@/components/bidp/suggestion-forms/ShopFloorCIPFields";
import MyIdeaCardFields from "@/components/bidp/suggestion-forms/MyIdeaCardFields";
import DailyCIPFields from "@/components/bidp/suggestion-forms/DailyCIPFields";
import CashTheFlashFields from "@/components/bidp/suggestion-forms/CashTheFlashFields";
import DuplicateAlertDialog from "@/components/bidp/DuplicateAlertDialog";
import { detectDuplicatesFull, type DuplicateMatch, type PendingMatch } from "@/lib/bidp/duplicateDetector";
import { registerPending, unregisterPending, getActivePending, createPendingId, clearExpiredPending } from "@/lib/bidp/pendingSubmissionsStore";
import { AttachmentItem, filesToAttachmentItems } from "@/lib/attachmentUtils";
import { validateFiles } from "@/lib/fileSecurityUtils";

const CLONE_KEY = "clone-suggestion-data";
const EDIT_KEY  = "edit-suggestion-draft";

// ── Voice field list for Simple Suggestion Scheme (covers entire page) ──────
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function tryParseDate(text: string): string | null {
  // Strip ordinal suffixes: 20th → 20, 1st → 1, 2nd → 2, 3rd → 3
  let cleaned = text.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
  // Remove "of" preposition: "20 of March" → "20 March"
  cleaned = cleaned.replace(/\bof\b/gi, "").replace(/\s+/g, " ").trim();

  // Try direct parse (handles "March 20 2026", "20 March 2026", "2026-03-20" etc.)
  const d1 = new Date(cleaned);
  if (!isNaN(d1.getTime()) && d1.getFullYear() > 2000) return localDateStr(d1);

  const months: Record<string, number> = {
    january:0, jan:0, february:1, feb:1, march:2, mar:2,
    april:3, apr:3, may:4, june:5, jun:5,
    july:6, jul:6, august:7, aug:7, september:8, sep:8, sept:8,
    october:9, oct:9, november:10, nov:10, december:11, dec:11,
  };
  const lc = cleaned.toLowerCase();
  const me = Object.entries(months).find(([m]) => lc.includes(m));
  if (me) {
    const nums = (cleaned.match(/\d+/g) || []).map(Number);
    const year = nums.find(n => n >= 2020 && n <= 2100);
    const day  = nums.find(n => n >= 1 && n <= 31 && n !== year);
    if (day && year) {
      const d = new Date(year, me[1], day);
      if (!isNaN(d.getTime())) return localDateStr(d);
    }
  }
  return null;
}

type VoiceFieldType = "select" | "radio" | "date" | "text" | "textarea" | "number";
interface VoiceField { key: string; label: string; type: VoiceFieldType; hint: string; }

// ── Global fields shared by all form types ────────────────────────────────
const GLOBAL_VOICE_FIELDS: VoiceField[] = [];
const OTHER_INFO_FIELDS: VoiceField[] = [
  { key: "otherInfo", label: "Other Info",  type: "textarea", hint: "Any additional information (optional)" },
];
const OTHER_INFO_NO_FLM: VoiceField[] = [
  { key: "otherInfo", label: "Other Info",  type: "textarea", hint: "Any additional information (optional)" },
];

const SSS_VOICE_FIELDS: VoiceField[] = [
  ...GLOBAL_VOICE_FIELDS,
  { key: "subject",              label: "Suggestion Subject",          type: "text",     hint: "Say your suggestion title" },
  { key: "presentMethod",        label: "Details of present Method",   type: "textarea", hint: "Describe the current method in detail" },
  { key: "proposedMethod",       label: "Details of proposed Method",  type: "textarea", hint: "Describe the proposed improvement" },
  { key: "benefits",             label: "Benefits",                    type: "textarea", hint: "Describe the expected benefits" },
  ...OTHER_INFO_FIELDS,
];
const SFCIP_VOICE_FIELDS: VoiceField[] = [
  ...GLOBAL_VOICE_FIELDS,
  { key: "problemStatus",           label: "Problem / Present Status",        type: "textarea", hint: "Describe the current problem or status" },
  { key: "beforeImprovement",       label: "Before Improvement",              type: "textarea", hint: "Describe the situation before improvement" },
  { key: "afterImprovement",        label: "After Improvement",               type: "textarea", hint: "Describe the situation after improvement" },
  { key: "benefits",                label: "Benefits",                        type: "textarea", hint: "Describe the expected benefits" },
  { key: "rootCauseIdentification", label: "Real Root Cause Identification",  type: "textarea", hint: "Identify the real root cause" },
  { key: "standardization",         label: "Standardization",                 type: "textarea", hint: "Describe the standardization applied" },
  { key: "rootCause",               label: "Root Cause",                      type: "textarea", hint: "State the root cause" },
  { key: "ideaToEliminate",         label: "Idea to Eliminate Root Cause",    type: "textarea", hint: "How will you eliminate the root cause?" },
  { key: "actionTaken",             label: "Action Taken",                    type: "textarea", hint: "Describe actions already taken" },
  { key: "horizontalDeployment",    label: "How many places this kaizen is deployed horizontally",     type: "number",   hint: "Say a number, e.g. 'three'" },
  ...OTHER_INFO_NO_FLM,
];
const MIC_VOICE_FIELDS: VoiceField[] = [
  ...GLOBAL_VOICE_FIELDS,
  { key: "subject",               label: "Suggestion Subject",          type: "text",     hint: "Say your suggestion title" },
  { key: "descriptionProblem",    label: "Description – Idea / Problem", type: "textarea", hint: "Describe the idea or problem (min 20 chars)" },
  { key: "descriptionImprovement",label: "Description – Improvement",   type: "textarea", hint: "Describe the improvement done (min 20 chars)" },
  { key: "benefits",              label: "Benefits",                    type: "textarea", hint: "Describe the expected benefits" },
  ...OTHER_INFO_FIELDS,
];
const DCIP_VOICE_FIELDS: VoiceField[] = [
  ...GLOBAL_VOICE_FIELDS,
  { key: "machineNoArea",         label: "Machine No / Area of Improvement",   type: "text",     hint: "Say the machine number or area name" },
  { key: "suggestionDescription", label: "Suggestion Description",             type: "textarea", hint: "Describe your suggestion" },
  { key: "actionTaken",           label: "Action Taken",                       type: "textarea", hint: "Describe actions already taken" },
  ...OTHER_INFO_NO_FLM,
];
const CTF_VOICE_FIELDS: VoiceField[] = [
  ...GLOBAL_VOICE_FIELDS,
  { key: "subject",        label: "Suggestion Subject",    type: "text",     hint: "Say your suggestion title" },
  { key: "presentMethod",  label: "Present / Before Method", type: "textarea", hint: "Describe the current method" },
  { key: "proposedMethod", label: "Proposed / After Method", type: "textarea", hint: "Describe the proposed method" },
  { key: "benefits",       label: "Benefits",              type: "textarea", hint: "Describe the expected benefits" },
  { key: "sharePercent",   label: "Share %",               type: "number",   hint: "Say your share percentage, e.g. 'fifty'" },
  ...OTHER_INFO_FIELDS,
];

const VOICE_FIELDS_MAP: Record<string, VoiceField[]> = {
  "Simple Suggestion Scheme": SSS_VOICE_FIELDS,
  "Shop Floor CIP":           SFCIP_VOICE_FIELDS,
  "My Idea Card":             MIC_VOICE_FIELDS,
  "Daily CIP":                DCIP_VOICE_FIELDS,
  "Cash The Flash":           CTF_VOICE_FIELDS,
};
// Flat key → field lookup for label/type resolution (deduped by key)
const ALL_VOICE_FIELD_LOOKUP: Record<string, VoiceField> = {};
Object.values(VOICE_FIELDS_MAP).flat().forEach(f => { if (!ALL_VOICE_FIELD_LOOKUP[f.key]) ALL_VOICE_FIELD_LOOKUP[f.key] = f; });

interface FormState {
  suggestionType: string;
  range: string;
  suggestionFor: string;
  groupSuggestion: string;
  otherInfo: string;
  typeFields: Record<string, any>;
  mainSuggestor: string;
  teamMembers: string[];
  teamMemberShares: Record<string, string>;
  suggestionDepartment: string;
  sameAsMyDepartment: boolean;
}

const emptyState: FormState = {
  suggestionType: "",
  range: "",
  suggestionFor: "self",
  groupSuggestion: "no",
  otherInfo: "",
  typeFields: {},
  mainSuggestor: "",
  teamMembers: [],
  teamMemberShares: {},
  suggestionDepartment: "",
  sameAsMyDepartment: true,
};

// Determine group suggestion default for a given type
const getGroupDefault = (type: string): string | null => {
  if (type === "Shop Floor CIP") return "yes";
  if (type === "My Idea Card") return "no";
  if (type === "Daily CIP") return "no";
  return null;
};

const loadSaved = (): { state: FormState; isClone: boolean; editingId: string | null; returnTo: string | null } => {
  try {
    const editRaw = localStorage.getItem(EDIT_KEY);
    if (editRaw) {
      localStorage.removeItem(EDIT_KEY);
      const { editingId, returnTo, ...formData } = JSON.parse(editRaw);
      return { state: { ...emptyState, ...formData }, isClone: false, editingId: editingId as string, returnTo: (returnTo as string) || null };
    }
    const cloneRaw = localStorage.getItem(CLONE_KEY);
    if (cloneRaw) {
      localStorage.removeItem(CLONE_KEY);
      return { state: { ...emptyState, ...JSON.parse(cloneRaw) }, isClone: true, editingId: null, returnTo: null };
    }
  } catch {}
  return { state: emptyState, isClone: false, editingId: null, returnTo: null };
};

const NewSuggestion = () => {
  const { state: saved, isClone: initialIsClone, editingId: initialEditingId, returnTo } = useMemo(() => loadSaved(), []);
  const [isClone, setIsClone] = useState(initialIsClone);
  const [editingId, setEditingId] = useState<string | null>(initialEditingId);
  const navigate = useNavigate();

  const [suggestionType, setSuggestionType] = useState(saved.suggestionType);
  const [range, setRange] = useState(saved.range);
  const [suggestionFor, setSuggestionFor] = useState(saved.suggestionFor);

  const [groupSuggestion, setGroupSuggestion] = useState(saved.groupSuggestion);
  const [otherInfo, setOtherInfo] = useState(saved.otherInfo);
  const [attachmentItems, setAttachmentItems] = useState<AttachmentItem[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + attachmentItems.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }
    const oversized = selected.find(f => f.size > 4 * 1024 * 1024);
    if (oversized) {
      toast.error(`File "${oversized.name}" exceeds 4MB limit`);
      return;
    }
    // Security validation: block dangerous file types & double extensions
    const validation = validateFiles(selected, { maxFiles: 5 - attachmentItems.length, maxSizeMB: 4 });
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }
    setAttachmentItems(prev => [...prev, ...filesToAttachmentItems(selected)]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachmentItems(prev => prev.filter((_, i) => i !== index));
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [typeFields, setTypeFields] = useState<Record<string, any>>(saved.typeFields);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [pendingMatchList, setPendingMatchList] = useState<PendingMatch[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const pendingSubmitRef = useRef(false);
  const pendingIdRef = useRef<string | null>(null);
  const [mainSuggestor, setMainSuggestor] = useState(saved.mainSuggestor || "");

  // ── Per-field voice controller ─────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceLang, setVoiceLang] = useState("en-IN");
  const [listeningField, setListeningField] = useState<string | null>(null);
  const listeningFieldRef = useRef<string | null>(null);
  const suggestionTypeRef = useRef(suggestionType);
  useEffect(() => { suggestionTypeRef.current = suggestionType; }, [suggestionType]);

  const handleVoiceResult = useCallback((text: string) => {
    const field = listeningFieldRef.current
      ? ALL_VOICE_FIELD_LOOKUP[listeningFieldRef.current]
      : null;
    if (!field) return;

    // Helper: stop listening after a single-value field is filled
    const stopAfterFill = () => {
      voiceEngine.stopListening();
      setListeningField(null);
      listeningFieldRef.current = null;
    };

    if (field.key === "suggestionFor") {
      const val = text.toLowerCase().includes("behalf") ? "behalf" : "self";
      setSuggestionFor(val);
      voiceEngine.setStatus({ text: `✓ Set to "${val === "behalf" ? "On Behalf" : "Self"}"`, ok: true });
      stopAfterFill();
    } else if (field.key === "groupSuggestion") {
      const val = text.toLowerCase().includes("yes") ? "yes" : "no";
      setGroupSuggestion(val);
      voiceEngine.setStatus({ text: `✓ Group Suggestion: "${val}"`, ok: true });
      stopAfterFill();
    } else if (field.key === "otherInfo") {
      setOtherInfo(prev => prev ? prev + " " + text : text);
      voiceEngine.setStatus({ text: "✓ Keep speaking… (tap stop when done)", ok: true });
    } else if (field.type === "date") {
      const parsed = tryParseDate(text);
      if (parsed) {
        setTypeFields(prev => ({ ...prev, dateOfImplementation: parsed }));
        const [yr, mo, dy] = parsed.split("-");
        const displayDate = new Date(Number(yr), Number(mo) - 1, Number(dy))
          .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        voiceEngine.setStatus({ text: `✓ Date set to ${displayDate}`, ok: true });
      } else {
        voiceEngine.setStatus({ text: `⚠ Couldn't understand "${text}" — try "20th March 2026" or tap to type`, ok: false });
      }
      stopAfterFill();
    } else if (field.key === "category") {
      const lc = text.toLowerCase();
      const match = categories.find(c => c.toLowerCase().includes(lc) || lc.includes(c.toLowerCase()));
      if (match) { setTypeFields(prev => ({ ...prev, category: match })); voiceEngine.setStatus({ text: `✓ Category: "${match}"`, ok: true }); }
      else voiceEngine.setStatus({ text: `⚠ No category matched "${text}"`, ok: false });
      stopAfterFill();
    } else if (field.key === "flm") {
      const lc = text.toLowerCase();
      const match = flmOptions.find(f => f.label.toLowerCase().includes(lc) || lc.includes(f.label.split(" ")[0].toLowerCase()));
      if (match) { setTypeFields(prev => ({ ...prev, flm: match.value })); voiceEngine.setStatus({ text: `✓ FLM: "${match.label}"`, ok: true }); }
      else voiceEngine.setStatus({ text: `⚠ No FLM matched "${text}" — say a name like 'Suresh'`, ok: false });
      stopAfterFill();
    } else if (field.key === "moderator") {
      const lc = text.toLowerCase();
      const match = moderatorOptions.find(m => m.label.toLowerCase().includes(lc) || lc.includes(m.label.split(" ")[0].toLowerCase()));
      if (match) {
        setTypeFields(prev => ({ ...prev, moderator: match.value, moderators: match.value }));
        voiceEngine.setStatus({ text: `✓ Moderator: "${match.label}"`, ok: true });
      } else voiceEngine.setStatus({ text: `⚠ No moderator matched "${text}" — say a name like 'Karthik'`, ok: false });
      stopAfterFill();
    } else if (field.key === "kaizenTheme") {
      const lc = text.toLowerCase();
      const match = kaizenThemes.find(k => k.toLowerCase().includes(lc) || lc.includes(k.toLowerCase().split(" ")[0]));
      if (match) { setTypeFields(prev => ({ ...prev, kaizenTheme: match })); voiceEngine.setStatus({ text: `✓ Theme: "${match}"`, ok: true }); }
      else voiceEngine.setStatus({ text: `⚠ No theme matched "${text}" — say e.g. 'Quality Improvement'`, ok: false });
      stopAfterFill();
    } else if (field.type === "number") {
      const words: Record<string, number> = {
        zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
        ten:10, eleven:11, twelve:12, fifteen:15, twenty:20, thirty:30, forty:40, fifty:50,
        sixty:60, seventy:70, eighty:80, ninety:90, hundred:100,
      };
      const lc = text.toLowerCase();
      const fromWord = Object.entries(words).find(([w]) => lc.includes(w));
      const fromDigit = text.match(/\d+/)?.[0];
      const val = fromWord ? String(fromWord[1]) : fromDigit;
      if (val) {
        setTypeFields(prev => ({ ...prev, [field.key]: val }));
        voiceEngine.setStatus({ text: `✓ ${field.label}: ${val}`, ok: true });
      } else voiceEngine.setStatus({ text: `⚠ Couldn't parse a number from "${text}"`, ok: false });
      stopAfterFill();
    } else {
      // Text/textarea fields — APPEND and keep listening for continuous dictation
      setTypeFields(prev => ({ ...prev, [field.key]: prev[field.key] ? prev[field.key] + " " + text : text }));
      voiceEngine.setStatus({ text: "✓ Keep speaking… (tap stop when done)", ok: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Called by the engine when recognition ends without a final result (e.g. silence timeout, error) */
  const handleListeningStopped = useCallback(() => {
    setListeningField(null);
    listeningFieldRef.current = null;
  }, []);

  const voiceEngine = useVoiceEngine(
    handleVoiceResult,
    { voiceLang, autoTranslate: true, translationProvider: "web", translationFallbackProvider: null },
    handleListeningStopped,
  );

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

  const voiceMode = voiceEnabled && !!VOICE_FIELDS_MAP[suggestionType];
  const activeVoiceField = voiceEngine.isListening ? listeningField : null;
  const onActivateVoice = startVoiceForField;
  const isNonEnglish = !voiceLang.startsWith("en");
  const [teamMembers, setTeamMembers] = useState<string[]>(saved.teamMembers || []);
  const [teamMemberShares, setTeamMemberShares] = useState<Record<string, string>>(saved.teamMemberShares || {});
  const [sameAsMyDepartment, setSameAsMyDepartment] = useState(saved.sameAsMyDepartment ?? true);
  const [suggestionDepartment, setSuggestionDepartment] = useState(saved.suggestionDepartment || "");

  const { addSuggestion, updateSuggestion, suggestions, refreshSuggestions, getSuggestionsSnapshot } = useSuggestions();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { addNotification } = useNotifications();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Derive range automatically from logged-in user's department via DeptMapping
  const { mapDept, uniqueDepartments } = useDeptMappings();
  const derivedRange = useMemo(() => {
    const dept = user?.department || "";
    const mapped = mapDept(dept);
    return mapped === "—" ? dept.trim() : mapped;
  }, [user?.department, mapDept]);

  // Keep suggestionDepartment synced to the employee's own department while
  // "Same as my department" is checked (and once user data becomes available).
  useEffect(() => {
    if (sameAsMyDepartment && user?.department) {
      setSuggestionDepartment(user.department);
    }
  }, [sameAsMyDepartment, user?.department]);

  // Clean up pending submission store on mount/unmount
  useEffect(() => {
    clearExpiredPending();
    return () => {
      // If the user navigates away mid-submit, remove their pending entry
      if (pendingIdRef.current) {
        unregisterPending(pendingIdRef.current);
        pendingIdRef.current = null;
      }
    };
  }, []);

  const handleTypeFieldChange = useCallback((field: string, value: any) => {
    setTypeFields(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleTypeChange = (type: string) => {
    setSuggestionType(type);
    // Reset ALL fields so no data carries over from the previous type
    setRange("");
    setSuggestionFor("self");
    setGroupSuggestion(getGroupDefault(type) ?? "no");
    setOtherInfo("");
    setAttachmentItems([]);
    setMainSuggestor("");
    setTeamMembers([]);
    setTeamMemberShares({});
    setTypeFields(type === "Cash The Flash" ? { suggestorName: user?.name || "" } : {});
    setErrors({});
    setSameAsMyDepartment(true);
    setSuggestionDepartment(user?.department || "");
    // Stop any active voice listening when switching form types
    voiceEngine.stopListening();
    setListeningField(null);
    listeningFieldRef.current = null;
  };

  const buildPayload = () => ({
    suggestionType,
    suggestionDate: today,
    range: derivedRange,
    suggestionFor,
    groupSuggestion,
    otherInfo,
    attachments: attachmentItems,
    mainSuggestor,
    teamMembers,
    suggestionDepartment,
    sameAsMyDepartment,
    ...typeFields,
  });

  const validateForm = (): Record<string, string> | null => {
    if (!suggestionType) {
      return { suggestionType: "Please select a suggestion type" };
    }
    const schema = schemaMap[suggestionType];
    if (!schema) return null;

    try {
      schema.parse(buildPayload());
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          const path = e.path.join(".");
          if (!fieldErrors[path]) fieldErrors[path] = e.message;
        });
        return fieldErrors;
      }
    }

    // Share is auto-computed (equal split) — no manual validation needed

    return null;
  };

  const getSubject = () => {
    return typeFields.subject || typeFields.kaizenTheme || typeFields.suggestionDescription || typeFields.machineNoArea || `${suggestionType} suggestion`;
  };

  const getCategory = () => {
    return typeFields.category || "Other";
  };

  const resetForm = () => {
    setSuggestionType("");
    setRange("");
    setSuggestionFor("self");
    setGroupSuggestion("no");
    setOtherInfo("");
    setAttachmentItems([]);
    setTypeFields({});
    setErrors({});
    setMainSuggestor("");
    setTeamMembers([]);
    setTeamMemberShares({});
    setEditingId(null);
    setIsClone(false);
    setSameAsMyDepartment(true);
    setSuggestionDepartment(user?.department || "");
  };

  // Build serializable form state (AttachmentItem objects are plain JSON — no File objects)
  const buildFormData = () => {
    const serializableTypeFields = Object.fromEntries(
      Object.entries(typeFields).filter(([, v]) => !(Array.isArray(v) && v.length > 0 && v[0] instanceof File))
    );
    return { suggestionType, range, suggestionFor, groupSuggestion, otherInfo, mainSuggestor, teamMembers, teamMemberShares, suggestionDepartment, sameAsMyDepartment, typeFields: serializableTypeFields, attachmentItems };
  };

  const handleSave = () => {
    if (!suggestionType) {
      toast.error("Please select a suggestion type before saving");
      return;
    }
    const subject = getSubject();
    const draftPayload = {
      subject,
      type: suggestionType || "Draft",
      category: getCategory(),
      status: "Draft" as const,
      date: today,
      employeeNo: user?.employeeNo,
      employeeName: user?.name,
      department: user?.department,
      suggestionDepartment: suggestionDepartment || user?.department,
      range: derivedRange,
      presentMethod: typeFields.presentMethod || typeFields.problemStatus || typeFields.beforeImprovement,
      proposedMethod: typeFields.proposedMethod || typeFields.afterImprovement || typeFields.descriptionImprovement,
      benefits: typeFields.benefits,
      formData: buildFormData(),
    };
    if (editingId) {
      updateSuggestion(editingId, draftPayload);
      toast.success("Draft updated successfully", { description: `Type: ${suggestionType}` });
    } else {
      addSuggestion({ ...draftPayload, suggestionNo: "" });
      toast.success("Suggestion saved as draft", { description: `Type: ${suggestionType}` });
    }
    addNotification(`Draft saved: ${subject} (${suggestionType})`, "info");
    resetForm();
    if (returnTo) navigate(returnTo);
  };

  const handleSubmit = async () => {
    if (isSubmitting || isScanning) return;  // Re-entrancy guard
    const fieldErrors = validateForm();
    if (fieldErrors) {
      setErrors(fieldErrors);
      const firstError = Object.values(fieldErrors)[0];
      toast.error(firstError);
      return;
    }

    // ── Duplicate detection phase ────────────────────────────────────────────
    if (!pendingSubmitRef.current) {
      // Register this submission in the pending store so other tabs / users
      // can detect it as a concurrent in-flight submission.
      if (!pendingIdRef.current) pendingIdRef.current = createPendingId();
      const input = (() => {
        let subject = "";
        let presentMethod = "";
        let proposedMethod = "";

        if (suggestionType === "Simple Suggestion Scheme" || suggestionType === "Cash The Flash") {
          subject        = typeFields.subject || "";
          presentMethod  = typeFields.presentMethod || "";
          proposedMethod = typeFields.proposedMethod || "";
        } else if (suggestionType === "Shop Floor CIP") {
          subject        = typeFields.kaizenTheme || "";
          presentMethod  = typeFields.problemStatus || typeFields.beforeImprovement || "";
          proposedMethod = typeFields.afterImprovement || "";
        } else if (suggestionType === "My Idea Card") {
          subject        = typeFields.subject || "";
          presentMethod  = typeFields.descriptionProblem || "";
          proposedMethod = typeFields.descriptionImprovement || "";
        } else if (suggestionType === "Daily CIP") {
          subject        = typeFields.machineNoArea || typeFields.suggestionDescription || "";
          presentMethod  = typeFields.suggestionDescription || "";
          proposedMethod = typeFields.actionTaken || "";
        }

        return {
          subject,
          presentMethod,
          proposedMethod,
          benefits:       typeFields.benefits || "",
          category:       typeFields.category || "",
          suggestionType,
          ...typeFields,
        };
      })();
      registerPending({
        id: pendingIdRef.current,
        employeeNo:     user?.employeeNo,
        employeeName:   user?.name,
        registeredAt:   Date.now(),
        subject:        input.subject,
        presentMethod:  input.presentMethod,
        proposedMethod: input.proposedMethod,
        benefits:       input.benefits,
        category:       input.category,
        suggestionType,
      });

      setIsScanning(true);
      await new Promise(r => setTimeout(r, 1200));

      // ── Fetch the FRESHEST suggestions from the DB ─────────────────────
      // refreshSuggestions() tries API first. If backend is unreachable it
      // returns the latest in-memory snapshot (not the stale closure).
      // This ensures back-to-back submits always see the suggestion that
      // was just added — even without a running backend.
      let freshSuggestions: typeof suggestions;
      try {
        freshSuggestions = await refreshSuggestions();
      } catch {
        // Absolute fallback — live snapshot from the ref
        freshSuggestions = getSuggestionsSnapshot();
      }

      const detection = detectDuplicatesFull(
        input,
        freshSuggestions,
        getActivePending(pendingIdRef.current)
      );
      setIsScanning(false);

      if (detection.hasConflict) {
        setDuplicateMatches(detection.saved);
        setPendingMatchList(detection.pending);
        setShowDuplicateAlert(true);
        return; // wait for user decision
      }
    }

    // ── Actual submission ────────────────────────────────────────────────────
    pendingSubmitRef.current = false;
    setIsSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 800));

      const subject = getSubject();
      const selectedFlm = flmOptions.find(f => f.value === typeFields.flm);
      const flmDisplayName = selectedFlm?.name || "Pending Review";

      // Daily CIP → auto-close (no approval pipeline)
      const isDCIP = suggestionType === "Daily CIP";

      const submitPayload = {
        subject,
        type: suggestionType,
        category: getCategory(),
        status: isDCIP ? "Approved & Closed" as const : "Submitted" as const,
        date: today,
        pendingWith: isDCIP ? undefined : `FLM - ${flmDisplayName}`,
        assignedFlm: isDCIP ? undefined : (typeFields.flm || ""),
        approvalLevel: isDCIP ? undefined : "FLM",
        daysPending: isDCIP ? undefined : 0,
        pendingSince: isDCIP ? undefined : today,
        employeeNo: user?.employeeNo,
        employeeName: user?.name,
        department: user?.department,
        suggestionDepartment: suggestionDepartment || user?.department,
        range: derivedRange,
        presentMethod: typeFields.presentMethod || typeFields.problemStatus || typeFields.beforeImprovement,
        proposedMethod: typeFields.proposedMethod || typeFields.afterImprovement || typeFields.descriptionImprovement,
        benefits: typeFields.benefits,
        formData: buildFormData(),
      };
      if (editingId) {
        await updateSuggestion(editingId, submitPayload);
      } else {
        // addSuggestion is async — await it so the context state is updated
        // BEFORE we reset the form. This way the next submit's
        // getSuggestionsSnapshot() will include the suggestion we just added.
        await addSuggestion({ ...submitPayload, suggestionNo: "" });
      }

      // Clean up pending store — submission is now in the DB / context
      if (pendingIdRef.current) {
        unregisterPending(pendingIdRef.current);
        pendingIdRef.current = null;
      }

      toast.success("Suggestion submitted successfully!", {
        description: isDCIP
          ? `${suggestionType} – auto-closed (no approval needed).`
          : `${suggestionType} – submitted for FLM review.`,
      });
      addNotification(
        isDCIP
          ? `New ${suggestionType} submitted — auto-closed`
          : `New ${suggestionType} submitted — pending FLM review`,
        "success",
      );
      resetForm();
      if (returnTo) navigate(returnTo);
    } catch (err) {
      console.error("[NewSuggestion] submission failed:", err);
      toast.error("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeFields = () => {
    const props = { values: typeFields, onChange: handleTypeFieldChange, errors };
    const voiceProps = {
      activeVoiceField, voiceMode, onActivateVoice,
      voiceInterimField: voiceEngine.isListening ? listeningField : null,
      voiceInterimText: voiceEngine.interimText,
      voiceIsTranslating: false,
      voiceTranslatingLang: undefined,
    };

    switch (suggestionType) {
      case "Simple Suggestion Scheme":
        return <SimpleSuggestionFields {...props} {...voiceProps} />;
      case "Shop Floor CIP":
        return <ShopFloorCIPFields {...props} {...voiceProps} />;
      case "My Idea Card":
        return <MyIdeaCardFields {...props} {...voiceProps} />;
      case "Daily CIP":
        return <DailyCIPFields {...props} {...voiceProps} />;
      case "Cash The Flash":
        return <CashTheFlashFields {...props} {...voiceProps} />;
      default:
        return null;
    }
  };

  const hasData = !!(suggestionType || Object.values(typeFields).some(v => v));

  return (
    <div className="flex flex-col h-full w-full max-w-5xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        {editingId ? "Edit Draft" : "New Suggestion"}
        <span className="text-sm font-normal text-muted-foreground"> / {t(editingId ? "Edit Draft" : "New Suggestion")}</span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-5">
          {/* Type Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Type of Suggestion <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Type of Suggestion")}</span></Label>
            {isClone || editingId ? (
              <div className="flex items-center gap-2">
                <Input value={suggestionType} readOnly className="bg-muted/50 flex-1" />
                {editingId && <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded px-2 py-1 font-medium whitespace-nowrap">Editing Draft</span>}
              </div>
            ) : (
              <Select value={suggestionType} onValueChange={handleTypeChange}>
                <SelectTrigger className={errors.suggestionType ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select suggestion type" />
                </SelectTrigger>
                <SelectContent>
                  {suggestionTypes.map(t => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {t}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.suggestionType && <p className="text-xs text-destructive">{errors.suggestionType}</p>}
          </div>

          {/* Show remaining fields only after type is selected */}
          {suggestionType && (
            <>
              {/* ── Voice input — enable toggle + per-field speak buttons ── */}
              {!!VOICE_FIELDS_MAP[suggestionType] && voiceEngine.supported && (
                voiceEnabled ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Voice language:</span>
                      <Select value={voiceLang} onValueChange={setVoiceLang}>
                        <SelectTrigger className="h-8 w-[220px] text-xs">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {VOICE_LANGUAGES.map(lang => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.flag} {lang.label} {lang.nativeName !== lang.label ? `(${lang.nativeName})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isNonEnglish && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-violet-600 bg-violet-500/[0.08] border border-violet-400/20 px-2 py-1 rounded-lg">
                          <Languages className="h-3 w-3" />
                          Web translate to English enabled
                        </span>
                      )}
                    </div>

                    {/* ── Main status bar ── */}
                    <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs transition-all duration-300 ${
                      voiceEngine.isListening
                        ? "border-rose-400/35 bg-rose-500/[0.04] shadow-sm shadow-rose-500/5"
                        : voiceEngine.status?.ok
                          ? "border-emerald-400/30 bg-emerald-500/[0.04]"
                          : voiceEngine.status
                            ? "border-amber-400/30 bg-amber-500/[0.04]"
                            : "border-primary/15 bg-primary/[0.03]"
                    }`}>
                      {/* Animated icon */}
                      <div className={`relative h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        voiceEngine.isListening ? "bg-rose-500 shadow-sm shadow-rose-500/30"
                          : voiceEngine.status?.ok ? "bg-emerald-500/15" : "bg-primary/10"
                      }`}>
                        {voiceEngine.isListening && (
                          <span className="absolute inset-0 rounded-full animate-ping pointer-events-none bg-rose-400/30" />
                        )}
                        {voiceEngine.isListening
                          ? <Mic className="h-3.5 w-3.5 text-white relative z-10" />
                          : voiceEngine.status?.ok
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            : <Mic className="h-3.5 w-3.5 text-primary" />
                        }
                      </div>
                      {/* Status text */}
                      <div className="flex-1 min-w-0">
                        {voiceEngine.isListening ? (
                          <p className="font-semibold text-foreground truncate">
                            Listening&nbsp;&mdash;&nbsp;
                            <span className="text-rose-500 font-bold">{ALL_VOICE_FIELD_LOOKUP[listeningField ?? ""]?.label ?? listeningField}</span>
                            <span className="font-normal text-muted-foreground/60 ml-1">
                              {voiceEngine.interimText ? "↓ typing in field…" : "speak now…"}
                            </span>
                          </p>
                        ) : voiceEngine.status ? (
                          <p className={`font-medium ${voiceEngine.status.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {voiceEngine.status.text}
                          </p>
                        ) : (
                          <p className="text-muted-foreground/70">
                            Tap&nbsp;
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted border border-border/50 text-foreground font-medium">
                              <Mic className="h-2.5 w-2.5" /> speak
                            </span>
                            &nbsp;on any field below to fill it by voice
                          </p>
                        )}
                      </div>
                      {/* Stop / exit */}
                      {voiceEngine.isListening ? (
                        <button type="button"
                          onClick={() => { voiceEngine.stopListening(); setListeningField(null); listeningFieldRef.current = null; }}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border bg-rose-500/10 border-rose-400/25 text-rose-500 hover:bg-rose-500/20 transition-colors">
                          <MicOff className="h-3 w-3" />
                          <span className="text-[10px] font-medium">stop</span>
                        </button>
                      ) : (
                        <button type="button" onClick={disableVoice}
                          className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors" title="Exit voice mode">
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
                    <span className="text-[10px] text-muted-foreground/40 font-normal">— speech to text</span>
                  </button>
                )
              )}

              {/* Global Fields */}
              <GlobalFields
                suggestionFor={suggestionFor}
                setSuggestionFor={setSuggestionFor}
                groupSuggestion={groupSuggestion}
                setGroupSuggestion={setGroupSuggestion}
                errors={errors}
                suggestionType={suggestionType}
                employeeNo={user?.employeeNo || ""}
                employeeName={user?.name || ""}
                department={user?.department || ""}
                area={user?.area || ""}
                derivedRange={derivedRange}
                mainSuggestor={mainSuggestor}
                setMainSuggestor={(v) => { setMainSuggestor(v); setErrors(prev => { const n = {...prev}; delete n.mainSuggestor; return n; }); }}
                teamMembers={teamMembers}
                setTeamMembers={(v) => {
                  setTeamMembers(v);
                  setErrors(prev => { const n = {...prev}; delete n.teamMembers; return n; });
                  // Auto-compute equal shares
                  if (v.length > 0) {
                    const share = Math.floor(100 / v.length);
                    const remainder = 100 - share * v.length;
                    const shares: Record<string, string> = {};
                    v.forEach((id, i) => { shares[id] = String(i === 0 ? share + remainder : share); });
                    setTeamMemberShares(shares);
                  } else {
                    setTeamMemberShares({});
                  }
                }}
                teamMemberShares={teamMemberShares}
                setTeamMemberShares={(v) => { setTeamMemberShares(v); setErrors(prev => { const n = {...prev}; delete n.teamMemberShares; return n; }); }}
                suggestionDepartment={suggestionDepartment}
                setSuggestionDepartment={(v) => { setSuggestionDepartment(v); setErrors(prev => { const n = {...prev}; delete n.suggestionDepartment; return n; }); }}
                sameAsMyDepartment={sameAsMyDepartment}
                setSameAsMyDepartment={setSameAsMyDepartment}
                allDepartments={uniqueDepartments}
              />

              {/* Dynamic Type-Specific Fields */}
              <Separator />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-secondary" />
                  {suggestionType} – Details
                </h3>
                <p className="text-xs text-muted-foreground">Fill in all mandatory fields marked with *</p>
              </div>
              {renderTypeFields()}

              {/* Other Information */}
              <Separator />
              <div className="rounded-xl border bg-gradient-to-br from-sky-50/50 via-background to-indigo-50/30 dark:from-sky-950/20 dark:via-background dark:to-indigo-950/10 p-5 space-y-4 shadow-sm">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm">
                    <Info className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-none">Other Information</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">/ ಇತರ ಮಾಹಿತಿ &nbsp;·&nbsp; Attachments &amp; submission details</p>
                  </div>
                </div>

                {/* Other Info textarea — full width */}
                <VoiceHighlight active={activeVoiceField === "otherInfo"} voiceMode={voiceMode} onActivate={() => onActivateVoice("otherInfo")}>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Other Info <span className="text-[10px] text-muted-foreground">(Optional)</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Other Info")}</span></Label>
                    <Textarea
                      value={listeningField === "otherInfo" && voiceEngine.interimText
                        ? (otherInfo ? otherInfo + " " + voiceEngine.interimText : voiceEngine.interimText)
                        : otherInfo}
                      onChange={e => setOtherInfo(e.target.value)}
                      placeholder="Any additional information…"
                      rows={2}
                      className={listeningField === "otherInfo" && voiceEngine.interimText ? "italic text-rose-600 dark:text-rose-400" : ""}
                    />
                  </div>
                </VoiceHighlight>

                {/* Attachments + FLM side by side on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Attachments */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      Attachments <span className="text-[10px] text-muted-foreground">(Max 5 · &lt;4MB each)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">/ {t("Attachments")}</span>
                    </Label>
                    <label className="flex w-fit items-center gap-1.5 px-3 py-2 text-xs border rounded-lg bg-background hover:bg-muted transition-colors cursor-pointer shadow-sm">
                      <Upload className="h-3.5 w-3.5" />
                      Choose Files
                      <input type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.mp4,.mp3" onChange={handleFileChange} />
                    </label>
                    <p className="text-[10px] text-muted-foreground">{attachmentItems.length} / 5 files attached</p>
                    {errors.attachments && <p className="text-xs text-destructive">{errors.attachments}</p>}
                    {attachmentItems.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachmentItems.map((f, i) => (
                          <span key={f.id} className="inline-flex items-center gap-1 text-xs bg-muted border px-2 py-1 rounded-md">
                            <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="max-w-[140px] truncate">{f.name}</span>
                            <button type="button" onClick={() => removeFile(i)} className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Select Approver (FLM) — only for applicable form types */}
                  {["Simple Suggestion Scheme", "My Idea Card", "Cash The Flash", "Shop Floor CIP"].includes(suggestionType) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Select Approver <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Select Approver")}</span></Label>
                      <SuggestionCombobox
                        options={flmOptions.filter(f => f.value !== user?.employeeNo).map(f => ({ value: f.value, label: f.label }))}
                        value={typeFields.flm || ""}
                        onChange={v => handleTypeFieldChange("flm", v)}
                        placeholder="Search by name or emp no..."
                        className={errors.flm ? "[&_input]:border-destructive" : ""}
                      />
                      {errors.flm && <p className="text-xs text-destructive">{errors.flm}</p>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <Separator />
          <div className="flex gap-3 pt-1">
            {hasData && (
              <Button variant="ghost" onClick={() => setShowResetConfirm(true)} className="gap-1.5 text-muted-foreground" disabled={isSubmitting || isScanning}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset <span className="text-[10px] opacity-60">/ {t("Reset")}</span>
              </Button>
            )}
            <Button variant="outline" onClick={handleSave} className="gap-1.5" disabled={isSubmitting || isScanning}>
              <Save className="h-3.5 w-3.5" />
              Save Draft <span className="text-[10px] opacity-60">/ {t("Save Draft")}</span>
            </Button>
            <Button onClick={handleSubmit} className="gap-1.5" disabled={isSubmitting || isScanning || !suggestionType}>
              <Send className="h-3.5 w-3.5" />
              {isScanning
                ? <><span className="animate-pulse">🔍 Scanning for duplicates…</span></>
                : isSubmitting
                ? "Submitting…"
                : <>Submit <span className="text-[10px] opacity-60">/ {t("Submit")}</span></>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all entered data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { resetForm(); setShowResetConfirm(false); if (returnTo) navigate(returnTo); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate detection alert */}
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

export default NewSuggestion;
