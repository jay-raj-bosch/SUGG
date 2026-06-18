import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode, useEffect } from "react";
import { usePlant, type PlantCode, PLANTS } from "@/contexts/PlantContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlantGuardProps {
  children: ReactNode;
}

/**
 * PlantGuard — wraps every plant-scoped route.
 *
 * Responsibilities:
 *  1. Reads the plant code from the first URL segment (e.g. /bidp/... → "bidp").
 *  2. Validates the segment is a known plant — unknown codes redirect to /.
 *  3. Syncs PlantContext so all children know which plant they are in.
 *  4. Ensures regional language is set for the plant.
 */
const PlantGuard = ({ children }: PlantGuardProps) => {
  const { pathname } = useLocation();
  const { plant: contextPlant, setPlant } = usePlant();
  const { setLanguage } = useLanguage();

  // Extract plant code from the first path segment: /bidp/employee → "bidp"
  const resolvedCode = pathname.split("/")[1]?.toLowerCase() as PlantCode | undefined;
  const isKnownPlant = resolvedCode !== undefined && resolvedCode in PLANTS;

  // Keep context in sync with the URL segment.
  // This handles direct URL access, browser back/forward, and shared links.
  useEffect(() => {
    if (isKnownPlant && resolvedCode !== contextPlant) {
      setPlant(resolvedCode);
      setLanguage(resolvedCode === "jap" ? "hindi" : "kannada");
    }
  }, [resolvedCode, contextPlant, isKnownPlant, setPlant, setLanguage]);

  if (!isKnownPlant) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PlantGuard;
