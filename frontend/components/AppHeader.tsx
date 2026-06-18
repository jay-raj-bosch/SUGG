import { Bell, Home, Lightbulb, Globe, CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle, Menu, X } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { usePlant } from "@/contexts/PlantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  isAdmin?: boolean;
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

const languageLabels: Record<Language, string> = {
  kannada: "ಕನ್ನಡ",
  tamil: "தமிழ்",
  hindi: "हिंदी",
  telugu: "తెలుగు",
};

/** Languages available per plant — JaP is Hindi-only, BidP supports all */
const plantLanguages: Record<string, Language[]> = {
  bidp: ["kannada", "hindi", "tamil", "telugu"],
  jap:  ["hindi"],
};

const typeIcon: Record<Notification["type"], React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
  error: <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />,
};

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AppHeader = ({ isAdmin = false, onMenuToggle, mobileMenuOpen }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { plant, plantInfo } = usePlant();

  const allowedLanguages: Language[] = plant ? (plantLanguages[plant] ?? Object.keys(languageLabels) as Language[]) : Object.keys(languageLabels) as Language[];

  // Auto-switch to first allowed language when plant changes (e.g. JaP → Hindi only)
  useEffect(() => {
    if (!allowedLanguages.includes(language)) {
      setLanguage(allowedLanguages[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant]);

  return (
    <header className="header-gradient shrink-0 shadow-md">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-header-foreground hover:bg-sidebar-accent h-8 w-8 shrink-0"
              onClick={onMenuToggle}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary/25 flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4 text-sidebar-primary" />
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="text-sm font-bold text-header-foreground tracking-tight">Suggestion Management System</span>
            <span className="block text-[10px] text-header-foreground/50 mt-0.5">{t("Suggestion Management System")}</span>
          </div>
          <span className="sm:hidden text-sm font-bold text-header-foreground">SMS</span>
          {isAdmin && (
            <Badge variant="outline" className="border-sidebar-primary/60 text-sidebar-primary bg-sidebar-primary/10 text-[10px] font-semibold px-2 ml-1 shrink-0">
              ADMIN
            </Badge>
          )}
          {plantInfo && (
            <Badge variant="outline" className="border-header-foreground/40 text-header-foreground/80 text-[10px] ml-1 font-semibold shrink-0">
              {plantInfo.name}
            </Badge>
          )}
        </div>

        {/* Right: Employee info + Actions */}
        <div className="flex items-center gap-3">

          {/* Employee details — far right, before action buttons */}
          {user && (
            <div className="hidden md:flex items-center gap-0 border border-header-foreground/15 rounded-lg overflow-hidden bg-header-foreground/8">
              <div className="flex flex-col justify-center px-3 py-1 border-r border-header-foreground/15">
                <span className="text-[9px] text-header-foreground/50 whitespace-nowrap leading-none">Employee No / {plant === "jap" ? "कर्मचारी संख्या" : "ನೌಕರನ ಸಂಖ್ಯೆ"}</span>
                <span className="text-xs font-bold text-header-foreground leading-tight mt-0.5">{user.employeeNo}</span>
              </div>
              <div className="flex flex-col justify-center px-3 py-1 border-r border-header-foreground/15">
                <span className="text-[9px] text-header-foreground/50 whitespace-nowrap leading-none">Name / {plant === "jap" ? "नाम" : "ಹೆಸರು"}</span>
                <span className="text-xs font-bold text-header-foreground leading-tight mt-0.5">{user.name}</span>
              </div>
              <div className="flex flex-col justify-center px-3 py-1 border-r border-header-foreground/15">
                <span className="text-[9px] text-header-foreground/50 whitespace-nowrap leading-none">Department / {plant === "jap" ? "विभाग" : "ವಿಭಾಗ"}</span>
                <span className="text-xs font-bold text-header-foreground leading-tight mt-0.5">{user.department}</span>
              </div>
              <div className="flex flex-col justify-center px-3 py-1">
                <span className="text-[9px] text-header-foreground/50 whitespace-nowrap leading-none">Area / {plant === "jap" ? "क्षेत्र" : "ಕಾರ್ಯಕ್ಷೇತ್ರ"}</span>
                <span className="text-xs font-bold text-header-foreground leading-tight mt-0.5">{user.area}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-header-foreground hover:bg-sidebar-accent text-xs gap-1.5 h-8">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{languageLabels[language]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {allowedLanguages.map((lang) => (
                  <DropdownMenuItem key={lang} onClick={() => setLanguage(lang)} className={language === lang ? "bg-accent" : ""}>
                    {languageLabels[lang]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-header-foreground hover:bg-sidebar-accent h-8 w-8">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[9px] font-bold flex items-center justify-center text-accent-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-primary" onClick={markAllAsRead}>
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </Button>
                  )}
                </div>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications</div>
                ) : (
                  notifications.slice(0, 15).map(n => (
                    <DropdownMenuItem
                      key={n.id}
                      className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      {typeIcon[n.type]}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${!n.read ? "font-medium" : "text-muted-foreground"}`}>{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.timestamp)}</p>
                      </div>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="text-header-foreground hover:bg-sidebar-accent text-xs gap-1 h-8"
              onClick={() => navigate("/")}
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Portal</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
