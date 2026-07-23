import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, User, Eye, EyeOff, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import OnScreenKeyboard from "@/components/bidp/kiosk/OnScreenKeyboard";

// Demo employees available in the seeded backend (all use password: password123)
const DEMO_EMPLOYEES = [
  { empNo: "30698665", name: "Karthik",      dept: "BIDP1/TEF" },
  { empNo: "30698701", name: "Suresh Patil", dept: "BIDP2/QAL" },
  { empNo: "30698702", name: "Anita Sharma", dept: "BIDP1/MNT" },
  { empNo: "30698704", name: "Priya Devi",   dept: "BIDP1/SAF" },
  { empNo: "30698706", name: "Kavitha Nair", dept: "BIDP2/QAL" },
  { empNo: "30698710", name: "Suresh M",     dept: "BIDP1/TEF" },
];

const DEMO_PASSWORD = "password123";

const KioskLogin = () => {
  const navigate = useNavigate();
  const { login, setBidpRole } = useAuth();
  const [employeeNo, setEmployeeNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState<"employeeNo" | "password" | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleInput = useCallback((key: string) => {
    if (activeField === "employeeNo") setEmployeeNo(prev => prev + key);
    else if (activeField === "password") setPassword(prev => prev + key);
  }, [activeField]);

  const handleBackspace = useCallback(() => {
    if (activeField === "employeeNo") setEmployeeNo(prev => prev.slice(0, -1));
    else if (activeField === "password") setPassword(prev => prev.slice(0, -1));
  }, [activeField]);

  const handleLogin = async () => {
    const emp = employeeNo.trim();
    if (!emp || !password.trim()) {
      toast.error("Please enter both Employee No and Password");
      return;
    }
    setLoading(true);
    try {
      // Try real API login
      const error = await login(emp, password, "employee");
      if (!error) {
        toast.success("Login successful!");
        navigate("/bidp/kiosk");
        return;
      }
      // If API login fails, fall back to demo credentials
      const demoEmp = DEMO_EMPLOYEES.find(e => e.empNo === emp);
      if (demoEmp && password === DEMO_PASSWORD) {
        await setBidpRole("employee", {
          employeeNo: demoEmp.empNo,
          name: demoEmp.name,
          department: demoEmp.dept,
          area: "RBIN/BIDP1",
          plantCode: "PLT-01",
          ntid: demoEmp.name.toLowerCase().replace(/\s/g, ""),
          email: `${demoEmp.name.toLowerCase().replace(/\s/g, ".")}@company.com`,
        });
        toast.success("Login successful!");
        navigate("/bidp/kiosk");
        return;
      }
      toast.error("Invalid employee number or password");
    } catch {
      // Network/server down — try offline demo fallback
      const demoEmp = DEMO_EMPLOYEES.find(e => e.empNo === emp);
      if (demoEmp && password === DEMO_PASSWORD) {
        await setBidpRole("employee", {
          employeeNo: demoEmp.empNo,
          name: demoEmp.name,
          department: demoEmp.dept,
          area: "RBIN/BIDP1",
          plantCode: "PLT-01",
          ntid: demoEmp.name.toLowerCase().replace(/\s/g, ""),
          email: `${demoEmp.name.toLowerCase().replace(/\s/g, ".")}@company.com`,
        });
        toast.success("Login successful!");
        navigate("/bidp/kiosk");
      } else {
        toast.error("Invalid employee number or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BIDP Kiosk</h1>
            <p className="text-sm text-muted-foreground">
              Suggestion Management System — Employee Login
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="w-full max-w-md shadow-xl border-primary/10 animate-fade-in">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Employee Login</CardTitle>
            <CardDescription>Enter your credentials to access the kiosk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="kiosk-empno" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Employee Number
              </Label>
              <Input
                id="kiosk-empno"
                value={employeeNo}
                onChange={e => setEmployeeNo(e.target.value)}
                onFocus={() => setActiveField("employeeNo")}
                placeholder="e.g. 30698665"
                className="h-12 text-lg"
                autoComplete="off"
                inputMode="none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kiosk-password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="kiosk-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setActiveField("password")}
                  placeholder="Enter your password"
                  className="h-12 text-lg pr-12"
                  autoComplete="off"
                  inputMode="none"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            {/* Demo credentials hint */}
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-400"
                onClick={() => setShowHint(h => !h)}
              >
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Demo credentials (password: password123)
                </span>
                {showHint ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showHint && (
                <div className="px-3 pb-3 space-y-1">
                  {DEMO_EMPLOYEES.map(e => (
                    <button
                      key={e.empNo}
                      type="button"
                      className="w-full text-left flex items-center gap-2 rounded px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      onClick={() => { setEmployeeNo(e.empNo); setPassword(DEMO_PASSWORD); }}
                    >
                      <span className="font-mono text-xs font-semibold text-blue-800 dark:text-blue-300 w-24">{e.empNo}</span>
                      <span className="text-xs text-muted-foreground">{e.name} — {e.dept}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => navigate("/bidp/select-role")}
            >
              Back to Role Selection
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* On-screen keyboard */}
      <OnScreenKeyboard
        onInput={handleInput}
        onBackspace={handleBackspace}
        onEnter={handleLogin}
        visible={activeField !== null}
      />
    </div>
  );
};

export default KioskLogin;

