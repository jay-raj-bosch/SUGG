import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moderatorOptions, kaizenThemes } from "@/lib/bidp/suggestionConstants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories } from "@/contexts/CategoryContext";
import { Search } from "lucide-react";
import VoiceHighlight from "@/components/VoiceHighlight";

interface Props {
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  activeVoiceField?: string | null;
  voiceMode?: boolean;
  onActivateVoice?: (key: string) => void;
  voiceInterimField?: string | null;
  voiceInterimText?: string;
  voiceIsTranslating?: boolean;
  voiceTranslatingLang?: string;
}

const ShopFloorCIPFields = ({ values, onChange, errors, activeVoiceField, voiceMode, onActivateVoice, voiceInterimField, voiceInterimText, voiceIsTranslating, voiceTranslatingLang }: Props) => {
  const { t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const { categories } = useCategories();
  const hi = (key: string) => activeVoiceField === key;
  const va = (key: string) => ({ voiceMode, onActivate: () => onActivateVoice?.(key), isTranslating: hi(key) && voiceIsTranslating, translatingLang: voiceTranslatingLang });
  const iv = (name: string) => voiceInterimField === name && voiceInterimText
    ? (values[name] ? values[name] + " " + voiceInterimText : voiceInterimText)
    : (values[name] || "");
  const vc = (name: string) => voiceInterimField === name && voiceInterimText ? "italic text-rose-600 dark:text-rose-400" : "";

  const [moderatorSearch, setModeratorSearch] = useState("");
  const [moderatorOpen, setModeratorOpen] = useState(false);
  const moderatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moderatorRef.current && !moderatorRef.current.contains(e.target as Node)) {
        setModeratorOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const textArea = (name: string, label: string) => (
    <VoiceHighlight key={name} active={hi(name)} {...va(name)}>
      <div className="space-y-1.5">
        <Label className="text-xs">{label} <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t(label)}</span></Label>
        <Textarea
          value={iv(name)}
          onChange={e => onChange(name, e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          rows={3}
          className={`${errors[name] ? "border-destructive" : ""} ${vc(name)}`}
        />
        {errors[name] && <p className="text-xs text-destructive">{errors[name]}</p>}
      </div>
    </VoiceHighlight>
  );

  const selectedModerator: string = Array.isArray(values.moderators)
    ? (values.moderators[0] || "")
    : (values.moderator || values.moderators || "");
  const selectedLabel = moderatorOptions.find(m => m.value === selectedModerator)?.label || "";

  const filteredModerators = useMemo(() => {
    if (!moderatorSearch.trim()) return moderatorOptions;
    const q = moderatorSearch.toLowerCase();
    return moderatorOptions.filter(m => m.label.toLowerCase().includes(q) || m.value.toLowerCase().includes(q));
  }, [moderatorSearch]);

  const selectModerator = (empId: string) => {
    onChange("moderator", empId);
    onChange("moderators", empId ? [empId] : []);
    setModeratorSearch("");
    setModeratorOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Date of Implementation <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Date of Implementation")}</span></Label>
        <Input
          type="date"
          value={values.dateOfImplementation || ""}
          onChange={e => onChange("dateOfImplementation", e.target.value)}
          max={today}
          className={errors.dateOfImplementation ? "border-destructive" : ""}
        />
        {errors.dateOfImplementation && <p className="text-xs text-destructive">{errors.dateOfImplementation}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Name of Moderator <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Name of Moderator")}</span></Label>
        <div className="relative" ref={moderatorRef}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={moderatorOpen ? moderatorSearch : selectedLabel}
            onChange={e => {
              setModeratorSearch(e.target.value);
              setModeratorOpen(true);
              if (!e.target.value) { onChange("moderator", ""); onChange("moderators", []); }
            }}
            onFocus={() => { setModeratorOpen(true); setModeratorSearch(""); }}
            placeholder="Search moderator by name or ID..."
            className={`pl-8 ${errors.moderator || errors.moderators ? "border-destructive" : ""}`}
          />
          {moderatorOpen && (
            <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
              {filteredModerators.length > 0 ? filteredModerators.map(m => (
                <button
                  key={m.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer ${selectedModerator === m.value ? "bg-accent/50 font-medium" : ""}`}
                  onMouseDown={e => { e.preventDefault(); selectModerator(m.value); }}
                >
                  {m.label}
                </button>
              )) : (
                <div className="p-3 text-xs text-muted-foreground text-center">No moderators found</div>
              )}
            </div>
          )}
        </div>
        {(errors.moderator || errors.moderators) && <p className="text-xs text-destructive">{errors.moderator || errors.moderators}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Kaizen Theme <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Kaizen Theme")}</span></Label>
        <Select value={values.kaizenTheme || ""} onValueChange={v => onChange("kaizenTheme", v)}>
          <SelectTrigger className={errors.kaizenTheme ? "border-destructive" : ""}><SelectValue placeholder="Select theme" /></SelectTrigger>
          <SelectContent>{kaizenThemes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        {errors.kaizenTheme && <p className="text-xs text-destructive">{errors.kaizenTheme}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Category <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Category")}</span></Label>
        <Select value={values.category || ""} onValueChange={v => onChange("category", v)}>
          <SelectTrigger className={errors.category ? "border-destructive" : ""}><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
      </div>

      {textArea("problemStatus",           "Problem / Present Status")}
      {textArea("beforeImprovement",       "Before Improvement")}
      {textArea("afterImprovement",        "After Improvement")}
      {textArea("benefits",                "Benefits")}
      {textArea("rootCauseIdentification", "Real Root Cause Identification")}
      {textArea("standardization",         "Standardization")}
      {textArea("rootCause",               "Root Cause")}
      {textArea("ideaToEliminate",         "Idea to Eliminate Root Cause")}
      {textArea("actionTaken",             "Action Taken")}

      <VoiceHighlight active={hi("horizontalDeployment")} {...va("horizontalDeployment")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Horizontal Deployment Count <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Horizontal Deployment Count")}</span></Label>
          <Input
            type="text" inputMode="numeric"
            value={values.horizontalDeployment || ""}
            onChange={e => onChange("horizontalDeployment", e.target.value)}
            placeholder="Enter positive integer"
            className={errors.horizontalDeployment ? "border-destructive" : ""}
          />
          {errors.horizontalDeployment && <p className="text-xs text-destructive">{errors.horizontalDeployment}</p>}
        </div>
      </VoiceHighlight>
    </div>
  );
};

export default ShopFloorCIPFields;
