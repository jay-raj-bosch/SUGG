import { Request, Response } from "express";
import * as store from "../data/store";
import { asyncHandler } from "../middleware/errorHandler";

/**
 * GET /api/reports/summary
 */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = store.getReportSummary(req.user!.plantCode);
  res.json(summary);
});

/**
 * GET /api/reports/dept-stats
 */
export const getDeptStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = store.getDeptStats(req.user!.plantCode);
  res.json(stats);
});

/**
 * GET /api/reports/category-stats
 */
export const getCategoryStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = store.getCategoryStats(req.user!.plantCode);
  res.json(stats);
});

/**
 * GET /api/reports/memo?month=&year=&type=
 */
export const getMemoReport = asyncHandler(async (req: Request, res: Response) => {
  const { month, year, type } = req.query;
  const monthNum = month ? Number(month) : new Date().getMonth() + 1;
  const yearNum = year ? Number(year) : new Date().getFullYear();
  const typeName = type as string | undefined;
  const data = store.getMemoReport(monthNum, yearNum, typeName, req.user!.plantCode);
  res.json(data);
});
