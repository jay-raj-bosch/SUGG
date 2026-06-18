import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { mockEmployees } from "@/lib/mockData";
import { teamMemberOptions } from "@/lib/bidp/suggestionConstants";
import { X, Search, Plus, Percent } from "lucide-react";
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

          {/* Share Distribution */}
          {selectedMembers.length > 0 && setTeamMemberShares && (
            <div className="rounded-xl border bg-gradient-to-br from-secondary/5 via-background to-muted/20 p-4 space-y-3.5 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-secondary/15 flex items-center justify-center">
                    <Percent className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold leading-none">
                      Share Distribution <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">/ ಪಾಲು ಹಂಚಿಕೆ</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={splitEqually}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all font-semibold border border-primary/20"
                  >
                    ⚖ Split equally
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamMemberShares && setTeamMemberShares(Object.fromEntries(selectedMembers.map(id => [id, "0"])))}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all font-semibold border border-border/60"
                    title="Reset all shares to 0"
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-muted overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      totalShare === 100 ? "bg-emerald-500" : totalShare > 100 ? "bg-destructive" : "bg-amber-400"
                    }`}
                    style={{ width: `${Math.min(totalShare, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">0%</span>
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                    totalShare === 100
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : totalShare > 100
                      ? "bg-red-100 text-destructive dark:bg-red-900/30"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {totalShare === 100
                      ? "✓ 100% allocated"
                      : totalShare > 100
                      ? `Over by ${totalShare - 100}%`
                      : `${100 - totalShare}% remaining`}
                  </span>
                  <span className="text-[10px] text-muted-foreground">100%</span>
                </div>
              </div>

              {/* Member rows */}
              <div className="space-y-2">
                {selectedMembers.map((id, idx) => {
                  const member = allMemberOptions.find(m => m.value === id);
                  const namePart = (member?.label || id).split("–")[0].trim();
                  const idPart = (member?.label || "").split("–")[1]?.trim() || id;
                  const initials = namePart.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  const avatarColors = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-pink-500","bg-indigo-500"];
                  const color = avatarColors[idx % avatarColors.length];
                  const shareVal = (teamMemberShares || {})[id] || "";
                  const shareNum = Number(shareVal) || 0;
                  return (
                    <div key={id} className="flex items-center gap-3 bg-background/80 rounded-lg px-3 py-2.5 border border-border/40 hover:border-border/80 hover:shadow-sm transition-all">
                      <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                        <span className="text-white text-[11px] font-bold">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-medium truncate leading-none">{namePart}</p>
                        <p className="text-[10px] text-muted-foreground leading-none">{idPart}</p>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${color} opacity-60`}
                            style={{ width: `${Math.min(shareNum, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={shareVal}
                          onChange={e => handleShareChange(id, e.target.value)}
                          placeholder="0"
                          className={`h-8 w-16 text-sm text-right font-semibold tabular-nums ${
                            errors.teamMemberShares ? "border-destructive" : ""
                          }`}
                        />
                        <span className="text-sm font-bold text-muted-foreground w-4">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {errors.teamMemberShares && <p className="text-xs text-destructive">{errors.teamMemberShares}</p>}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default GlobalFields;
