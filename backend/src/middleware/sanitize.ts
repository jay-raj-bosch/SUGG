/**
 * sanitize.ts — Server-side input sanitization middleware.
 *
 * Strips potential XSS vectors from string fields in request body.
 * Applied to all POST/PUT/PATCH routes that accept user content.
 */

import { Request, Response, NextFunction } from "express";

/**
 * Strip dangerous HTML/script content from a string value.
 * Does NOT use a library — just removes the most common attack vectors.
 */
function stripXSS(value: string): string {
  return value
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove on* event handlers
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\bon\w+\s*=\s*[^\s>]*/gi, "")
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, "")
    // Remove data: URIs with scripts
    .replace(/data\s*:\s*text\/html/gi, "")
    // Remove iframe/object/embed tags
    .replace(/<\s*(iframe|object|embed|applet|form|meta|link)\b[^>]*>/gi, "")
    // Remove closing tags for above
    .replace(/<\/\s*(iframe|object|embed|applet|form|meta|link)\s*>/gi, "");
}

/**
 * Recursively sanitize all string values in an object.
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") return stripXSS(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Middleware that sanitizes req.body to remove XSS vectors.
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}
