// Demo Application — Plant & Scheme Configuration Screen
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEMO_PLANTS_CONFIG,
  type DemoPlantKey,
  getDemoSelection,
  saveDemoSelection,
} from "@/lib/demoConfig";
import {
  Building2,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Sliders,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { usePlant } from "@/contexts/PlantContext";
import { useAuth } from "@/contexts/AuthContext";

const DemoSetupScreen = () => {
  const navigate = useNavigate();
  const { setPlant } = usePlant();
  const { setDemoRole } = useAuth();
  const existing = getDemoSelection();

  const [selectedPlant, setSelectedPlant] = useState<DemoPlantKey | "">(
    existing?.plant ?? ""
  );
  const [selectedScheme, setSelectedScheme] = useState<string>(
    existing?.scheme ?? ""
  );

  // When plant changes, if existing scheme is not valid for new plant, clear or reset
  const handlePlantChange = (plantKey: string) => {
    const validPlant = plantKey as DemoPlantKey;
    setSelectedPlant(validPlant);
    const plantConfig = DEMO_PLANTS_CONFIG[validPlant];
    if (plantConfig) {
      // Check if current scheme belongs to this plant, otherwise select first available
      const existsInNewPlant = plantConfig.schemes.some(
        (s) => s.value === selectedScheme
      );
      if (!existsInNewPlant) {
        setSelectedScheme("");
      }
    } else {
      setSelectedScheme("");
    }
  };

  const currentPlantConfig = selectedPlant
    ? DEMO_PLANTS_CONFIG[selectedPlant]
    : null;

  const currentSchemeOption = currentPlantConfig?.schemes.find(
    (s) => s.value === selectedScheme
  );

  const canProceed = Boolean(selectedPlant && selectedScheme);

  const handleProceed = () => {
    if (!selectedPlant || !selectedScheme) {
      toast.error("Please select both a plant and a scheme to continue.");
      return;
    }

    saveDemoSelection(selectedPlant, selectedScheme);
    setPlant("demo");
    setDemoRole("employee");
    toast.success("Environment Configured!", {
      description: `Active Plant: ${selectedPlant} · Scheme: ${selectedScheme}`,
    });
    navigate("/demo/employee");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full space-y-6 animate-fade-in">
        {/* Top Back navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Plants
          </Button>

          <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
            Demo Application
          </Badge>
        </div>

        {/* Main Card */}
        <Card className="card-shadow border-primary/20">
          <CardHeader className="space-y-2 pb-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-1 shadow-inner">
              <Sliders className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              Select Plant & Scheme
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              Configure the demo environment by selecting the operational plant and its associated improvement scheme.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* ── Dropdown A: Select Plant ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  a) Select Plant <span className="text-destructive">*</span>
                </Label>
                {selectedPlant && (
                  <Badge variant="secondary" className="text-[10px]">
                    {currentPlantConfig?.location}
                  </Badge>
                )}
              </div>

              <Select value={selectedPlant} onValueChange={handlePlantChange}>
                <SelectTrigger className="h-11 text-sm bg-background">
                  <SelectValue placeholder="Choose a plant (JaP, BidP, NaP)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JaP">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">JaP</span>
                      <span className="text-xs text-muted-foreground">— Jaipur Plant (Rajasthan)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="BidP">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">BidP</span>
                      <span className="text-xs text-muted-foreground">— Bidadi Plant (Karnataka)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="NaP">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">NaP</span>
                      <span className="text-xs text-muted-foreground">— Naganathapura Plant (Karnataka)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Dropdown B: Select Scheme ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  b) Select Scheme <span className="text-destructive">*</span>
                </Label>
                {selectedPlant && (
                  <span className="text-[10px] text-muted-foreground">
                    Available for {selectedPlant}: {currentPlantConfig?.schemes.length} schemes
                  </span>
                )}
              </div>

              <Select
                value={selectedScheme}
                onValueChange={setSelectedScheme}
                disabled={!selectedPlant}
              >
                <SelectTrigger
                  className={`h-11 text-sm bg-background transition-all ${
                    !selectedPlant ? "opacity-60 cursor-not-allowed bg-muted/30" : ""
                  }`}
                >
                  <SelectValue
                    placeholder={
                      selectedPlant
                        ? `Select a scheme for ${selectedPlant}...`
                        : "Select a plant first..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {currentPlantConfig?.schemes.map((scheme) => (
                    <SelectItem key={scheme.value} value={scheme.value}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex flex-col text-left">
                          <span className="font-medium text-foreground">{scheme.label}</span>
                          {scheme.description && (
                            <span className="text-[10px] text-muted-foreground">
                              {scheme.description}
                            </span>
                          )}
                        </div>
                        {scheme.badge && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                            {scheme.badge}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selection Overview Banner */}
            {canProceed && (
              <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] flex items-start gap-3 transition-all animate-fade-in">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5 min-w-0 flex-1">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Ready to proceed
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    Plant: <span className="font-bold">{selectedPlant}</span> ({currentPlantConfig?.fullName}) · Scheme:{" "}
                    <span className="font-bold underline">{selectedScheme}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2">
              <Button
                onClick={handleProceed}
                disabled={!canProceed}
                className="w-full h-11 text-sm font-medium gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <span>Enter Employee Portal</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informational Footer */}
        <p className="text-center text-xs text-muted-foreground">
          You can change the selected plant and scheme at any time inside the demo portal.
        </p>
      </div>
    </div>
  );
};

export default DemoSetupScreen;
