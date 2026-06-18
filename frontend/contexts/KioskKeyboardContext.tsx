import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

interface KioskKeyboardContextType {
  isVisible: boolean;
  onInput: (char: string) => void;
  onBackspace: () => void;
}

const KioskKeyboardContext = createContext<KioskKeyboardContextType | null>(null);

export const KioskKeyboardProvider = ({ children }: { children: ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const activeElRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Directly inject into the DOM element — React synthetic onChange fires automatically
  const injectValue = useCallback((newValue: string, cursorPos: number) => {
    const el = activeElRef.current;
    if (!el) return;
    // Use native setter so React detects the change
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    nativeSetter?.call(el, newValue);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      try { el.selectionStart = cursorPos; el.selectionEnd = cursorPos; } catch {}
    });
  }, []);

  const onInput = useCallback((char: string) => {
    const el = activeElRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    injectValue(el.value.slice(0, start) + char + el.value.slice(end), start + 1);
  }, [injectValue]);

  const onBackspace = useCallback(() => {
    const el = activeElRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    if (start !== end) {
      injectValue(el.value.slice(0, start) + el.value.slice(end), start);
    } else if (start > 0) {
      injectValue(el.value.slice(0, start - 1) + el.value.slice(start), start - 1);
    }
  }, [injectValue]);

  useEffect(() => {
    const SKIP_TYPES = new Set(["date","time","datetime-local","checkbox","radio","file","color","range","submit","button","reset","hidden"]);

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
      if (el.readOnly || el.disabled) return;
      if (SKIP_TYPES.has((el as HTMLInputElement).type)) return;
      activeElRef.current = el;
      setIsVisible(true);
    };

    const onFocusOut = () => {
      // Delay so keyboard mousedown (which prevents blur) settles first
      setTimeout(() => {
        const focused = document.activeElement;
        if (!focused || (focused.tagName !== "INPUT" && focused.tagName !== "TEXTAREA")) {
          setIsVisible(false);
          activeElRef.current = null;
        }
      }, 120);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <KioskKeyboardContext.Provider value={{ isVisible, onInput, onBackspace }}>
      {children}
    </KioskKeyboardContext.Provider>
  );
};

export const useKioskKeyboard = () => {
  const ctx = useContext(KioskKeyboardContext);
  if (!ctx) throw new Error("useKioskKeyboard must be used within KioskKeyboardProvider");
  return ctx;
};
