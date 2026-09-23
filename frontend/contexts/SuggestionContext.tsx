// SuggestionContext – plant-scoped suggestion state
// Backend: suggestions table via /api/suggestions?plantCode={plant}
// ISOLATION: Every fetch, create, and update carries the active plant_code.
//             Data is cleared and re-fetched whenever the active plant changes.
import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from "react";
import { Suggestion, AuditEntry, mockSuggestions as initialSuggestions } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { usePlant } from "@/contexts/PlantContext";

interface SuggestionContextType {
  suggestions: Suggestion[];
  addSuggestion: (suggestion: Omit<Suggestion, "id">) => Promise<void>;
  updateSuggestion: (id: string, updates: Partial<Suggestion>) => Promise<void>;
  deleteSuggestion: (id: string) => void;
  /** Re-fetch from backend; returns the freshest list */
  refreshSuggestions: () => Promise<Suggestion[]>;
  /** Synchronous snapshot — always returns the latest array (not stale closure) */
  getSuggestionsSnapshot: () => Suggestion[];
  getSuggestionsByStatus: (...statuses: string[]) => Suggestion[];
  getPendingSuggestions: () => Suggestion[];
  getDraftSuggestions: () => Suggestion[];
  getSubmittedSuggestions: () => Suggestion[];
  getAwardedSuggestions: () => Suggestion[];
  getDailyCIPSuggestions: () => Suggestion[];
  getByType: (type: string) => Suggestion[];
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

// Bump this version whenever mock data structure changes to force a fresh seed.
const MOCK_DATA_VERSION = "v13";

// ── Stale-cache eviction ─────────────────────────────────────────────────────
// Scans all bidp_db_ data keys; removes any whose version tag is missing or stale.
// Runs at module-load time so it triggers on both page load AND Vite HMR.
(function evictStaleMockCache() {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith("bidp_db_") && !k.includes("version_"))
      .forEach(dataKey => {
        const vk = dataKey.replace("bidp_db_", "bidp_db_version_");
        if (sessionStorage.getItem(vk) !== MOCK_DATA_VERSION) {
          sessionStorage.removeItem(dataKey);
          sessionStorage.removeItem(vk);
        }
      });
  } catch { /* sessionStorage unavailable */ }
})();

let nextId = 100;

const typePrefix: Record<string, string> = {
  "Simple Suggestion Scheme": "SSS",
  "Shop Floor CIP": "SFC",
  "My Idea Card": "MIC",
  "Daily CIP": "DCP",
  "Cash The Flash": "CTF",
};

