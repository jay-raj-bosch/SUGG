import { AlertTriangle, AlertCircle, Info, ExternalLink, ChevronDown, ChevronUp, CheckCircle2, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import type { DuplicateMatch, PendingMatch } from "@/lib/bidp/duplicateDetector";

interface DuplicateAlertDialogProps {
  open: boolean;
  matches?: DuplicateMatch[];
  /** In-flight concurrent matches (from pendingSubmissionsStore) */
  pendingMatches?: PendingMatch[];
  /** Called when the user decides to proceed anyway */
  onProceed: () => void;
  /** Called when the user decides to cancel */
  onCancel: () => void;
}

const confidenceConfig = {
  HIGH:   { color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-950/30",    border: "border-red-200 dark:border-red-800",    icon: AlertTriangle, label: "High Confidence Duplicate", badge: "destructive" as const },
  MEDIUM: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: AlertCircle,   label: "Possible Duplicate",         badge: "outline" as const },
  LOW:    { color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800",   icon: Info,          label: "Similar Suggestion",          badge: "secondary" as const },
};

const statusColors: Record<string, string> = {
  "Submitted":       "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Approved":        "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300",
  "Implemented":     "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Rejected":        "bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-300",
  "Under Evaluation":"bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300",
  "Pending FLM":     "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Pending BPS":     "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Draft":           "bg-gray-100   text-gray-600   dark:bg-gray-800/50   dark:text-gray-400",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress
        value={value}
        className={`h-1.5 ${value >= 70 ? "[&>div]:bg-red-500" : value >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-blue-400"}`}
      />
    </div>
  );
}

function MatchCard({ match, index }: { match: DuplicateMatch; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const cfg = confidenceConfig[match.confidence];
  const Icon = cfg.icon;
  const s = match.suggestion;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-start gap-3 p-3.5">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold font-mono ${cfg.color}`}>{s.suggestionNo}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[s.status] ?? "bg-gray-100 text-gray-600"}`}>
              {s.status}
            </span>
            <Badge variant={cfg.badge} className="text-[10px] h-4">
              {match.score}% match
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground leading-snug truncate">{s.subject}</p>
          <p className="text-[10px] text-muted-foreground">{s.type} · {s.category} · {s.date}</p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
          title={expanded ? "Collapse" : "View details"}
        >
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {/* Reason banner */}
      <div className={`px-3.5 py-2 border-t ${cfg.border} text-[10px] ${cfg.color} font-medium`}>
        {match.reason}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3.5 py-3 border-t border-border/30 space-y-4">
          {/* Similarity breakdown */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Similarity Breakdown</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              <ScoreBar label="Proposed Solution" value={match.breakdown.proposedMethod} />
              <ScoreBar label="Problem Description" value={match.breakdown.presentMethod} />
              <ScoreBar label="Subject / Title" value={match.breakdown.subject} />
              <ScoreBar label="Expected Benefits" value={match.breakdown.benefits} />
              <ScoreBar label="Category" value={match.breakdown.category} />
              <ScoreBar label="Suggestion Type" value={match.breakdown.type} />
            </div>
          </div>

          {/* Existing suggestion content */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Existing Suggestion Content</p>
            {s.presentMethod && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground">Present Situation</p>
                <p className="text-xs text-foreground bg-background/60 rounded p-2 border border-border/30">{s.presentMethod}</p>
              </div>
            )}
            {s.proposedMethod && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground">Proposed Solution</p>
                <p className="text-xs text-foreground bg-background/60 rounded p-2 border border-border/30">{s.proposedMethod}</p>
              </div>
            )}
            {s.benefits && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground">Benefits</p>
                <p className="text-xs text-foreground bg-background/60 rounded p-2 border border-border/30">{s.benefits}</p>
              </div>
            )}
            {s.employeeName && (
              <p className="text-[10px] text-muted-foreground">
                Submitted by <span className="font-medium text-foreground">{s.employeeName}</span>
                {s.department && <> · {s.department}</>}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PendingMatchCard({ match }: { match: PendingMatch }) {
  const cfg = confidenceConfig[match.confidence];
  const Icon = cfg.icon;
  const e = match.entry;

  return (
    <div className="rounded-xl border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 overflow-hidden">
      <div className="flex items-start gap-3 p-3.5">
        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700">
          <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-orange-500 text-white text-[10px] h-4">⚡ Live Conflict</Badge>
            <Badge variant={cfg.badge} className="text-[10px] h-4">{match.score}% match</Badge>
          </div>
          <p className="text-xs font-semibold text-foreground leading-snug">
            {e.employeeName ?? "Another user"} is submitting a similar {e.suggestionType ?? "suggestion"} right now
          </p>
          {e.subject && (
            <p className="text-[10px] text-muted-foreground truncate">Subject: {e.subject}</p>
          )}
        </div>
      </div>
      <div className="px-3.5 py-2 border-t border-orange-200 dark:border-orange-800 text-[10px] text-orange-700 dark:text-orange-400 font-medium">
        {match.reason}
      </div>
      <div className="px-3.5 py-3 border-t border-border/30 space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Similarity Breakdown</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <ScoreBar label="Proposed Solution" value={match.breakdown.proposedMethod} />
          <ScoreBar label="Problem Description" value={match.breakdown.presentMethod} />
          <ScoreBar label="Subject / Title" value={match.breakdown.subject} />
          <ScoreBar label="Expected Benefits" value={match.breakdown.benefits} />
        </div>
      </div>
    </div>
  );
}

export default function DuplicateAlertDialog({
  open,
  matches = [],
  pendingMatches = [],
  onProceed,
  onCancel,
}: DuplicateAlertDialogProps) {
  const hasPending = pendingMatches.length > 0;
  const best = matches[0] ?? (hasPending ? null : null);
  if (!best && !hasPending) return null;

  const hasHigh   = matches.some(m => m.confidence === "HIGH");
  const hasMedium = !hasHigh && matches.some(m => m.confidence === "MEDIUM");

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {hasHigh ? (
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            Duplicate Suggestion Detected
          </DialogTitle>
          <DialogDescription className="text-xs">
            {hasHigh
              ? "Our system found a highly similar suggestion already in the database. Please review before submitting."
              : hasMedium
              ? "A possibly similar suggestion was found. Please review the details below."
              : "Similar suggestions were found. Review them before proceeding."}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Summary chip row */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {hasPending && <Badge className="bg-orange-500 text-white text-[10px]">⚡ {pendingMatches.length} Live Conflict{pendingMatches.length > 1 ? "s" : ""}</Badge>}
          {matches.length > 0 && <span className="text-muted-foreground">{matches.length} saved match{matches.length > 1 ? "es" : ""}</span>}
          {hasHigh   && <Badge variant="destructive" className="text-[10px]">High Risk</Badge>}
          {hasMedium && <Badge className="bg-amber-500 text-white text-[10px]">Medium Risk</Badge>}
          {best && <span className="text-muted-foreground ml-auto text-[10px]">Best match: {best.score}% similarity</span>}
        </div>

        {/* Pending (live conflict) match cards — shown first as most urgent */}
        {hasPending && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
              <Zap className="h-3.5 w-3.5" />
              Live conflicts — being submitted right now
            </div>
            {pendingMatches.map((m) => (
              <PendingMatchCard key={m.entry.id} match={m} />
            ))}
          </div>
        )}

        {/* Saved match cards */}
        {matches.length > 0 && (
          <div className="space-y-3">
            {hasPending && (
              <p className="text-[11px] font-semibold text-muted-foreground">Also found in saved suggestions:</p>
            )}
            {matches.map((m, i) => (
              <MatchCard key={m.suggestion.id} match={m} index={i} />
            ))}
          </div>
        )}

        <Separator />

        {/* Action guidance */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            What should you do?
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
            <li>If your idea is <span className="font-medium text-foreground">the same</span> as an existing one — cancel and avoid duplicating.</li>
            <li>If your idea adds <span className="font-medium text-foreground">new value or a different scope</span> — proceed with submission.</li>
            <li>If the existing suggestion is <span className="font-medium text-foreground">rejected/closed</span>, you may re-submit with improvements.</li>
          </ul>
        </div>

        {/* Footer buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            ← Go back and revise
          </Button>
          <Button
            onClick={onProceed}
            variant={hasHigh ? "destructive" : "default"}
            className="flex-1 gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Submit anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
