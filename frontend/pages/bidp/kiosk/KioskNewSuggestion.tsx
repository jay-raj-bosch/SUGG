import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { suggestionTypes } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { toast } from "sonner";
import { Send, Save, RotateCcw, Upload, X, Paperclip, Info } from "lucide-react";
import { schemaMap } from "@/lib/bidp/suggestionSchemas";
import { ZodError } from "zod";
import { useNavigate } from "react-router-dom";
import { flmOptions } from "@/lib/bidp/suggestionConstants";
import { AttachmentItem, filesToAttachmentItems } from "@/lib/attachmentUtils";
import { validateFiles } from "@/lib/fileSecurityUtils";

import GlobalFields from "@/components/bidp/suggestion-forms/GlobalFields";
import SimpleSuggestionFields from "@/components/bidp/suggestion-forms/SimpleSuggestionFields";
import ShopFloorCIPFields from "@/components/bidp/suggestion-forms/ShopFloorCIPFields";
import MyIdeaCardFields from "@/components/bidp/suggestion-forms/MyIdeaCardFields";
import DailyCIPFields from "@/components/bidp/suggestion-forms/DailyCIPFields";
import CashTheFlashFields from "@/components/bidp/suggestion-forms/CashTheFlashFields";

const getGroupDefault = (type: string): string => {
  if (type === "Shop Floor CIP") return "yes";
  if (type === "My Idea Card" || type === "Daily CIP") return "no";
  return "no";
};

