import { useState, useCallback } from "react";
import { Delete, CornerDownLeft, Space, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnScreenKeyboardProps {
  onInput: (value: string) => void;
  onBackspace: () => void;
  onEnter?: () => void;
  visible: boolean;
}

const ROWS_LOWER = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const ROWS_UPPER = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const SYMBOLS = [
  ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
  ["-", "_", "=", "+", "[", "]", "{", "}", "|", "\\"],
  [";", ":", "'", "\"", ",", ".", "<", ">", "/", "?"],
  ["`", "~"],
];

type KeyboardMode = "lower" | "upper" | "symbols";

const OnScreenKeyboard = ({ onInput, onBackspace, onEnter, visible }: OnScreenKeyboardProps) => {
  const [mode, setMode] = useState<KeyboardMode>("lower");

  const rows = mode === "symbols" ? SYMBOLS : mode === "upper" ? ROWS_UPPER : ROWS_LOWER;

  // CRITICAL: use onMouseDown + preventDefault to prevent input blur when tapping keys
  const press = useCallback((fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }, []);

  if (!visible) return null;

  return (
    <div
      className="w-full bg-muted/95 backdrop-blur-sm border-t border-border p-2 rounded-t-xl shadow-2xl"
      // Prevent any touch/mouse event from bubbling and blurring the active input
      onMouseDown={e => e.preventDefault()}
    >
      <div className="max-w-2xl mx-auto space-y-1.5">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1">
            {rowIdx === 3 && (
              <button
                onMouseDown={press(() => setMode(m => m === "upper" ? "lower" : "upper"))}
                className={cn(
                  "h-10 px-3 rounded-md border text-xs font-semibold select-none transition-colors",
                  mode === "upper"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-accent"
                )}
              >
                ⇧
              </button>
            )}
            {row.map((key) => (
              <button
                key={key}
                onMouseDown={press(() => onInput(key))}
                className="h-10 w-10 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent hover:border-accent-foreground/20 active:bg-primary/20 select-none transition-colors"
              >
                {key}
              </button>
            ))}
            {rowIdx === 3 && (
              <button
                onMouseDown={press(onBackspace)}
                className="h-10 px-3 rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive select-none transition-colors"
              >
                <Delete className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {/* Bottom row: symbols toggle, space, enter */}
        <div className="flex justify-center gap-1">
          <button
            onMouseDown={press(() => setMode(m => m === "symbols" ? "lower" : "symbols"))}
            className={cn(
              "h-10 px-4 rounded-md border text-xs font-semibold select-none transition-colors",
              mode === "symbols"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-accent"
            )}
          >
            {mode === "symbols" ? "ABC" : "!@#"}
          </button>
          <button
            onMouseDown={press(() => onInput(" "))}
            className="h-10 flex-1 max-w-[280px] rounded-md border border-border bg-background hover:bg-accent select-none transition-colors flex items-center justify-center gap-1 text-xs"
          >
            <Space className="h-4 w-4" /> Space
          </button>
          {onEnter && (
            <button
              onMouseDown={press(onEnter)}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 select-none transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <CornerDownLeft className="h-4 w-4" /> Enter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnScreenKeyboard;

