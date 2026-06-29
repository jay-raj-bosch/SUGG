import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import * as apiService from "@/lib/apiService";
import { clearToken } from "@/lib/api";
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

// ── Demo-mode fallback users ──────────────────────────────────────────────────
// Used ONLY when the backend is unreachable (VITE_DEMO_MODE=true).
// In production with SSO these are never used — the real user identity
// comes from the SSO provider via POST /api/auth/sso-exchange.
const DEMO_EMPLOYEE: AuthUser = {
  employeeNo: "DEMO-EMP",
  name: "Demo Employee",
  department: "Demo Dept",
  area: "Demo Area",
  plantCode: "PLT-01",
  role: "employee",
  ntid: "demo_emp",
  email: "demo.employee@company.com",
};

const DEMO_ADMIN: AuthUser = {
  employeeNo: "DEMO-ADMIN",
  name: "Demo Admin",
  department: "Demo Admin Dept",
  area: "Demo Area",
  plantCode: "PLT-01",
  role: "admin",
  ntid: "demo_admin",
  email: "demo.admin@company.com",
};

interface AuthContextType {
  user: AuthUser | null;
  /** Demo/fallback only — sets a placeholder role when no real auth is present. */
  setRole: (role: "employee" | "admin") => void;
  setBidpRole: (bidpRole: BidpRole, userData: Partial<AuthUser>) => void;
  setJapRole: (japRole: JapRole, userData: Partial<AuthUser>) => void;
  login: (employeeNo: string, password: string, requiredRole: "employee" | "admin") => Promise<string | null>;
  /** SSO login — pass the access token received from the SSO provider redirect. */
  loginWithSsoToken: (ssoAccessToken: string) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Session restore on mount.
  // 1. Tries GET /api/auth/me with the stored JWT — works for both credential
  //    login and SSO (the app JWT is the same format either way).
  // 2. Falls back to demo mode if no token or backend is unreachable.
  useEffect(() => {
    (async () => {
      const savedBidpRole = sessionStorage.getItem("bidpRole") as BidpRole | null;
      const savedBidpData = sessionStorage.getItem("bidpUserData");
      const savedJapRole  = sessionStorage.getItem("japRole") as JapRole | null;
      const savedJapData  = sessionStorage.getItem("japUserData");

      // Apply a saved role context on top of the resolved user
      const applyRoleContext = (baseUser: AuthUser): AuthUser => {
        if (savedJapRole && savedJapData) {
          const extra = JSON.parse(savedJapData) as Partial<AuthUser>;
          return { ...baseUser, ...extra, role: savedJapRole === "employee" ? "employee" : "admin", japRole: savedJapRole, bidpRole: undefined };
        }
        if (savedBidpRole && savedBidpData) {
          const extra = JSON.parse(savedBidpData) as Partial<AuthUser>;
          return { ...baseUser, ...extra, role: savedBidpRole === "employee" ? "employee" : "admin", bidpRole: savedBidpRole, japRole: undefined };
        }
        return baseUser;
      };

      try {
        // Restore from existing JWT — no credentials needed
        const restoredUser = await apiService.restoreSession();
        setUser(applyRoleContext(restoredUser));
      } catch {
        // No valid token or backend offline — use demo fallback
        setUser(applyRoleContext(DEMO_EMPLOYEE));
      }
    })();
  }, []);

  // Demo/fallback only — called by BidPUnifiedLayout when no user is present.
  // In production with SSO this path is never reached because SSO provides
  // the user identity before any plant page is rendered.
  const setRole = useCallback((role: "employee" | "admin") => {
    setUser(role === "admin" ? DEMO_ADMIN : DEMO_EMPLOYEE);
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

  // SSO login — call this from the SSO redirect callback page.
  // Pass the access token received from the SSO provider.
  // The backend validates the SSO token and returns an app JWT + user.
  const loginWithSsoToken = useCallback(async (ssoAccessToken: string): Promise<string | null> => {
    try {
      const res = await apiService.exchangeSsoToken(ssoAccessToken);
      setUser(res.user);
      return null;
    } catch (err: any) {
      return err?.message || "SSO login failed";
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
    <AuthContext.Provider value={{ user, setRole, setBidpRole, setJapRole, login, loginWithSsoToken, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
