import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { mockEmployees } from "@/lib/mockData";
import { teamMemberOptions } from "@/lib/bidp/suggestionConstants";
import { X, Search, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface GlobalFieldsProps {
  /** Auto-derived from department (e.g. BIDP1/TEF → TEF) */
  derivedRange?: string;
  /** Logged-in employee info for header display */
  employeeNo?: string;
  employeeName?: string;
  department?: string;
  area?: string;
  suggestionFor: string;
  setSuggestionFor: (v: string) => void;
  groupSuggestion: string;
  setGroupSuggestion: (v: string) => void;
  errors: Record<string, string>;
  suggestionType?: string;
  // Main suggestor for on-behalf
  mainSuggestor?: string;
  setMainSuggestor?: (v: string) => void;
  // Team members for group suggestion
  teamMembers?: string[];
  setTeamMembers?: (v: string[]) => void;
  teamMemberShares?: Record<string, string>;
  setTeamMemberShares?: (v: Record<string, string>) => void;
  // Suggestion department — the department the suggestion is actually about
  suggestionDepartment?: string;
  setSuggestionDepartment?: (v: string) => void;
  sameAsMyDepartment?: boolean;
  setSameAsMyDepartment?: (v: boolean) => void;
  allDepartments?: string[];
}

// Employee options for searchable dropdown
const employeeOptions = mockEmployees.map(e => ({
  value: e.employeeNo,
  label: `${e.name} – ${e.employeeNo}`,
  sublabel: e.department,
}));

// All member options for team members (combine teamMemberOptions + mockEmployees for a richer list)
const allMemberOptions = [
  ...teamMemberOptions,
  ...mockEmployees
    .filter(e => !teamMemberOptions.find(t => t.value === e.employeeNo))
    .map(e => ({ value: e.employeeNo, label: `${e.name} – ${e.employeeNo}` })),
];

const GlobalFields = ({
  derivedRange,
  employeeNo, employeeName, department, area,
  suggestionFor, setSuggestionFor,
  groupSuggestion, setGroupSuggestion,
  errors,
  suggestionType,
  mainSuggestor, setMainSuggestor,
  teamMembers, setTeamMembers,
  teamMemberShares, setTeamMemberShares,
  suggestionDepartment, setSuggestionDepartment,
  sameAsMyDepartment, setSameAsMyDepartment,
  allDepartments,
}: GlobalFieldsProps) => {
  const today = new Date().toISOString().split("T")[0];
  const { t } = useLanguage();
  const [suggestorSearch, setSuggestorSearch] = useState("");
  const [suggestorOpen, setSuggestorOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const suggestorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestorRef.current && !suggestorRef.current.contains(e.target as Node)) {
        setSuggestorOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Determine if group suggestion is locked
  const isGroupLocked = suggestionType === "Shop Floor CIP" || suggestionType === "My Idea Card" || suggestionType === "Daily CIP";

  // Max team members per suggestion type
  const getMaxMembers = (): number => {
    switch (suggestionType) {
      case "Simple Suggestion Scheme": return 2;
      case "Shop Floor CIP":           return 7;
      case "My Idea Card":             return 1;
      case "Daily CIP":               return 1;
      case "Cash The Flash":          return 3;
      default:                         return Infinity;
    }
  };
  const maxMembers = getMaxMembers();

  // Filtered employees for main suggestor
  const filteredEmployees = useMemo(() => {
    if (!suggestorSearch.trim()) return employeeOptions;
    const q = suggestorSearch.toLowerCase();
    return employeeOptions.filter(e =>
      e.label.toLowerCase().includes(q) || e.sublabel.toLowerCase().includes(q)
    );
  }, [suggestorSearch]);

  // Filtered members for team members
  const selectedMembers = teamMembers || [];
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return allMemberOptions;
    const q = memberSearch.toLowerCase();
    return allMemberOptions.filter(m => m.label.toLowerCase().includes(q) || m.value.toLowerCase().includes(q));
  }, [memberSearch]);

  const toggleMember = (empId: string) => {
    if (!setTeamMembers) return;
    if (selectedMembers.includes(empId)) {
      setTeamMembers(selectedMembers.filter(id => id !== empId));
      if (setTeamMemberShares) {
        const next = { ...(teamMemberShares || {}) };
        delete next[empId];
        setTeamMemberShares(next);
      }
    } else {
      if (selectedMembers.length >= maxMembers) return; // limit reached
      setTeamMembers([...selectedMembers, empId]);
    }
  };

  const removeMember = (empId: string) => {
    if (!setTeamMembers) return;
    setTeamMembers(selectedMembers.filter(id => id !== empId));
    if (setTeamMemberShares) {
      const next = { ...(teamMemberShares || {}) };
      delete next[empId];
      setTeamMemberShares(next);
    }
  };

  const handleShareChange = (empId: string, value: string) => {
    if (!setTeamMemberShares) return;
    // Allow empty string while typing; otherwise clamp to 0–100
    if (value !== "") {
      const num = Number(value);
      if (isNaN(num)) return;           // reject non-numeric
      if (num < 0)   value = "0";
      if (num > 100) value = "100";
    }
    setTeamMemberShares({ ...(teamMemberShares || {}), [empId]: value });
  };

  const splitEqually = () => {
    if (!setTeamMemberShares || selectedMembers.length === 0) return;
    const share = Math.floor(100 / selectedMembers.length);
    const remainder = 100 - share * selectedMembers.length;
    const shares: Record<string, string> = {};
    selectedMembers.forEach((id, i) => {
      shares[id] = i === 0 ? String(share + remainder) : String(share);
    });
    setTeamMemberShares(shares);
  };

  const totalShare = selectedMembers.reduce((sum, id) => sum + (Number((teamMemberShares || {})[id]) || 0), 0);

  // Main suggestor display
  const selectedSuggestor = employeeOptions.find(e => e.value === mainSuggestor);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Suggestion Date <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion Date")}</span></Label>
          <Input value={today} disabled className="bg-muted" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Range <span className="text-[10px] text-muted-foreground font-normal">/ {t("Range")}</span></Label>
          <Input value={derivedRange || "—"} disabled className="bg-muted" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Suggestion For <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion For")}</span></Label>
          <RadioGroup value={suggestionFor} onValueChange={setSuggestionFor} className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="self" id="sf-self" />
              <Label htmlFor="sf-self" className="text-xs cursor-pointer">Self <span className="text-[10px] text-muted-foreground">/ {t("Self")}</span></Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="behalf" id="sf-behalf" />
              <Label htmlFor="sf-behalf" className="text-xs cursor-pointer">On Behalf <span className="text-[10px] text-muted-foreground">/ {t("On Behalf")}</span></Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Group Suggestion <span className="text-[10px] text-muted-foreground font-normal">/ {t("Group Suggestion")}</span></Label>
          {isGroupLocked ? (
            <div className="flex items-center gap-2">
              <Input value={groupSuggestion === "yes" ? "Yes" : "No"} disabled className="bg-muted w-20" />
              <span className="text-[10px] text-muted-foreground">(Auto-set for {suggestionType})</span>
            </div>
          ) : (
            <RadioGroup value={groupSuggestion} onValueChange={setGroupSuggestion} className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="yes" id="gs-yes" />
                <Label htmlFor="gs-yes" className="text-xs cursor-pointer">Yes <span className="text-[10px] text-muted-foreground">/ {t("Yes")}</span></Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="no" id="gs-no" />
                <Label htmlFor="gs-no" className="text-xs cursor-pointer">No <span className="text-[10px] text-muted-foreground">/ {t("No")}</span></Label>
              </div>
            </RadioGroup>
          )}
        </div>

        {setSuggestionDepartment && (
          <div className="space-y-1.5">
            <Label className="text-xs">Suggestion Department <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Suggestion Department")}</span></Label>
            <Select
              value={suggestionDepartment || ""}
              onValueChange={setSuggestionDepartment}
              disabled={!!sameAsMyDepartment}
            >
              <SelectTrigger className={`h-9 ${errors.suggestionDepartment ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                {(allDepartments || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {setSameAsMyDepartment && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <Checkbox
                  id="same-as-my-dept"
                  checked={!!sameAsMyDepartment}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setSameAsMyDepartment(isChecked);
                    if (isChecked && department) setSuggestionDepartment(department);
                  }}
                />
                <Label htmlFor="same-as-my-dept" className="text-xs cursor-pointer font-normal text-muted-foreground">
                  Same as my department <span className="text-[10px]">/ {t("Same as my department")}</span>
                </Label>
              </div>
            )}
            {errors.suggestionDepartment && <p className="text-xs text-destructive">{errors.suggestionDepartment}</p>}
          </div>
        )}
      </div>

      {/* Main Suggestor - shown when On Behalf is selected */}
      {suggestionFor === "behalf" && setMainSuggestor && (
        <div className="space-y-1.5">
          <Label className="text-xs">Main Suggestor <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Main Suggestor")}</span></Label>
          <div className="relative" ref={suggestorRef}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={suggestorOpen ? suggestorSearch : (selectedSuggestor?.label || "")}
                onChange={e => {
                  setSuggestorSearch(e.target.value);
                  setSuggestorOpen(true);
                  if (!e.target.value && setMainSuggestor) setMainSuggestor("");
                }}
                onFocus={() => { setSuggestorOpen(true); setSuggestorSearch(""); }}
                placeholder="Search employee by name or ID..."
                className={`pl-8 ${errors.mainSuggestor ? "border-destructive" : ""}`}
              />
            </div>
            {suggestorOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                  <button
                    key={emp.value}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer ${
                      mainSuggestor === emp.value ? "bg-accent/50 font-medium" : ""
                    }`}
                    onMouseDown={e => {
                      e.preventDefault();
                      setMainSuggestor(emp.value);
                      setSuggestorSearch("");
                      setSuggestorOpen(false);
                    }}
                  >
                    <span>{emp.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{emp.sublabel}</span>
                  </button>
                )) : (
                  <div className="p-3 text-xs text-muted-foreground text-center">No employees found</div>
                )}
              </div>
            )}
          </div>
          {errors.mainSuggestor && <p className="text-xs text-destructive">{errors.mainSuggestor}</p>}
        </div>
      )}

      {/* Team Members - shown when Group Suggestion is Yes */}
      {groupSuggestion === "yes" && setTeamMembers && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Team Members <span className="text-destructive">*</span> <span className="text-[10px] text-muted-foreground font-normal">/ {t("Team Members")}</span></Label>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              selectedMembers.length >= maxMembers
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}>
              {selectedMembers.length} / {maxMembers === Infinity ? "∞" : maxMembers} selected
            </span>
          </div>

          {/* Selected members as badges */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedMembers.map(id => {
                const member = allMemberOptions.find(m => m.value === id);
                return (
                  <Badge key={id} variant="secondary" className="text-[11px] gap-1 pr-1">
                    {member?.label || id}
                    <button type="button" onClick={() => removeMember(id)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Search + dropdown */}
          <div className={`border rounded-md ${errors.teamMembers ? "border-destructive" : ""}`}>
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search team members by name or ID..."
                className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-[160px] overflow-y-auto p-1.5 space-y-0.5">
              {filteredMembers.length > 0 ? filteredMembers.map(m => {
                const isSelected = selectedMembers.includes(m.value);
                const isDisabled = !isSelected && selectedMembers.length >= maxMembers;
                return (
                  <div
                    key={m.value}
                    onClick={() => !isDisabled && toggleMember(m.value)}
                    title={isDisabled ? `Maximum ${maxMembers} team member${maxMembers === 1 ? "" : "s"} allowed` : undefined}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium cursor-pointer"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-muted cursor-pointer"
                    }`}
                  >
                    <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                      {isSelected && <span className="text-primary-foreground text-[9px]">✓</span>}
                    </div>
                    {m.label}
                    <Plus className={`h-3 w-3 ml-auto ${isSelected ? "hidden" : "text-muted-foreground"}`} />
                  </div>
                );
              }) : (
                <p className="text-xs text-muted-foreground text-center py-2">No members found</p>
              )}
            </div>
          </div>
          {selectedMembers.length >= maxMembers && maxMembers !== Infinity && (
            <p className="text-[10px] text-destructive font-medium">
              Maximum {maxMembers} team member{maxMembers === 1 ? "" : "s"} allowed for {suggestionType}.
            </p>
          )}
          {errors.teamMembers && <p className="text-xs text-destructive">{errors.teamMembers}</p>}


          {/* Share distribution is calculated automatically after FLM evaluation */}
        </div>
      )}

    </div>
  );
};

export default GlobalFields;
