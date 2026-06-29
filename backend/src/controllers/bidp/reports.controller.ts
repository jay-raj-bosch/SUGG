// BidP — Reports Controller
// Handles /api/bidp/reports* — plant code enforced by plantGuard (PLT-01) + JWT.
import { Request, Response } from "express";
import * as store from "../../data/store";
import { asyncHandler } from "../../middleware/errorHandler";

/** GET /api/bidp/reports/summary */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  res.json(store.getReportSummary(req.user!.plantCode));
});

/** GET /api/bidp/reports/dept-stats */
export const getDeptStats = asyncHandler(async (req: Request, res: Response) => {
  res.json(store.getDeptStats(req.user!.plantCode));
});

/** GET /api/bidp/reports/category-stats */
export const getCategoryStats = asyncHandler(async (req: Request, res: Response) => {
  res.json(store.getCategoryStats(req.user!.plantCode));
});

/** GET /api/bidp/reports/memo?month=&year=&type= */
export const getMemoReport = asyncHandler(async (req: Request, res: Response) => {
  const { month, year, type } = req.query;
  const monthNum = month ? Number(month) : new Date().getMonth() + 1;
  const yearNum  = year  ? Number(year)  : new Date().getFullYear();
  res.json(store.getMemoReport(monthNum, yearNum, type as string | undefined, req.user!.plantCode));
});
