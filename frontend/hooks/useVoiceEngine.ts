import { useState, useRef, useEffect, useCallback } from "react";
import { translateText as translateViaBackend } from "@/lib/apiService";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface VoiceStatus { text: string; ok: boolean; }

/** Supported voice input languages */
export interface VoiceLangOption {
  code: string;   // BCP-47 code for SpeechRecognition
  label: string;  // Display name
  flag: string;   // Emoji flag
  nativeName: string; // Name in the language itself
}

export const VOICE_LANGUAGES: VoiceLangOption[] = [
  { code: "en-US", label: "English",  flag: "🇺🇸", nativeName: "English" },
  { code: "en-IN", label: "English (India)", flag: "🇮🇳", nativeName: "English" },
  { code: "hi-IN", label: "Hindi",    flag: "🇮🇳", nativeName: "हिन्दी" },
  { code: "kn-IN", label: "Kannada",  flag: "🇮🇳", nativeName: "ಕನ್ನಡ" },
  { code: "ta-IN", label: "Tamil",    flag: "🇮🇳", nativeName: "தமிழ்" },
  { code: "te-IN", label: "Telugu",   flag: "🇮🇳", nativeName: "తెలుగు" },
  { code: "mr-IN", label: "Marathi",  flag: "🇮🇳", nativeName: "मराठी" },
  { code: "bn-IN", label: "Bengali",  flag: "🇮🇳", nativeName: "বাংলা" },
  { code: "gu-IN", label: "Gujarati", flag: "🇮🇳", nativeName: "ગુજરાતી" },
  { code: "ml-IN", label: "Malayalam",flag: "🇮🇳", nativeName: "മലയാളം" },
  { code: "pa-IN", label: "Punjabi",  flag: "🇮🇳", nativeName: "ਪੰਜਾਬੀ" },
];

/** Map BCP-47 to 2-letter language code for translation APIs */
function langCodeToTranslateCode(bcp47: string): string {
  const map: Record<string, string> = {
    "en-US": "en", "en-IN": "en",
    "hi-IN": "hi", "kn-IN": "kn", "ta-IN": "ta", "te-IN": "te",
    "mr-IN": "mr", "bn-IN": "bn", "gu-IN": "gu", "ml-IN": "ml", "pa-IN": "pa",
  };
  return map[bcp47] || bcp47.split("-")[0];
}

/**
 * Translate text to English.
 * Primary: our backend's /api/translate, which proxies the internal
 * translation API (credentials stay server-side — see
 * backend/src/services/translationService.ts). Falls back to Google
 * Translate's unofficial web endpoint if the backend call fails or the
 * internal API isn't configured yet, then MyMemory, then the original text.
 */
async function translateToEnglish(text: string, sourceLang: string): Promise<{ translated: string; didTranslate: boolean }> {
  const src = langCodeToTranslateCode(sourceLang);
  if (src === "en") return { translated: text, didTranslate: false };

  // Primary: our backend (internal translation API)
  try {
    const result = await translateViaBackend(text, src, "en");
    if (result.didTranslate) return result;
  } catch { /* backend unreachable or internal API not yet configured — fall through */ }

  // Fallback: Google Translate unofficial API — high accuracy, neural MT
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      // Response: [[[ "translated" , "original" , ...], ...], ...]
      if (data && Array.isArray(data[0])) {
        const translated = data[0].map((seg: any) => seg[0]).join("");
        if (translated && translated.trim().toLowerCase() !== text.trim().toLowerCase()) {
          return { translated: translated.trim(), didTranslate: true };
        }
      }
    }
  } catch { /* translation failed */ }

  return { translated: text, didTranslate: false };
}

export interface VoiceEngineOptions {
  /** BCP-47 language code for speech recognition (default: "en-US") */
  voiceLang?: string;
  /** Whether to auto-translate non-English speech to English (default: true) */
  autoTranslate?: boolean;
}

/**
 * Pure speech-recognition engine with optional auto-translation.
 * Fires onFinalResult(text) when a final transcript arrives (translated if enabled).
 * Fires onListeningStopped() when recognition ends unexpectedly (no result delivered)
 * so the parent can clear its field-tracking state.
 * Uses continuous mode so the mic doesn't cut off mid-sentence.
 */
