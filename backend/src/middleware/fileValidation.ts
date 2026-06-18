/**
 * fileValidation.ts — Server-side file upload security middleware.
 *
 * Validates uploaded file names and types to prevent:
 * - Double extension attacks (e.g. malware.pdf.exe)
 * - Path traversal via null bytes or ../ in filenames
 * - Dangerous executable file types
 * - Oversized uploads
 */

import { Request, Response, NextFunction } from "express";

// ─── Blocked extensions ───────────────────────────────────────────────────────
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif", "cpl",
  "js", "jse", "vbs", "vbe", "wsf", "wsh", "ps1", "psm1",
  "sh", "bash", "csh", "ksh",
  "php", "php3", "php4", "php5", "phtml", "asp", "aspx", "jsp", "jspx",
  "cgi", "pl", "py", "rb",
  "jar", "class", "dll", "sys",
  "hta", "inf", "reg", "rgs", "sct", "ws",
  "lnk", "url", "desktop",
  "docm", "xlsm", "pptm", "dotm", "xltm",
]);

// ─── Allowed MIME types ───────────────────────────────────────────────────────
const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "video/",
  "audio/",
];

function isFilenameUnsafe(filename: string): string | null {
  // Null bytes
  if (filename.includes("\0") || filename.includes("%00")) {
    return "Filename contains null bytes";
  }

  // Path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return "Filename contains path traversal characters";
  }

  // Hidden files
  if (filename.startsWith(".")) {
    return "Hidden files not allowed";
  }

  // Length
  if (filename.length > 255) {
    return "Filename too long";
  }

  // Extract all extensions
  const parts = filename.split(".");
  if (parts.length <= 1) return null; // no extension is ok for now
  const extensions = parts.slice(1).map(e => e.toLowerCase().trim());

  // Check each extension for blocked types
  for (const ext of extensions) {
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return `Extension .${ext} is not allowed`;
    }
  }

  // Double extensions — block ALL multi-extension files
  if (extensions.length > 1) {
    const safeDoubles = new Set(["tar.gz", "tar.bz2", "tar.xz"]);
    const joined = extensions.join(".");
    if (!safeDoubles.has(joined)) {
      return `Multiple extensions not allowed (${filename})`;
    }
  }

  return null;
}

function isMimeAllowed(mime: string): boolean {
  if (!mime || mime === "application/octet-stream") return true; // cannot verify
  // Block known executable MIME types
  if (mime === "application/x-executable" || mime === "application/x-dosexec" ||
      mime === "application/x-msdos-program" || mime.startsWith("application/x-ms")) {
    return false;
  }
  return ALLOWED_MIME_PREFIXES.some(prefix => mime.startsWith(prefix)) || mime === "application/octet-stream";
}

/**
 * Middleware: validates any multer-uploaded files on the request.
 * Use after multer middleware in the route chain.
 */
export function validateUploadedFiles(req: Request, res: Response, next: NextFunction): void {
  const files: Express.Multer.File[] = [];

  // Collect files from req.file and req.files
  if ((req as any).file) files.push((req as any).file);
  if ((req as any).files) {
    if (Array.isArray((req as any).files)) {
      files.push(...(req as any).files);
    } else {
      // req.files is an object { fieldname: File[] }
      for (const field of Object.values((req as any).files as Record<string, Express.Multer.File[]>)) {
        files.push(...field);
      }
    }
  }

  for (const file of files) {
    const filenameError = isFilenameUnsafe(file.originalname);
    if (filenameError) {
      res.status(400).json({ error: `File rejected: ${filenameError} (${file.originalname})` });
      return;
    }

    if (!isMimeAllowed(file.mimetype)) {
      res.status(400).json({ error: `File type "${file.mimetype}" is not allowed (${file.originalname})` });
      return;
    }

    // Max 4MB per file
    if (file.size > 4 * 1024 * 1024) {
      res.status(400).json({ error: `File "${file.originalname}" exceeds 4MB limit` });
      return;
    }
  }

  next();
}

/**
 * Validate attachment metadata within JSON body (for when files are stored as blob references).
 * Checks formData.attachmentItems[].name field.
 */
export function validateAttachmentNames(req: Request, res: Response, next: NextFunction): void {
  const body = req.body;
  const attachments: Array<{ name?: string }> = [];

  // Collect attachment names from various places in the payload
  if (body.formData?.attachmentItems) attachments.push(...body.formData.attachmentItems);
  if (body.attachments) attachments.push(...body.attachments);
  if (body.formData?.typeFields?.beforeImages) attachments.push(...body.formData.typeFields.beforeImages);
  if (body.formData?.typeFields?.afterImages) attachments.push(...body.formData.typeFields.afterImages);

  for (const att of attachments) {
    if (att.name) {
      const error = isFilenameUnsafe(att.name);
      if (error) {
        res.status(400).json({ error: `Attachment rejected: ${error} (${att.name})` });
        return;
      }
    }
  }

  next();
}
