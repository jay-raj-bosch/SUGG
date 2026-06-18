import { Request, Response } from "express";
import * as store from "../data/store";
import { asyncHandler } from "../middleware/errorHandler";

/**
 * GET /api/notifications?unread=true
 */
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.employeeNo;
  const unreadOnly = req.query.unread === "true";
  const notifications = store.getNotifications(userId, unreadOnly);
  res.json(notifications);
});

/**
 * POST /api/notifications
 * Body: { userId, message, type }
 */
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { userId, message, type } = req.body;
  // "self" means the authenticated user
  const targetUser = userId === "self" ? req.user!.employeeNo : userId;
  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  const created = store.addNotification(targetUser, message, type || "info");
  res.status(201).json(created);
});

/**
 * PATCH /api/notifications/:id/read
 */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.employeeNo;
  const notification = store.markNotificationRead(Number(req.params.id), userId);
  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(notification);
});

/**
 * PATCH /api/notifications/read-all
 */
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.employeeNo;
  store.markAllNotificationsRead(userId);
  res.status(204).send();
});
