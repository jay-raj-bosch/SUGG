// Demo Application — Employee Sidebar Content
import { Home, FilePlus, ListChecks, Trophy, ArrowLeft, Sliders, Layers, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlant } from "@/contexts/PlantContext";
import { getDemoSelection } from "@/lib/demoConfig";

interface Props {
  onClose?: () => void;
}

const DemoEmployeeSidebarContent = ({ onClose }: Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { plantPrefix } = usePlant();
  const demoSelection = getDemoSelection();

  const menuItems = [
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
      <div className="px-3 py-3 border-b border-sidebar-border space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">
          Demo Application
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-sidebar-foreground/80 font-medium">
          <Building2 className="h-3 w-3 text-primary shrink-0" />
          <span>{demoSelection?.plant ?? "JaP"}</span>
          <span className="opacity-50">/</span>
          <Layers className="h-3 w-3 text-indigo-500 shrink-0" />
          <span className="truncate capitalize">{demoSelection?.scheme ?? "suggestion"}</span>
        </div>
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
      <div className="px-2 py-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => {
            navigate("/demo/setup");
            onClose?.();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
        >
          <Sliders className="h-4 w-4 text-primary" />
          <div className="flex flex-col leading-tight text-left">
            <span>Switch Plant & Scheme</span>
            <span className="text-[10px] opacity-60">Change Environment</span>
          </div>
        </button>
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

