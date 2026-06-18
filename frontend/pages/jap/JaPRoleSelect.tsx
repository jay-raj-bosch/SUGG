// JaP — Role Selection Page
// Shows all 7 workflow roles. Each role maps to a mock JaP employee.
// Non-employee roles go to /jap/admin/workflow-inbox;
// the employee role goes to /jap/employee.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, ArrowRight, User, Shield, ClipboardCheck,
  Wrench, Calculator, Users, UserCog,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import type { JapRole } from "@/lib/jap/workflowPipeline";

interface RoleOption {
  role: JapRole;
  label: string;
  sublabel: string;
  name: string;
  employeeNo: string;
  department: string;
  icon: typeof User;
  description: string;
  iconClass: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "employee",
    label: "Employee",
    sublabel: "कर्मचारी",
    name: "Suresh M",
    employeeNo: "EMP-10201",
    department: "Production",
    icon: User,
    description: "Submit suggestions, track status & awards",
    iconClass: "bg-blue-100 text-blue-600",
  },
  {
    role: "superior",
    label: "Superior",
    sublabel: "वरिष्ठ अधिकारी",
    name: "Rajesh Kumar",
    employeeNo: "EMP-10250",
    department: "Production",
    icon: UserCog,
    description: "Phase 2 — Feasibility review: approve or reject submissions",
    iconClass: "bg-orange-100 text-orange-600",
  },
  {
    role: "planner",
    label: "Planner",
    sublabel: "योजनाकार",
    name: "Anita Sharma",
    employeeNo: "EMP-10251",
    department: "Planning",
    icon: ClipboardCheck,
    description: "Phase 3 — Opinion review; Phase 5 — Evaluation & award recommendation",
    iconClass: "bg-purple-100 text-purple-600",
  },
  {
    role: "implementer",
    label: "Implementer",
    sublabel: "क्रियान्वयनकर्ता",
    name: "Sanjay P",
    employeeNo: "EMP-10253",
    department: "Engineering",
    icon: Wrench,
    description: "Phase 4 — Execute approved suggestions and mark implementation done",
    iconClass: "bg-amber-100 text-amber-600",
  },
  {
    role: "ctg",
    label: "CTG",
    sublabel: "केंद्रीय तकनीकी समूह",
    name: "Praveen N",
    employeeNo: "EMP-10252",
    department: "CTG",
    icon: Calculator,
    description: "Phase 5 — Calculate quantifiable savings (restricted access)",
    iconClass: "bg-teal-100 text-teal-600",
  },
  {
    role: "bps",
    label: "BPS Admin",
    sublabel: "बीपीएस प्रशासक",
    name: "Arun Joshi",
    employeeNo: "EMP-ADMIN-02",
    department: "Admin",
    icon: Shield,
    description: "Full admin — manage input methods, reports, award management, all phases",
    iconClass: "bg-red-100 text-red-600",
  },
  {
    role: "coordinator",
    label: "Suggestion Coordinator",
    sublabel: "सुझाव समन्वयक",
    name: "Kavitha R",
    employeeNo: "EMP-10254",
    department: "HR",
    icon: Users,
    description: "Track all open suggestions across phases and help close them",
    iconClass: "bg-green-100 text-green-600",
  },
];

const JaPRoleSelect = () => {
  const navigate = useNavigate();
  const { setJapRole } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [selected, setSelected] = useState<JapRole | null>(null);

  const handleSelect = (option: RoleOption) => {
    if (leaving) return;
    setSelected(option.role);
    setLeaving(true);

    setJapRole(option.role, {
      employeeNo: option.employeeNo,
      name: option.name,
      department: option.department,
      area: "RBIN/JAP",
      plantCode: "PLT-02",
      ntid: option.name.toLowerCase().replace(/\s+/g, ""),
      email: `${option.name.toLowerCase().replace(/\s+/g, ".")}@company.com`,
    });

    const dest =
      option.role === "employee" ? "/jap/employee" : "/jap/admin/workflow-inbox";
    setTimeout(() => navigate(dest), 280);
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
          <h1 className="text-2xl font-bold text-foreground">
            Suggestion Management System
          </h1>
          <p className="text-sm text-muted-foreground">
            सुझाव प्रबंधन प्रणाली — जयपुर संयंत्र
          </p>
        </div>
      </div>

      <p className="text-xs text-primary font-semibold mb-2 tracking-wide uppercase">
        Jaipur Plant (JaP)
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        Select your role to continue
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-5xl w-full">
        {ROLE_OPTIONS.map((option, index) => (
          <div
            key={option.role}
            className="transition-all duration-200"
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <Card
              className={[
                "cursor-pointer group transition-all duration-200 hover:shadow-md h-full",
                selected === option.role ? "ring-2 ring-primary shadow-md" : "",
              ].join(" ")}
              onClick={() => handleSelect(option)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${option.iconClass}`}
                  >
                    <option.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
                <CardTitle className="text-base leading-tight">
                  {option.label}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{option.sublabel}</p>
                <CardDescription className="text-xs mt-1 leading-snug">
                  {option.description}
                </CardDescription>
                <p className="text-xs text-primary font-medium mt-2">
                  {option.name} · {option.department}
                </p>
              </CardHeader>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JaPRoleSelect;
