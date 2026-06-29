import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
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

const CashTheFlashFields = ({ values, onChange, errors, activeVoiceField, voiceMode, onActivateVoice, voiceInterimField, voiceInterimText, voiceIsTranslating, voiceTranslatingLang }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { categories } = useCategories();
  const hi = (key: string) => activeVoiceField === key;
  const va = (key: string) => ({ voiceMode, onActivate: () => onActivateVoice?.(key), isTranslating: hi(key) && voiceIsTranslating, translatingLang: voiceTranslatingLang });
  const iv = (name: string) => voiceInterimField === name && voiceInterimText
    ? (values[name] ? values[name] + " " + voiceInterimText : voiceInterimText)
    : (values[name] || "");
  const vc = (name: string) => voiceInterimField === name && voiceInterimText ? "italic text-rose-600 dark:text-rose-400" : "";

  return (
    <div className="space-y-4">
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

      <VoiceHighlight active={hi("presentMethod")} {...va("presentMethod")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Present / Before Method <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Present / Before Method")}</span></Label>
          <Textarea
            value={iv("presentMethod")}
            onChange={e => onChange("presentMethod", e.target.value)}
            placeholder="Describe the current method"
            rows={3}
            className={`${errors.presentMethod ? "border-destructive" : ""} ${vc("presentMethod")}`}
          />
          {errors.presentMethod && <p className="text-xs text-destructive">{errors.presentMethod}</p>}
        </div>
      </VoiceHighlight>

      <VoiceHighlight active={hi("proposedMethod")} {...va("proposedMethod")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Proposed / After Method <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Proposed / After Method")}</span></Label>
          <Textarea
            value={iv("proposedMethod")}
            onChange={e => onChange("proposedMethod", e.target.value)}
            placeholder="Describe the proposed method"
            rows={3}
            className={`${errors.proposedMethod ? "border-destructive" : ""} ${vc("proposedMethod")}`}
          />
          {errors.proposedMethod && <p className="text-xs text-destructive">{errors.proposedMethod}</p>}
        </div>
      </VoiceHighlight>

      <VoiceHighlight active={hi("benefits")} {...va("benefits")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Benefits <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Benefits")}</span></Label>
          <Textarea
            value={iv("benefits")}
            onChange={e => onChange("benefits", e.target.value)}
            placeholder="Describe the benefits"
            rows={2}
            className={`${errors.benefits ? "border-destructive" : ""} ${vc("benefits")}`}
          />
          {errors.benefits && <p className="text-xs text-destructive">{errors.benefits}</p>}
        </div>
      </VoiceHighlight>

      <div className="space-y-1.5">
        <Label className="text-xs">Suggestor Name <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestor Name")}</span></Label>
        <Input value={user?.name ?? ""} disabled className="bg-muted" />
      </div>

      <VoiceHighlight active={hi("sharePercent")} {...va("sharePercent")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Share % <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Share %")}</span></Label>
          <Input
            type="text" inputMode="numeric"
            value={values.sharePercent || ""}
            onChange={e => onChange("sharePercent", e.target.value)}
            placeholder="0100 (total must equal 100)"
            className={errors.sharePercent ? "border-destructive" : ""}
          />
          {errors.sharePercent && <p className="text-xs text-destructive">{errors.sharePercent}</p>}
        </div>
      </VoiceHighlight>
    </div>
  );
};

export default CashTheFlashFields;
