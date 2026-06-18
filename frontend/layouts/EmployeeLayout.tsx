import { Outlet, Navigate, useLocation } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import EmployeeSidebar from "@/components/EmployeeSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { usePlant, PlantCode } from "@/contexts/PlantContext";
import { useEffect, useState } from "react";
import ChatbotWidget from "@/components/jap/ChatbotWidget";
import { useSlaEscalation } from "@/hooks/useSlaEscalation";

const EmployeeLayout = () => {
  const { user, setRole } = useAuth();
  const { plant, setPlant } = usePlant();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-detect plant from URL on direct access (e.g. bookmarks)
  useEffect(() => {
    if (!plant) {
      const match = location.pathname.match(/^\/(bidp|jap)\//i);
      if (match) setPlant(match[1].toLowerCase() as PlantCode);
    }
  }, [plant, location.pathname, setPlant]);

  // Auto-assign employee role if not authenticated (direct URL access)
  useEffect(() => {
    if (!user) {
      setRole("employee");
    }
  }, [user, setRole]);

  // SLA escalation alerts for JaP
  useSlaEscalation();

  if (!user) return null; // Brief render while setting role

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader
        onMenuToggle={() => setMobileOpen(o => !o)}
        mobileMenuOpen={mobileOpen}
      />
      <div className="flex flex-1 min-h-0">
        <EmployeeSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-background">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      {plant === "jap" && <ChatbotWidget />}
    </div>
  );
};

export default EmployeeLayout;
