import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const Procedure = () => {
  const { t } = useLanguage();

  const TH = ({ en }: { en: string }) => (
    <span>{en} <span className="text-[9px] opacity-70">/ {t(en)}</span></span>
  );

  return (
    <div className="flex flex-col h-full w-full max-w-5xl space-y-4">
      <h2 className="text-xl font-bold text-foreground">
        Suggestion Scheme Procedure
        <span className="text-sm font-normal text-muted-foreground ml-2">/ {t("Suggestion Scheme Procedure")}</span>
      </h2>

      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-6 text-sm">
          <section>
            <h3 className="font-semibold text-foreground mb-2">1. Objective <span className="text-xs font-normal text-muted-foreground">/ {t("Details")}</span></h3>
            <p className="text-muted-foreground">
              To encourage employees to contribute innovative ideas for improving productivity, quality, safety, and cost reduction through a structured suggestion management process.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-2">2. Types of Suggestions <span className="text-xs font-normal text-muted-foreground">/ {t("Type of Suggestion")}</span></h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Simple Suggestion Scheme (SSS)</strong> – Standard improvement ideas</li>
              <li><strong>Shop Floor CIP</strong> – Continuous improvement on the shop floor</li>
              <li><strong>My Idea Card</strong> – Quick idea submission</li>
              <li><strong>Daily CIP</strong> – Daily continuous improvement activities</li>
              <li><strong>Cash The Flash</strong> – Quick-fix improvements with immediate rewards</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-2">3. Workflow <span className="text-xs font-normal text-muted-foreground">/ {t("Status")}</span></h3>
            <div className="flex flex-wrap gap-2 items-center text-xs">
              {["Submit", "FLM Review", "BPS Evaluation", "Approval", "Implementation", "Award"].map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-medium">{step}</span>
                  {i < 5 && <span className="text-muted-foreground">→</span>}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-2">4. Award Structure <span className="text-xs font-normal text-muted-foreground">/ {t("Award Category")}</span></h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left text-xs"><TH en="Category" /></th>
                    <th className="border p-2 text-right text-xs"><TH en="Amount" /> (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border p-2">Bronze</td><td className="border p-2 text-right">250</td></tr>
                  <tr><td className="border p-2">Silver</td><td className="border p-2 text-right">500</td></tr>
                  <tr><td className="border p-2">Gold</td><td className="border p-2 text-right">1,000</td></tr>
                  <tr><td className="border p-2">Platinum</td><td className="border p-2 text-right">2,500</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-2">5. Rules <span className="text-xs font-normal text-muted-foreground">/ {t("Other Info")}</span></h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>All mandatory fields must be filled before submission</li>
              <li>Maximum 5 attachments per suggestion, each under 4MB</li>
              <li>No duplicate subjects within 30 days</li>
              <li>FLM approval required before BPS evaluation</li>
              <li>Awards processed through NEFT</li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default Procedure;
