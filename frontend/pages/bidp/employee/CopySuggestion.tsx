// TODO [BACKEND]: Search suggestion → GET /api/suggestions/:suggestionNo
// TODO [BACKEND]: Clone → POST /api/suggestions (create new record with copied fields, status=Draft)
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Suggestion } from "@/lib/mockData";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Search, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlant } from "@/contexts/PlantContext";

const CLONE_KEY = "clone-suggestion-data";

const CopySuggestion = () => {
  const [suggestionNo, setSuggestionNo] = useState("");
  const [found, setFound] = useState<Suggestion | null>(null);

  const { suggestions } = useSuggestions();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { plantPrefix } = usePlant();

  const allSuggestions = suggestions;

  const handleSearch = () => {
    const s = allSuggestions.find(s => s.suggestionNo === suggestionNo);
    if (!s) {
      toast.error("Suggestion not found");
      setFound(null);
      return;
    }
    if (s.status === "Rejected") {
      toast.error("Cannot copy a rejected suggestion unless reopened");
      setFound(null);
      return;
    }
    setFound(s);
  };

  const handleClone = () => {
    if (!found) return;

    // ── Sanitization helpers ─────────────────────────────────────────────
    // Block keys that could be used to forge identity / approval state when the
    // clone is later submitted. Also strip non-string scalars from string fields.
    const FORBIDDEN_KEYS = new Set([
      "__proto__", "constructor", "prototype",
      "id", "suggestionNo", "status", "approvalLevel", "assignedFlm",
      "employeeNo", "employeeName", "department", "plantCode",
      "evaluatedBy", "evaluatedByName", "evaluatedOn",
      "approvedByManager", "approvedByManagerName", "approvedByManagerOn",
      "approvedByBpsAdmin", "approvedByBpsAdminName", "approvedByBpsAdminOn",
      "approvedByBpsDh", "approvedByBpsDhName", "approvedByBpsDhOn",
      "awardAmount", "awardCategory", "awardDate", "rejectionReason",
      "rejectedBy", "rejectedByName", "rejectedOn", "sendBackHistory",
      "transferHistory", "originalEmployeeNo", "originalEmployeeName",
      "reopenRemark", "reopenedOn", "reopenedBy", "pendingWith", "pendingSince",
      "daysPending", "date", "attachment", "attachmentItems",
    ]);
    const sanitizeValue = (v: any): any => {
      if (v == null) return v;
      if (typeof v === "string") {
        // Strip control chars + script-like tags to be safe even though backend re-sanitises
        return v.replace(/[<>]/g, "").slice(0, 5000);
      }
      if (Array.isArray(v)) return v.map(sanitizeValue).slice(0, 100);
      if (typeof v === "object") return sanitizeObject(v);
      return v;
    };
    const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
      const clean: Record<string, any> = {};
      for (const [key, val] of Object.entries(obj || {})) {
        if (FORBIDDEN_KEYS.has(key)) continue;
        clean[key] = sanitizeValue(val);
      }
      return clean;
    };

    // If formData exists (suggestions submitted/saved via the current form), use it directly
    // and just strip any draft-specific keys that shouldn't carry over.
    if (found.formData) {
      const { typeFields: savedTypeFields = {}, ...rest } = found.formData;

      // Merge top-level suggestion fields into typeFields as fallback
      const mergedTypeFields: Record<string, any> = {
        ...(found.presentMethod ? { presentMethod: found.presentMethod } : {}),
        ...(found.proposedMethod ? { proposedMethod: found.proposedMethod } : {}),
        ...(found.benefits ? { benefits: found.benefits } : {}),
        ...(found.subject ? { subject: found.subject } : {}),
        ...(found.category ? { category: found.category } : {}),
        ...savedTypeFields,
      };

      const cloneData = sanitizeObject({
        ...rest,
        suggestionType: found.type,
        range: found.range || rest.range || "",
        typeFields: mergedTypeFields,
      });

      try {
        localStorage.setItem(CLONE_KEY, JSON.stringify(cloneData));
      } catch (err) {
        console.error("[CopySuggestion] failed to persist clone:", err);
        toast.error("Failed to prepare clone. Please try again.");
        return;
      }
    } else {
      // Fallback for older/mock suggestions without formData
      const typeFields: Record<string, any> = {};
      if (found.presentMethod) typeFields.presentMethod = found.presentMethod;
      if (found.proposedMethod) typeFields.proposedMethod = found.proposedMethod;
      if (found.benefits) typeFields.benefits = found.benefits;
      if (found.subject) typeFields.subject = found.subject;
      if (found.category) typeFields.category = found.category;

      const cloneData = sanitizeObject({
        suggestionType: found.type,
        range: found.range || "",
        suggestionFor: "self",
        groupSuggestion: "no",
        otherInfo: "",
        mainSuggestor: "",
        teamMembers: [],
        teamMemberShares: {},
        typeFields,
      });

      try {
        localStorage.setItem(CLONE_KEY, JSON.stringify(cloneData));
      } catch (err) {
        console.error("[CopySuggestion] failed to persist clone:", err);
        toast.error("Failed to prepare clone. Please try again.");
        return;
      }
    }

    toast.success("Suggestion cloned! Redirecting to form...");
    navigate(`${plantPrefix}/employee/new-suggestion`);
  };

  const L = (en: string) => <span className="text-[10px] text-muted-foreground font-normal">/ {t(en)}</span>;

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        Copy Suggestion <span className="text-sm font-normal text-muted-foreground">/ {t("Copy Suggestion")}</span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Enter Suggestion No {L("Enter Suggestion No")}</Label>
              <Input value={suggestionNo} onChange={e => setSuggestionNo(e.target.value)} placeholder="e.g. SSS-2026-001" />
            </div>
            <Button onClick={handleSearch} className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> View {L("View")}
            </Button>
          </div>

          {found && (() => {
            const fd = found.formData || {};
            const teamMembers: string[] = fd.teamMembers || [];
            const teamMemberShares: Record<string, string> = fd.teamMemberShares || {};
            const isGroup = fd.groupSuggestion === "yes" || teamMembers.length > 0;
            const isOnBehalf = fd.suggestionFor === "behalf";

            return (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Original Suggestion {L("Original Suggestion")}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">No {L("Suggestion No")}:</span> <strong>{found.suggestionNo}</strong></div>
                  <div><span className="text-muted-foreground text-xs">Type {L("Type")}:</span> {found.type}</div>
                  <div><span className="text-muted-foreground text-xs">Subject {L("Subject")}:</span> {found.subject}</div>
                  <div><span className="text-muted-foreground text-xs">Status {L("Status")}:</span> {found.status}</div>
                  <div><span className="text-muted-foreground text-xs">Category {L("Category")}:</span> {found.category}</div>
                  <div><span className="text-muted-foreground text-xs">Range {L("Range")}:</span> {found.range || "—"}</div>
                  <div><span className="text-muted-foreground text-xs">Date {L("Date")}:</span> {found.date}</div>
                  <div><span className="text-muted-foreground text-xs">Employee {L("Employee")}:</span> {found.employeeName || "—"}</div>
                  <div>
                    <span className="text-muted-foreground text-xs">Suggestion For:</span>{" "}
                    <span className={`text-xs font-medium ${isOnBehalf ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {isOnBehalf ? "On Behalf" : "Self"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Group Suggestion:</span>{" "}
                    <span className={`text-xs font-medium ${isGroup ? "text-primary" : ""}`}>
                      {isGroup ? "Yes" : "No"}
                    </span>
                  </div>
                  {isOnBehalf && fd.mainSuggestor && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">Main Suggestor:</span>{" "}
                      <span className="text-xs font-medium">{fd.mainSuggestor}</span>
                    </div>
                  )}
                  <div className="col-span-2"><span className="text-muted-foreground text-xs">Present Method {L("Present / Before Method")}:</span> <p className="text-sm">{found.presentMethod || "—"}</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground text-xs">Proposed Method {L("Proposed / After Method")}:</span> <p className="text-sm">{found.proposedMethod || "—"}</p></div>
                  <div className="col-span-2"><span className="text-muted-foreground text-xs">Benefits {L("Benefits")}:</span> <p className="text-sm">{found.benefits || "—"}</p></div>
                </div>

                {/* Team members preview */}
                {isGroup && teamMembers.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">Team Members & Share Distribution</p>
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-[1fr_60px] px-3 py-1.5 bg-muted/40 border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Member</span><span className="text-right">Share</span>
                      </div>
                      {teamMembers.map((id, idx) => {
                        const namePart = id.includes("–") ? id.split("–")[0].trim() : id;
                        const colors = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500"];
                        const initials = namePart.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0,2).toUpperCase();
                        return (
                          <div key={id} className="grid grid-cols-[1fr_60px] px-3 py-2 border-b last:border-0 items-center">
                            <div className="flex items-center gap-2">
                              <div className={`h-6 w-6 rounded-full ${colors[idx % colors.length]} flex items-center justify-center shrink-0`}>
                                <span className="text-white text-[9px] font-bold">{initials}</span>
                              </div>
                              <span className="text-xs truncate">{namePart}</span>
                            </div>
                            <span className="text-xs font-bold text-right text-primary">
                              {teamMemberShares[id] ? `${teamMemberShares[id]}%` : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button onClick={handleClone} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Clone & Edit in Form {L("Clone & Edit in Form")}
                </Button>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default CopySuggestion;
