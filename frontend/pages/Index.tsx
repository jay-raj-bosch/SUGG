import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight, MapPin } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlant, PlantCode, PLANTS } from "@/contexts/PlantContext";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Step 1 — Plant selection landing page.
 * Navigates to /:plant (SelectRole) so the browser back button works naturally.
 */
const Index = () => {
  const navigate = useNavigate();
  const { setPlant } = usePlant();
  const { setLanguage } = useLanguage();
  const [leaving, setLeaving] = useState(false);
  const [selected, setSelected] = useState<PlantCode | null>(null);

  const handlePlantSelect = (plantCode: PlantCode) => {
    if (leaving) return;
    setSelected(plantCode);
    setLeaving(true);
    setPlant(plantCode);
    setLanguage(plantCode === "jap" ? "hindi" : "kannada");
    // BidP goes to role selection; JaP uses role selection; Demo Application goes to plant & scheme setup
    const destination =
      plantCode === "bidp"
        ? "/bidp/select-role"
        : plantCode === "jap"
          ? "/jap/select-role"
          : "/demo/setup";
    setTimeout(() => navigate(destination), 320);
  };

  return (
    <div
      className={[
        "min-h-screen flex flex-col items-center justify-center bg-background p-6",
        "transition-all duration-300 ease-in-out",
        leaving ? "opacity-0 scale-95" : "opacity-100 scale-100",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 mb-8 animate-fade-in">
        <Building2 className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suggestion Management System</h1>
          <p className="text-sm text-muted-foreground">
            ಸಲಹೆ ನಿರ್ವಹಣೆ ವ್ಯವಸ್ಥೆ &nbsp;·&nbsp; सुझाव प्रबंधन प्रणाली
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6 animate-fade-in">Select your plant to continue</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {Object.values(PLANTS).map((info, index) => (
          <div
            key={info.code}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
          >
            <Card
              className={[
                "card-shadow cursor-pointer group transition-all duration-200",
                selected === info.code
                  ? "scale-105 shadow-lg ring-2 ring-primary/40"
                  : "hover:card-elevated",
              ].join(" ")}
              onClick={() => handlePlantSelect(info.code)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
                <CardTitle className="text-lg">{info.fullName}</CardTitle>
                <CardDescription>
                  {info.city}
                  <br />
                  <span className="font-medium text-foreground/70">{info.regionalLabel}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Index;
