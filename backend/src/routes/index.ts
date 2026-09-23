import { Router } from "express";
import { login, getMe } from "../controllers/auth.controller";
import { listNotifications, createNotification, markRead, markAllRead } from "../controllers/notifications.controller";
import { authenticate } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimiter";
import bidpRouter from "./bidp";
import japRouter from "./jap";
import demoRouter from "./demo";

const router = Router();

// ── Auth (shared — cross-plant) ───────────────────────────────────────────────
router.post("/auth/login", rateLimit(100, 15 * 60 * 1000), login);
router.get("/auth/me", authenticate, getMe);

// ── Notifications (shared — user-scoped, not plant-scoped) ───────────────────
router.get("/notifications", authenticate, listNotifications);
router.post("/notifications", authenticate, createNotification);
router.patch("/notifications/read-all", authenticate, markAllRead);
router.patch("/notifications/:id/read", authenticate, markRead);

// ── Plant-specific routes ─────────────────────────────────────────────────────
// Each sub-router applies its own plantGuard middleware internally.
// A JaP JWT cannot reach /bidp/... endpoints and vice-versa.
router.use("/bidp", bidpRouter);
router.use("/jap",  japRouter);
router.use("/demo", demoRouter);

export default router;