export function useVoiceEngine(
  onFinalResult: (text: string) => void,
  options: VoiceEngineOptions = {},
  onListeningStopped?: () => void,
) {
  const { voiceLang = "en-US", autoTranslate = true } = options;

  const [supported,      setSupported]      = useState(false);
  const [isListening,    setIsListening]    = useState(false);
  const [isTranslating,  setIsTranslating]  = useState(false);
  const [interimText,    setInterimText]    = useState("");
  const [status,         setStatus]         = useState<VoiceStatus | null>(null);
  const [originalText,   setOriginalText]   = useState<string | null>(null);

  const recRef       = useRef<any>(null);
  const sessionRef   = useRef(0);
  const interimRef   = useRef("");
  const cbRef        = useRef(onFinalResult);
  const onStopRef    = useRef(onListeningStopped);
  const langRef      = useRef(voiceLang);
  const translateRef = useRef(autoTranslate);
  /** Tracks whether a final result was delivered in this session */
  const gotResultRef = useRef(false);

  useEffect(() => { cbRef.current = onFinalResult; }, [onFinalResult]);
  useEffect(() => { onStopRef.current = onListeningStopped; }, [onListeningStopped]);
  useEffect(() => { langRef.current = voiceLang; }, [voiceLang]);
  useEffect(() => { translateRef.current = autoTranslate; }, [autoTranslate]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) setSupported(true);
    return () => {
      sessionRef.current = -1;
      if (recRef.current) { try { recRef.current.abort(); } catch {} }
    };
  }, []);

  const startListening = useCallback(() => {
    if (isListening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (recRef.current) { try { recRef.current.abort(); } catch {} recRef.current = null; }
    const mySession = ++sessionRef.current;

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = langRef.current;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      if (sessionRef.current !== mySession) return;
      setIsListening(true);
      gotResultRef.current = false;
    };

    rec.onend = () => {
      if (sessionRef.current !== mySession) return;
      setIsListening(false);
      setInterimText("");
      recRef.current = null;
      // If recognition ended without delivering a final result,
      // notify the parent so it can clear listeningField / UI state.
      if (!gotResultRef.current) {
        onStopRef.current?.();
      }
    };

    rec.onerror = (e: any) => {
      if (sessionRef.current !== mySession) return;
      // For these benign errors, let onend handle cleanup
      if (e.error === "no-speech" || e.error === "aborted") return;

      setIsListening(false);
      setInterimText("");
      recRef.current = null;

      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        setStatus({ text: "🔒 Microphone access denied — click the mic icon in your browser address bar", ok: false });
      else if (e.error === "audio-capture")
        setStatus({ text: "🎤 No microphone detected — check device settings", ok: false });
      else if (e.error === "network")
        setStatus({ text: "🌐 Speech service unreachable — type this field manually", ok: false });
      else
        setStatus({ text: `Tap the mic to try again (${e.error})`, ok: false });

      // Notify parent about unexpected stop
      onStopRef.current?.();
    };

    rec.onresult = (event: any) => {
      if (sessionRef.current !== mySession) return;
      let interim = "";
      let bestFinal = "";
      let bestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Pick the alternative with the highest confidence score
          for (let a = 0; a < result.length; a++) {
            const alt = result[a];
            if (alt.confidence > bestConfidence) {
              bestConfidence  = alt.confidence;
              bestFinal       = alt.transcript;
            }
          }
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
        interimRef.current = interim;
      }

      if (bestFinal) {
        // Discard very low-confidence results (garbled / background noise)
        if (bestConfidence > 0 && bestConfidence < 0.25) {
          setStatus({ text: `⚠ Couldn't hear clearly — please speak again`, ok: false });
          onStopRef.current?.();
          return;
        }

        gotResultRef.current = true;
        setInterimText("");
        interimRef.current = "";

        const trimmed = bestFinal.trim();
        const lang = langRef.current;
        const shouldTranslate = translateRef.current && langCodeToTranslateCode(lang) !== "en";
        const capturedSession = sessionRef.current;

        if (shouldTranslate) {
          setStatus({ text: "Translating captured speech to English…", ok: true });
          setOriginalText(trimmed);
          setIsTranslating(true);
          translateToEnglish(trimmed, lang).then(({ translated, didTranslate }) => {
            if (sessionRef.current < capturedSession - 1) return; // stale
            setIsTranslating(false);
            setOriginalText(didTranslate ? trimmed : null);
            setStatus(didTranslate
              ? { text: `✓ Translated to English`, ok: true }
              : { text: "✓ Speech captured", ok: true });
            cbRef.current(translated);
          });
        } else {
          setOriginalText(null);
          setStatus({ text: "✓ Speech captured", ok: true });
          cbRef.current(trimmed);
        }
      }
    };

    recRef.current = rec;
    setInterimText("");
    interimRef.current = "";
    setOriginalText(null);
    setStatus(null);
    gotResultRef.current = false;
    try { rec.start(); } catch {
      if (sessionRef.current === mySession)
        setStatus({ text: "Could not start mic — check browser permissions", ok: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  const stopListening = useCallback(() => {
    sessionRef.current++;
    gotResultRef.current = true; // intentional stop — don't fire onListeningStopped
    // If there's uncommitted interim text, commit it as the final result
    const pending = interimRef.current.trim();
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
    setIsListening(false);
    setIsTranslating(false);
    setInterimText("");
    interimRef.current = "";
    if (pending) {
      cbRef.current(pending);
    }
  }, []);

  return {
    supported, isListening, isTranslating, interimText,
    status, setStatus, startListening, stopListening,
    originalText,
  };
}
