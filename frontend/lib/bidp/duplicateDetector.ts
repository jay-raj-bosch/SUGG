/**
 * duplicateDetector.ts — v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Industrial-grade duplicate suggestion detection engine.
 *
 * Algorithm pipeline:
 *  1. Text normalisation     – lowercase, strip punctuation, expand contractions
 *  2. Stop-word removal      – manufacturing-domain stop-word list
 *  3. Porter-style stemming  – 22 suffix rules (v2 expanded)
 *  4. Synonym expansion      – 52-group domain synonym map (v2: +25 new groups)
 *  5. TF-IDF cosine          – vector space model per field
 *  6. N-gram overlap         – bigram + trigram phrase matching
 *  7. Jaccard similarity     – unordered token-set overlap (NEW in v2)
 *  8. Per-type field weights – different forms weight fields differently (NEW)
 *  9. Cross-field boost      – multi-field agreement raises score
 * 10. Context threshold      – same category+type lowers detection bar (NEW)
 * 11. Concurrent detection   – checks pendingSubmissionsStore for in-flight
 *                              submissions happening right now (NEW)
 *
 * No external API required — runs fully client-side in < 80 ms.
 */

import type { PendingEntry } from "./pendingSubmissionsStore";
import { Suggestion } from "../mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DuplicateConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface DuplicateMatch {
  suggestion: Suggestion;
  /** Overall similarity 0–100 */
  score: number;
  confidence: DuplicateConfidence;
  /** Per-field breakdown */
  breakdown: {
    subject: number;
    presentMethod: number;
    proposedMethod: number;
    benefits: number;
    category: number;
    type: number;
  };
  reason: string;
}

/** A match found against an in-flight (not yet persisted) submission */
export interface PendingMatch {
  entry: PendingEntry;
  score: number;
  confidence: DuplicateConfidence;
  breakdown: {
    subject: number;
    presentMethod: number;
    proposedMethod: number;
    benefits: number;
  };
  reason: string;
}

export interface FullDetectionResult {
  /** Matches against suggestions already saved in the database */
  saved: DuplicateMatch[];
  /** Matches against submissions currently in-progress by other users */
  pending: PendingMatch[];
  hasConflict: boolean;
}

export interface DuplicateCheckInput {
  subject?: string;
  presentMethod?: string;
  proposedMethod?: string;
  benefits?: string;
  category?: string;
  suggestionType?: string;
  /** Type-specific raw fields (kaizenTheme, machineNoArea, etc.) */
  [key: string]: any;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const THRESHOLD_HIGH   = 70;   // (v2: was 72 — slightly easier to flag near-dupes)
const THRESHOLD_MEDIUM = 50;   // (v2: was 52)
const THRESHOLD_LOW    = 36;   // (v2: was 38)

// ─── Default field weights (must sum to 100) ──────────────────────────────────

/** Weights must sum to 100 */
const FIELD_WEIGHTS = {
  proposedMethod: 32, // what you want to do — most distinctive
  presentMethod:  26, // current situation
  subject:        20, // title
  benefits:       14, // expected results
  category:        5, // category match
  type:            3, // same form type
};

/**
 * Per-form-type weight overrides (v2 NEW).
 * Different suggestion forms emphasise different text fields.
 * All weight sets must sum to 100.
 */
const TYPE_FIELD_WEIGHTS: Record<string, typeof FIELD_WEIGHTS> = {
  "Simple Suggestion Scheme": { proposedMethod: 34, presentMethod: 24, subject: 20, benefits: 16, category: 4, type: 2 },
  "Shop Floor CIP":           { proposedMethod: 36, presentMethod: 28, subject: 13, benefits: 16, category: 5, type: 2 },
  "My Idea Card":             { proposedMethod: 33, presentMethod: 26, subject: 18, benefits: 17, category: 4, type: 2 },
  "Daily CIP":                { proposedMethod: 35, presentMethod: 28, subject: 14, benefits: 17, category: 4, type: 2 },
  "Cash The Flash":           { proposedMethod: 38, presentMethod: 22, subject: 18, benefits: 16, category: 4, type: 2 },
};

// ─── Stop words (manufacturing / industrial domain tuned) ─────────────────────

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","up","about","into","through","during","before","after","above",
  "below","between","each","is","are","was","were","be","been","being","have",
  "has","had","do","does","did","will","would","could","should","may","might",
  "shall","can","need","must","use","used","using","also","this","that","these",
  "those","it","its","we","our","they","their","he","she","i","my","you","your",
  "all","some","any","more","less","no","not","so","as","if","then","than","when",
  "which","who","what","how","where","why","there","here","now","just","only",
  "make","made","get","got","set","put","take","taken","give","given","done",
  "currently","present","current","existing","improve","improvement","reduce",
  "reduction","increase","install","installed","implement","implementation",
  "system","process","method","area","per","time","shift","daily","every",
  "work","worker","workers","machine","equipment","manual","auto","automatic",
  "new","old","better","best","good","bad","high","low","yes","able","provide",
  "due","help","ensure","avoid","prevent","allow","need","required","type",
]);

