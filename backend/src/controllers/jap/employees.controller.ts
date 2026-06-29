// JaP — Employees Controller
// Handles /api/jap/employees* — plant code enforced by plantGuard (PLT-02) + JWT.
import { Request, Response } from "express";
import * as store from "../../data/store";
import { asyncHandler } from "../../middleware/errorHandler";

/** GET /api/jap/employees?role= */
export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.query;
  const employees = store.getEmployees({
    plantCode: req.user!.plantCode,
    role: role as string | undefined,
  });
  res.json(employees);
});

/** GET /api/jap/employees/:employeeNo */
export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const emp = store.getEmployee(req.params.employeeNo, req.user!.plantCode);
  if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }
  res.json(emp);
});
