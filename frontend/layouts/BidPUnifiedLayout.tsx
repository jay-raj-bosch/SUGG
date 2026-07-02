import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BidPCombinedSidebarContent from "@/components/bidp/CombinedSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { usePlant, PlantCode } from "@/contexts/PlantContext";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Unified BidP layout that shows both Employee and Admin sidebars.
 * Later: access-based filtering will show only relevant sections.
 */
const BidPUnifiedLayout = () => {
  const { user, setRole } = useAuth();
  const { plant, setPlant } = usePlant();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-detect plant from URL on direct access
  useEffect(() => {
    if (!plant) {
      const match = location.pathname.match(/^\/(bidp)\//i);
      if (match) setPlant(match[1].toLowerCase() as PlantCode);
    }
  }, [plant, location.pathname, setPlant]);

  // Auto-assign admin role (gives access to everything)
  useEffect(() => {
    if (!user) {
      setRole("admin");
    }
  }, [user, setRole]);

  if (!user) return null;

  return (
    <div className="flex flex-col overflow-hidden" style={{ zoom: 0.90, height: 'calc(100vh / 0.90)', width: 'calc(100vw / 0.90)' }}>
      <AppHeader
        isAdmin
        onMenuToggle={() => setMobileOpen(o => !o)}
        mobileMenuOpen={mobileOpen}
      />
      <div className="flex flex-1 min-h-0">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col border-r border-sidebar-border transition-transform duration-300 lg:hidden overflow-y-auto",
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
          )}
        >
          <BidPCombinedSidebarContent onClose={() => setMobileOpen(false)} />
        </aside>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 bg-sidebar shrink-0 flex-col border-r border-sidebar-border min-h-0 overflow-y-auto">
          <BidPCombinedSidebarContent />
        </aside>

        <main className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-5 bg-background min-w-0">
          <div className="animate-fade-in max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default BidPUnifiedLayout;
