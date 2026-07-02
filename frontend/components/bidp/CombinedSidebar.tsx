// BidP — Combined Sidebar (Employee + Admin)
// Shows Employee module always; Admin module only for non-employee roles.
import {
  Home, FilePlus, Copy, FolderOpen, Trophy, BookOpen,
  Shield, Search, DollarSign, FileSpreadsheet, BarChart3, Building,
  Tag, ArrowRightLeft, RotateCcw, Award, ArrowLeft, CheckSquare,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlant } from "@/contexts/PlantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { roleToApprovalLevel, getStatusesForLevel } from "@/lib/bidp/approvalPipeline";
import { bidpRoleHasAdminAccess, bidpRoleCanAccessAdminPath } from "@/lib/bidp/roles";

interface Props { onClose?: () => void; }

const BidPCombinedSidebarContent = ({ onClose }: Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { plantPrefix } = usePlant();
  const { user } = useAuth();
  const { suggestions } = useSuggestions();

  // Only show admin section for roles with admin module access (BPS Admin / BPS DH)
  const showAdmin = bidpRoleHasAdminAccess(user?.bidpRole);

  // Count of pending approvals for the current user's role
  const approvalsCount = useMemo(() => {
    if (!user?.employeeNo || !user.bidpRole || user.bidpRole === "employee") return 0;
    const level = roleToApprovalLevel(user.bidpRole);
    if (!level) return 0;
    const validStatuses = getStatusesForLevel(level);
    return suggestions.filter(s => {
      if (level === "FLM") return s.assignedFlm === user.employeeNo && validStatuses.includes(s.status);
      return validStatuses.includes(s.status);
    }).length;
  }, [suggestions, user]);

  const employeeItems = [
    { title: "Home",               translationKey: "Home",               url: `${plantPrefix}/employee`,                    icon: Home,        end: true },
    { title: "New Suggestion",     translationKey: "New Suggestion",     url: `${plantPrefix}/employee/new-suggestion`,     icon: FilePlus,    end: false },
    { title: "My Suggestions",     translationKey: "My Suggestions",     url: `${plantPrefix}/employee/my-suggestions`,     icon: FolderOpen },
    { title: "My Approvals",       translationKey: "My Approvals",       url: `${plantPrefix}/employee/my-approvals`,       icon: CheckSquare, badge: approvalsCount },
    { title: "My Awards",          translationKey: "My Awards",          url: `${plantPrefix}/employee/my-awards`,          icon: Trophy },
    { title: "Procedure",          translationKey: "Procedure",          url: `${plantPrefix}/employee/procedure`,          icon: BookOpen },
  ];

  const adminItems = [
    { title: "General Enquiry",     translationKey: "General Enquiry",            url: `${plantPrefix}/admin/general-enquiry`,     icon: Search,          path: "general-enquiry" },
    { title: "NEFT Report",         translationKey: "NEFT Report",                 url: `${plantPrefix}/admin/neft-report`,         icon: DollarSign,      path: "neft-report" },
    { title: "MIS Report",          translationKey: "MIS Report",                  url: `${plantPrefix}/admin/mis-report`,          icon: FileSpreadsheet, path: "mis-report" },
    { title: "MIS Graphical",       translationKey: "MIS Graphical Report",       url: `${plantPrefix}/admin/mis-graphical`,       icon: BarChart3,       path: "mis-graphical" },
    { title: "Dept Mapping",        translationKey: "Add Department Mapping",     url: `${plantPrefix}/admin/dept-mapping`,        icon: Building,        path: "dept-mapping" },
    { title: "Category Master",     translationKey: "Category Master",            url: `${plantPrefix}/admin/category-master`,     icon: Tag,             path: "category-master" },
    { title: "Transfer Suggestion", translationKey: "Transfer Suggestion",        url: `${plantPrefix}/admin/transfer-suggestion`, icon: ArrowRightLeft,  path: "transfer-suggestion" },
    { title: "Reopen Suggestion",   translationKey: "Reopen Rejected Suggestion", url: `${plantPrefix}/admin/reopen-suggestion`,   icon: RotateCcw,       path: "reopen-suggestion" },
    { title: "Award Letter",        translationKey: "Award Letter",               url: `${plantPrefix}/admin/award-letter`,        icon: Award,           path: "award-letter" },
  ].filter(item => bidpRoleCanAccessAdminPath(user?.bidpRole, item.path));

  const renderMenuItems = (items: typeof employeeItems) =>
    items.map((item) => (
      <NavLink
        key={item.url}
        to={item.url}
        end={item.end}
        onClick={onClose}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <div className="flex flex-col leading-tight flex-1 min-w-0">
          <span>{item.title}</span>
          <span className="text-[10px] opacity-60">{t(item.translationKey)}</span>
        </div>
        {"badge" in item && item.badge != null && item.badge > 0 && (
          <span className="ml-auto shrink-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </NavLink>
    ));

  return (
    <>
      {/* Scrollable area for both modules */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hidden select-none">
        {/* Employee Section */}
        <div className="px-3 py-3 border-b border-sidebar-border sticky top-0 bg-sidebar z-10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">
            Employee Module / <span>{t("Employee Menu")}</span>
          </p>
        </div>
        <nav className="py-2 px-2 space-y-0.5">
          {renderMenuItems(employeeItems)}
        </nav>

        {/* Admin Section — only for roles with admin module access (BPS Admin, BPS DH) */}
        {showAdmin && (
          <>
            <div className="px-3 py-3 border-b border-t border-sidebar-border">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">
                Admin Module / <span>{t("Admin Module")}</span>
              </p>
            </div>
            <nav className="py-2 px-2 space-y-0.5">
              {renderMenuItems(adminItems)}
            </nav>
          </>
        )}
      </div>

      {/* Back to Portal — pinned at bottom */}
      <div className="px-2 py-3 border-t border-sidebar-border shrink-0">
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

export default BidPCombinedSidebarContent;
