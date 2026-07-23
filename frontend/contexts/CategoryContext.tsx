import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import * as apiService from "@/lib/apiService";
import { usePlant } from "@/contexts/PlantContext";

const SESSION_KEY = "bidp_categories";

interface CategoryContextType {
  categories: string[];
  refreshCategories: () => Promise<void>;
  addCategory: (name: string) => void;
  removeCategories: (names: string[]) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

/** Persist categories to sessionStorage */
const persist = (cats: string[]) => {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(cats)); } catch { /* */ }
};

/** Restore categories from sessionStorage */
const restore = (): string[] | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return null;
};

// Backend is an in-memory ts-node process — after a restart it takes a few
// seconds to compile & start listening. If the category fetch races that
// window it fails once and (without a retry) the list would stay empty/stale
// until a manual page reload. Retry with a short fixed delay a few times,
// then keep polling slowly until it succeeds so the list self-heals as soon
// as the backend comes back up, always reflecting Category Master.
const MAX_FAST_RETRIES = 5;
const FAST_RETRY_DELAY_MS = 1500;
const SLOW_RETRY_DELAY_MS = 5000;

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const { plant } = usePlant();
  const [categories, setCategories] = useState<string[]>(() => restore() || []);

  /**
   * Fetch from backend and apply on success. Returns whether it succeeded.
   * Always OVERWRITES local state with the backend's list — the dropdown must
   * stay a true mirror of the BPS admin's Category Master, never a merge with
   * stale/local-only names left over from a previous failed sync.
   */
  const fetchAndApply = useCallback(async (): Promise<boolean> => {
    if (!plant) return false;
    try {
      const cats = await apiService.fetchCategories(plant as "bidp" | "jap");
      const names = Array.from(new Set(cats.map(c => c.name)));
      setCategories(names);
      persist(names);
      return true;
    } catch {
      return false;
    }
  }, [plant]);

  const refreshCategories = useCallback(async () => {
    await fetchAndApply();
  }, [fetchAndApply]);

  // Load on mount / whenever the plant changes: restore from session (or the
  // Category Master's own cache) first for an instant paint, then keep
  // retrying the backend until it responds.
  useEffect(() => {
    const saved = restore();
    if (saved && saved.length > 0) {
      setCategories(saved);
    } else {
      // No session cache — try the Category Master's own cache as a last
      // resort so the UI isn't blank while we wait for the backend to respond.
      try {
        const raw = sessionStorage.getItem("bidp_catlist");
        if (raw) {
          const entries: { name: string }[] = JSON.parse(raw);
          const names = entries.map(e => e.name).filter(Boolean);
          if (names.length > 0) setCategories(names);
        }
      } catch { /* */ }
    }

    if (!plant) return;
    let cancelled = false;
    let attempt = 0;

    const tryFetch = () => {
      fetchAndApply().then(ok => {
        if (ok || cancelled) return;
        attempt += 1;
        const delay = attempt <= MAX_FAST_RETRIES ? FAST_RETRY_DELAY_MS : SLOW_RETRY_DELAY_MS;
        setTimeout(() => { if (!cancelled) tryFetch(); }, delay);
      });
    };
    tryFetch();

    return () => { cancelled = true; };
  }, [fetchAndApply, plant]);

  const addCategory = useCallback((name: string) => {
    setCategories(prev => {
      if (prev.includes(name)) return prev;
      const updated = [...prev, name];
      persist(updated);
      return updated;
    });
  }, []);

  const removeCategories = useCallback((names: string[]) => {
    const removeSet = new Set(names);
    setCategories(prev => {
      const updated = prev.filter(c => !removeSet.has(c));
      persist(updated);
      return updated;
    });
  }, []);

  const value = useMemo<CategoryContextType>(
    () => ({ categories, refreshCategories, addCategory, removeCategories }),
    [categories, refreshCategories, addCategory, removeCategories],
  );

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = (): CategoryContextType => {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories must be used within CategoryProvider");
  return ctx;
};
