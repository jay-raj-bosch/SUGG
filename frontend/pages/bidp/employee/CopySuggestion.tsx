import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Suggestion, statusColors } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Search, Copy, FileText, Users, User, Tag, Calendar, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlant } from "@/contexts/PlantContext";
import * as apiService from "@/lib/apiService";

const CLONE_KEY = "clone-suggestion-data";

/** Field definitions per suggestion type — all the data fields that exist */
const TYPE_FIELDS: Record<string, { key: string; label: string }[]> = {
  "Simple Suggestion Scheme": [
    { key: "subject", label: "Subject" },
    { key: "category", label: "Category" },
    { key: "presentMethod", label: "Present / Before Method" },
    { key: "proposedMethod", label: "Proposed / After Method" },
    { key: "benefits", label: "Benefits" },
  ],
  "Shop Floor CIP": [
    { key: "problemStatus", label: "Problem / Present Status" },
    { key: "beforeImprovement", label: "Before Improvement" },
    { key: "afterImprovement", label: "After Improvement" },
    { key: "benefits", label: "Benefits" },
    { key: "rootCauseIdentification", label: "Root Cause Identification" },
    { key: "standardization", label: "Standardization" },
    { key: "rootCause", label: "Root Cause" },
    { key: "ideaToEliminate", label: "Idea to Eliminate Root Cause" },
    { key: "actionTaken", label: "Action Taken" },
    { key: "horizontalDeployment", label: "How many places this kaizen is deployed horizontally" },
  ],
  "My Idea Card": [
    { key: "subject", label: "Subject" },
    { key: "descriptionProblem", label: "Idea / Problem Description" },
    { key: "descriptionImprovement", label: "Improvement Description" },
    { key: "benefits", label: "Benefits" },
  ],
  "Daily CIP": [
    { key: "machineNoArea", label: "Machine No / Area" },
    { key: "suggestionDescription", label: "Suggestion Description" },
    { key: "actionTaken", label: "Action Taken" },
  ],
  "Cash The Flash": [
    { key: "subject", label: "Subject" },
    { key: "presentMethod", label: "Present / Before Method" },
    { key: "proposedMethod", label: "Proposed / After Method" },
    { key: "benefits", label: "Benefits" },
  ],
};

