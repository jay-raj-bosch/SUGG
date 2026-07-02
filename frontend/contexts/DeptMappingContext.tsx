/**
 * DeptMappingContext — shared department-mapping state.
 *
 * Both the admin DeptMapping page (which mutates mappings) and the
 * GeneralEnquiry page (which reads them) consume this context so
 * changes propagate instantly without a page reload.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import * as apiService from "@/lib/apiService";
import { usePlant } from "@/contexts/PlantContext";

// ── Hardcoded fallback (mirrors DeptMapping.tsx initialDepts) ────────────────
const FALLBACK_MAPPINGS: Record<string, string> = {
  "BIDP1/TEF": "TEF",
  "BIDP2/QAL": "QAL",
  "BIDP1/HRD": "HRD",
  "BIDP1/MNT": "MNT",
  "BIDP1/SAF": "SAF",
  "BIDP1/ADM": "ADM",
  "BIDP3/LOG": "LOG",
  "BIDP2/RND": "RND",
  "BIDP1/FIN": "FIN",
  "BIDP1/ITS": "ITS",
};

export interface DeptMappingEntry {
  id: string;
  dept: string;
  mapped: string;
}

interface DeptMappingContextType {
  /** Raw list of entries (for the admin table) */
  entries: DeptMappingEntry[];
  /** dept → mapped lookup for quick resolution */
  deptMap: Record<string, string>;
  /** Unique sorted list of all mapped department names (replaces hardcoded ranges) */
  uniqueRanges: string[];
  /** Unique sorted list of all raw department names (e.g. "BIDP1/TEF") — used for the Suggestion Department picker */
  uniqueDepartments: string[];
  /** Resolve a raw department name to its mapped short form */
  mapDept: (rawDept: string | undefined) => string;
  /** Full refresh from API */
  refresh: () => Promise<void>;
  /** Optimistic add — called after a successful API/local add */
  addEntry: (entry: DeptMappingEntry) => void;
  /** Optimistic update — called after a successful API/local update */
  updateEntry: (id: string, newMapped: string) => void;
  /** Optimistic delete — called after a successful API/local delete */
  removeEntry: (id: string) => void;
}

const DeptMappingContext = createContext<DeptMappingContextType | undefined>(undefined);

export const DeptMappingProvider = ({ children }: { children: ReactNode }) => {
  const { plant } = usePlant();
  const [entries, setEntries] = useState<DeptMappingEntry[]>(() =>
    Object.entries(FALLBACK_MAPPINGS).map(([dept, mapped], i) => ({
      id: String(i + 1),
      dept,
      mapped,
    })),
  );

  // ── Load from backend on mount ──────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!plant) return;
    try {
      const rows = await apiService.fetchDeptMappings(plant as "bidp" | "jap");
      if (rows.length) {
        setEntries(
          rows.map((r) => ({ id: String(r.id), dept: r.dept_name, mapped: r.mapped_name })),
        );
      }
    } catch {
      // keep current list on error
    }
  }, [plant]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Derived lookup map ──────────────────────────────────────────────────────
  const deptMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of entries) m[e.dept] = e.mapped;
    return m;
  }, [entries]);

  /** Unique sorted list of all mapped names — used as dynamic range options */
  const uniqueRanges = useMemo(() => {
    const unique = new Set(entries.map(e => e.mapped));
    return Array.from(unique).sort();
  }, [entries]);

  /** Unique sorted list of all raw department names — used for the Suggestion Department picker */
  const uniqueDepartments = useMemo(() => {
    const unique = new Set(entries.map(e => e.dept));
    return Array.from(unique).sort();
  }, [entries]);

  const mapDept = useCallback(
    (rawDept: string | undefined): string => {
      if (!rawDept) return "—";
      return deptMap[rawDept] || rawDept;
    },
    [deptMap],
  );

  // ── Optimistic mutators ─────────────────────────────────────────────────────
  const addEntry = useCallback((entry: DeptMappingEntry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  const updateEntry = useCallback((id: string, newMapped: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, mapped: newMapped } : e)));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const value = useMemo<DeptMappingContextType>(
    () => ({ entries, deptMap, uniqueRanges, uniqueDepartments, mapDept, refresh, addEntry, updateEntry, removeEntry }),
    [entries, deptMap, uniqueRanges, uniqueDepartments, mapDept, refresh, addEntry, updateEntry, removeEntry],
  );

  return <DeptMappingContext.Provider value={value}>{children}</DeptMappingContext.Provider>;
};

export const useDeptMappings = (): DeptMappingContextType => {
  const ctx = useContext(DeptMappingContext);
  if (!ctx) throw new Error("useDeptMappings must be used within DeptMappingProvider");
  return ctx;
};
