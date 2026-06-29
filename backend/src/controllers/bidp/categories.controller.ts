// BidP — Categories Controller
// Handles /api/bidp/categories* — plant code enforced by plantGuard (PLT-01) + JWT.
import { Request, Response } from "express";
import * as store from "../../data/store";
import { asyncHandler } from "../../middleware/errorHandler";

/** GET /api/bidp/categories */
export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = store.getCategories(req.user!.plantCode);
  res.json(categories);
});

/** POST /api/bidp/categories — admin only */
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const created = store.addCategory(req.user!.plantCode, name, description);
  res.status(201).json(created);
});

/** DELETE /api/bidp/categories/:id — admin only */
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const deleted = store.deleteCategory(Number(req.params.id), req.user!.plantCode);
  if (!deleted) { res.status(404).json({ error: "Category not found" }); return; }
  res.status(204).send();
});
