import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { translateText } from "../services/translationService";

/**
 * POST /api/translate
 * Body: { text: string, sourceLang: string, targetLang?: string }
 * Auth required (see routes/index.ts) so this can't be used as an open,
 * unmetered proxy to a paid third-party API.
 */
export const translate = asyncHandler(async (req: Request, res: Response) => {
  const { text, sourceLang, targetLang } = req.body as {
    text?: string;
    sourceLang?: string;
    targetLang?: string;
  };

  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  if (!sourceLang || typeof sourceLang !== "string") {
    res.status(400).json({ error: "sourceLang is required" });
    return;
  }
  // Cap length to avoid abuse / excessive provider cost.
  if (text.length > 5000) {
    res.status(400).json({ error: "text is too long (max 5000 characters)" });
    return;
  }

  const result = await translateText(text, sourceLang, targetLang || "en");
  res.json(result);
});
