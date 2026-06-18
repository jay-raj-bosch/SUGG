// BidP — Admin Sidebar
// This file owns all BidP admin menu items. Never import JaP items here.
import {
  Search, DollarSign, BarChart3, Building,
  Tag, ArrowRightLeft, RotateCcw, Award, ArrowLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlant } from "@/contexts/PlantContext";

interface Props { onClose?: () => void; }

const BidPAdminSidebarContent = ({ onClose }: Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { plantPrefix } = usePlant();

  const menuItems = [
    { title: "General Enquiry",     translationKey: "General Enquiry",            url: `${plantPrefix}/admin/general-enquiry`,     icon: Search },
    { title: "NEFT/MIS Report",     translationKey: "NEFT / MIS Report",          url: `${plantPrefix}/admin/neft-report`,         icon: DollarSign },
    { title: "MIS Graphical",       translationKey: "MIS Graphical Report",       url: `${plantPrefix}/admin/mis-graphical`,       icon: BarChart3 },
    { title: "Dept Mapping",        translationKey: "Add Department Mapping",     url: `${plantPrefix}/admin/dept-mapping`,        icon: Building },
    { title: "Category Master",     translationKey: "Category Master",            url: `${plantPrefix}/admin/category-master`,     icon: Tag },
    { title: "Transfer Suggestion", translationKey: "Transfer Suggestion",        url: `${plantPrefix}/admin/transfer-suggestion`, icon: ArrowRightLeft },
    { title: "Reopen Suggestion",   translationKey: "Reopen Rejected Suggestion", url: `${plantPrefix}/admin/reopen-suggestion`,   icon: RotateCcw },
    { title: "Award Letter",        translationKey: "Award Letter",               url: `${plantPrefix}/admin/award-letter`,        icon: Award },
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

export default BidPAdminSidebarContent;
