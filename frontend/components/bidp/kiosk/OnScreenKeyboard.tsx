import { useState, useCallback, useRef, useEffect } from "react";
import { Delete, CornerDownLeft, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnScreenKeyboardProps {
  onInput: (value: string) => void;
  onBackspace: () => void;
  onEnter?: () => void;
  onCursorLeft?: () => void;
  onCursorRight?: () => void;
  visible: boolean;
}

// ── Layout definitions ──────────────────────────────────────────────────
// Mode: "abc" (letters), "123" (numbers + common symbols), "#+=" (extra symbols)

const ALPHA_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const NUM_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "/", ":", ";", "(", ")", "$", "&", "@", '"'],
  [".", ",", "?", "!", "'"],
];

const SYM_ROWS = [
  ["[", "]", "{", "}", "#", "%", "^", "*", "+", "="],
  ["_", "\\", "|", "~", "<", ">", "€", "£", "¥", "•"],
  [".", ",", "?", "!", "'"],
];

type KeyboardMode = "abc" | "123" | "#+=";

const OnScreenKeyboard = ({ onInput, onBackspace, onEnter, onCursorLeft, onCursorRight, visible }: OnScreenKeyboardProps) => {
  const [mode, setMode] = useState<KeyboardMode>("abc");
  const [isCaps, setIsCaps] = useState(false);

  // ── Hold-to-delete logic ──────────────────────────────────────────────
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopDelete = useCallback(() => {
    if (deleteTimerRef.current) { clearTimeout(deleteTimerRef.current); deleteTimerRef.current = null; }
    if (deleteIntervalRef.current) { clearInterval(deleteIntervalRef.current); deleteIntervalRef.current = null; }
  }, []);

  const startDelete = useCallback(() => {
    // Fire once immediately
    onBackspace();
    // After 400ms, start rapid repeat (every 80ms)
    deleteTimerRef.current = setTimeout(() => {
      deleteIntervalRef.current = setInterval(() => {
        onBackspace();
      }, 80);
    }, 400);
  }, [onBackspace]);

  // Cleanup on unmount
  useEffect(() => stopDelete, [stopDelete]);

  // CRITICAL: use onMouseDown + preventDefault to prevent input blur
  const press = useCallback((fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    let char = key;
    if (mode === "abc" && isCaps && char.length === 1 && char >= "a" && char <= "z") {
      char = char.toUpperCase();
    }
    onInput(char);
  }, [onInput, mode, isCaps]);

  if (!visible) return null;

  const isAlpha = mode === "abc";
  const rows = isAlpha ? ALPHA_ROWS : mode === "123" ? NUM_ROWS : SYM_ROWS;

  const getKeyDisplay = (key: string): string => {
    if (isAlpha && isCaps && key.length === 1 && key >= "a" && key <= "z") return key.toUpperCase();
    return key;
  };

  return (
    <div
      className="w-full bg-gradient-to-t from-muted/98 via-muted/95 to-muted/90 backdrop-blur-md border-t border-border/60 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-2 py-2"
      onMouseDown={e => e.preventDefault()}
    >
      <div className="max-w-[640px] mx-auto space-y-1">
        {/* Main rows */}
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-[4px]">
            {/* Row 3 (last letter row): Caps/Shift on left */}
            {rowIdx === 2 && isAlpha && (
              <button
                onMouseDown={press(() => setIsCaps(prev => !prev))}
                className={cn(
                  "h-10 px-3 rounded-lg border text-xs font-semibold select-none transition-all duration-75 shadow-sm flex items-center justify-center",
                  isCaps
                    ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                    : "bg-muted/80 border-border hover:bg-accent text-muted-foreground"
                )}
                style={{ minWidth: 44 }}
              >
                {isCaps ? "⬆" : "⇧"}
              </button>
            )}

            {/* Row 3 for numeric/symbol: the #+= / 123 toggle */}
            {rowIdx === 2 && !isAlpha && (
              <button
                onMouseDown={press(() => setMode(mode === "123" ? "#+=" : "123"))}
                className="h-10 px-3 rounded-lg border border-border bg-muted/80 hover:bg-accent text-xs font-semibold select-none transition-all duration-75 shadow-sm text-muted-foreground"
                style={{ minWidth: 44 }}
              >
                {mode === "123" ? "#+=" : "123"}
              </button>
            )}

            {/* Keys */}
            {row.map((key, keyIdx) => (
              <button
                key={`${rowIdx}-${keyIdx}`}
                onMouseDown={press(() => handleKeyPress(key))}
                className="h-10 flex-1 rounded-lg border border-border bg-background text-[15px] font-medium hover:bg-accent hover:border-accent-foreground/20 active:bg-primary/15 active:scale-[0.96] select-none transition-all duration-75 shadow-sm"
              >
                {getKeyDisplay(key)}
              </button>
            ))}

            {/* Row 3: Backspace on right */}
            {rowIdx === 2 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDelete(); }}
                onMouseUp={stopDelete}
                onMouseLeave={stopDelete}
                className="h-10 px-3 rounded-lg border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 select-none transition-all duration-75 shadow-sm flex items-center justify-center"
                style={{ minWidth: 44 }}
              >
                <Delete className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}

        {/* Bottom row: mode toggle, comma, space, period, arrows, enter */}
        <div className="flex justify-center gap-[4px]">
          {/* Mode toggle: 123 / ABC */}
          <button
            onMouseDown={press(() => setMode(isAlpha ? "123" : "abc"))}
            className="h-10 px-4 rounded-lg border border-border bg-muted/80 hover:bg-accent text-xs font-bold select-none transition-all duration-75 shadow-sm text-muted-foreground"
            style={{ minWidth: 56 }}
          >
            {isAlpha ? "123" : "ABC"}
          </button>

          {/* Left arrow */}
          <button
            onMouseDown={press(() => onCursorLeft?.())}
            className="h-10 w-10 rounded-lg border border-border bg-muted/80 hover:bg-accent text-muted-foreground select-none transition-all duration-75 shadow-sm flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Space bar */}
          <button
            onMouseDown={press(() => onInput(" "))}
            className="h-10 flex-1 rounded-lg border border-border bg-background hover:bg-accent select-none transition-all duration-75 shadow-sm flex items-center justify-center text-xs text-muted-foreground font-medium"
          >
            space
          </button>

          {/* Right arrow */}
          <button
            onMouseDown={press(() => onCursorRight?.())}
            className="h-10 w-10 rounded-lg border border-border bg-muted/80 hover:bg-accent text-muted-foreground select-none transition-all duration-75 shadow-sm flex items-center justify-center"
          >
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Enter */}
          {onEnter && (
            <button
              onMouseDown={press(onEnter)}
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 select-none transition-all duration-75 shadow-sm flex items-center gap-1.5 text-xs font-semibold"
              style={{ minWidth: 56 }}
            >
              <CornerDownLeft className="h-4 w-4" /> Go
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnScreenKeyboard;