const KioskNewSuggestion = () => {
  const { user } = useAuth();
  const { addSuggestion } = useSuggestions();
  const navigate = useNavigate();

  const [suggestionType, setSuggestionType] = useState("");
  const [suggestionFor, setSuggestionFor] = useState("self");
  const [groupSuggestion, setGroupSuggestion] = useState("no");
  const [mainSuggestor, setMainSuggestor] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teamMemberShares, setTeamMemberShares] = useState<Record<string, string>>({});
  const [typeFields, setTypeFields] = useState<Record<string, any>>({});
  const [otherInfo, setOtherInfo] = useState("");
  const [attachmentItems, setAttachmentItems] = useState<AttachmentItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const validation = validateFiles(selected, { maxFiles: 5 - attachmentItems.length, maxSizeMB: 4 });
    if (!validation.valid) { toast.error(validation.error!); return; }
    setAttachmentItems(prev => [...prev, ...filesToAttachmentItems(selected)]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachmentItems(prev => prev.filter((_, i) => i !== index));
  };

  const derivedRange = useMemo(() => {
    const parts = (user?.department || "").split("/");
    return parts.length > 1 ? parts[1] : "";
  }, [user?.department]);

  const handleTypeChange = (t: string) => {
    setSuggestionType(t);
    setGroupSuggestion(getGroupDefault(t));
    setTypeFields({});
    setErrors({});
  };

  const handleFieldChange = useCallback((field: string, value: string) => {
    setTypeFields(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const handleReset = () => {
    setSuggestionType(""); setSuggestionFor("self"); setGroupSuggestion("no");
    setMainSuggestor(""); setTeamMembers([]); setTeamMemberShares({});
    setTypeFields({}); setOtherInfo(""); setAttachmentItems([]); setErrors({});
  };

  const today = new Date().toISOString().split("T")[0];

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
    ...typeFields,
  });

  const handleSubmit = async (asDraft = false) => {
    if (!suggestionType) { toast.error("Please select a suggestion type"); return; }
    const schema = !asDraft ? schemaMap[suggestionType] : null;
    if (schema) {
      try { schema.parse(buildPayload()); }
      catch (e) {
        if (e instanceof ZodError) {
          const errs: Record<string, string> = {};
          e.errors.forEach(err => { if (err.path[0]) errs[String(err.path[0])] = err.message; });
          setErrors(errs);
          toast.error("Please fix the highlighted fields");
          return;
        }
      }
    }
    setIsSubmitting(true);
    const isDCIP = suggestionType === "Daily CIP";
    const selectedFlm = flmOptions.find(f => f.value === typeFields.flm);
    const flmDisplayName = selectedFlm?.name || "Pending Review";
    try {
      addSuggestion({
        suggestionNo: "",
        date: today,
        subject: typeFields.subject || typeFields.kaizenTheme || typeFields.machineNoArea || "(no subject)",
        presentMethod: typeFields.presentMethod || typeFields.problemStatus || typeFields.beforeImprovement || typeFields.suggestionDescription || typeFields.descriptionProblem || "",
        proposedMethod: typeFields.proposedMethod || typeFields.afterImprovement || typeFields.descriptionImprovement || "",
        type: suggestionType,
        category: typeFields.category || "General",
        range: derivedRange || "BIDP1",
        benefits: typeFields.benefits || "",
        employeeName: user?.name || "",
        employeeNo: user?.employeeNo || "",
        department: user?.department || "",
        status: asDraft ? "Draft" : isDCIP ? "Approved & Closed" : "Submitted",
        pendingWith: asDraft || isDCIP ? undefined : `FLM - ${flmDisplayName}`,
        assignedFlm: asDraft || isDCIP ? undefined : (typeFields.flm || ""),
        approvalLevel: asDraft || isDCIP ? undefined : "FLM",
        daysPending: asDraft || isDCIP ? undefined : 0,
        pendingSince: asDraft || isDCIP ? undefined : today,
        formData: { suggestionType, range: derivedRange, suggestionFor, groupSuggestion, otherInfo, mainSuggestor, teamMembers, teamMemberShares, typeFields, attachmentItems },
      });
      toast.success(asDraft ? "Draft saved!" : "Suggestion submitted successfully!");
      handleReset();
      if (!asDraft) navigate("/bidp/kiosk/my-suggestions");
    } catch { toast.error("Failed. Please try again."); }
    finally { setIsSubmitting(false); }
  };

  const sharedProps = { values: typeFields, onChange: handleFieldChange, errors };

  const renderTypeFields = () => {
    switch (suggestionType) {
      case "Simple Suggestion Scheme": return <SimpleSuggestionFields {...sharedProps} />;
      case "Shop Floor CIP":           return <ShopFloorCIPFields {...sharedProps} />;
      case "My Idea Card":             return <MyIdeaCardFields {...sharedProps} />;
      case "Daily CIP":                return <DailyCIPFields {...sharedProps} />;
      case "Cash The Flash":           return <CashTheFlashFields {...sharedProps} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">New Suggestion</h1>
        <p className="text-sm text-muted-foreground">Tap any field — the keyboard appears at the bottom automatically</p>
      </div>

      {/* Employee details banner */}
      <Card className="border-primary/10 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap gap-6 text-sm">
          <div><span className="text-muted-foreground text-xs">Name</span><p className="font-semibold">{user?.name}</p></div>
          <div><span className="text-muted-foreground text-xs">Emp No</span><p className="font-mono font-semibold">{user?.employeeNo}</p></div>
          <div><span className="text-muted-foreground text-xs">Department</span><p className="font-semibold">{user?.department}</p></div>
          <div><span className="text-muted-foreground text-xs">Range</span><p className="font-semibold">{derivedRange || "—"}</p></div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="pt-5 space-y-5">
          <div className="space-y-2">
            <Label className="font-medium text-sm">
              Suggestion Type <span className="text-destructive">*</span>
            </Label>
            <Select value={suggestionType} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select suggestion type..." />
              </SelectTrigger>
              <SelectContent>
                {suggestionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {suggestionType && (
            <>
              <GlobalFields
                derivedRange={derivedRange}
                employeeNo={user?.employeeNo}
                employeeName={user?.name}
                department={user?.department}
                area={user?.area}
                suggestionFor={suggestionFor}
                setSuggestionFor={setSuggestionFor}
                groupSuggestion={groupSuggestion}
                setGroupSuggestion={setGroupSuggestion}
                errors={errors}
                suggestionType={suggestionType}
                mainSuggestor={mainSuggestor}
                setMainSuggestor={setMainSuggestor}
                teamMembers={teamMembers}
                setTeamMembers={setTeamMembers}
                teamMemberShares={teamMemberShares}
                setTeamMemberShares={setTeamMemberShares}
              />

              <Separator />

              {renderTypeFields()}

              {/* ── Other Information ─────────────────────────────────── */}
              <Separator />
              <div className="rounded-xl border bg-gradient-to-br from-sky-50/50 via-background to-indigo-50/30 dark:from-sky-950/20 dark:via-background dark:to-indigo-950/10 p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm">
                    <Info className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-none">Other Information</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">/ ಇತರ ಮಾಹಿತಿ &nbsp;·&nbsp; Attachments &amp; submission details</p>
                  </div>
                </div>

                {/* Other Info textarea */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Other Info <span className="text-[10px] text-muted-foreground">(Optional)</span></Label>
                  <Textarea
                    value={otherInfo}
                    onChange={e => setOtherInfo(e.target.value)}
                    placeholder="Any additional information…"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Attachments */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      Attachments <span className="text-[10px] text-muted-foreground">(Max 5 · &lt;4MB each)</span>
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
                            <button type="button" onClick={() => removeFile(i)} className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FLM selector for applicable form types */}
                  {["Simple Suggestion Scheme", "My Idea Card", "Cash The Flash", "Shop Floor CIP"].includes(suggestionType) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Select FLM <span className="text-destructive">*</span></Label>
                      <Select value={typeFields.flm || ""} onValueChange={v => handleFieldChange("flm", v)}>
                        <SelectTrigger className={errors.flm ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select FLM" />
                        </SelectTrigger>
                        <SelectContent>
                          {flmOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.flm && <p className="text-xs text-destructive">{errors.flm}</p>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      {suggestionType && (
        <div className="flex gap-3 flex-wrap pb-4">
          <Button className="h-11 px-6 gap-2" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
            <Send className="h-4 w-4" />{isSubmitting ? "Submitting..." : "Submit Suggestion"}
          </Button>
          <Button variant="outline" className="h-11 px-6 gap-2" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
            <Save className="h-4 w-4" />Save Draft
          </Button>
          <Button variant="ghost" className="h-11 px-6 gap-2" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />Reset
          </Button>
        </div>
      )}
    </div>
  );
};

export default KioskNewSuggestion;
