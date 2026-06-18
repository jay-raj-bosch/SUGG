// JaP — BPS Input Method Control
// BPS admins can activate/deactivate input methods (Voice, Typing, File Upload).
// Settings are persisted in localStorage and enforced in NewSuggestion.

const STORAGE_KEY = "jap_input_methods";

export interface InputMethodSettings {
  voiceEnabled: boolean;
  typingEnabled: boolean;
  fileUploadEnabled: boolean;
}

const DEFAULT_SETTINGS: InputMethodSettings = {
  voiceEnabled: true,
  typingEnabled: true,
  fileUploadEnabled: true,
};

export function getInputMethodSettings(): InputMethodSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveInputMethodSettings(settings: InputMethodSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
