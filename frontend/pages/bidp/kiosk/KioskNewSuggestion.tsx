import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { suggestionTypes } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useDeptMappings } from "@/contexts/DeptMappingContext";
import { toast } from "sonner";
import { Send, Save, RotateCcw } from "lucide-react";
import { schemaMap } from "@/lib/bidp/suggestionSchemas";
import { ZodError } from "zod";
import { useNavigate } from "react-router-dom";
import { validateFiles } from "@/lib/fileSecurityUtils";
import GlobalFields from "@/components/bidp/suggestion-forms/GlobalFields";
import SimpleSuggestionFields from "@/components/bidp/suggestion-forms/SimpleSuggestionFields";
import ShopFloorCIPFields from "@/components/bidp/suggestion-forms/ShopFloorCIPFields";
import MyIdeaCardFields from "@/components/bidp/suggestion-forms/MyIdeaCardFields";
import DailyCIPFields from "@/components/bidp/suggestion-forms/DailyCIPFields";
import CashTheFlashFields from "@/components/bidp/suggestion-forms/CashTheFlashFields";
import { AttachmentItem, filesToAttachmentItems } from "@/lib/attachmentUtils";
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
  const [typeFields, setTypeFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsMyDepartment, setSameAsMyDepartment] = useState(true);
  const [suggestionDepartment, setSuggestionDepartment] = useState("");
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
    const validation = validateFiles(selected, { maxFiles: 5 - attachmentItems.length, maxSizeMB: 4 });
    if (!validation.valid) { toast.error(validation.error!); return; }
    setAttachmentItems(prev => [...prev, ...filesToAttachmentItems(selected)]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachmentItems(prev => prev.filter((_, i) => i !== index));
  };

  const { mapDept, uniqueDepartments } = useDeptMappings();
  const derivedRange = useMemo(() => {
    const dept = user?.department || "";
    const mapped = mapDept(dept);
    return mapped === "—" ? "" : mapped;
  }, [user?.department, mapDept]);

  useEffect(() => {
    if (sameAsMyDepartment && user?.department) {
      setSuggestionDepartment(user.department);
    }
  }, [sameAsMyDepartment, user?.department]);

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
    setMainSuggestor(""); setTeamMembers([]); setTeamMemberShares({}); setTypeFields({}); setErrors({});
    setSameAsMyDepartment(true); setSuggestionDepartment(user?.department || "");
  };

  const handleSubmit = async (asDraft = false) => {
    if (!suggestionType) { toast.error("Please select a suggestion type"); return; }
    const schema = !asDraft ? schemaMap[suggestionType] : null;
    if (schema) {
      try { schema.parse(typeFields); }
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
    try {
      // await addSuggestion so the context state is updated BEFORE we reset
      // the form. This prevents back-to-back submissions from colliding.
      await addSuggestion({
        suggestionNo: "",
        date: new Date().toISOString().split("T")[0],
        subject: typeFields.subject || typeFields.machineNoArea || "(no subject)",
        presentMethod: typeFields.presentMethod || typeFields.suggestionDescription || typeFields.descriptionProblem || "",
        proposedMethod: typeFields.proposedMethod || typeFields.afterImprovement || "",
        type: suggestionType,
        category: typeFields.category || "General",
        range: derivedRange || "BIDP1",
        benefits: typeFields.benefits || "",
        employeeName: user?.name || "",
        employeeNo: user?.employeeNo || "",
        department: user?.department || "",
        suggestionDepartment: suggestionDepartment || user?.department || "",
        status: asDraft ? "Draft" : "Submitted",
        formData: { suggestionType, range: derivedRange, suggestionFor, groupSuggestion, otherInfo: typeFields.otherInfo || "", mainSuggestor, teamMembers, typeFields, suggestionDepartment: suggestionDepartment || user?.department || "", sameAsMyDepartment },
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
                suggestionDepartment={suggestionDepartment}
                setSuggestionDepartment={(v) => { setSuggestionDepartment(v); setErrors(prev => { const n = {...prev}; delete n.suggestionDepartment; return n; }); }}
                sameAsMyDepartment={sameAsMyDepartment}
                setSameAsMyDepartment={setSameAsMyDepartment}
                allDepartments={uniqueDepartments}
              />
              {renderTypeFields()}
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
