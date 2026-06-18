import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { categories as mockCategories } from "@/lib/mockData";
import * as apiService from "@/lib/apiService";
import { usePlant } from "@/contexts/PlantContext";

interface CategoryContextType {
  categories: string[];
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const { plant } = usePlant();
  const [categories, setCategories] = useState<string[]>(mockCategories);

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await apiService.fetchCategories(plant ?? undefined);
      if (cats.length > 0) {
        setCategories(cats.map(c => c.name));
      }
    } catch {
      // keep current list on error
    }
  }, [plant]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  const value = useMemo<CategoryContextType>(() => ({ categories, refreshCategories }), [categories, refreshCategories]);

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
