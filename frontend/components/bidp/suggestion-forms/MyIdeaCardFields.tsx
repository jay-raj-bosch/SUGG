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
  activeVoiceField?: string | null;
  voiceMode?: boolean;
  onActivateVoice?: (key: string) => void;
  voiceInterimField?: string | null;
  voiceInterimText?: string;
  voiceIsTranslating?: boolean;
  voiceTranslatingLang?: string;
}

const MyIdeaCardFields = ({ values, onChange, errors, activeVoiceField, voiceMode, onActivateVoice, voiceInterimField, voiceInterimText, voiceIsTranslating, voiceTranslatingLang }: Props) => {
  const { t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const { categories } = useCategories();
  const hi = (key: string) => activeVoiceField === key;
  const va = (key: string) => ({ voiceMode, onActivate: () => onActivateVoice?.(key), isTranslating: hi(key) && voiceIsTranslating, translatingLang: voiceTranslatingLang });
  const iv = (name: string) => voiceInterimField === name && voiceInterimText
    ? (values[name] ? values[name] + " " + voiceInterimText : voiceInterimText)
    : (values[name] || "");
  const vc = (name: string) => voiceInterimField === name && voiceInterimText ? "italic text-rose-600 dark:text-rose-400" : "";

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

      <VoiceHighlight active={hi("subject")} {...va("subject")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Suggestion Subject <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion Subject")}</span></Label>
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
        <Label className="text-xs">Category <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Category")}</span></Label>
        <Select value={values.category || ""} onValueChange={v => onChange("category", v)}>
          <SelectTrigger className={errors.category ? "border-destructive" : ""}><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
      </div>

      <VoiceHighlight active={hi("descriptionProblem")} {...va("descriptionProblem")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Description  Idea / Problem <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Description  Idea / Problem")}</span></Label>
          <Textarea
            value={iv("descriptionProblem")}
            onChange={e => onChange("descriptionProblem", e.target.value)}
            placeholder="Minimum 20 characters"
            rows={3}
            className={`${errors.descriptionProblem ? "border-destructive" : ""} ${vc("descriptionProblem")}`}
          />
          <p className="text-xs text-muted-foreground">{(values.descriptionProblem || "").length}/20 min characters</p>
          {errors.descriptionProblem && <p className="text-xs text-destructive">{errors.descriptionProblem}</p>}
        </div>
      </VoiceHighlight>

      <VoiceHighlight active={hi("descriptionImprovement")} {...va("descriptionImprovement")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Description  Improvement Done <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Description  Improvement Done")}</span></Label>
          <Textarea
            value={iv("descriptionImprovement")}
            onChange={e => onChange("descriptionImprovement", e.target.value)}
            placeholder="Minimum 20 characters"
            rows={3}
            className={`${errors.descriptionImprovement ? "border-destructive" : ""} ${vc("descriptionImprovement")}`}
          />
          <p className="text-xs text-muted-foreground">{(values.descriptionImprovement || "").length}/20 min characters</p>
          {errors.descriptionImprovement && <p className="text-xs text-destructive">{errors.descriptionImprovement}</p>}
        </div>
      </VoiceHighlight>

      <VoiceHighlight active={hi("benefits")} {...va("benefits")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Benefits <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Benefits")}</span></Label>
          <Textarea
            value={iv("benefits")}
            onChange={e => onChange("benefits", e.target.value)}
            placeholder="Enter benefits"
            rows={2}
            className={`${errors.benefits ? "border-destructive" : ""} ${vc("benefits")}`}
          />
          {errors.benefits && <p className="text-xs text-destructive">{errors.benefits}</p>}
        </div>
      </VoiceHighlight>
    </div>
  );
};

export default MyIdeaCardFields;
