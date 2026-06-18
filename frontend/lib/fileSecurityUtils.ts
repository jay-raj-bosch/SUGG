/**
 * fileSecurityUtils.ts — Client-side file upload security validation.
 *
 * Prevents:
 * - Double extensions (e.g. file.pdf.exe)
 * - Dangerous executable file types (.exe, .bat, .cmd, .js, .vbs, etc.)
 * - Files with mismatched MIME types
 * - Null bytes in filenames (path traversal)
 * - Hidden files (dot-prefix on Unix)
 * - Excessively long filenames
 */

// ─── Blocked extensions (dangerous executables / scripts) ─────────────────────
const BLOCKED_EXTENSIONS = new Set([
  // Windows executables
  "exe", "bat", "cmd", "com", "msi", "scr", "pif", "cpl",
  // Scripts
  "js", "jse", "vbs", "vbe", "wsf", "wsh", "ps1", "psm1",
  // Shell scripts
  "sh", "bash", "csh", "ksh",
  // Server-side scripts
  "php", "php3", "php4", "php5", "phtml", "asp", "aspx", "jsp", "jspx",
  "cgi", "pl", "py", "rb",
  // Java / .NET
  "jar", "class", "dll", "sys",
  // Macros & archives with auto-run
  "hta", "inf", "reg", "rgs", "sct", "ws",
  // Shortcut / link files
  "lnk", "url", "desktop",
  // Dangerous document macros
  "docm", "xlsm", "pptm", "dotm", "xltm",
]);

// ─── Allowed MIME type prefixes for general attachments ───────────────────────
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

// ─── Allowed MIME types for image-only uploads ────────────────────────────────
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Extracts all extensions from a filename.
 * e.g. "report.pdf.exe" → ["pdf", "exe"]
 */
function getAllExtensions(filename: string): string[] {
  const parts = filename.split(".");
  if (parts.length <= 1) return [];
  return parts.slice(1).map(ext => ext.toLowerCase().trim());
}

/**
 * Validate a single file for security issues.
 * Call this before accepting any file upload.
 */
export function validateFile(file: File, options?: { imageOnly?: boolean }): FileValidationResult {
  const filename = file.name;

  // 1. Check for null bytes (path traversal attempt)
  if (filename.includes("\0") || filename.includes("%00")) {
    return { valid: false, error: `"${filename}" contains invalid characters` };
  }

  // 2. Check filename length (prevent buffer overflow / filesystem issues)
  if (filename.length > 255) {
    return { valid: false, error: `Filename is too long (max 255 characters)` };
  }

  // 3. Check for hidden files
  if (filename.startsWith(".")) {
    return { valid: false, error: `Hidden files are not allowed: "${filename}"` };
  }

  // 4. Check for path separators (directory traversal)
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return { valid: false, error: `"${filename}" contains invalid path characters` };
  }

  // 5. Get all extensions and check for blocked ones
  const extensions = getAllExtensions(filename);

  if (extensions.length === 0) {
    return { valid: false, error: `"${filename}" has no file extension` };
  }

  // 6. Check for double/multiple extensions — block ALL multi-extension files
  if (extensions.length > 1) {
    // Only allow known safe double extensions like .tar.gz
    const safeDoubles = new Set(["tar.gz", "tar.bz2", "tar.xz"]);
    const joined = extensions.join(".");
    if (!safeDoubles.has(joined)) {
      return { valid: false, error: `"${filename}" has multiple extensions which is not allowed. Please rename and upload with a single extension.` };
    }
  }

  // 7. Check if the final extension is blocked
  const finalExt = extensions[extensions.length - 1];
  if (BLOCKED_EXTENSIONS.has(finalExt)) {
    return { valid: false, error: `File type ".${finalExt}" is not allowed for security reasons` };
  }

  // 8. MIME type validation
  const mime = file.type || "application/octet-stream";

  if (options?.imageOnly) {
    if (!IMAGE_MIME_TYPES.has(mime)) {
      return { valid: false, error: `"${filename}" is not a valid image file (JPG/PNG/GIF/WebP only)` };
    }
    // Verify extension matches image type
    const imageExts = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
    if (!imageExts.has(finalExt)) {
      return { valid: false, error: `"${filename}" does not have a valid image extension` };
    }
  } else {
    // General file: check MIME against allowed list
    if (mime === "application/octet-stream") {
      // Browser couldn't determine type — still block known dangerous extensions
      // Already handled above
    } else {
      const isAllowed = ALLOWED_MIME_PREFIXES.some(prefix => mime.startsWith(prefix));
      if (!isAllowed) {
        return { valid: false, error: `File type "${mime}" is not allowed for "${filename}"` };
      }
    }
  }

  // 9. Check for MIME / extension mismatch (e.g., exe file renamed to .pdf)
  if (mime.startsWith("application/x-ms") || mime === "application/x-executable" ||
      mime === "application/x-dosexec" || mime === "application/x-msdos-program") {
    return { valid: false, error: `"${filename}" appears to be an executable file disguised with a different extension` };
  }

  return { valid: true };
}

/**
 * Validate an array of files. Returns the first error found, or valid.
 */
export function validateFiles(files: File[], options?: { imageOnly?: boolean; maxFiles?: number; maxSizeMB?: number }): FileValidationResult {
  const maxFiles = options?.maxFiles ?? 5;
  const maxSize = (options?.maxSizeMB ?? 4) * 1024 * 1024;

  if (files.length > maxFiles) {
    return { valid: false, error: `Maximum ${maxFiles} files allowed` };
  }

  for (const file of files) {
    // Size check
    if (file.size > maxSize) {
      return { valid: false, error: `"${file.name}" exceeds ${options?.maxSizeMB ?? 4}MB limit` };
    }

    // Security validation
    const result = validateFile(file, { imageOnly: options?.imageOnly });
    if (!result.valid) return result;
  }

  return { valid: true };
}

/**
 * Sanitize a filename for safe storage.
 * Removes special characters, normalizes whitespace, enforces max length.
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  let safe = filename.replace(/[/\\:\0]/g, "");
  // Remove leading dots
  safe = safe.replace(/^\.+/, "");
  // Replace multiple spaces/special chars with underscore
  safe = safe.replace(/[^\w.\-\s]/g, "_").replace(/\s+/g, "_");
  // Truncate to 200 chars (leaving room for random suffix)
  if (safe.length > 200) {
    const ext = safe.split(".").pop() || "";
    safe = safe.slice(0, 195) + "." + ext;
  }
  return safe || "unnamed_file";
}