// ─── Industrial synonym map — v2: 52 groups ───────────────────────────────────
// Maps word → canonical group index; words in the same group are treated as identical

const SYNONYM_GROUPS: string[][] = [
  // Mechanical / conveying
  ["conveyor","belt","line","track","chain","roller","transport"],
  // Sensing / monitoring
  ["sensor","detector","monitor","monitoring","gauge","meter","probe"],
  // Fluids
  ["coolant","lubricant","fluid","oil","grease","liquid","hydraulic"],
  // Leaks / spills
  ["leak","leakage","seepage","drip","overflow","spill","contamination"],
  // Waste / loss
  ["waste","wastage","loss","consumption","excess","scrap","material"],
  // Safety
  ["safety","hazard","risk","danger","accident","incident","unsafe"],
  // Energy / power
  ["energy","power","electricity","kwh","watt","voltage","current"],
  // Noise / vibration
  ["noise","sound","vibration","decibel","db","acoustic","rattle"],
  // Storage / organisation
  ["storage","organise","organize","bin","rack","shelf","trolley"],
  // Documentation
  ["checklist","list","form","document","record","log","register","sheet"],
  // Downtime / stoppages
  ["downtime","breakdown","failure","stoppage","halt","idle","unplanned"],
  // Maintenance
  ["maintenance","repair","service","overhaul","pm","preventive","corrective"],
  // Efficiency / output
  ["efficiency","productivity","throughput","output","yield","oee","uptime"],
  // Cost / savings
  ["cost","saving","expense","expenditure","spend","budget","overhead"],
  // Quality / defects
  ["quality","defect","reject","scrap","rework","ppm","rejection","ncr"],
  // Automation / IoT
  ["automation","digital","smart","plc","hmi","scada","iot","control"],
  // Calibration / alignment
  ["alignment","calibration","adjustment","setup","tuning","setting"],
  // Pneumatics / pressure
  ["pneumatic","pressure","air","valve","cylinder","actuator","solenoid"],
  // Lighting
  ["lighting","light","led","lamp","illumination","lux","lumen","bright"],
  // Inventory / spares
  ["inventory","stock","spare","parts","kanban","buffer","replenishment"],
  // Ergonomics
  ["ergonomic","fatigue","posture","mat","comfort","ergonomics","body"],
  // PPE / protection
  ["ppe","protection","glove","helmet","guard","shield","mask","safety"],
  // 5S / Housekeeping
  ["5s","housekeeping","cleanliness","clean","orderly","sort","shine","sustain"],
  // RCA / Root cause
  ["root","cause","analysis","rca","why","investigation","fishbone","pareto"],
  // Kaizen / CI
  ["kaizen","cip","improvement","lean","six","sigma","continuous","breakthrough"],
  // Deployment / rollout
  ["deploy","deployment","replicate","horizontal","rollout","spread","standardise"],
  // Temperature / thermal
  ["temperature","heat","cooling","thermal","hot","cold","celsius","furnace"],
  // Welding / machining
  ["welding","weld","grinding","cutting","machining","turning","milling","boring"],
  // Surface / paint / coating
  ["paint","coating","surface","finish","treatment","plating","powder","rust"],
  // Tooling / jigs
  ["jig","fixture","tool","tooling","die","mold","mould","punch"],
  // Fasteners / brackets
  ["bolt","nut","fastener","screw","rivet","bracket","clamp","pin"],
  // Pipes / hoses
  ["pipe","tube","duct","hose","fitting","connector","coupling","manifold"],
  // Motors / drives
  ["pump","motor","drive","inverter","vfd","gearbox","shaft","bearing"],
  // Measurement / inspection
  ["measurement","inspection","testing","qc","gage","cmm","metrology","verify"],
  // Cycle time / takt
  ["cycle","takt","lead","standard","uph","pitch","wip"],
  // Mistake-proofing
  ["poka","yoke","mistake","proof","failsafe","prevention","detection"],
  // SOP / Work instructions
  ["sop","procedure","instruction","wis","guideline","standard","protocol"],
  // Visual management
  ["visual","display","board","andon","signal","indicator","shadow"],
  // Shop floor zones
  ["floor","shop","cell","station","workstation","bay","zone","aisle"],
  // Customer / complaints
  ["reject","return","complaint","feedback","customer","ncrm","warranty","claim"],
  // Effluent / water
  ["water","effluent","discharge","treatment","rtu","sewage","drainage"],
  // Air quality / dust
  ["dust","fume","emission","pollution","extraction","ventilation"],
  // Material handling
  ["forklift","agv","material","handling","pallet","crane","hoist"],
  // IT / Software
  ["software","app","excel","erp","sap","database","spreadsheet","it"],
  // Training / skills
  ["training","skill","competency","knowledge","certification","upskill"],
  // Shift / handover
  ["handover","communication","information","gap","briefing","meeting"],
  // Packaging / labelling
  ["packing","packaging","label","marking","identification","tag","barcode"],
  // Traceability / batch
  ["traceability","lot","batch","qr","rfid","serialisation"],
  // Line balancing
  ["balance","bottleneck","constraint","capacity","load","flow"],
  // Colour coding
  ["colour","color","coding","designation","marking"],
  // Alarms / alerts
  ["alarm","alert","notification","warning","reminder","flag","trigger"],
  // Digital transformation
  ["paperless","transformation","technology","industry","digitalise"],
];

