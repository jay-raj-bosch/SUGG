/**
 * constants.ts — Application-wide magic-string constants.
 *
 * RULE: Never hard-code "PLT-01", "PLT-02", "bidp", "jap", or storage key
 * strings directly in component/context files. Import from here instead.
 *
 * NOTE FOR .NET BACKEND TEAM:
 *   - Plant codes in the database and JWT must exactly match PLANT_CODE values.
 *   - All JWT payloads must include `plantCode` (camelCase).
 *   - All API JSON responses must use camelCase property names.
 */

// ─── Plant Codes ─────────────────────────────────────────────────────────────

/** Database / JWT / API plant code for Bidadi Plant */
export const PLANT_CODE_BIDP = "PLT-01" as const;

/** Database / JWT / API plant code for Jaipur Plant */
export const PLANT_CODE_JAP = "PLT-02" as const;

export type PlantCode = typeof PLANT_CODE_BIDP | typeof PLANT_CODE_JAP;

/** Maps the URL segment (from PlantContext) to the DB plant code */
export const PLANT_SEGMENT_TO_CODE: Record<string, PlantCode> = {
  bidp: PLANT_CODE_BIDP,
  jap:  PLANT_CODE_JAP,
};

/** Maps the DB plant code back to the URL segment */
export const PLANT_CODE_TO_SEGMENT: Record<PlantCode, string> = {
  [PLANT_CODE_BIDP]: "bidp",
  [PLANT_CODE_JAP]:  "jap",
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────
// All localStorage / sessionStorage key strings in one place.
// Renaming a key here is the only change needed to avoid stale data.

export const STORAGE_KEYS = {
  /** Active plant URL segment — sessionStorage */
  SELECTED_PLANT:     "selectedPlant",
  /** Active JaP workflow role — sessionStorage */
  JAP_ROLE:           "japRole",
  /** JaP role user data snapshot — sessionStorage */
  JAP_USER_DATA:      "japUserData",
  /** Active BidP workflow role — sessionStorage */
  BIDP_ROLE:          "bidpRole",
  /** BidP role user data snapshot — sessionStorage */
  BIDP_USER_DATA:     "bidpUserData",
  /** JWT token — localStorage */
  AUTH_TOKEN:         "authToken",
  /** BPS input method settings for JaP — localStorage */
  JAP_INPUT_METHODS:  "jap_input_methods",
  /** UI language preference — localStorage */
  PREFERRED_LANGUAGE: "preferredLanguage",
  /** Pending concurrent submissions (cross-tab) — localStorage */
  PENDING_SUBS:       "flowboost_pending_subs",
  /** Prefix for the in-memory suggestion DB cache — sessionStorage */
  SUGGESTION_DB_PREFIX: "bidp_db_",
  /** Prefix for the suggestion DB cache version tag — sessionStorage */
  SUGGESTION_VERSION_PREFIX: "bidp_db_version_",
} as const;

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * JWT payload field names.
 * The .NET backend must include ALL of these in the JWT it issues.
 *
 * Example payload:
 *   { "employeeNo": "EMP-10201", "name": "Suresh M", "role": "employee", "plantCode": "PLT-02" }
 */
export const JWT_CLAIMS = {
  EMPLOYEE_NO: "employeeNo",
  NAME:        "name",
  ROLE:        "role",       // "employee" | "admin"
  PLANT_CODE:  "plantCode",  // "PLT-01" | "PLT-02"
} as const;
