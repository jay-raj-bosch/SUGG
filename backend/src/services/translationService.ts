/**
 * translationService.ts — server-side Azure Translator adapter.
 *
 * WHY THIS EXISTS ON THE BACKEND (not the frontend):
 * Azure subscription keys must never be shipped to the browser. Frontend calls
 * POST /api/translate and backend performs the provider request securely.
 */

import { randomUUID } from "crypto";
import { env } from "../config/env";

export interface TranslateResult {
  translated: string;
  didTranslate: boolean;
}

/** True once Azure Translator key + region are configured in .env. */
export function isTranslationApiConfigured(): boolean {
  return !!(env.AZURE_TRANSLATOR_KEY && env.AZURE_TRANSLATOR_REGION);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Calls Azure Translator Text API.
 * Docs: POST /translate?api-version=3.0&from=hi&to=en
 */
async function callProviderApi(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const base = env.AZURE_TRANSLATOR_ENDPOINT.replace(/\/$/, "");
  const qs = new URLSearchParams({
    "api-version": "3.0",
    from: sourceLang,
    to: targetLang,
  });

  const res = await fetch(`${base}/translate?${qs.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": env.AZURE_TRANSLATOR_KEY,
      "Ocp-Apim-Subscription-Region": env.AZURE_TRANSLATOR_REGION,
      "X-ClientTraceId": randomUUID(),
    },
    body: JSON.stringify([{ text }]),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Azure Translator request failed: ${res.status}${detail ? ` - ${detail}` : ""}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0 || !isObjectRecord(data[0])) {
    return text;
  }

  const first = data[0];
  const translations = first["translations"];
  if (!Array.isArray(translations) || translations.length === 0 || !isObjectRecord(translations[0])) {
    return text;
  }

  return readStringField(translations[0], "text") ?? text;
}

/**
 * Translates text from sourceLang to targetLang (e.g. hi -> en).
 * On any failure it soft-falls back to original text to keep speech flow usable.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string = "en",
): Promise<TranslateResult> {
  if (!text?.trim() || sourceLang === targetLang) {
    return { translated: text, didTranslate: false };
  }

  if (!isTranslationApiConfigured()) {
    return { translated: text, didTranslate: false };
  }

  try {
    const translated = await callProviderApi(text, sourceLang, targetLang);
    const didTranslate = translated.trim().toLowerCase() !== text.trim().toLowerCase();
    return { translated: didTranslate ? translated : text, didTranslate };
  } catch (err) {
    console.error("[translationService] Azure provider call failed:", err instanceof Error ? err.message : err);
    return { translated: text, didTranslate: false };
  }
}
