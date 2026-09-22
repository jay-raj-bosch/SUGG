export type FrontendTranslationProvider = "azure" | "web";

export interface FrontendTranslateResult {
  translated: string;
  didTranslate: boolean;
  /** True when every provider attempt threw (network/CORS/auth failure) — translated is just the original text. */
  failed?: boolean;
}

const AZURE_TRANSLATOR_KEY = import.meta.env.VITE_AZURE_TRANSLATOR_KEY as string | undefined;
const AZURE_TRANSLATOR_REGION = import.meta.env.VITE_AZURE_TRANSLATOR_REGION as string | undefined;
const AZURE_TRANSLATOR_ENDPOINT =
  (import.meta.env.VITE_AZURE_TRANSLATOR_ENDPOINT as string | undefined)
  || "https://api.cognitive.microsofttranslator.com";

export function isAzureFrontendConfigured(): boolean {
  return !!(AZURE_TRANSLATOR_KEY && AZURE_TRANSLATOR_REGION);
}

async function translateWithAzure(text: string, sourceLang: string, targetLang: string): Promise<FrontendTranslateResult> {
  if (!isAzureFrontendConfigured()) {
    return { translated: text, didTranslate: false };
  }

  const base = AZURE_TRANSLATOR_ENDPOINT.replace(/\/$/, "");
  const qs = new URLSearchParams({
    "api-version": "3.0",
    from: sourceLang,
    to: targetLang,
  });

  const standardUrl = `${base}/translate?${qs.toString()}`;
  const customDomainUrl = `${base}/translator/text/v3.0/translate?${qs.toString()}`;
  const primaryUrl = base.includes("api.cognitive.microsofttranslator.com") ? standardUrl : customDomainUrl;
  const fallbackUrl = base.includes("api.cognitive.microsofttranslator.com") ? customDomainUrl : standardUrl;

  const makeRequest = async (url: string) => fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY!,
      "Ocp-Apim-Subscription-Region": AZURE_TRANSLATOR_REGION!,
      "X-ClientTraceId": crypto.randomUUID(),
    },
    body: JSON.stringify([{ text }]),
  });

  let res = await makeRequest(primaryUrl);
  if (res.status === 404 || res.status === 405) {
    res = await makeRequest(fallbackUrl);
  }

  if (!res.ok) {
    throw new Error(`Azure translation failed: ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    return { translated: text, didTranslate: false };
  }

  const first = data[0] as { translations?: Array<{ text?: string }> };
  const translated = first.translations?.[0]?.text ?? text;
  const didTranslate = translated.trim().toLowerCase() !== text.trim().toLowerCase();
  return { translated: didTranslate ? translated : text, didTranslate };
}

async function translateWithGoogleUnofficial(text: string, sourceLang: string, targetLang: string): Promise<FrontendTranslateResult> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google (unofficial) translation failed: ${res.status}`);
  }

  const data = await res.json();
  if (!(data && Array.isArray(data[0]))) {
    return { translated: text, didTranslate: false };
  }

  const translated = data[0].map((seg: any) => seg[0]).join("").trim();
  const didTranslate = !!translated && translated.toLowerCase() !== text.trim().toLowerCase();
  return { translated: didTranslate ? translated : text, didTranslate };
}

async function translateWithMyMemory(text: string, sourceLang: string, targetLang: string): Promise<FrontendTranslateResult> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MyMemory translation failed: ${res.status}`);
  }

  const data = await res.json();
  const translated = (data?.responseData?.translatedText as string | undefined)?.trim();
  if (!translated) {
    return { translated: text, didTranslate: false };
  }
  const didTranslate = translated.toLowerCase() !== text.trim().toLowerCase();
  return { translated: didTranslate ? translated : text, didTranslate };
}

/**
 * "web" provider chains two free, unofficial, key-less translation endpoints
 * so a single one being blocked/unreachable doesn't take down BidP's voice
 * translation entirely: Google's unofficial endpoint first, then MyMemory.
 */
async function translateWithWeb(text: string, sourceLang: string, targetLang: string): Promise<FrontendTranslateResult> {
  try {
    return await translateWithGoogleUnofficial(text, sourceLang, targetLang);
  } catch (err) {
    console.warn("[frontendTranslationService] Google unofficial endpoint failed, trying MyMemory:", err);
    return translateWithMyMemory(text, sourceLang, targetLang);
  }
}


export async function translateInFrontend(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: FrontendTranslationProvider,
  fallbackProvider: FrontendTranslationProvider | null = "web",
): Promise<FrontendTranslateResult> {
  if (!text.trim() || sourceLang === targetLang) {
    return { translated: text, didTranslate: false };
  }

  try {
    return provider === "azure"
      ? await translateWithAzure(text, sourceLang, targetLang)
      : await translateWithWeb(text, sourceLang, targetLang);
  } catch (err) {
    console.error(`[frontendTranslationService] ${provider} provider failed:`, err);
    if (!fallbackProvider || fallbackProvider === provider) {
      return { translated: text, didTranslate: false, failed: true };
    }
    try {
      return fallbackProvider === "azure"
        ? await translateWithAzure(text, sourceLang, targetLang)
        : await translateWithWeb(text, sourceLang, targetLang);
    } catch (err2) {
      console.error(`[frontendTranslationService] fallback provider ${fallbackProvider} also failed:`, err2);
      return { translated: text, didTranslate: false, failed: true };
    }
  }
}
