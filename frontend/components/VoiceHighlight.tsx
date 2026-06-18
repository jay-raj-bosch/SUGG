import React from "react";
import { Mic, MicOff, Languages } from "lucide-react";

/**
 * Wraps a form field with a per-field mic button when voice mode is on.
 *  - voiceMode=true   shows a small "speak" button (top-right, always visible)
 *  - active=true      field glows with ring + button turns coloured/pulsing (stop)
 *  - isTranslating    shows a translating shimmer while auto-translation runs
 *  - translatingLang  shows source language badge when non-English
 *  - onActivate       toggles listen on/off for this specific field
 */
interface VoiceHighlightProps {
  active: boolean;
  voiceMode?: boolean;
  onActivate?: () => void;
  isTranslating?: boolean;
  translatingLang?: string;      // e.g. "Hindi", displayed as badge
  children: React.ReactNode;
}

const VoiceHighlight = ({
  active, voiceMode, onActivate, isTranslating, translatingLang, children,
}: VoiceHighlightProps) => (
  <div className={`relative transition-all duration-300 ${
    active
      ? isTranslating
        ? "rounded-xl ring-2 ring-violet-400/40 bg-violet-500/[0.03] p-2.5"
        : "rounded-xl ring-2 ring-rose-400/35 bg-rose-500/[0.03] p-2.5"
      : ""
  }`}>
    {voiceMode && (
      <div className="absolute top-0 right-0 flex items-center gap-0.5 z-10">
        {/* Language badge — visible only when listening with a non-English language */}
        {active && translatingLang && (
          <span className="flex items-center gap-0.5 px-1.5 py-[3px] rounded-bl-lg text-[9px] font-semibold bg-violet-500/90 text-white border border-violet-400/60 select-none">
            <Languages className="h-2.5 w-2.5" />
            {translatingLang}
          </span>
        )}
        <button
          type="button"
          onClick={onActivate}
          title={active ? "Stop listening" : "Speak this field"}
          className={`flex items-center gap-1 px-1.5 py-[3px] text-[10px] font-medium border transition-all duration-200 select-none ${
            translatingLang && active ? "rounded-tr-xl" : "rounded-bl-lg rounded-tr-[inherit]"
          } ${
            active
              ? isTranslating
                ? "bg-violet-500 border-violet-400/60 text-white shadow-sm shadow-violet-500/20"
                : "bg-rose-500 border-rose-400/60 text-white shadow-sm shadow-rose-500/20"
              : "bg-background border-border/40 text-muted-foreground/60 hover:bg-primary/5 hover:border-primary/25 hover:text-primary"
          }`}
        >
          {active ? (
            <>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isTranslating ? "bg-violet-200" : "bg-white"
                }`} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              {isTranslating ? (
                <>
                  <Languages className="h-2.5 w-2.5 animate-pulse" />
                  <span>translating…</span>
                </>
              ) : (
                <>
                  <MicOff className="h-2.5 w-2.5" />
                  <span>stop</span>
                </>
              )}
            </>
          ) : (
            <>
              <Mic className="h-2.5 w-2.5" />
              <span>speak</span>
            </>
          )}
        </button>
      </div>
    )}
    {children}
  </div>
);

export default VoiceHighlight;
