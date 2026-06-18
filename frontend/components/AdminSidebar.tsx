import { usePlant } from "@/contexts/PlantContext";
import BidPAdminSidebarContent from "@/components/bidp/AdminSidebar";
import JaPAdminSidebarContent from "@/components/jap/AdminSidebar";
import { cn } from "@/lib/utils";
import { useRef, useState, useCallback, useEffect } from "react";

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 240;

const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const { plant } = usePlant();
  return plant === "jap"
    ? <JaPAdminSidebarContent onClose={onClose} />
    : <BidPAdminSidebarContent onClose={onClose} />;
};

const AdminSidebar = ({ open, onClose }: AdminSidebarProps) => {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile: slide-in drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col border-r border-sidebar-border transition-transform duration-300 md:hidden",
          open ? "translate-x-0 shadow-xl" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={onClose} />
      </aside>

      {/* Desktop: resizable sidebar */}
      <aside
        className="hidden md:flex bg-sidebar shrink-0 flex-col border-r border-sidebar-border min-h-0 overflow-y-auto relative"
        style={{ width }}
      >
        <SidebarContent />
        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10 group"
          title="Drag to resize"
        >
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-8 rounded-full bg-border group-hover:bg-primary/60 transition-colors" />
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
