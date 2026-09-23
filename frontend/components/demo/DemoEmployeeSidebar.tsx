// Demo Plant — Employee Sidebar Content
import { Home, FilePlus, ListChecks, Trophy, ArrowLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlant } from "@/contexts/PlantContext";

interface Props {
  onClose?: () => void;
}

const DemoEmployeeSidebarContent = ({ onClose }: Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { plantPrefix } = usePlant();

  const menuItems = [
    {
      title: "Home",
      translationKey: "Home",
      url: `${plantPrefix}/employee`,
      icon: Home,
      end: true,
    },
    {
      title: "New Suggestion",
      translationKey: "New Suggestion",
      url: `${plantPrefix}/employee/new-suggestion`,
      icon: FilePlus,
      end: false,
    },
    {
      title: "My Suggestions",
      translationKey: "My Suggestions",
      url: `${plantPrefix}/employee/my-suggestions`,
      icon: ListChecks,
      end: false,
    },
    {
      title: "My Rewards",
      translationKey: "My Rewards",
      url: `${plantPrefix}/employee/my-rewards`,
      icon: Trophy,
      end: false,
    },
  ];

  return (
    <>
      <div className="px-3 py-3 border-b border-sidebar-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">
          Employee Portal / <span>{t("Employee Menu")}</span>
        </p>
      </div>
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => (
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
            <div className="flex flex-col leading-tight">
              <span>{item.title}</span>
              <span className="text-[10px] opacity-60">{t(item.translationKey)}</span>
            </div>
          </NavLink>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-sidebar-border">
        <button
          onClick={() => {
            navigate("/");
            onClose?.();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <div className="flex flex-col leading-tight text-left">
            <span>Back to Portal</span>
            <span className="text-[10px] opacity-60">{t("Back to Portal")}</span>
          </div>
        </button>
      </div>
    </>
  );
};

export default DemoEmployeeSidebarContent;
