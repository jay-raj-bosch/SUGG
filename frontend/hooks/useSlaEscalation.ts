// JaP — SLA Escalation Hook
// Scans active JaP suggestions on mount; fires a notification for each
// suggestion whose daysPending exceeds the phase SLA.
// Deduplicates via sessionStorage so the same suggestion isn't alerted twice per session.
import { useEffect, useRef } from "react";
import { useSuggestions } from "@/contexts/SuggestionContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { PHASE_SLA, STATUS_TO_PHASE, STATUS_PENDING_WITH } from "@/lib/jap/workflowPipeline";
import { PLANT_CODE_JAP } from "@/lib/constants";

const SEEN_KEY = "jap_sla_alerts_seen";

function getSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markSeen(ids: string[]) {
  try {
    const existing = getSeenIds();
    ids.forEach(id => existing.add(id));
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...existing]));
  } catch { /* quota */ }
}

export function useSlaEscalation() {
  const { suggestions } = useSuggestions();
  const { addNotification } = useNotifications();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const japSuggs = suggestions.filter(s => s.plantCode === PLANT_CODE_JAP);
    if (japSuggs.length === 0) return;

    const seen = getSeenIds();
    const newAlerts: string[] = [];

    japSuggs.forEach(s => {
      const sla = PHASE_SLA[s.status];
      if (!sla || sla === 0) return;
      const pending = s.daysPending ?? 0;
      if (pending <= sla) return;
      if (seen.has(s.id)) return;

      const phase = STATUS_TO_PHASE[s.status] ?? s.status;
      const owner = STATUS_PENDING_WITH[s.status] ?? "—";
      addNotification(
        `⚠️ SLA Breach: ${s.suggestionNo} overdue in ${phase} (${pending}d / ${sla}d SLA) — pending with ${owner}`,
        "warning",
      );
      newAlerts.push(s.id);
    });

    if (newAlerts.length > 0) {
      markSeen(newAlerts);
    }

    fired.current = true;
  }, [suggestions, addNotification]);
}
