/**
 * translationService.ts — server-side adapter for the internal translation API.
 *
 * WHY THIS EXISTS ON THE BACKEND (not the frontend):
 *   TRANSLATION_APP_SECRET must never be shipped to the browser. Any code that
 *   holds it has to run here, with the frontend calling POST /api/translate
 *   (see routes/index.ts + controllers/translate.controller.ts) instead of the
 *   provider directly.
 *
 * STATUS: The exact API contract (base URL, auth flow, request/response JSON
 * shape) for this internal gateway is not yet known. Only `callProviderApi()`
 * below needs to change once you have that — everything else (token caching,
 * the /api/translate route, frontend wiring, and the Google-translate
 * fallback already in useVoiceEngine.ts) is already wired up and working.
 *
 * TO FINISH THIS INTEGRATION:
 *   1. Get from whoever issued the credentials: the API base URL, the auth
 *      flow (e.g. is APP_ID/SECRET sent as headers on every call, or
 *      exchanged for a bearer token first?), the translate endpoint path,
 *      and the exact request/response field names.
 *   2. Fill in `fetchAccessToken()` (only needed if it's OAuth2) and
 *      `callProviderApi()` below.
 *   3. Set TRANSLATION_APP_ID / TRANSLATION_APP_SECRET / TRANSLATION_DOMAIN /
 *      TRANSLATION_TEAM_ID in backend/.env (never commit real values).
 */

import { env } from "../config/env";

export interface TranslateResult {
  translated: string;
  didTranslate: boolean;
}

/** True once TRANSLATION_APP_ID/SECRET/DOMAIN have been configured in .env. */
export function isTranslationApiConfigured(): boolean {
  return !!(env.TRANSLATION_APP_ID && env.TRANSLATION_APP_SECRET && env.TRANSLATION_DOMAIN);
}

// ── Token cache (only relevant if the provider uses OAuth2 client-credentials) ──
let cachedToken: { value: string; expiresAt: number } | null = null;

async function fetchAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  // TODO(confirm-with-provider): replace with the real token endpoint + body
  // shape once known. Common enterprise pattern (OAuth2 client_credentials)
  // shown here as a starting point — adjust path/fields to match the docs.
  const tokenUrl = `${env.TRANSLATION_DOMAIN}/oauth/token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.TRANSLATION_APP_ID,
      client_secret: env.TRANSLATION_APP_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Translation API token request failed: ${res.status}`);
  }

  const data = await res.json();
  const accessToken: string = data.access_token;
  const expiresInSeconds: number = data.expires_in ?? 3600;

  cachedToken = { value: accessToken, expiresAt: Date.now() + expiresInSeconds * 1000 };
  return accessToken;
}

/**
 * The actual provider call. THIS IS THE ONLY FUNCTION that needs to change
 * once the real API contract is known.
 */
async function callProviderApi(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const token = await fetchAccessToken();

  // TODO(confirm-with-provider): replace with the real translate endpoint,
  // headers (e.g. Team-Id), and request/response field names.
  const res = await fetch(`${env.TRANSLATION_DOMAIN}/v1/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Team-Id": env.TRANSLATION_TEAM_ID,
    },
    body: JSON.stringify({
      text,
      source_language: sourceLang,
      target_language: targetLang,
    }),
  });

  if (!res.ok) {
    throw new Error(`Translation API request failed: ${res.status}`);
  }

  const data = await res.json();
  // TODO(confirm-with-provider): adjust to the real response field name.
  return data.translated_text ?? data.translation ?? text;
}

/**
 * Translates `text` from `sourceLang` to `targetLang` (2-letter codes, e.g. "hi" -> "en").
 * Returns the original text with didTranslate:false if the API isn't configured
 * yet or the call fails — callers should treat this as a soft failure, not an error,
 * so voice capture keeps working while the integration is finished.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string = "en",
): Promise<TranslateResult> {
  if (sourceLang === targetLang) {
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
    console.error("[translationService] provider call failed:", err instanceof Error ? err.message : err);
    return { translated: text, didTranslate: false };
  }
}
