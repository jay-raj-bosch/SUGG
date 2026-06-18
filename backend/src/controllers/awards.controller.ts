import { Request, Response } from "express";
import * as store from "../data/store";
import { asyncHandler } from "../middleware/errorHandler";

/**
 * GET /api/awards?employeeNo=&neftStatus=
 */
export const listAwards = asyncHandler(async (req: Request, res: Response) => {
  const { employeeNo, neftStatus } = req.query;
  const awards = store.getAwards({
    plantCode: req.user!.plantCode,          // always scope to the caller's plant
    employeeNo: employeeNo as string | undefined,
    neftStatus: neftStatus as string | undefined,
  });
  res.json(awards);
});

/**
 * POST /api/awards
 * Body: { suggestionId, suggestionNo, employeeNo, amount, category, awardDate }
 */
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
  // Ensure the suggestion being awarded belongs to the caller's plant
  const suggestion = store.getSuggestionById(Number(suggestionId), req.user!.plantCode);
  if (!suggestion) {
    res.status(404).json({ error: "Suggestion not found in your plant" });
    return;
  }
  const AWARD_ELIGIBLE_STATUSES = ["Approved", "Approved & Closed", "Closed / Awarded", "Implemented"];
  if (!AWARD_ELIGIBLE_STATUSES.includes(suggestion.status)) {
    res.status(409).json({ error: `Suggestion status \"${suggestion.status}\" is not eligible for award` });
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

/**
 * PATCH /api/awards/:id/neft
 * Body: { neftStatus, neftDate? }
 */
export const updateNeft = asyncHandler(async (req: Request, res: Response) => {
  const { neftStatus, neftDate } = req.body;
  if (!neftStatus) {
    res.status(400).json({ error: "neftStatus is required" });
    return;
  }
  const updated = store.updateNeftStatus(Number(req.params.id), neftStatus, neftDate);
  if (!updated) {
    res.status(404).json({ error: "Award not found" });
    return;
  }
  res.json(updated);
});
