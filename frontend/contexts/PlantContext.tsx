import { createContext, useContext, useState, ReactNode } from "react";

export type PlantCode = "bidp" | "jap" | "demo";

export interface PlantInfo {
  code: PlantCode;
  name: string;
  fullName: string;
  city: string;
  regionalLabel: string;
}

export const PLANTS: Record<PlantCode, PlantInfo> = {
  bidp: {
    code: "bidp",
    name: "BidP",
    fullName: "Bidadi Plant",
    city: "Bidadi, Karnataka",
    regionalLabel: "ಕನ್ನಡ",
  },
  jap: {
    code: "jap",
    name: "JaP",
    fullName: "Jaipur Plant",
    city: "Jaipur, Rajasthan",
    regionalLabel: "हिंदी",
  },
  demo: {
    code: "demo",
    name: "Demo",
    fullName: "Demo Plant",
    city: "Innovation Hub",
    regionalLabel: "Demo",
  },
};

interface PlantContextType {
  plant: PlantCode | null;
  plantInfo: PlantInfo | null;
  setPlant: (plant: PlantCode) => void;
  /** e.g. "/bidp" or "/jap" — prefix for all plant-scoped routes */
  plantPrefix: string;
}

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export const PlantProvider = ({ children }: { children: ReactNode }) => {
  const [plant, setPlantState] = useState<PlantCode | null>(() => {
    try {
      return (sessionStorage.getItem("selectedPlant") as PlantCode) || null;
    } catch {
      return null;
    }
  });

  const setPlant = (p: PlantCode) => {
    try { sessionStorage.setItem("selectedPlant", p); } catch { /* ignore */ }
    setPlantState(p);
  };

  return (
    <PlantContext.Provider
      value={{
        plant,
        plantInfo: plant ? PLANTS[plant] : null,
        setPlant,
        plantPrefix: plant ? `/${plant}` : "",
      }}
    >
      {children}
    </PlantContext.Provider>
  );
};

export const usePlant = () => {
  const ctx = useContext(PlantContext);
  if (!ctx) throw new Error("usePlant must be used within PlantProvider");
  return ctx;
};
