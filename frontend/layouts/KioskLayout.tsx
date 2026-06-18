import { Outlet, useNavigate } from "react-router-dom";
import { Home, FilePlus, FolderOpen, Trophy, KeyRound, LogOut, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KioskKeyboardProvider, useKioskKeyboard } from "@/contexts/KioskKeyboardContext";
import OnScreenKeyboard from "@/components/bidp/kiosk/OnScreenKeyboard";

const menuItems = [
  { title: "Home",            url: "/bidp/kiosk",                icon: Home,      end: true  },
  { title: "New Suggestion",  url: "/bidp/kiosk/new-suggestion", icon: FilePlus,  end: false },
  { title: "My Suggestions",  url: "/bidp/kiosk/my-suggestions", icon: FolderOpen },
  { title: "My Awards",       url: "/bidp/kiosk/my-awards",      icon: Trophy     },
  { title: "Change Password", url: "/bidp/kiosk/change-password",icon: KeyRound   },
];

const KioskSidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => { logout(); navigate("/bidp/kiosk/login"); };

  return (
    <aside className="w-60 shrink-0 bg-sidebar flex flex-col border-r border-sidebar-border h-full">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">BIDP Kiosk</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.name} · {user?.employeeNo}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {menuItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.end}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            activeClassName="bg-primary text-primary-foreground font-semibold shadow-md"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

// Inner layout — consumes keyboard context
const KioskInner = () => {
  const { isVisible, onInput, onBackspace } = useKioskKeyboard();

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <KioskSidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
        {/* On-screen keyboard — sticky at bottom of right panel */}
        <OnScreenKeyboard
          onInput={onInput}
          onBackspace={onBackspace}
          visible={isVisible}
        />
      </div>
    </div>
  );
};

const KioskLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/bidp/kiosk/login");
    return null;
  }

  return (
    <KioskKeyboardProvider>
      <KioskInner />
    </KioskKeyboardProvider>
  );
};

export default KioskLayout;
