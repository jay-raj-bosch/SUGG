import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface SuggestionOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SuggestionComboboxProps {
  options: SuggestionOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Max items to render in the dropdown at once (default 50) */
  maxVisible?: number;
}

const SuggestionCombobox = ({
  options,
  value,
  onChange,
  placeholder = "Type or select...",
  className,
  maxVisible = 50,
}: SuggestionComboboxProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync display text when value changes externally
  useEffect(() => {
    if (value) {
      const match = options.find(o => o.value === value);
      if (match) setQuery(match.value);
      else setQuery(value);
    } else {
      setQuery("");
    }
  }, [value, options]);

  // Memoized filtering — avoids re-filtering on every render
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      o.value.toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q))
    );
  }, [options, query]);

  // Cap visible results for DOM performance
  const totalMatches = filtered.length;
  const visibleItems = filtered.slice(0, maxVisible);
  const hasMore = totalMatches > maxVisible;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (opt: SuggestionOption) => {
    onChange(opt.value);
    setQuery(opt.value);
    setOpen(false);
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    setOpen(true);
    // If typed value exactly matches an option value, select it
    const exact = options.find(o => o.value.toLowerCase() === val.toLowerCase() || o.label.toLowerCase() === val.toLowerCase());
    if (exact) {
      onChange(exact.value);
    } else {
      onChange(val); // allow manual entry
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-8 pr-3"
        />
      </div>
      {open && visibleItems.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          {/* Match count header when there are many results */}
          {totalMatches > 10 && (
            <div className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm border-b px-3 py-1.5 text-[10px] text-muted-foreground font-medium flex justify-between">
              <span>{totalMatches} match{totalMatches !== 1 ? "es" : ""}</span>
              {hasMore && <span>Showing first {maxVisible} — type to narrow</span>}
            </div>
          )}
          {visibleItems.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer",
                value === opt.value && "bg-accent/50 font-medium"
              )}
              onMouseDown={e => { e.preventDefault(); handleSelect(opt); }}
            >
              <span>{opt.label}</span>
              {opt.sublabel && <span className="block text-[10px] text-muted-foreground">{opt.sublabel}</span>}
            </button>
          ))}
          {hasMore && (
            <div className="sticky bottom-0 bg-muted/90 backdrop-blur-sm border-t px-3 py-1.5 text-[10px] text-muted-foreground text-center">
              {totalMatches - maxVisible} more — type to filter
            </div>
          )}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md p-3 text-xs text-muted-foreground text-center">
          No matches found — manual entry will be used
        </div>
      )}
    </div>
  );
};

export default SuggestionCombobox;
