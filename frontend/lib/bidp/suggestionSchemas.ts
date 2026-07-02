import { z } from "zod";

// Max file constraints
const MAX_FILES = 5;
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

// AttachmentItem schema (matches src/lib/attachmentUtils.ts interface)
const attachmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string(),
  uploadedAt: z.string(),
});

// Reusable refinements
const fileArraySchema = z.array(attachmentItemSchema)
  .max(MAX_FILES, "Maximum 5 files allowed")
  .refine(
    (files) => files.every((f) => f.size <= MAX_FILE_SIZE),
    "Each file must be under 4MB"
  );

const imageFileSchema = z.array(attachmentItemSchema)
  .min(1, "At least one image is required")
  .refine(
    (files) => files.every((f) => IMAGE_TYPES.includes(f.type)),
    "Only JPG/PNG images are allowed"
  )
  .refine(
    (files) => files.every((f) => f.size <= MAX_FILE_SIZE),
    "Each image must be under 4MB"
  );

const positiveIntSchema = z
  .string()
  .min(1, "This field is required")
  .refine((val) => /^\d+$/.test(val) && parseInt(val, 10) > 0, "Must be a positive integer");

const sharePercentSchema = z
  .string()
  .min(1, "Share % is required")
  .refine((val) => !isNaN(Number(val)), "Must be a number")
  .refine((val) => Number(val) >= 0 && Number(val) <= 100, "Must be between 0 and 100");

// ─── Global (common) fields ───
export const globalFieldsSchema = z.object({
  suggestionType: z.string().min(1, "Suggestion type is required"),
  suggestionDate: z.string(),
  range: z.string().optional(),
  suggestionFor: z.enum(["self", "behalf"]),
  groupSuggestion: z.enum(["yes", "no"]),
  otherInfo: z.string().optional(),
  mainSuggestor: z.string().optional(),
  teamMembers: z.array(z.string()).optional(),
  attachments: fileArraySchema,
  suggestionDepartment: z.string().min(1, "Suggestion department is required"),
  sameAsMyDepartment: z.boolean().optional(),
});

// ─── 1. Simple Suggestion Scheme ───
export const simpleSuggestionSchema = globalFieldsSchema.extend({
  subject: z.string().trim().min(1, "Subject is mandatory"),
  category: z.string().min(1, "Category is mandatory"),
  presentMethod: z.string().trim().min(1, "Present/Before Method is mandatory"),
  proposedMethod: z.string().trim().min(1, "Proposed/After Method is mandatory"),
  benefits: z.string().trim().min(1, "Benefits is mandatory"),
  flm: z.string().trim().min(1, "FLM is mandatory"),
});

// ─── 2. Shop Floor CIP ───
export const shopFloorCIPSchema = globalFieldsSchema.extend({
  dateOfImplementation: z.string().min(1, "Date of implementation is required"),
  moderators: z.array(z.string()).min(1, "At least one moderator is required"),
  kaizenTheme: z.string().trim().min(1, "Kaizen Theme is mandatory"),
  problemStatus: z.string().trim().min(1, "Problem/Present Status is mandatory"),
  category: z.string().min(1, "Category is mandatory"),
  beforeImprovement: z.string().trim().min(1, "Before Improvement is mandatory"),
  afterImprovement: z.string().trim().min(1, "After Improvement is mandatory"),
  benefits: z.string().trim().min(1, "Benefits is mandatory"),
  rootCauseIdentification: z.string().trim().min(1, "Root Cause Identification is mandatory"),
  standardization: z.string().trim().min(1, "Standardization is mandatory"),
  rootCause: z.string().trim().min(1, "Root Cause is mandatory"),
  ideaToEliminate: z.string().trim().min(1, "Idea to Eliminate Root Cause is mandatory"),
  actionTaken: z.string().trim().min(1, "Action Taken is mandatory"),
  horizontalDeployment: positiveIntSchema,
});

// ─── 3. My Idea Card ───
export const myIdeaCardSchema = globalFieldsSchema.extend({
  dateOfImplementation: z.string().min(1, "Date of implementation is required"),
  subject: z.string().trim().min(1, "Subject is mandatory"),
  category: z.string().min(1, "Category is mandatory"),
  descriptionProblem: z.string().trim().min(20, "Description must be at least 20 characters"),
  descriptionImprovement: z.string().trim().min(20, "Description must be at least 20 characters"),
  benefits: z.string().trim().min(1, "Benefits is mandatory"),
  flm: z.string().trim().min(1, "FLM is mandatory"),
});

// ─── 4. Daily CIP ───
export const dailyCIPSchema = globalFieldsSchema.extend({
  dateOfImplementation: z.string().min(1, "Date of implementation is required"),
  category: z.string().min(1, "Category is mandatory"),
  machineNoArea: z.string().trim().min(1, "Machine No / Area is mandatory"),
  suggestionDescription: z.string().trim().min(1, "Suggestion Description is mandatory"),
  photosBefore: imageFileSchema,
  photosAfter: imageFileSchema,
  actionTaken: z.string().trim().min(1, "Action Taken is mandatory"),
});

// ─── 5. Cash The Flash ───
export const cashTheFlashSchema = globalFieldsSchema.extend({
  subject: z.string().trim().min(1, "Subject is mandatory"),
  category: z.string().min(1, "Category is mandatory"),
  presentMethod: z.string().trim().min(1, "Present/Before Method is mandatory"),
  proposedMethod: z.string().trim().min(1, "Proposed/After Method is mandatory"),
  benefits: z.string().trim().min(1, "Benefits is mandatory"),
  suggestorName: z.string(),
  sharePercent: sharePercentSchema,
  // Date of implementation may be in the future for CTF (planned implementation)
  dateOfImplementation: z.string().min(1, "Date of Implementation is required"),
  flm: z.string().trim().min(1, "FLM is mandatory"),
});

// Schema map by type
export const schemaMap: Record<string, z.ZodSchema> = {
  "Simple Suggestion Scheme": simpleSuggestionSchema,
  "Shop Floor CIP": shopFloorCIPSchema,
  "My Idea Card": myIdeaCardSchema,
  "Daily CIP": dailyCIPSchema,
  "Cash The Flash": cashTheFlashSchema,
};

// Type exports
export type SimpleSuggestionData = z.infer<typeof simpleSuggestionSchema>;
export type ShopFloorCIPData = z.infer<typeof shopFloorCIPSchema>;
export type MyIdeaCardData = z.infer<typeof myIdeaCardSchema>;
export type DailyCIPData = z.infer<typeof dailyCIPSchema>;
export type CashTheFlashData = z.infer<typeof cashTheFlashSchema>;