export const SuggestionProvider = ({ children }: { children: ReactNode }) => {
  const { plant } = usePlant();
  // seedTick increments when the module-level eviction cleared stale data so
  // the effect re-runs even under HMR without a full browser refresh.
  const [seedTick, setSeedTick] = useState(() => {
    try {
      // If no version key exists for this plant, data was just evicted → tick
      const plant = sessionStorage.getItem("selectedPlant");
      if (!plant) return 0;
      const vk = `bidp_db_version_${plant}`;
      return sessionStorage.getItem(vk) === MOCK_DATA_VERSION ? 0 : 1;
    } catch { return 0; }
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Keep a ref that always points to the latest suggestions array.
  // This prevents stale-closure issues in handleSubmit.
  const suggestionsRef = useRef<Suggestion[]>(suggestions);
  useEffect(() => { suggestionsRef.current = suggestions; }, [suggestions]);

  /** Synchronous snapshot — always up-to-date */
  const getSuggestionsSnapshot = useCallback(() => suggestionsRef.current, []);

  // ── Persistence helpers ──────────────────────────────────────────────
  // Treat sessionStorage as our "database". The FULL suggestions array is
  // saved on every mutation. On load we check sessionStorage first; if present
  // we use that (preserving all approvals/edits). If absent, seed from mock data.
  const storageKey = plant ? `bidp_db_${plant}` : null;

  const persist = useCallback((data: Suggestion[]) => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(data));
      sessionStorage.setItem(`${storageKey.replace("bidp_db_", "bidp_db_version_")}`, MOCK_DATA_VERSION);
    } catch { /* quota */ }
  }, [storageKey]);

  /** Re-fetch from backend; falls back to current local state */
  const refreshSuggestions = useCallback(async (): Promise<Suggestion[]> => {
    if (!plant) return suggestionsRef.current;
    try {
      const result = await apiService.fetchSuggestions(plant, { limit: 2000 });
      if (result.data?.length) {
        setSuggestions(result.data);
        suggestionsRef.current = result.data;
        persist(result.data);
        return result.data;
      }
    } catch { /* backend unavailable */ }
    return suggestionsRef.current;
  }, [plant, persist]);

  // Load data when plant changes (or when stale cache was evicted on HMR).
  // Priority: backend > sessionStorage (persisted DB) > mock seed data.
  useEffect(() => {
    if (!plant) {
      setSuggestions([]);
      suggestionsRef.current = [];
      return;
    }
    const key = `bidp_db_${plant}`;
    const versionKey = `bidp_db_version_${plant}`;
    const savedVersion = sessionStorage.getItem(versionKey);
    const saved = sessionStorage.getItem(key);
    if (saved && savedVersion === MOCK_DATA_VERSION) {
      // Restore previously persisted state (includes all user edits & approvals)
      const restored: Suggestion[] = JSON.parse(saved);
      setSuggestions(restored);
      suggestionsRef.current = restored;
    } else {
      // First visit or mock data updated — seed from fresh mock data
      const plantKey = plant === "jap" ? "PLT-02" : plant === "demo" ? "PLT-03" : "PLT-01";
      // Suggestions without plantCode are legacy BidP data → treat as PLT-01
      const seed = initialSuggestions.filter(s => (s.plantCode || "PLT-01") === plantKey);
      setSuggestions(seed);
      suggestionsRef.current = seed;
      // Persist the seed so all roles share the same state
      try {
        sessionStorage.setItem(key, JSON.stringify(seed));
        sessionStorage.setItem(versionKey, MOCK_DATA_VERSION);
      } catch { /* */ }
    }
    // Try backend — if available, overwrite with real data.
    // Only accept the response if it actually contains suggestions for this plant.
    const expectedPlantCode = plant === "jap" ? "PLT-02" : plant === "demo" ? "PLT-03" : "PLT-01";
    apiService.fetchSuggestions(plant, { limit: 500 })
      .then(result => {
        if (result.data.length) {
          // Guard: the JWT user may belong to a different plant, so the backend
          // could return data for the wrong plant. Only overwrite local state
          // when at least some returned rows match the active plant.
          const relevant = result.data.filter(
            (s: any) => s.plantCode === expectedPlantCode || s.plant_code === expectedPlantCode,
          );
          if (relevant.length) {
            setSuggestions(result.data);
            suggestionsRef.current = result.data;
            try { sessionStorage.setItem(key, JSON.stringify(result.data)); } catch { /* */ }
          }
        }
      })
      .catch(() => { /* backend unavailable — keep local data */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant, seedTick]);

  const addSuggestion = useCallback(async (suggestion: Omit<Suggestion, "id">) => {
    let newEntry: Suggestion;

    // Build initial audit entry for submission
    const initialAuditEntry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action: suggestion.status === "Draft" ? "Created" : "Submitted",
      performedBy: suggestion.employeeNo || "",
      performedByName: suggestion.employeeName || "",
      performedByDept: suggestion.department,
      role: "Employee",
      date: new Date().toISOString(),
      fromStatus: undefined,
      toStatus: suggestion.status || "Submitted",
      comments: undefined,
    };
    const suggestionWithAudit = {
      ...suggestion,
      auditTrail: [...(suggestion.auditTrail || []), initialAuditEntry],
    };

    try {
      const typeCodeMap: Record<string, string> = {
        "Simple Suggestion Scheme": "SSS",
        "Shop Floor CIP": "SFC",
        "My Idea Card": "MIC",
        "Daily CIP": "DCP",
        "Cash The Flash": "CTF",
        "Improvement Suggestion": "JAP",
      };
      const typeCode = typeCodeMap[suggestion.type] ?? "SSS";
      const created = await apiService.createSuggestion((plant ?? "bidp") as "bidp" | "jap", {
        typeCode,
        subject: suggestion.subject,
        category: suggestion.category,
        status: suggestion.status,
        suggestionDate: suggestion.date,
        range: suggestion.range,
        suggestionFor: (suggestion as any).suggestionFor ?? "self",
        groupSuggestion: (suggestion as any).groupSuggestion ?? "no",
        otherInfo: (suggestion as any).otherInfo,
        pendingWith: suggestion.pendingWith,
        presentMethod: suggestion.presentMethod,
        proposedMethod: suggestion.proposedMethod,
        benefits: suggestion.benefits,
        assignedFlm: suggestion.assignedFlm,
        approvalLevel: suggestion.approvalLevel,
        plantCode: plant,
        ...((suggestion as any).formData ?? {}),
      });
      newEntry = { ...suggestionWithAudit, plantCode: suggestion.plantCode ?? plant ?? "", id: String(created.id), suggestionNo: created.suggestionNo ?? suggestion.suggestionNo };
    } catch {
      const id = String(Date.now());
      const prefix = { "Simple Suggestion Scheme": "SSS", "Shop Floor CIP": "SFC", "My Idea Card": "MIC", "Daily CIP": "DCP", "Cash The Flash": "CTF", "Improvement Suggestion": "JAP" }[suggestion.type] ?? "SUG";
      const year = new Date().getFullYear();
      const suggestionNo = suggestion.suggestionNo || `${prefix}-${year}-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`;
      newEntry = { ...suggestionWithAudit, plantCode: suggestion.plantCode ?? plant ?? "", id, suggestionNo };
    }
    setSuggestions(prev => {
      const updated = [newEntry, ...prev];
      suggestionsRef.current = updated;
      persist(updated);
      return updated;
    });
  }, [plant, persist]);

  const updateSuggestion = useCallback(async (id: string, updates: Partial<Suggestion>) => {
    // Snapshot previous state for potential rollback
    const previous = suggestionsRef.current;
    setSuggestions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      suggestionsRef.current = updated;
      persist(updated);
      return updated;
    });
    try {
      await apiService.updateSuggestion((plant ?? "bidp") as "bidp" | "jap" | "demo", id, updates as Record<string, unknown>);
    } catch (err) {
      // Rollback the optimistic update so the UI does not drift from the server
      console.error("[SuggestionContext] updateSuggestion failed, rolling back:", err);
      setSuggestions(previous);
      suggestionsRef.current = previous;
      persist(previous);
      throw err;
    }
  }, [persist]);

  const deleteSuggestion = useCallback((id: string) => {
    setSuggestions(prev => {
      const updated = prev.filter(s => s.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const getSuggestionsByStatus = useCallback((...statuses: string[]) => {
    return suggestions.filter(s => statuses.includes(s.status));
  }, [suggestions]);

  const getPendingSuggestions = useCallback(() => {
    // Treat every closed/terminal status as non-pending so closed suggestions
    // never appear under any "Pending" list (req #31).
    const terminalStatuses = [
      "Draft",
      "Rejected",
      "Approved",
      "Approved & Closed",
      "Closed",
      "Closed / Awarded",
      "Implemented",
    ];
    return suggestions.filter(s => !terminalStatuses.includes(s.status));
  }, [suggestions]);

  const getDraftSuggestions = useCallback(() => {
    return suggestions.filter(s => s.status === "Draft");
  }, [suggestions]);

  const getSubmittedSuggestions = useCallback(() => {
    return suggestions.filter(s => s.status !== "Draft");
  }, [suggestions]);

  const getAwardedSuggestions = useCallback(() => {
    return suggestions.filter(s => s.awardAmount !== undefined && s.awardAmount > 0);
  }, [suggestions]);

  const getDailyCIPSuggestions = useCallback(() => {
    return suggestions.filter(s => s.type === "Daily CIP");
  }, [suggestions]);

  const getByType = useCallback((type: string) => {
    return suggestions.filter(s => s.type === type);
  }, [suggestions]);

  // Memoise context value so consumers don't re-render unless one of the
  // referenced values/handlers actually changes.
  const value = useMemo<SuggestionContextType>(() => ({
    suggestions,
    addSuggestion,
    updateSuggestion,
    deleteSuggestion,
    refreshSuggestions,
    getSuggestionsSnapshot,
    getSuggestionsByStatus,
    getPendingSuggestions,
    getDraftSuggestions,
    getSubmittedSuggestions,
    getAwardedSuggestions,
    getDailyCIPSuggestions,
    getByType,
  }), [
    suggestions,
    addSuggestion,
    updateSuggestion,
    deleteSuggestion,
    refreshSuggestions,
    getSuggestionsSnapshot,
    getSuggestionsByStatus,
    getPendingSuggestions,
    getDraftSuggestions,
    getSubmittedSuggestions,
    getAwardedSuggestions,
    getDailyCIPSuggestions,
    getByType,
  ]);

  return (
    <SuggestionContext.Provider value={value}>
      {children}
    </SuggestionContext.Provider>
  );
};

export const useSuggestions = () => {
  const ctx = useContext(SuggestionContext);
  if (!ctx) throw new Error("useSuggestions must be used within SuggestionProvider");
  return ctx;
};