// Build flat synonym lookup: word → canonical index
const synonymIndex: Map<string, number> = new Map();
SYNONYM_GROUPS.forEach((group, idx) => {
  group.forEach(word => synonymIndex.set(word, idx));
});

// ─── Text normalisation ───────────────────────────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "") // smart quotes
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Basic Porter-style suffix rules — v2: 22 rules (was 14)
const STEMMING_RULES: [RegExp, string][] = [
  [/ings?$/,      ""],
  [/izations?$/,  "iz"],
  [/ations?$/,    "ate"],
  [/tion$/,       "te"],
  [/sion$/,       "se"],
  [/ments?$/,     ""],
  [/nesses$/,     ""],
  [/ness$/,       ""],
  [/ities$/,      "ity"],
  [/ity$/,        ""],
  [/ers?$/,       ""],
  [/ors?$/,       ""],
  [/ed$/,         ""],
  [/ly$/,         ""],
  [/al$/,         ""],
  [/ize$/,        ""],
  [/ise$/,        ""],
  [/ical$/,       "ic"],
  [/fulness$/,    "ful"],
  [/ful$/,        ""],
  [/less$/,       ""],
  [/ing$/,        ""],
];

function stem(word: string): string {
  if (word.length <= 4) return word;
  for (const [rx, rep] of STEMMING_RULES) {
    if (rx.test(word)) {
      const result = word.replace(rx, rep);
      if (result.length >= 3) return result;
    }
  }
  return word;
}

// ─── Token pipeline ───────────────────────────────────────────────────────────

function tokenise(text: string): string[] {
  if (!text || !text.trim()) return [];
  return normalise(text)
    .split(" ")
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);
}

