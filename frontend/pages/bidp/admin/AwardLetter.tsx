// AwardLetter — fetch award letter for a specific suggestion (admin)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Search, Award } from "lucide-react";
import { useState, useMemo } from "react";
import type { Suggestion } from "@/lib/mockData";
import { downloadAwardLetterPDF } from "@/lib/pdfUtils";
import SuggestionCombobox from "@/components/SuggestionCombobox";
import { useSuggestions } from "@/contexts/SuggestionContext";

const AwardLetter = () => {
  const { t } = useLanguage();
  const { getSubmittedSuggestions } = useSuggestions();
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [found, setFound] = useState<Suggestion | null>(null);
  const allSuggestions = getSubmittedSuggestions();

  const AWARD_ELIGIBLE_STATUSES = ["Approved & Closed", "Closed / Awarded"];

  const awardedOptions = useMemo(() =>
    allSuggestions.filter(s => !!s.awardAmount && AWARD_ELIGIBLE_STATUSES.includes(s.status)).map(s => ({
      value: s.suggestionNo,
      label: `${s.suggestionNo} — ${s.subject}`,
      sublabel: `₹${s.awardAmount?.toLocaleString()} • ${s.employeeName}`,
    })), [allSuggestions]);

  const handleFetch = () => {
    const s = allSuggestions.find(s => s.suggestionNo === selectedSuggestion);
    if (s && s.awardAmount && AWARD_ELIGIBLE_STATUSES.includes(s.status)) {
      setFound(s);
    } else if (s && !AWARD_ELIGIBLE_STATUSES.includes(s.status)) {
      toast.error("Award letter is only available for approved & closed suggestions");
      setFound(null);
    } else {
      toast.error("Award not found for this suggestion");
      setFound(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        Award Letter – Cash The Flash <span className="text-sm font-normal text-muted-foreground">/ {t("Award Letter")}</span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Suggestion No <span className="text-[9px] opacity-70">/ {t("Suggestion No")}</span></Label>
              <SuggestionCombobox
                options={awardedOptions}
                value={selectedSuggestion}
                onChange={setSelectedSuggestion}
                placeholder="Type suggestion no or keyword..."
              />
            </div>
            <Button className="gap-1.5" onClick={handleFetch}>
              <Search className="h-3.5 w-3.5" /> Fetch / {t("Search")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {found && (
        <Card className="card-shadow border-2 border-primary/20">
          <CardHeader className="text-center pb-2 border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="h-6 w-6 text-accent" />
              <CardTitle className="text-lg">AWARD LETTER <span className="text-sm font-normal text-muted-foreground">/ {t("Award Letter")}</span></CardTitle>
              <Award className="h-6 w-6 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground">{found.type} – Suggestion Scheme Award</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Employee Name <span className="text-[9px]">/ {t("Name")}</span></span>
                <p className="font-medium">{found.employeeName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Employee No <span className="text-[9px]">/ {t("Employee No")}</span></span>
                <p className="font-medium">{found.employeeNo}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Department <span className="text-[9px]">/ {t("Department")}</span></span>
                <p className="font-medium">{found.department || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Suggestion No <span className="text-[9px]">/ {t("Suggestion No")}</span></span>
                <p className="font-mono">{found.suggestionNo}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Suggestion Title <span className="text-[9px]">/ {t("Suggestion Subject")}</span></span>
                <p className="font-medium">{found.subject}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Award Category <span className="text-[9px]">/ {t("Award Category")}</span></span>
                <p className="font-medium">{found.awardCategory}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Approved Date <span className="text-[9px]">/ {t("Award Date")}</span></span>
                <p>{found.awardDate}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Award Amount <span className="text-[9px]">/ {t("Amount")}</span></span>
                <p className="text-lg font-bold text-primary">₹{found.awardAmount?.toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground">Authority Signature <span className="text-[9px]">/ {t("Authority Role")}</span></p>
              <div className="h-12 border-b border-dashed border-muted-foreground/30 w-48 mt-2" />
            </div>

            <Button className="gap-1.5 w-full" onClick={() => {
              downloadAwardLetterPDF(found);
              toast.success("Award letter downloaded!");
            }}>
              <Download className="h-3.5 w-3.5" /> Download Award Letter (PDF) / {t("Award Letter")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AwardLetter;
