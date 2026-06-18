// JaP — Admin Sidebar
// This file owns all JaP admin menu items. Never import BidP items here.
import { useMemo } from "react";
import {
  Shield, Search, ClipboardList, FileText, Award,
  BarChart3, RotateCcw, Inbox, ArrowLeft, Settings2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlant } from "@/contexts/PlantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { countJapInboxItems } from "@/lib/jap/workflowPipeline";
import { countPendingForApprover } from "@/lib/jap/evalApprovalStore";
import { countPendingReopenForSigner } from "@/lib/jap/reopenApprovalStore";
import type { JapRole } from "@/lib/jap/workflowPipeline";

interface Props { onClose?: () => void; }

const JaPAdminSidebarContent = ({ onClose }: Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { plantPrefix } = usePlant();
  const { user } = useAuth();
  const { suggestions } = useSuggestions();

  const workflowBadge = useMemo(() => {
    if (!user?.japRole || !user?.employeeNo) return 0;
    return countJapInboxItems(suggestions, user.japRole as JapRole, user.employeeNo);
  }, [user, suggestions]);

  const approvalBadge = useMemo(() => {
    if (!user?.japRole || !user?.employeeNo) return 0;
    const wf    = countJapInboxItems(suggestions, user.japRole as JapRole, user.employeeNo);
    const eval_ = countPendingForApprover(user.employeeNo);
    return wf + eval_;
  }, [user, suggestions]);

  const reopenBadge = useMemo(() => {
    if (!user?.employeeNo) return 0;
    return countPendingReopenForSigner(user.employeeNo);
  }, [user]);

  const menuItems = [
    {
      title: "Workflow Inbox", translationKey: "वर्कफ़्लोव इनबॉक्स",
      url: `${plantPrefix}/admin/workflow-inbox`,
      icon: Inbox,
      badge: workflowBadge > 0 ? workflowBadge : undefined as number | undefined,
    },
    { title: "Assign Authority",           translationKey: "प्राधिकरण नियुक्त करें",  url: `${plantPrefix}/admin/assign-authority`,      icon: Shield,        badge: undefined as number | undefined },
    { title: "View Suggestions",           translationKey: "सुझाव देखें",            url: `${plantPrefix}/admin/view-suggestions`,      icon: Search,        badge: undefined as number | undefined },
    { title: "Quantifiable Evaluation",    translationKey: "मापनीय मूल्यांकन",       url: `${plantPrefix}/admin/eval-quantifiable`,     icon: ClipboardList, badge: undefined as number | undefined },
    { title: "Non-Quantifiable Evaluation",translationKey: "गैर-मापनीय मूल्यांकन",  url: `${plantPrefix}/admin/eval-non-quantifiable`, icon: FileText,      badge: undefined as number | undefined },
    { title: "Award Management",           translationKey: "पुरस्कार प्रबंधन",       url: `${plantPrefix}/admin/award-management`,      icon: Award,         badge: undefined as number | undefined },
    { title: "MIS Graphical",              translationKey: "एमआईएस रिपोर्ट",         url: `${plantPrefix}/admin/mis-graphical`,          icon: BarChart3,     badge: undefined as number | undefined },
    { title: "Reopen Suggestion",          translationKey: "सुझाव पुनः खोलें",       url: `${plantPrefix}/admin/reopen-suggestion`,     icon: RotateCcw,     badge: reopenBadge > 0 ? reopenBadge : undefined as number | undefined },
    {
      title: "Approval Inbox", translationKey: "अनुमोदन इनबॉक्स",
      url: `${plantPrefix}/admin/approval-inbox`,
      icon: ClipboardList,
      badge: approvalBadge > 0 ? approvalBadge : undefined as number | undefined,
    },
    ...(user?.japRole === "bps" ? [{
      title: "BPS Settings", translationKey: "बीपीएस सेटिंग्स",
      url: `${plantPrefix}/admin/bps-settings`,
      icon: Settings2,
      badge: undefined as number | undefined,
    }] : []),
  ];

  return (
    <>
      <div className="px-3 py-3 border-b border-sidebar-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">
          Admin Module / <span>{t("Admin Module")}</span>
        </p>
      </div>
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            onClick={onClose}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
            activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <div className="flex flex-col leading-tight flex-1">
              <span>{item.title}</span>
              <span className="text-[10px] opacity-60">{t(item.translationKey)}</span>
            </div>
            {item.badge !== undefined && (
              <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-sidebar-border">
        <button
          onClick={() => { navigate("/"); onClose?.(); }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <div className="flex flex-col leading-tight">
            <span>Back to Portal</span>
            <span className="text-[10px] opacity-60">{t("Back to Portal")}</span>
          </div>
        </button>
      </div>
    </>
  );
};

export default JaPAdminSidebarContent;