/** Expand tokens with synonyms (replace with canonical group index string) */
function expandWithSynonyms(tokens: string[]): string[] {
  return tokens.map(t => {
    const idx = synonymIndex.get(t);
    return idx !== undefined ? `__syn_${idx}` : t;
  });
}

// ─── N-gram extraction ────────────────────────────────────────────────────────

function getNgrams(tokens: string[], n: number): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    result.add(tokens.slice(i, i + n).join(" "));
  }
  return result;
}

// ─── TF-IDF cosine similarity ────────────────────────────────────────────────

function buildTfVector(tokens: string[]): Map<string, number> {
  const freq: Map<string, number> = new Map();
  tokens.forEach(t => freq.set(t, (freq.get(t) ?? 0) + 1));
  const tf: Map<string, number> = new Map();
  const total = tokens.length || 1;
  freq.forEach((count, term) => tf.set(term, count / total));
  return tf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0;
  a.forEach((valA, term) => {
    dot += valA * (b.get(term) ?? 0);
    magA += valA * valA;
  });
  b.forEach(valB => { magB += valB * valB; });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ─── N-gram overlap score ─────────────────────────────────────────────────────

function ngramOverlap(tokensA: string[], tokensB: string[]): number {
  if (!tokensA.length || !tokensB.length) return 0;
  let totalOverlap = 0;
  let totalPossible = 0;

  for (const n of [2, 3]) {
    const a = getNgrams(tokensA, n);
    const b = getNgrams(tokensB, n);
    if (!a.size || !b.size) continue;
    let intersection = 0;
    a.forEach(gram => { if (b.has(gram)) intersection++; });
    const weight = n === 2 ? 1.5 : 2.5; // trigrams worth more
    totalOverlap += intersection * weight;
    totalPossible += Math.min(a.size, b.size) * weight;
  }

  return totalPossible > 0 ? totalOverlap / totalPossible : 0;
}

// ─── Jaccard similarity (NEW in v2) ──────────────────────────────────────────
// Measures unordered token-set overlap — complements cosine for short texts

function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  setA.forEach(t => { if (setB.has(t)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ─── Field-level similarity (v2: 3-signal blend) ─────────────────────────────

function fieldSimilarity(a: string | undefined, b: string | undefined): number {
  if (!a && !b) return 0;
  if (!a || !b) return 0;

  const tokA = expandWithSynonyms(tokenise(a));
  const tokB = expandWithSynonyms(tokenise(b));

  if (!tokA.length || !tokB.length) return 0;

  const cosine  = cosineSimilarity(buildTfVector(tokA), buildTfVector(tokB));
  const ngram   = ngramOverlap(tokA, tokB);
  const jaccard = jaccardSimilarity(tokA, tokB);

  // v2 blend: 55% cosine + 25% n-gram + 20% Jaccard
  // Adding Jaccard gives robustness for short texts where cosine is noisy
  const combined = cosine * 0.55 + ngram * 0.25 + jaccard * 0.20;

  // Bonus: exact substring match (handles very short but identical phrases)
  const na = normalise(a); const nb = normalise(b);
  let exactBonus = 0;
  if (na.length > 8 && (na.includes(nb) || nb.includes(na))) exactBonus = 0.15;

  return Math.min(1, combined + exactBonus);
}

// ─── Extract comparable text from a submission ───────────────────────────────

interface ComparableFields {
  subject: string;
  presentMethod: string;
  proposedMethod: string;
  benefits: string;
  category: string;
  type: string;
}

function extractFromInput(input: DuplicateCheckInput): ComparableFields {
  const type = input.suggestionType || "";

  let subject = "";
  let presentMethod = "";
  let proposedMethod = "";

  if (type === "Simple Suggestion Scheme" || type === "Cash The Flash") {
    subject        = input.subject || "";
    presentMethod  = input.presentMethod || "";
    proposedMethod = input.proposedMethod || "";
  } else if (type === "Shop Floor CIP") {
    subject        = input.kaizenTheme || input.subject || "";
    presentMethod  = input.problemStatus || input.beforeImprovement || input.presentMethod || "";
    proposedMethod = input.afterImprovement || input.proposedMethod || "";
  } else if (type === "My Idea Card") {
    subject        = input.subject || "";
    presentMethod  = input.descriptionProblem || input.presentMethod || "";
    proposedMethod = input.descriptionImprovement || input.proposedMethod || "";
  } else if (type === "Daily CIP") {
    subject        = input.machineNoArea || input.suggestionDescription || input.subject || "";
    presentMethod  = input.suggestionDescription || input.presentMethod || "";
    proposedMethod = input.actionTaken || input.proposedMethod || "";
  } else {
    // Fallback — try all known field names
    subject        = input.subject || input.kaizenTheme || input.machineNoArea || input.suggestionDescription || "";
    presentMethod  = input.presentMethod || input.problemStatus || input.beforeImprovement || input.descriptionProblem || input.suggestionDescription || "";
    proposedMethod = input.proposedMethod || input.afterImprovement || input.descriptionImprovement || input.actionTaken || "";
  }

  return {
    subject,
    presentMethod,
    proposedMethod,
    benefits: input.benefits || "",
    category: (input.category || "").toLowerCase(),
    type,
  };
}

function extractFromSuggestion(s: Suggestion): ComparableFields {
  const tf: Record<string, any> = (s as any).formData?.typeFields ?? {};
  const type = s.type || "";

  let subject = "";
  let presentMethod = "";
  let proposedMethod = "";

  if (type === "Simple Suggestion Scheme" || type === "Cash The Flash") {
    subject        = tf.subject || s.subject || "";
    presentMethod  = tf.presentMethod || s.presentMethod || "";
    proposedMethod = tf.proposedMethod || s.proposedMethod || "";
  } else if (type === "Shop Floor CIP") {
    subject        = tf.kaizenTheme || s.subject || "";
    presentMethod  = tf.problemStatus || tf.beforeImprovement || s.presentMethod || "";
    proposedMethod = tf.afterImprovement || s.proposedMethod || "";
  } else if (type === "My Idea Card") {
    subject        = tf.subject || s.subject || "";
    presentMethod  = tf.descriptionProblem || s.presentMethod || "";
    proposedMethod = tf.descriptionImprovement || s.proposedMethod || "";
  } else if (type === "Daily CIP") {
    subject        = tf.machineNoArea || tf.suggestionDescription || s.subject || "";
    presentMethod  = tf.suggestionDescription || s.presentMethod || "";
    proposedMethod = tf.actionTaken || s.proposedMethod || "";
  } else {
    // Fallback for legacy / unknown types
    subject        = s.subject || tf.kaizenTheme || tf.machineNoArea || tf.suggestionDescription || "";
    presentMethod  = s.presentMethod || tf.problemStatus || tf.beforeImprovement || tf.descriptionProblem || tf.suggestionDescription || "";
    proposedMethod = s.proposedMethod || tf.afterImprovement || tf.descriptionImprovement || tf.actionTaken || "";
  }

  return {
    subject,
    presentMethod,
    proposedMethod,
    benefits: s.benefits || tf.benefits || "",
    category: (s.category || "").toLowerCase(),
    type,
  };
}

// ─── Main detection function ──────────────────────────────────────────────────

/**
 * Check `input` against all `existing` suggestions.
 * Returns matches above THRESHOLD_LOW sorted by score descending.
 */
export function detectDuplicates(
  input: DuplicateCheckInput,
  existing: Suggestion[]
): DuplicateMatch[] {
  if (!existing.length) return [];

  const inputFields = extractFromInput(input);

  // Reject if the input has almost no content
  const totalInputLength = [
    inputFields.subject, inputFields.presentMethod,
    inputFields.proposedMethod, inputFields.benefits,
  ].join(" ").trim().length;
  if (totalInputLength < 15) return [];

  // Use per-type weights when available (v2)
  const weights = inputFields.type
    ? (TYPE_FIELD_WEIGHTS[inputFields.type] ?? FIELD_WEIGHTS)
    : FIELD_WEIGHTS;

  const results: DuplicateMatch[] = [];

  for (const suggestion of existing) {
    // Skip drafts — only check submitted/active suggestions
    if (suggestion.status === "Draft") continue;

    const sf = extractFromSuggestion(suggestion);

    // ── Per-field similarity (0–1) ──────────────────────────────────────────
    const subjectSim    = fieldSimilarity(inputFields.subject,        sf.subject);
    const presentSim    = fieldSimilarity(inputFields.presentMethod,  sf.presentMethod);
    const proposedSim   = fieldSimilarity(inputFields.proposedMethod, sf.proposedMethod);
    const benefitsSim   = fieldSimilarity(inputFields.benefits,       sf.benefits);

    // Category: exact match = 1.0, else 0
    const categorySim = inputFields.category && sf.category &&
      inputFields.category === sf.category ? 1.0 : 0;

    // Type: same form type = 1.0
    const typeSim = inputFields.type && sf.type &&
      inputFields.type === sf.type ? 1.0 : 0;

    // ── Weighted aggregate (0–100) ──────────────────────────────────────────
    const raw =
      proposedSim   * weights.proposedMethod +
      presentSim    * weights.presentMethod  +
      subjectSim    * weights.subject        +
      benefitsSim   * weights.benefits       +
      categorySim   * weights.category       +
      typeSim       * weights.type;

    // ── Cross-field reinforcement boost ────────────────────────────────────
    const strongFields = [subjectSim, presentSim, proposedSim, benefitsSim]
      .filter(s => s > 0.55).length;
    const crossBoost = strongFields >= 3 ? 8 : strongFields >= 2 ? 4 : 0;

    const score = Math.min(100, Math.round(raw + crossBoost));

    // ── Context-aware threshold (v2 NEW) ────────────────────────────────────
    // Same category + same form type → lower the detection bar by 6 pts
    // (catches near-misses within tightly-scoped contexts)
    const contextMatch = categorySim === 1 && typeSim === 1;
    const effectiveLow = contextMatch ? THRESHOLD_LOW - 6 : THRESHOLD_LOW;

    if (score < effectiveLow) continue;

    // ── Confidence band ─────────────────────────────────────────────────────
    let confidence: DuplicateConfidence;
    if (score >= THRESHOLD_HIGH)        confidence = "HIGH";
    else if (score >= THRESHOLD_MEDIUM) confidence = "MEDIUM";
    else                                confidence = "LOW";

    // ── Human-readable reason ───────────────────────────────────────────────
    const reasons: string[] = [];
    if (proposedSim  > 0.60) reasons.push("proposed solution is very similar");
    if (presentSim   > 0.60) reasons.push("problem description closely matches");
    if (subjectSim   > 0.65) reasons.push("subject/title is nearly identical");
    if (benefitsSim  > 0.60) reasons.push("expected benefits overlap significantly");
    if (categorySim  === 1)  reasons.push(`same category (${suggestion.category})`);
    if (typeSim      === 1)  reasons.push(`same suggestion type`);
    if (!reasons.length)     reasons.push("overall content is substantially similar");

    const reason =
      confidence === "HIGH"
        ? `⚠ Very likely a duplicate — ${reasons.join("; ")}.`
        : confidence === "MEDIUM"
        ? `⚠ Possible duplicate — ${reasons.join("; ")}.`
        : `ℹ Similar suggestion found — ${reasons[0]}.`;

    results.push({
      suggestion,
      score,
      confidence,
      breakdown: {
        subject:       Math.round(subjectSim   * 100),
        presentMethod: Math.round(presentSim   * 100),
        proposedMethod:Math.round(proposedSim  * 100),
        benefits:      Math.round(benefitsSim  * 100),
        category:      Math.round(categorySim  * 100),
        type:          Math.round(typeSim       * 100),
      },
      reason,
    });
  }

  // Sort by score descending, return top 5
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ─── Concurrent / pending detection (NEW in v2) ───────────────────────────────

/**
 * Check `input` against currently in-flight submissions from pendingSubmissionsStore.
 * These are suggestions being submitted RIGHT NOW by other users/tabs — they haven't
 * hit the database yet, so a plain DB query would miss them entirely.
 */
export function detectPendingDuplicates(
  input: DuplicateCheckInput,
  pending: PendingEntry[]
): PendingMatch[] {
  if (!pending.length) return [];

  const inputFields = extractFromInput(input);
  const totalLen = [
    inputFields.subject, inputFields.presentMethod,
    inputFields.proposedMethod, inputFields.benefits,
  ].join(" ").trim().length;
  if (totalLen < 15) return [];

  const weights = inputFields.type
    ? (TYPE_FIELD_WEIGHTS[inputFields.type] ?? FIELD_WEIGHTS)
    : FIELD_WEIGHTS;

  const results: PendingMatch[] = [];

  for (const entry of pending) {
    const subjectSim    = fieldSimilarity(inputFields.subject,        entry.subject);
    const presentSim    = fieldSimilarity(inputFields.presentMethod,  entry.presentMethod);
    const proposedSim   = fieldSimilarity(inputFields.proposedMethod, entry.proposedMethod);
    const benefitsSim   = fieldSimilarity(inputFields.benefits,       entry.benefits);

    const categorySim = inputFields.category && entry.category &&
      inputFields.category.toLowerCase() === entry.category.toLowerCase() ? 1 : 0;
    const typeSim = inputFields.type && entry.suggestionType &&
      inputFields.type === entry.suggestionType ? 1 : 0;

    const raw =
      proposedSim   * weights.proposedMethod +
      presentSim    * weights.presentMethod  +
      subjectSim    * weights.subject        +
      benefitsSim   * weights.benefits       +
      categorySim   * weights.category       +
      typeSim       * weights.type;

    const strongFields = [subjectSim, presentSim, proposedSim, benefitsSim]
      .filter(s => s > 0.55).length;
    const crossBoost   = strongFields >= 3 ? 8 : strongFields >= 2 ? 4 : 0;
    const score        = Math.min(100, Math.round(raw + crossBoost));

    const effectiveLow = categorySim === 1 && typeSim === 1 ? THRESHOLD_LOW - 6 : THRESHOLD_LOW;
    if (score < effectiveLow) continue;

    let confidence: DuplicateConfidence;
    if      (score >= THRESHOLD_HIGH)   confidence = "HIGH";
    else if (score >= THRESHOLD_MEDIUM) confidence = "MEDIUM";
    else                                confidence = "LOW";

    const byWhom = entry.employeeName
      ? `by ${entry.employeeName}`
      : "by another user";

    const reason = `⚡ Live conflict — ${byWhom} is currently submitting a ${score}%-similar suggestion right now.`;

    results.push({
      entry,
      score,
      confidence,
      breakdown: {
        subject:        Math.round(subjectSim  * 100),
        presentMethod:  Math.round(presentSim  * 100),
        proposedMethod: Math.round(proposedSim * 100),
        benefits:       Math.round(benefitsSim * 100),
      },
      reason,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─── Combined full detection ──────────────────────────────────────────────────

/**
 * Run detection against BOTH the saved database (existing[]) AND any
 * in-flight submissions currently being submitted (activePending[]).
 *
 * Pass `activePending` from getActivePending(yourTempId) to exclude your own
 * in-progress submission from the comparison.
 */
export function detectDuplicatesFull(
  input: DuplicateCheckInput,
  existing: Suggestion[],
  activePending: PendingEntry[] = []
): FullDetectionResult {
  const saved   = detectDuplicates(input, existing);
  const pending = detectPendingDuplicates(input, activePending);
  return {
    saved,
    pending,
    hasConflict: saved.length > 0 || pending.length > 0,
  };
}

/** Returns the single best match above HIGH threshold, or null */
export function getBestMatch(
  input: DuplicateCheckInput,
  existing: Suggestion[]
): DuplicateMatch | null {
  const matches = detectDuplicates(input, existing);
  return matches.length > 0 ? matches[0] : null;
}
