import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import router from "./backend/src/routes";
import { errorHandler } from "./backend/src/middleware/errorHandler";
import { sanitizeBody } from "./backend/src/middleware/sanitize";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security & parsing
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(sanitizeBody);

  // Uploads directory
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"), {
      dotfiles: "deny",
      index: false,
    })
  );

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Backend API routes
  const apiRouter = (router as any)?.default ?? router;
  app.use("/api", apiRouter);

  // Fallback 404 for unhandled /api/* routes
  app.all("/api/*all", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // Vite middleware in dev mode vs static file serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handler for API errors (must be after routes)
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Suggestion Management Server running on http://localhost:${PORT}`);
  });
}

startServer();
