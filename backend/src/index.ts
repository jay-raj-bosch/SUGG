import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { env } from "./config/env";
import router from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { sanitizeBody } from "./middleware/sanitize";

const app = express();

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
  hsts: env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  crossOriginResourcePolicy: { policy: "same-site" },
}));
app.set("trust proxy", 1);  // honour X-Forwarded-* from a single trusted proxy
// Restrict CORS to a comma-separated allow-list; deny others.
const corsOrigins = env.CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);              // allow non-browser tools
    if (corsOrigins.includes("*")) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(sanitizeBody);  // Strip XSS vectors from all incoming JSON bodies

// ── Static file serving (attachments) ────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "..", env.UPLOAD_DIR), {
  dotfiles: "deny",       // Block hidden files
  index: false,           // Disable directory listing
  extensions: false,      // Don't guess extensions
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server (no DB required — using in-memory store) ─────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   CORS origin: ${env.CORS_ORIGIN}`);
  console.log(`   Using in-memory data store (no database)`);
});
