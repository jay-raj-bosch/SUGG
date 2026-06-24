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

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const { plant } = usePlant();
  const [categories, setCategories] = useState<string[]>(() => restore() || []);

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await apiService.fetchCategories(plant ?? undefined);
      const names = cats.map(c => c.name);
      // Merge: keep any session-only categories that the backend doesn't know about
      const saved = restore() || [];
      const backendSet = new Set(names);
      const merged = [...names, ...saved.filter(s => !backendSet.has(s))];
      // Deduplicate
      const unique = Array.from(new Set(merged));
      setCategories(unique);
      persist(unique);
    } catch {
      // Backend unavailable — keep session data
    }
  }, [plant]);

  // Load on mount: restore from session first, then try backend
  useEffect(() => {
    const saved = restore();
    if (saved && saved.length > 0) {
      setCategories(saved);
    }
    refreshCategories();
  }, [refreshCategories]);

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
