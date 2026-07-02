import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight, User, Shield, Users, ClipboardCheck, UserCog, Monitor, Briefcase, Landmark, Globe2, Calculator } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { BIDP_ROLE_DEFINITIONS, type BidpRole } from "@/lib/bidp/roles";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * BidP Role selection — fake role-based login.
 * Each role maps to a mock employee with relevant access.
 * Role tiles are generated dynamically from BIDP_ROLE_DEFINITIONS —
 * add a new role there and it automatically appears here.
 */

interface RoleOption {
  role: BidpRole;
  label: string;
  sublabel: string;
  name: string;
  employeeNo: string;
  department: string;
  icon: typeof User;
  description: string;
}

/** UI-only icon mapping — kept separate from the role definitions so roles.ts stays framework-agnostic. */
const ROLE_ICONS: Record<BidpRole, typeof User> = {
  employee: User,
  flm: UserCog,
  manager: Users,
  dept_general_manager: Briefcase,
  general_manager: Landmark,
  bps_admin: Shield,
  bps_dh: ClipboardCheck,
  vs_rc: Globe2,
  ctg: Calculator,
};

const ROLE_OPTIONS: RoleOption[] = BIDP_ROLE_DEFINITIONS.map(def => ({
  ...def,
  icon: ROLE_ICONS[def.role],
}));

const BidPRoleSelect = () => {
  const navigate = useNavigate();
  const { setBidpRole } = useAuth();
  const { t } = useLanguage();
  const [leaving, setLeaving] = useState(false);
  const [selected, setSelected] = useState<BidpRole | null>(null);

  const handleSelect = (option: RoleOption) => {
    if (leaving) return;
    setSelected(option.role);
    setLeaving(true);

    setBidpRole(option.role, {
      employeeNo: option.employeeNo,
      name: option.name,
      department: option.department,
      area: "RBIN/BIDP1",
      plantCode: "PLT-01",
      ntid: option.name.toLowerCase().replace(/\s/g, ""),
      email: `${option.name.toLowerCase().replace(/\s/g, ".")}@company.com`,
    });

    setTimeout(() => navigate("/bidp/employee"), 280);
  };

  const handleKiosk = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => navigate("/bidp/kiosk/login"), 280);
  };

  return (
    <div
      className={[
        "min-h-screen flex flex-col items-center justify-center bg-background p-6",
        "transition-all duration-300 ease-in-out",
        leaving ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bidadi Plant</h1>
          <p className="text-sm text-muted-foreground">
            Select your role to continue / ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        Suggestion Management System — Role Selection
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {ROLE_OPTIONS.map((option, index) => (
          <div
            key={option.role}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
          >
            <Card
              className={[
                "cursor-pointer group transition-all duration-200 h-full",
                selected === option.role
                  ? "scale-105 shadow-lg ring-2 ring-primary/40"
                  : "hover:shadow-md hover:border-primary/30",
              ].join(" ")}
              onClick={() => handleSelect(option)}
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                    <option.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
                <CardTitle className="text-sm">{option.label}</CardTitle>
                <CardDescription className="text-[11px] space-y-1">
                  <span className="block text-muted-foreground">{option.sublabel}</span>
                  <span className="block font-medium text-foreground/80">{option.name} — {option.employeeNo}</span>
                  <span className="block text-[10px]">{option.description}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ))}

        {/* Kiosk Tile */}
        <div
          className="animate-fade-in"
          style={{ animationDelay: `${ROLE_OPTIONS.length * 60}ms`, animationFillMode: "both" }}
        >
          <Card
            className="cursor-pointer group transition-all duration-200 h-full border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:shadow-lg hover:border-indigo-500 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20"
            onClick={handleKiosk}
          >
            <CardHeader className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <Monitor className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
              </div>
              <CardTitle className="text-sm text-indigo-700 dark:text-indigo-300">Kiosk</CardTitle>
              <CardDescription className="text-[11px] space-y-1">
                <span className="block text-muted-foreground">Employee Self-Service Kiosk</span>
                <span className="block font-medium text-foreground/80">Login with Employee No & Password</span>
                <span className="block text-[10px]">On-screen keyboard • Touch-friendly interface</span>
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BidPRoleSelect;
