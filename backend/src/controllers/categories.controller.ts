import { Request, Response } from "express";
import * as store from "../data/store";
import { asyncHandler } from "../middleware/errorHandler";

/**
 * GET /api/categories?plantCode=
 */
export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = store.getCategories(req.user!.plantCode);  // always scope to JWT plant
  res.json(categories);
});

/**
 * POST /api/categories
 * Body: { name, description? }
 */
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const plantCode = req.user!.plantCode;        // always enforce from JWT, ignore body
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const created = store.addCategory(plantCode, name, description);
  res.status(201).json(created);
});

/**
 * DELETE /api/categories/:id
 */
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const deleted = store.deleteCategory(Number(req.params.id), req.user!.plantCode);
  if (!deleted) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.status(204).send();
});
