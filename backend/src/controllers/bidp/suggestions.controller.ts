// BidP — Suggestions Controller
// Handles /api/bidp/suggestions* — plant code enforced by plantGuard (PLT-01) + JWT.
import { Request, Response } from "express";
import * as store from "../../data/store";
import { asyncHandler } from "../../middleware/errorHandler";

const VALID_TYPE_CODES = ["SSS", "SFC", "MIC", "DCP", "CTF"] as const;

const VALID_STATUSES = [
  "Draft",
  "Submitted",
  "Pending FLM",
  "Pending Manager",
  "Pending BPS",
  "Pending BPS Admin",
  "Pending BPS DH",
  "Under Evaluation",
  "Approved",
  "Approved & Closed",
  "Closed / Awarded",
  "Implemented",
  "Rejected",
  "Sent Back",
  "Reopened",
] as const;

/** GET /api/bidp/suggestions?status=&type=&employeeNo=&page=&limit= */
export const listSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { status, type, employeeNo, assignedFlm, page, limit } = req.query;
  const result = store.getSuggestions({
    plantCode: req.user!.plantCode,
    status: status as string | undefined,
    type: type as string | undefined,
    employeeNo: employeeNo as string | undefined,
    assignedFlm: assignedFlm as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.json(result);
});

/** GET /api/bidp/suggestions/:id */
export const getSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const s = store.getSuggestionById(req.params.id, req.user!.plantCode);
  if (!s) { res.status(404).json({ error: "Suggestion not found" }); return; }
  res.json(s);
});

/** POST /api/bidp/suggestions */
export const createSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const user = req.user!;

  if (!body.typeCode || !VALID_TYPE_CODES.includes(body.typeCode)) {
    res.status(400).json({ error: `Invalid or missing typeCode. Valid BidP types: ${VALID_TYPE_CODES.join(", ")}` });
    return;
  }

  const created = store.createSuggestion({
    typeCode: body.typeCode,
    subject: body.subject,
    category: body.category,
    status: body.status || "Draft",
    suggestionDate: body.suggestionDate,
    range: body.range,
    suggestionFor: body.suggestionFor,
    groupSuggestion: body.groupSuggestion,
    otherInfo: body.otherInfo,
    employeeNo: user.employeeNo,
    pendingWith: body.pendingWith,
    plantCode: user.plantCode,
    presentMethod: body.presentMethod,
    proposedMethod: body.proposedMethod,
    benefits: body.benefits,
    formData: body.formData ?? body,
    // All users can set assignedFlm and approvalLevel — employees
    // choose which FLM to submit to during the suggestion form.
    assignedFlm: body.assignedFlm,
    approvalLevel: body.approvalLevel,
  });
  res.status(201).json(created);
});

/** PUT /api/bidp/suggestions/:id */
export const updateSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const updated = store.updateSuggestion(req.params.id, req.body, req.user!.plantCode);
  if (!updated) { res.status(404).json({ error: "Suggestion not found" }); return; }
  res.json(updated);
});

/** PATCH /api/bidp/suggestions/:id/status */
export const patchStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, pendingWith, rejectionReason, rejectedBy, rejectedByName, rejectedOn } = req.body;
  if (!status) { res.status(400).json({ error: "status is required" }); return; }
  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `Invalid BidP status: ${status}` });
    return;
  }
  const meta = (rejectionReason || rejectedBy)
    ? { rejectionReason, rejectedBy, rejectedByName, rejectedOn }
    : undefined;
  const updated = store.patchSuggestionStatus(req.params.id, status, pendingWith, meta, req.user!.plantCode);
  if (!updated) { res.status(404).json({ error: "Suggestion not found" }); return; }
  res.json(updated);
});
