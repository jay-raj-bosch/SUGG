// NotificationContext — plant-scoped per-user notification feed
// Backend: notifications table via /api/notifications
// ISOLATION: Notifications are fetched and posted with the active plant_code.
//             Notifications from other plants are never loaded into this context.
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import * as apiService from "@/lib/apiService";
import { usePlant } from "@/contexts/PlantContext";

export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (message: string, type?: Notification["type"]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// No hardcoded initial notifications — each user starts with an empty feed.
// Notifications are populated from the backend (per user) or via addNotification().
const initialNotifications: Notification[] = [];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { plant } = usePlant();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Re-fetch whenever the active plant changes — ensures no cross-plant notifications.
  useEffect(() => {
    if (!plant) {
      setNotifications([]);
      return;
    }
    // Start with plant-filtered mock data while backend loads
    setNotifications(initialNotifications);
    apiService.fetchNotifications()
      .then(rows => {
        if (rows.length) {
          setNotifications(rows.map(n => ({
            id: String(n.id),
            message: n.message,
            type: n.type,
            timestamp: new Date(n.created_at),
            read: n.is_read,
          })));
        }
      })
      .catch(() => { /* keep mock data */ });
  }, [plant]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback(async (message: string, type: Notification["type"] = "info") => {
    const local: Notification = {
      id: `n-${Date.now()}`,
      message,
      type,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [local, ...prev]);
    // Best-effort persist to backend (user id resolved server-side from JWT)
    apiService.postNotification("self", message, type).catch(() => {});
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const numId = parseInt(id);
    if (!isNaN(numId)) apiService.markNotificationRead(numId).catch(() => {});
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    apiService.markAllNotificationsRead().catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
