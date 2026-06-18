import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categories } from "@/lib/mockData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories } from "@/contexts/CategoryContext";
import VoiceHighlight from "@/components/VoiceHighlight";

interface Props {
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
  /** Key of the field currently targeted by the page-level voice controller */
  activeVoiceField?: string | null;
  voiceMode?: boolean;
  onActivateVoice?: (key: string) => void;
  /** Field key currently being listened to (for live interim text in the input) */
  voiceInterimField?: string | null;
  /** Live interim transcript — shown directly inside the field while speaking */
  voiceInterimText?: string;
  /** Whether the voice engine is currently translating */
  voiceIsTranslating?: boolean;
  /** Source language name when translating (e.g. "Hindi") */
  voiceTranslatingLang?: string;
}

const SimpleSuggestionFields = ({ values, onChange, errors, activeVoiceField, voiceMode, onActivateVoice, voiceInterimField, voiceInterimText, voiceIsTranslating, voiceTranslatingLang }: Props) => {
  const { t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const { categories } = useCategories();

  const hi = (key: string) => activeVoiceField === key;
  /** Returns live interim text for this field while listening, else the saved value */
  const iv = (name: string) => voiceInterimField === name && voiceInterimText
    ? (values[name] ? values[name] + " " + voiceInterimText : voiceInterimText)
    : (values[name] || "");
  /** Extra className when interim text is being shown */
  const vc = (name: string) => voiceInterimField === name && voiceInterimText ? "italic text-rose-600 dark:text-rose-400" : "";

  const textareaBlock = (name: string, label: string, required = true) => (
    <VoiceHighlight active={hi(name)} voiceMode={voiceMode} onActivate={() => onActivateVoice?.(name)} isTranslating={hi(name) && voiceIsTranslating} translatingLang={voiceTranslatingLang}>
      <div className="space-y-1.5">
        <Label className="text-xs">
          {label}{" "}{required && <span className="text-destructive">*</span>}{" "}
          <span className="text-[10px] text-muted-foreground font-normal">/ {t(label)}</span>
        </Label>
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

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">
          Date of Implementation <span className="text-destructive">*</span>{" "}
          <span className="text-[10px] text-muted-foreground font-normal">/ {t("Date of Implementation")}</span>
        </Label>
        <Input
          type="date"
          value={values.dateOfImplementation || ""}
          onChange={e => onChange("dateOfImplementation", e.target.value)}
          max={today}
          className={errors.dateOfImplementation ? "border-destructive" : ""}
        />
        {errors.dateOfImplementation && <p className="text-xs text-destructive">{errors.dateOfImplementation}</p>}
      </div>

      <VoiceHighlight active={hi("subject")} voiceMode={voiceMode} onActivate={() => onActivateVoice?.("subject")} isTranslating={hi("subject") && voiceIsTranslating} translatingLang={voiceTranslatingLang}>
        <div className="space-y-1.5">
          <Label className="text-xs">
            Suggestion Subject <span className="text-destructive">*</span>{" "}
            <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion Subject")}</span>
          </Label>
          <Input
            value={iv("subject")}
            onChange={e => onChange("subject", e.target.value)}
            placeholder="Enter suggestion subject"
            className={`${errors.subject ? "border-destructive" : ""} ${vc("subject")}`}
          />
          {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
        </div>
      </VoiceHighlight>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Category <span className="text-destructive">*</span>{" "}
          <span className="text-[10px] text-muted-foreground font-normal">/ {t("Category")}</span>
        </Label>
        <Select value={values.category || ""} onValueChange={v => onChange("category", v)}>
          <SelectTrigger className={errors.category ? "border-destructive" : ""}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
      </div>

      {textareaBlock("presentMethod",  "Details of present Method")}
      {textareaBlock("proposedMethod", "Details of proposed Method")}
      {textareaBlock("benefits",       "Benefits")}
    </div>
  );
};

export default SimpleSuggestionFields;
