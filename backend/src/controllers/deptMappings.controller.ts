import { Request, Response } from "express";
import * as store from "../data/store";
import { asyncHandler } from "../middleware/errorHandler";

/**
 * GET /api/dept-mappings
 */
export const listMappings = asyncHandler(async (req: Request, res: Response) => {
  const mappings = store.getDeptMappings(req.user!.plantCode);
  res.json(mappings);
});

/**
 * POST /api/dept-mappings
 * Body: { deptName, mappedName }
 */
export const createMapping = asyncHandler(async (req: Request, res: Response) => {
  const { deptName, mappedName } = req.body;
  if (!deptName || !mappedName) {
    res.status(400).json({ error: "deptName and mappedName are required" });
    return;
  }
  const plant = req.user!.plantCode;
  const existing = store.getDeptMappings(plant).find(d => d.dept_name === deptName);
  if (existing) {
    res.status(409).json({ error: "A mapping for this department already exists" });
    return;
  }
  const created = store.addDeptMapping(plant, deptName, mappedName);
  res.status(201).json(created);
});

/**
 * PUT /api/dept-mappings/:id
 * Body: { mappedName }
 */
export const updateMapping = asyncHandler(async (req: Request, res: Response) => {
  const { mappedName } = req.body;
  if (!mappedName) {
    res.status(400).json({ error: "mappedName is required" });
    return;
  }
  const updated = store.updateDeptMapping(Number(req.params.id), mappedName);
  if (!updated) {
    res.status(404).json({ error: "Mapping not found" });
    return;
  }
  res.json(updated);
});

/**
 * DELETE /api/dept-mappings/:id
 */
export const deleteMapping = asyncHandler(async (req: Request, res: Response) => {
  const deleted = store.deleteDeptMapping(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: "Mapping not found" });
    return;
  }
  res.status(204).send();
});
