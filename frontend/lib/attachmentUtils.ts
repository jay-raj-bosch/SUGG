/**
 * Serializable attachment item — created from a browser File at upload time.
 * The `url` is a Blob Object URL valid for the current browser session.
 * In production, the backend would return a proper HTTPS URL after upload.
 */
export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;        // MIME type, e.g. "image/jpeg"
  url: string;         // blob: URL (session-only) or https: URL (backend)
  uploadedAt: string;  // ISO-8601 timestamp
}

import { sanitizeFilename } from "./fileSecurityUtils";

/**
 * Convert browser File objects → AttachmentItem objects.
 * A Blob Object URL is created for each file so it can be displayed
 * immediately and stored in React state / context without serialisation issues.
 */
export function filesToAttachmentItems(files: File[]): AttachmentItem[] {
  const now = Date.now();
  return files.map((f, i) => ({
    id: `${now}_${i}_${Math.random().toString(36).slice(2, 7)}`,
    name: sanitizeFilename(f.name),
    size: f.size,
    type: f.type || "application/octet-stream",
    url: URL.createObjectURL(f),
    uploadedAt: new Date().toISOString(),
  }));
}

/** Human-readable file size string (e.g. "1.4 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Returns true if the MIME type represents an image. */
export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}
