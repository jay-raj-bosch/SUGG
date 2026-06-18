import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { usePlant, PlantCode } from "@/contexts/PlantContext";
import { useEffect, useState } from "react";
import ChatbotWidget from "@/components/jap/ChatbotWidget";
import { useSlaEscalation } from "@/hooks/useSlaEscalation";

const AdminLayout = () => {
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

  // Auto-assign admin role if not authenticated (direct URL access)
  useEffect(() => {
    if (!user) {
      setRole("admin");
    }
  }, [user, setRole]);

  // SLA escalation alerts for JaP
  useSlaEscalation();

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader
        isAdmin
        onMenuToggle={() => setMobileOpen(o => !o)}
        mobileMenuOpen={mobileOpen}
      />
      <div className="flex flex-1 min-h-0">
        <AdminSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 md:p-6 bg-background overflow-hidden">
          <div className="animate-fade-in flex-1 min-h-0 flex flex-col overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
      {plant === "jap" && <ChatbotWidget />}
    </div>
  );
};

export default AdminLayout;
