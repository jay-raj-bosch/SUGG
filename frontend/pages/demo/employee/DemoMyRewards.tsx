// Demo Plant — My Rewards (employee view of awarded suggestions)
// Exact clone of Jaipur Plant My Rewards module.
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download, Trophy } from "lucide-react";
import { toast } from "sonner";
import { downloadAwardLetterPDF } from "@/lib/pdfUtils";

const DemoMyRewards = () => {
  const { suggestions } = useSuggestions();
  const { t } = useLanguage();

  // Demo awarded suggestions: plant-scoped + awarded status + has award amount
  const awards = suggestions.filter(
    (s) =>
      s.plantCode === "PLT-03" &&
      s.status === "Closed / Awarded" &&
      s.awardAmount !== undefined &&
      s.awardAmount > 0
  );

  const TH = ({ en }: { en: string }) => (
    <span>
      {en} <span className="text-[9px] opacity-70">/ {t(en)}</span>
    </span>
  );

  const handleDownload = (suggestionNo: string) => {
    const suggestion = suggestions.find((s) => s.suggestionNo === suggestionNo);
    if (suggestion) {
      downloadAwardLetterPDF(suggestion);
      toast.success("Award letter downloaded!");
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        My Rewards{" "}
        <span className="text-sm font-normal text-muted-foreground">
          / {t("My Rewards")}
        </span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          {/* ── Mobile card list (< sm) ── */}
          <div className="sm:hidden space-y-2">
            {awards.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No rewards yet / {t("No rewards yet")}
              </p>
            )}
            {awards.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border bg-card p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">
                      {a.suggestionNo}
                    </p>
                    <p className="text-sm font-medium leading-snug mt-0.5">
                      {a.subject}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-accent shrink-0">
                    ₹{a.awardAmount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-accent" />
                    {a.awardCategory ?? "—"}
                  </span>
                  <span>·</span>
                  <span>{a.awardDate ?? "—"}</span>
                  <span>·</span>
                  <span>{a.category || "—"}</span>
                </div>
                <div className="pt-1 border-t border-border/40">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => handleDownload(a.suggestionNo)}
                  >
                    <Download className="h-3 w-3" /> Download Letter
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (≥ sm) ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">
                    <TH en="Suggestion No" />
                  </th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground hidden md:table-cell">
                    <TH en="Subject" />
                  </th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground">
                    <TH en="Award Category" />
                  </th>
                  <th className="pb-2 px-3 text-xs font-medium text-muted-foreground text-right">
                    <TH en="Amount" /> (₹)
                  </th>
                  <th className="pb-2 px-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                    <TH en="Award Date" />
                  </th>
                  <th className="pb-2 px-2 text-xs font-medium text-muted-foreground text-right">
                    <TH en="Actions" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {awards.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2.5 px-2 font-mono text-xs">
                      {a.suggestionNo}
                    </td>
                    <td className="py-2.5 px-2 text-xs hidden md:table-cell max-w-[220px] truncate">
                      {a.subject}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5 text-accent" />
                        {a.awardCategory ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      ₹{a.awardAmount?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-xs whitespace-nowrap hidden sm:table-cell">
                      {a.awardDate ?? "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => handleDownload(a.suggestionNo)}
                      >
                        <Download className="h-3 w-3" />
                        <span className="hidden md:inline">
                          Letter / {t("Letter")}
                        </span>
                      </Button>
                    </td>
                  </tr>
                ))}
                {awards.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No rewards yet / {t("No rewards yet")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoMyRewards;
