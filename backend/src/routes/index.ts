import { Router } from "express";
import { login, getMe } from "../controllers/auth.controller";
import { listSuggestions, getSuggestion, createSuggestion, updateSuggestion, patchStatus } from "../controllers/suggestions.controller";
import { listEmployees, getEmployee } from "../controllers/employees.controller";
import { listCategories, createCategory, deleteCategory } from "../controllers/categories.controller";
import { listMappings, createMapping, updateMapping, deleteMapping } from "../controllers/deptMappings.controller";
import { listAuthority, createAuthority, deleteAuthority } from "../controllers/authority.controller";
import { listNotifications, createNotification, markRead, markAllRead } from "../controllers/notifications.controller";
import { listAwards, createAward, updateNeft } from "../controllers/awards.controller";
import { getDeptStats, getCategoryStats, getMemoReport, getSummary } from "../controllers/reports.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { validateAttachmentNames } from "../middleware/fileValidation";
import { rateLimit } from "../middleware/rateLimiter";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/auth/login", rateLimit(5, 15 * 60 * 1000), login);
router.get("/auth/me", authenticate, getMe);

// ── Suggestions ───────────────────────────────────────────────────────────────
router.get("/suggestions", authenticate, listSuggestions);
router.get("/suggestions/:id", authenticate, getSuggestion);
router.post("/suggestions", authenticate, validateAttachmentNames, createSuggestion);
router.put("/suggestions/:id", authenticate, validateAttachmentNames, updateSuggestion);
router.patch("/suggestions/:id/status", authenticate, patchStatus);

// ── Employees ─────────────────────────────────────────────────────────────────
router.get("/employees", authenticate, listEmployees);
router.get("/employees/:employeeNo", authenticate, getEmployee);

// ── Categories ────────────────────────────────────────────────────────────────
router.get("/categories", authenticate, listCategories);
router.post("/categories", authenticate, requireAdmin, createCategory);
router.delete("/categories/:id", authenticate, requireAdmin, deleteCategory);

// ── Dept Mappings ─────────────────────────────────────────────────────────────
router.get("/dept-mappings", authenticate, listMappings);
router.post("/dept-mappings", authenticate, requireAdmin, createMapping);
router.put("/dept-mappings/:id", authenticate, requireAdmin, updateMapping);
router.delete("/dept-mappings/:id", authenticate, requireAdmin, deleteMapping);

// ── Authority Assignments ─────────────────────────────────────────────────────
router.get("/authority-assignments", authenticate, listAuthority);
router.post("/authority-assignments", authenticate, requireAdmin, createAuthority);
router.delete("/authority-assignments/:id", authenticate, requireAdmin, deleteAuthority);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get("/notifications", authenticate, listNotifications);
router.post("/notifications", authenticate, createNotification);
router.patch("/notifications/read-all", authenticate, markAllRead);
router.patch("/notifications/:id/read", authenticate, markRead);

// ── Awards ────────────────────────────────────────────────────────────────────
router.get("/awards", authenticate, listAwards);
router.post("/awards", authenticate, requireAdmin, createAward);
router.patch("/awards/:id/neft", authenticate, requireAdmin, updateNeft);

// ── Reports ───────────────────────────────────────────────────────────────────
router.get("/reports/summary", authenticate, getSummary);
router.get("/reports/dept-stats", authenticate, getDeptStats);
router.get("/reports/category-stats", authenticate, getCategoryStats);
router.get("/reports/memo", authenticate, getMemoReport);

export default router;