const CopySuggestion = () => {
  const [suggestionNo, setSuggestionNo] = useState("");
  const [found, setFound] = useState<Suggestion | null>(null);
  const [allSuggestionsApi, setAllSuggestionsApi] = useState<Suggestion[]>([]);

  const { suggestions } = useSuggestions();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { plant, plantPrefix } = usePlant();

  useEffect(() => {
    apiService.fetchSuggestions(plant as "bidp" | "jap", { limit: 5000 })
      .then(r => setAllSuggestionsApi(r.data))
      .catch(() => {});
  }, [plant]);

  /** Get a field value — checks formData.typeFields first, then top-level suggestion, then formData root */
  const getFieldValue = (s: Suggestion, key: string): string => {
    const fd: Record<string, any> = s.formData || {};
    const tf: Record<string, any> = fd.typeFields || {};
    return tf[key] || (s as any)[key] || fd[key] || "";
  };

  const handleSearch = () => {
    if (!suggestionNo.trim()) {
      toast.error("Please enter a suggestion number");
      return;
    }
    const q = suggestionNo.trim();
    const s = allSuggestionsApi.find(s => s.suggestionNo === q)
           || suggestions.find(s => s.suggestionNo === q);
    if (!s) {
      toast.error("Suggestion not found");
      setFound(null);
      return;
    }
    setFound(s);
  };

  const handleClone = () => {
    if (!found) return;

    const fd: Record<string, any> = found.formData || {};

    // Build complete typeFields by merging all sources
    const typeFieldDefs = TYPE_FIELDS[found.type || ""] || [];
    const mergedTypeFields: Record<string, any> = {};
    for (const f of typeFieldDefs) {
      const val = getFieldValue(found, f.key);
      if (val) mergedTypeFields[f.key] = val;
    }

    const cloneData = {
      suggestionType: found.type || "",
      range: found.range || fd.range || "",
      suggestionFor: fd.suggestionFor || "self",
      groupSuggestion: fd.groupSuggestion || "no",
      otherInfo: fd.otherInfo || "",
      mainSuggestor: fd.mainSuggestor || "",
      teamMembers: fd.teamMembers || [],
      teamMemberShares: fd.teamMemberShares || {},
      typeFields: mergedTypeFields,
    };

    try {
      localStorage.setItem(CLONE_KEY, JSON.stringify(cloneData));
    } catch (err) {
      toast.error("Failed to prepare clone. Please try again.");
      return;
    }

    toast.success("Suggestion cloned! Redirecting to form...");
    navigate(`${plantPrefix}/employee/new-suggestion`);
  };

  const L = (en: string) => <span className="text-[10px] text-muted-foreground font-normal">/ {t(en)}</span>;

  return (
    <div className="max-w-4xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        Copy Suggestion <span className="text-sm font-normal text-muted-foreground">/ {t("Copy Suggestion")}</span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Enter Suggestion No {L("Enter Suggestion No")}</Label>
              <Input
                value={suggestionNo}
                onChange={e => setSuggestionNo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="e.g. SSS-2026-001"
              />
            </div>
            <Button onClick={handleSearch} className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> Search {L("Search")}
            </Button>
          </div>

          {found && (() => {
            const fd: Record<string, any> = found.formData || {};
            const teamMembers: string[] = fd.teamMembers || [];
            const teamMemberShares: Record<string, string> = fd.teamMemberShares || {};
            const isGroup = fd.groupSuggestion === "yes" || teamMembers.length > 0;
            const isOnBehalf = fd.suggestionFor === "behalf";
            const typeFields = TYPE_FIELDS[found.type || ""] || [];

            return (
              <div className="rounded-xl border bg-gradient-to-br from-muted/30 via-background to-muted/20 space-y-0 overflow-hidden">
                {/* Header */}
                <div className="bg-muted/40 px-5 py-3 flex items-center justify-between border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{found.suggestionNo}</p>
                      <p className="text-[10px] text-muted-foreground">{found.type}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[found.status] || ""}`}>
                    {found.status}
                  </Badge>
                </div>

                <div className="p-5 space-y-4">
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Employee</p>
                      <p className="text-xs font-medium">{found.employeeName || "—"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{found.employeeNo || "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />Department</p>
                      <p className="text-xs font-medium">{found.department || "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Date</p>
                      <p className="text-xs font-medium">{found.date || "—"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />Range</p>
                      <p className="text-xs font-medium">{found.range || "—"}</p>
                    </div>
                  </div>

                  {/* Suggestion For / Group */}
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Suggestion For:</span>
                      <Badge variant="outline" className={`text-[10px] ${isOnBehalf ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                        {isOnBehalf ? "On Behalf" : "Self"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Group:</span>
                      <Badge variant="outline" className={`text-[10px] ${isGroup ? "border-primary/40 text-primary" : ""}`}>
                        {isGroup ? "Yes" : "No"}
                      </Badge>
                    </div>
                    {isOnBehalf && fd.mainSuggestor && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Main Suggestor:</span>
                        <span className="text-xs font-medium">{fd.mainSuggestor}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Dynamic Type-Specific Fields */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> {found.type} — Details
                    </p>
                    {typeFields.length > 0 ? (
                      <div className="space-y-2.5">
                        {typeFields.map(f => {
                          const val = getFieldValue(found, f.key);
                          return (
                            <div key={f.key} className="space-y-0.5">
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground">{f.label}</p>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/30 border px-3 py-2">
                                {val || <span className="text-muted-foreground italic">—</span>}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No specific fields for this type</p>
                    )}
                  </div>

                  {/* Other Info */}
                  {(fd.otherInfo || (found as any).otherInfo) && (
                    <>
                      <Separator />
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Other Information</p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/30 border px-3 py-2">
                          {fd.otherInfo || (found as any).otherInfo}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Team Members */}
                  {isGroup && teamMembers.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3 w-3" /> Team Members ({teamMembers.length})
                        </p>
                        <div className="space-y-1.5">
                          {teamMembers.map((id, idx) => {
                            const namePart = id.includes("–") ? id.split("–")[0].trim() : id;
                            const colors = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-pink-500","bg-indigo-500"];
                            const initials = namePart.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                            const share = teamMemberShares[id];
                            return (
                              <div key={id} className="flex items-center gap-3 bg-background/80 rounded-lg px-3 py-2 border border-border/40">
                                <div className={`h-7 w-7 rounded-full ${colors[idx % colors.length]} flex items-center justify-center shrink-0`}>
                                  <span className="text-white text-[9px] font-bold">{initials}</span>
                                </div>
                                <span className="text-xs font-medium flex-1 truncate">{namePart}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{id}</span>
                                {share && (
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{share}%</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  <Button onClick={handleClone} className="gap-1.5 w-full" size="lg">
                    <Copy className="h-4 w-4" /> Clone & Edit in New Suggestion Form {L("Clone & Edit")}
                  </Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default CopySuggestion;
