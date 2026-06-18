import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import * as apiService from "@/lib/apiService";
import { setToken, clearToken } from "@/lib/api";
import type { JapRole } from "@/lib/jap/workflowPipeline";
export type { JapRole };

export type BidpRole = "employee" | "flm" | "manager" | "bps_admin" | "bps_dh";

export interface AuthUser {
  employeeNo: string;
  name: string;
  department: string;
  area: string;
  plantCode: string;
  role: "employee" | "admin";
  bidpRole?: BidpRole;
  japRole?: JapRole;
  ntid: string;
  email: string;
}

// Default credentials for auto-login (hardcoded in backend store)
const DEFAULT_EMPLOYEE_NO = "30698665";
const DEFAULT_ADMIN_NO = "30698720";
const DEFAULT_PASSWORD = "password123";

interface AuthContextType {
  user: AuthUser | null;
  setRole: (role: "employee" | "admin") => void;
  setBidpRole: (bidpRole: BidpRole, userData: Partial<AuthUser>) => void;
  setJapRole: (japRole: JapRole, userData: Partial<AuthUser>) => void;
  login: (employeeNo: string, password: string, requiredRole: "employee" | "admin") => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Auto-login on mount — restore saved BidP or JaP role session
  useEffect(() => {
    (async () => {
      const savedBidpRole   = sessionStorage.getItem("bidpRole") as BidpRole | null;
      const savedBidpData   = sessionStorage.getItem("bidpUserData");
      const savedJapRole    = sessionStorage.getItem("japRole") as JapRole | null;
      const savedJapData    = sessionStorage.getItem("japUserData");

      try {
        const res = await apiService.login(DEFAULT_EMPLOYEE_NO, DEFAULT_PASSWORD, "employee");
        if (savedJapRole && savedJapData) {
          const userData = JSON.parse(savedJapData) as Partial<AuthUser>;
          const baseRole = savedJapRole === "employee" ? "employee" : "admin";
          setUser({ ...res.user, ...userData, role: baseRole, japRole: savedJapRole } as AuthUser);
        } else if (savedBidpRole && savedBidpData) {
          const userData = JSON.parse(savedBidpData) as Partial<AuthUser>;
          const baseRole = savedBidpRole === "employee" ? "employee" : "admin";
          setUser({ ...res.user, ...userData, role: baseRole, bidpRole: savedBidpRole } as AuthUser);
        } else {
          setUser(res.user);
        }
      } catch {
        const fallback: AuthUser = {
          employeeNo: DEFAULT_EMPLOYEE_NO,
          name: "Karthik",
          department: "BIDP1/TEF",
          area: "RBIN/BIDP1",
          plantCode: "PLT-01",
          role: "employee",
          ntid: "karthik",
          email: "karthik@company.com",
        };
        if (savedJapRole && savedJapData) {
          const userData = JSON.parse(savedJapData) as Partial<AuthUser>;
          const baseRole = savedJapRole === "employee" ? "employee" : "admin";
          setUser({ ...fallback, ...userData, role: baseRole, japRole: savedJapRole } as AuthUser);
        } else if (savedBidpRole && savedBidpData) {
          const userData = JSON.parse(savedBidpData) as Partial<AuthUser>;
          const baseRole = savedBidpRole === "employee" ? "employee" : "admin";
          setUser({ ...fallback, ...userData, role: baseRole, bidpRole: savedBidpRole } as AuthUser);
        } else {
          setUser(fallback);
        }
      }
    })();
  }, []);

  const setRole = useCallback(async (role: "employee" | "admin") => {
    const empNo = role === "admin" ? DEFAULT_ADMIN_NO : DEFAULT_EMPLOYEE_NO;
    try {
      const res = await apiService.login(empNo, DEFAULT_PASSWORD, role);
      setUser(res.user);
    } catch {
      // Fallback if backend is unreachable
      if (role === "admin") {
        setUser({ employeeNo: "30698720", name: "Vijay Sharma", department: "BIDP1/ADM", area: "RBIN/BIDP1", plantCode: "PLT-01", role: "admin", ntid: "vsharma", email: "vijay.sharma@company.com" });
      } else {
        setUser({ employeeNo: DEFAULT_EMPLOYEE_NO, name: "Karthik", department: "BIDP1/TEF", area: "RBIN/BIDP1", plantCode: "PLT-01", role: "employee", ntid: "karthik", email: "karthik@company.com" });
      }
    }
  }, []);

  const login = useCallback(async (
    employeeNo: string,
    password: string,
    requiredRole: "employee" | "admin"
  ): Promise<string | null> => {
    try {
      const res = await apiService.login(employeeNo, password, requiredRole);
      setUser(res.user);
      return null;
    } catch (err: any) {
      return err?.message || "Login failed";
    }
  }, []);

  const setBidpRole = useCallback((bidpRole: BidpRole, userData: Partial<AuthUser>) => {
    const baseRole = bidpRole === "employee" ? "employee" : "admin";
    sessionStorage.setItem("bidpRole", bidpRole);
    sessionStorage.setItem("bidpUserData", JSON.stringify(userData));
    // Clear JaP session when entering BidP
    sessionStorage.removeItem("japRole");
    sessionStorage.removeItem("japUserData");
    setUser(prev => ({
      ...(prev || { employeeNo: "", name: "", department: "", area: "", plantCode: "", ntid: "", email: "" }),
      ...userData,
      role: baseRole,
      bidpRole,
      japRole: undefined,
    } as AuthUser));
  }, []);

  const setJapRole = useCallback((japRole: JapRole, userData: Partial<AuthUser>) => {
    const baseRole = japRole === "employee" ? "employee" : "admin";
    sessionStorage.setItem("japRole", japRole);
    sessionStorage.setItem("japUserData", JSON.stringify(userData));
    // Clear BidP session when entering JaP
    sessionStorage.removeItem("bidpRole");
    sessionStorage.removeItem("bidpUserData");
    setUser(prev => ({
      ...(prev || { employeeNo: "", name: "", department: "", area: "", plantCode: "", ntid: "", email: "" }),
      ...userData,
      role: baseRole,
      japRole,
      bidpRole: undefined,
    } as AuthUser));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    sessionStorage.removeItem("bidpRole");
    sessionStorage.removeItem("bidpUserData");
    sessionStorage.removeItem("japRole");
    sessionStorage.removeItem("japUserData");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setRole, setBidpRole, setJapRole, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
