// Configuration and scheme registry for Demo Application
export type DemoPlantKey = "JaP" | "BidP" | "NaP";

export interface DemoSchemeOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

export interface DemoPlantOption {
  key: DemoPlantKey;
  label: string;
  fullName: string;
  location: string;
  schemes: DemoSchemeOption[];
}

export const DEMO_PLANTS_CONFIG: Record<DemoPlantKey, DemoPlantOption> = {
  JaP: {
    key: "JaP",
    label: "JaP",
    fullName: "Jaipur Plant (JaP)",
    location: "Jaipur, Rajasthan",
    schemes: [
      {
        value: "suggestion",
        label: "Suggestion",
        description: "Standard employee improvement suggestion / सुझाव",
        badge: "Active",
      },
      {
        value: "kaizen",
        label: "Kaizen",
        description: "Continuous quick incremental shopfloor improvement / कैज़न",
        badge: "Popular",
      },
    ],
  },
  NaP: {
    key: "NaP",
    label: "NaP",
    fullName: "Naganathapura Plant (NaP)",
    location: "Naganathapura, Karnataka",
    schemes: [
      {
        value: "regular suggestion",
        label: "Regular Suggestion",
        description: "Formal individual process improvement proposal",
        badge: "Standard",
      },
      {
        value: "EDOI",
        label: "EDOI",
        description: "Every Day Operational Improvement scheme",
        badge: "Operational",
      },
      {
        value: "kaizen",
        label: "Kaizen",
        description: "Shopfloor 5S, ergonomics & flow optimization",
        badge: "Fast-Track",
      },
    ],
  },
  BidP: {
    key: "BidP",
    label: "BidP",
    fullName: "Bidadi Plant (BidP)",
    location: "Bidadi, Karnataka",
    schemes: [
      {
        value: "ctf",
        label: "CTF",
        description: "Continuous Task Force improvement scheme",
      },
      {
        value: "sss",
        label: "SSS",
        description: "Small Scale Suggestion system",
      },
      {
        value: "sfc",
        label: "SFC",
        description: "Suggestion For Change / Safety First Committee",
      },
      {
        value: "mic",
        label: "MIC",
        description: "Minor Improvement Campaign",
      },
      {
        value: "dcip",
        label: "DCIP",
        description: "Direct Cost Improvement Project",
      },
    ],
  },
};

const STORAGE_KEY_PLANT = "demo_app_selected_plant";
const STORAGE_KEY_SCHEME = "demo_app_selected_scheme";

export interface DemoSelection {
  plant: DemoPlantKey;
  scheme: string;
}

export function getDemoSelection(): DemoSelection | null {
  try {
    const plant = (sessionStorage.getItem(STORAGE_KEY_PLANT) || localStorage.getItem(STORAGE_KEY_PLANT)) as DemoPlantKey | null;
    const scheme = sessionStorage.getItem(STORAGE_KEY_SCHEME) || localStorage.getItem(STORAGE_KEY_SCHEME);
    if (plant && scheme && DEMO_PLANTS_CONFIG[plant]) {
      return { plant, scheme };
    }
  } catch {
    // ignore storage error
  }
  return null;
}

export function saveDemoSelection(plant: DemoPlantKey, scheme: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_PLANT, plant);
    sessionStorage.setItem(STORAGE_KEY_SCHEME, scheme);
    localStorage.setItem(STORAGE_KEY_PLANT, plant);
    localStorage.setItem(STORAGE_KEY_SCHEME, scheme);
  } catch {
    // ignore
  }
}

export function clearDemoSelection(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_PLANT);
    sessionStorage.removeItem(STORAGE_KEY_SCHEME);
    localStorage.removeItem(STORAGE_KEY_PLANT);
    localStorage.removeItem(STORAGE_KEY_SCHEME);
  } catch {
    // ignore
  }
}
