import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Building2, ArrowRight, Shield, User } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { usePlant, PlantCode, PLANTS } from "@/contexts/PlantContext";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Step 2 — Role selection page, rendered at /:plant (e.g. /bidp, /jap).
 * A distinct URL means the browser back button navigates correctly to / (plant select).
 * No manual back button needed — the browser's native controls work.
 */
const SelectRole = () => {
  const { plantCode } = useParams<{ plantCode: string }>();
  const navigate = useNavigate();
  const { setRole } = useAuth();
  const { plant, setPlant } = usePlant();
  const { setLanguage } = useLanguage();
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const resolvedPlant = (plantCode as PlantCode) ?? plant;
  const plantInfo = resolvedPlant ? PLANTS[resolvedPlant] : null;

  // Trigger entrance animation after mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Sync context if user landed here directly via URL (e.g. bookmark)
  useEffect(() => {
    if (resolvedPlant && resolvedPlant !== plant) {
      setPlant(resolvedPlant);
      setLanguage(resolvedPlant === "jap" ? "hindi" : "kannada");
    }
  }, [resolvedPlant, plant, setPlant, setLanguage]);

  // Guard: unknown plant code → back to landing
  if (!resolvedPlant || !plantInfo) {
    return <Navigate to="/" replace />;
  }

  // Both BidP and JaP have their own role-selection pages
  if (resolvedPlant === "bidp") {
    return <Navigate to="/bidp/select-role" replace />;
  }
  if (resolvedPlant === "jap") {
    return <Navigate to="/jap/select-role" replace />;
  }
  if (resolvedPlant === "demo") {
    return <Navigate to="/demo/employee" replace />;
  }

  const handleRoleSelect = (role: "employee" | "admin") => {
    if (leaving) return;
    setLeaving(true);
    setRole(role);
    const destination =
      role === "admin"
        ? `/${resolvedPlant}/admin/assign-authority`
        : `/${resolvedPlant}/employee`;
    setTimeout(() => navigate(destination), 280);
  };

  return (
    <div
      className={[
        "min-h-screen flex flex-col items-center justify-center bg-background p-6",
        "transition-all duration-300 ease-in-out",
        leaving
          ? "opacity-0 translate-y-2"
          : mounted
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suggestion Management System</h1>
          <p className="text-sm text-muted-foreground">
            ಸಲಹೆ ನಿರ್ವಹಣೆ ವ್ಯವಸ್ಥೆ &nbsp;·&nbsp; सुझाव प्रबंधन प्रणाली
          </p>
        </div>
      </div>

      <p className="text-xs text-primary font-semibold mb-6 tracking-wide uppercase">
        {plantInfo.fullName} — {plantInfo.city}
      </p>

      <p className="text-sm text-muted-foreground mb-6">Select your portal to continue</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full items-stretch">
        {[
          { role: "employee" as const, icon: User, label: "Employee Portal", desc: "Submit suggestions, track status, view awards", border: "" },
          { role: "admin"    as const, icon: Shield, label: "Admin Module",   desc: "Manage authorities, reports, categories",        border: "border-secondary/30" },
        ].map(({ role, icon: Icon, label, desc, border }, index) => (
          <div
            key={role}
            className="transition-all duration-200 flex"
            style={{ transitionDelay: `${index * 60}ms` }}
          >
            <Card
              className={[
                "card-shadow cursor-pointer group transition-all duration-200 hover:card-elevated w-full",
                border,
              ].join(" ")}
              onClick={() => handleRoleSelect(role)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
                <CardTitle className="text-lg">{label}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectRole;
