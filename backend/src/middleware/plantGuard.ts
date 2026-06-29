import { Request, Response, NextFunction } from "express";

/**
 * plantGuard middleware — ensures the URL plant prefix matches the JWT plant code.
 *
 * Must be applied AFTER the `authenticate` middleware so that req.user is populated.
 *
 * Prevents a JaP user from calling BidP endpoints and vice-versa,
 * even if they have a valid JWT for a different plant.
 */

export function requireBidP(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.plantCode !== "PLT-01") {
    res.status(403).json({
      error: "Access denied: this endpoint is for Bidadi Plant (PLT-01) only",
    });
    return;
  }
  next();
}

export function requireJaP(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.plantCode !== "PLT-02") {
    res.status(403).json({
      error: "Access denied: this endpoint is for Jaipur Plant (PLT-02) only",
    });
    return;
  }
  next();
}
