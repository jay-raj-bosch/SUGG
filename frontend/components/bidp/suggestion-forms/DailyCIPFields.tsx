import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories } from "@/contexts/CategoryContext";
import VoiceHighlight from "@/components/VoiceHighlight";
import { type AttachmentItem, filesToAttachmentItems } from "@/lib/attachmentUtils";
import { validateFiles } from "@/lib/fileSecurityUtils";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const MAX_SIZE = 4 * 1024 * 1024;

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

const ImageUploadSection = ({
  label, translatedLabel, files, fieldName, onChange, error,
}: {
  label: string; translatedLabel: string; files: AttachmentItem[];
  fieldName: string; onChange: (field: string, value: any) => void; error?: string;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const invalid = selected.find(f => !IMAGE_TYPES.includes(f.type));
    if (invalid) { toast.error("Only JPG/PNG images are allowed"); return; }
    const oversized = selected.find(f => f.size > MAX_SIZE);
    if (oversized) { toast.error(`Image "${oversized.name}" exceeds 4MB`); return; }
    // Security validation: block double extensions & dangerous files
    const validation = validateFiles(selected, { imageOnly: true, maxSizeMB: 4 });
    if (!validation.valid) { toast.error(validation.error!); return; }
    onChange(fieldName, [...files, ...filesToAttachmentItems(selected)]);
    e.target.value = "";
  };
  const removeFile = (index: number) => onChange(fieldName, files.filter((_, i) => i !== index));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label} <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {translatedLabel}</span></Label>
      <div className={`border-2 border-dashed rounded-lg p-4 text-center ${error ? "border-destructive" : "border-muted-foreground/25"}`}>
        {files.length === 0 ? (
          <label className="cursor-pointer flex flex-col items-center gap-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Click to upload images (JPG/PNG only)</span>
            <input type="file" className="hidden" accept=".jpg,.jpeg,.png" multiple onChange={handleChange} />
          </label>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 justify-center">
              {files.map((f, i) => (
                <div key={f.id} className="relative group">
                  <img src={f.url} alt={f.name} className="h-20 w-20 object-cover rounded border" />
                  <button type="button" onClick={() => removeFile(i)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-muted transition-colors">
              <Upload className="h-3.5 w-3.5" />Add More
              <input type="file" className="hidden" accept=".jpg,.jpeg,.png" multiple onChange={handleChange} />
            </label>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

const DailyCIPFields = ({ values, onChange, errors, activeVoiceField, voiceMode, onActivateVoice, voiceInterimField, voiceInterimText, voiceIsTranslating, voiceTranslatingLang }: Props) => {
  const { t } = useLanguage();
  const { categories } = useCategories();
  const today = new Date().toISOString().split("T")[0];
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

      <div className="space-y-1.5">
        <Label className="text-xs">Category <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Category")}</span></Label>
        <Select value={values.category || ""} onValueChange={v => onChange("category", v)}>
          <SelectTrigger className={errors.category ? "border-destructive" : ""}><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
      </div>

      <VoiceHighlight active={hi("machineNoArea")} {...va("machineNoArea")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Machine No / Area of Improvement <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Machine No / Area of Improvement")}</span></Label>
          <Input
            value={iv("machineNoArea")}
            onChange={e => onChange("machineNoArea", e.target.value)}
            placeholder="Enter machine no or area"
            className={`${errors.machineNoArea ? "border-destructive" : ""} ${vc("machineNoArea")}`}
          />
          {errors.machineNoArea && <p className="text-xs text-destructive">{errors.machineNoArea}</p>}
        </div>
      </VoiceHighlight>

      <VoiceHighlight active={hi("suggestionDescription")} {...va("suggestionDescription")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Suggestion Description <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion Description")}</span></Label>
          <Textarea
            value={iv("suggestionDescription")}
            onChange={e => onChange("suggestionDescription", e.target.value)}
            placeholder="Describe the suggestion"
            rows={3}
            className={`${errors.suggestionDescription ? "border-destructive" : ""} ${vc("suggestionDescription")}`}
          />
          {errors.suggestionDescription && <p className="text-xs text-destructive">{errors.suggestionDescription}</p>}
        </div>
      </VoiceHighlight>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUploadSection label="Photos  Before" translatedLabel={t("Photos  Before")} files={values.photosBefore || []} fieldName="photosBefore" onChange={onChange} error={errors.photosBefore} />
        <ImageUploadSection label="Photos  After" translatedLabel={t("Photos  After")} files={values.photosAfter || []} fieldName="photosAfter" onChange={onChange} error={errors.photosAfter} />
      </div>

      <VoiceHighlight active={hi("actionTaken")} {...va("actionTaken")}>
        <div className="space-y-1.5">
          <Label className="text-xs">Action Taken <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Action Taken")}</span></Label>
          <Textarea
            value={iv("actionTaken")}
            onChange={e => onChange("actionTaken", e.target.value)}
            placeholder="Describe action taken"
            rows={3}
            className={`${errors.actionTaken ? "border-destructive" : ""} ${vc("actionTaken")}`}
          />
          {errors.actionTaken && <p className="text-xs text-destructive">{errors.actionTaken}</p>}
        </div>
      </VoiceHighlight>
    </div>
  );
};

export default DailyCIPFields;
