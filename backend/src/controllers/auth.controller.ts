import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import * as store from "../data/store";
import { asyncHandler } from "../middleware/errorHandler";
import type { JwtPayload } from "../middleware/auth";

/**
 * POST /api/auth/login
 * Body: { employeeNo, password, role }
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { employeeNo, password, role } = req.body;

  if (!employeeNo || !password) {
    res.status(400).json({ error: "employeeNo and password are required" });
    return;
  }

  const employee = store.findEmployeeByNo(employeeNo);
  if (!employee) {
    res.status(401).json({ error: "Invalid employee number or password" });
    return;
  }

  const valid = await bcrypt.compare(password, employee.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid employee number or password" });
    return;
  }

  // If a role filter was requested, verify the employee matches
  if (role && employee.role !== role) {
    res.status(403).json({ error: `Employee ${employeeNo} does not have ${role} access` });
    return;
  }

  const payload: JwtPayload = {
    employeeNo: employee.employee_no,
    name: employee.name,
    role: employee.role,
    plantCode: employee.plant_code,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

  res.json({
    token,
    user: {
      employeeNo: employee.employee_no,
      name: employee.name,
      department: employee.department,
      area: employee.area,
      plantCode: employee.plant_code,
      role: employee.role,
      ntid: employee.ntid,
      email: employee.email,
    },
  });
});

/**
 * GET /api/auth/me
 * Returns the current user based on JWT payload
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { employeeNo } = req.user!;
  const emp = store.getEmployee(employeeNo);
  if (!emp) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    employeeNo: emp.employee_no,
    name: emp.name,
    department: emp.department,
    area: emp.area,
    plantCode: emp.plant_code,
    role: emp.role,
    ntid: emp.ntid,
    email: emp.email,
  });
});
