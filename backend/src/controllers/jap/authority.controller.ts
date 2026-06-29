// JaP — Authority Assignments Controller
// Handles /api/jap/authority-assignments* — plant code enforced by plantGuard (PLT-02) + JWT.
import { Request, Response } from "express";
import * as store from "../../data/store";
import { asyncHandler } from "../../middleware/errorHandler";

/** GET /api/jap/authority-assignments?role= */
export const listAuthority = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.query;
  const assignments = store.getAuthorityAssignments({
    plantCode: req.user!.plantCode,
    role: role as string | undefined,
  });
  res.json(assignments);
});

/** POST /api/jap/authority-assignments — admin only */
export const createAuthority = asyncHandler(async (req: Request, res: Response) => {
  const { employee_no, employeeNo, name, department, role, type, email, ntid } = req.body;
  const created = store.addAuthorityAssignment({
    plant_code: req.user!.plantCode,
    employee_no: employee_no || employeeNo || "",
    name: name || "",
    department: department || "",
    role: role || "Superior",
    type: type || "Internal",
    email: email || "",
    ntid: ntid || "",
  });
  res.status(201).json(created);
});

/** DELETE /api/jap/authority-assignments/:id — admin only */
export const deleteAuthority = asyncHandler(async (req: Request, res: Response) => {
  const deleted = store.deleteAuthorityAssignment(Number(req.params.id));
  if (!deleted) { res.status(404).json({ error: "Authority assignment not found" }); return; }
  res.status(204).send();
});
