// Demo plant routes — mounted at /api/demo/...
// Enforces JWT plantCode is PLT-03 or PLT-DEMO
import { Router } from "express";
import {
  listSuggestions, getSuggestion, createSuggestion, updateSuggestion, patchStatus,
} from "../controllers/jap/suggestions.controller";
import { listEmployees, getEmployee } from "../controllers/jap/employees.controller";
import { listCategories, createCategory, deleteCategory } from "../controllers/jap/categories.controller";
import { listMappings, createMapping, updateMapping, deleteMapping } from "../controllers/jap/deptMappings.controller";
import { listAuthority, createAuthority, deleteAuthority } from "../controllers/jap/authority.controller";
import { listAwards, createAward, updateNeft } from "../controllers/jap/awards.controller";
import { getSummary, getDeptStats, getCategoryStats, getMemoReport } from "../controllers/jap/reports.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { requireDemo } from "../middleware/plantGuard";
import { validateAttachmentNames } from "../middleware/fileValidation";

const router = Router();

// Apply authentication + plant guard to every Demo route
router.use(authenticate, requireDemo);

// ── Suggestions ───────────────────────────────────────────────────────────────
router.get("/suggestions",                    listSuggestions);
router.get("/suggestions/:id",                getSuggestion);
router.post("/suggestions",                   validateAttachmentNames, createSuggestion);
router.put("/suggestions/:id",                validateAttachmentNames, updateSuggestion);
router.patch("/suggestions/:id/status",       patchStatus);

// ── Employees ─────────────────────────────────────────────────────────────────
router.get("/employees",             listEmployees);
router.get("/employees/:employeeNo", getEmployee);

// ── Categories ────────────────────────────────────────────────────────────────
router.get("/categories",         listCategories);
router.post("/categories",        requireAdmin, createCategory);
router.delete("/categories/:id",  requireAdmin, deleteCategory);

// ── Dept Mappings ─────────────────────────────────────────────────────────────
router.get("/dept-mappings",         listMappings);
router.post("/dept-mappings",        requireAdmin, createMapping);
router.put("/dept-mappings/:id",     requireAdmin, updateMapping);
router.delete("/dept-mappings/:id",  requireAdmin, deleteMapping);

// ── Authority Assignments ─────────────────────────────────────────────────────
router.get("/authority-assignments",         listAuthority);
router.post("/authority-assignments",        requireAdmin, createAuthority);
router.delete("/authority-assignments/:id",  requireAdmin, deleteAuthority);

// ── Awards ────────────────────────────────────────────────────────────────────
router.get("/awards",            listAwards);
router.post("/awards",           requireAdmin, createAward);
router.patch("/awards/:id/neft", requireAdmin, updateNeft);

// ── Reports ───────────────────────────────────────────────────────────────────
router.get("/reports/summary",        getSummary);
router.get("/reports/dept-stats",     getDeptStats);
router.get("/reports/category-stats", getCategoryStats);
router.get("/reports/memo",           getMemoReport);

export default router;
