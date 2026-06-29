// JaP — Awards Controller
// Handles /api/jap/awards* — plant code enforced by plantGuard (PLT-02) + JWT.
import { Request, Response } from "express";
import * as store from "../../data/store";
import { asyncHandler } from "../../middleware/errorHandler";

// JaP suggestions become award-eligible once they reach the Award or Evaluation phase.
const AWARD_ELIGIBLE_STATUSES = [
  "In Award",
  "In Evaluation",
  "Closed / Awarded",
] as const;

/** GET /api/jap/awards?employeeNo=&neftStatus= */
export const listAwards = asyncHandler(async (req: Request, res: Response) => {
  const { employeeNo, neftStatus } = req.query;
  const awards = store.getAwards({
    plantCode: req.user!.plantCode,
    employeeNo: employeeNo as string | undefined,
    neftStatus: neftStatus as string | undefined,
  });
  res.json(awards);
});

/** POST /api/jap/awards — admin only */
export const createAward = asyncHandler(async (req: Request, res: Response) => {
  const { suggestionId, suggestionNo, employeeNo, amount, category, awardDate } = req.body;
  if (!suggestionId || !employeeNo || amount === undefined || amount === null) {
    res.status(400).json({ error: "suggestionId, employeeNo, and amount are required" });
    return;
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0 || numericAmount > 1_000_000) {
    res.status(400).json({ error: "amount must be a non-negative number up to 1,000,000" });
    return;
  }
  const suggestion = store.getSuggestionById(Number(suggestionId), req.user!.plantCode);
  if (!suggestion) {
    res.status(404).json({ error: "Suggestion not found in JaP" });
    return;
  }
  if (!AWARD_ELIGIBLE_STATUSES.includes(suggestion.status as typeof AWARD_ELIGIBLE_STATUSES[number])) {
    res.status(409).json({ error: `Suggestion status "${suggestion.status}" is not eligible for award in JaP` });
    return;
  }
  const created = store.addAward({
    suggestionId: Number(suggestionId),
    suggestionNo: suggestionNo || "",
    employeeNo,
    amount: numericAmount,
    category: category || "Bronze",
    awardDate: awardDate || new Date().toISOString().split("T")[0],
  });
  res.status(201).json(created);
});

/** PATCH /api/jap/awards/:id/neft — admin only */
export const updateNeft = asyncHandler(async (req: Request, res: Response) => {
  const { neftStatus, neftDate } = req.body;
  if (!neftStatus) { res.status(400).json({ error: "neftStatus is required" }); return; }
  const updated = store.updateNeftStatus(Number(req.params.id), neftStatus, neftDate);
  if (!updated) { res.status(404).json({ error: "Award not found" }); return; }
  res.json(updated);
});
