import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { notificationService } from "../services/notificationService";
import { AppNotification } from "../types";

interface NotificationBellProps {
  userEmail: string;
  onNavigateToProject?: (projectId: string) => void;
}

export function NotificationBell({ userEmail, onNavigateToProject }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [isOpen]);

  const handleEnablePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    await notificationService.requestAndSaveToken(userEmail);
    setPermissionStatus(Notification.permission);
  };

  useEffect(() => {
    if (!userEmail) return;

    // Subscribe to real-time notification collection changes
    const unsubscribe = notificationService.subscribeToNotifications(userEmail, (data) => {
      setNotifications(data);
    });

    // Also register for foreground web push notifications
    const unsubscribeForeground = notificationService.onForegroundMessage((payload) => {
      console.log("Web client foreground notification received in Bell:", payload);
      // Let the browser's Notification API show it if permission is granted
      if (Notification.permission === "granted") {
        new Notification(payload.notification?.title || "New Task Assigned", {
          body: payload.notification?.body || "You have a new task assigned.",
          icon: "/logo192.png",
        });
      }
    });

    // Request and activate Push Token registration on login
    notificationService.requestAndSaveToken(userEmail);

    return () => {
      unsubscribe();
      unsubscribeForeground();
    };
  }, [userEmail]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Mark all notifications as read when the dropdown is opened
  useEffect(() => {
    if (isOpen && unreadCount > 0 && userEmail) {
      notificationService.markAllAsRead(userEmail);
    }
  }, [isOpen, unreadCount, userEmail]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(userEmail);
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (notification.id) {
      await notificationService.markAsRead(notification.id);
    }
    setIsOpen(false);
    if (notification.projectId && onNavigateToProject) {
      onNavigateToProject(notification.projectId);
    }
  };

  // Helper for human-readable module styling
  const getModuleBadgeConfig = (moduleType: string) => {
    switch (moduleType) {
      case "lead_management":
        return { text: "Lead", bg: "bg-amber-100 text-amber-700 border-amber-200" };
      case "site_survey":
        return { text: "Survey", bg: "bg-blue-100 text-blue-700 border-blue-200" };
      case "project_control":
        return { text: "Control", bg: "bg-indigo-100 text-indigo-700 border-indigo-200" };
      case "task_sheet":
        return { text: "Task", bg: "bg-emerald-100 text-emerald-700 border-emerald-200" };
      case "service_request":
        return { text: "Service", bg: "bg-purple-100 text-purple-700 border-purple-200" };
      default:
        return { text: "Update", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  // Render timestamp helper using "Time ago" styling
  const renderTime = (timestampParam: any) => {
    if (!timestampParam) return "Just now";
    try {
      const date = timestampParam.toDate ? timestampParam.toDate() : new Date(timestampParam);
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      
      if (seconds < 60) return "Just now";
      
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) {
        return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
      }
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) {
        return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
      }
      
      const days = Math.floor(hours / 24);
      if (days < 30) {
        return days === 1 ? "1 day ago" : `${days} days ago`;
      }
      
      const months = Math.floor(days / 30);
      return months === 1 ? "1 month ago" : `${months} months ago`;
    } catch (e) {
      return "Just now";
    }
  };

  return (
    <div className="relative" ref={dropdownRef} id="bell-container">
      {/* Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all relative outline-none"
        aria-label="Notifications"
        id="bell-button"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse" id="bell-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-[999]"
            id="notifications-dropdown"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F8FAFC]">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                <p className="text-xs text-slate-400">You have {unreadCount} unread tasks</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-4.5 h-4.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Native Mobile/PWA Push Enablement Action Banner */}
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs">
              {permissionStatus === "default" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-base select-none">🔔</span>
                    <p className="text-slate-600 leading-normal font-medium">
                      Receive real-time mobile task alerts on your device even when SuryaDesk is closed.
                    </p>
                  </div>
                  <button
                    onClick={handleEnablePush}
                    className="w-full py-2 px-3 bg-orange-500 hover:bg-orange-600 active:scale-[98%] text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md"
                  >
                    Enable Push Notifications
                  </button>
                </div>
              )}
              {permissionStatus === "granted" && (
                <div className="flex items-center gap-2 text-emerald-700 font-medium bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/30">
                  <span className="text-base select-none">✓</span>
                  <p className="leading-tight">
                    Background alerts are active! You will get mobile push alerts when you close the app.
                  </p>
                </div>
              )}
              {permissionStatus === "denied" && (
                <div className="flex items-start gap-2 text-slate-500 bg-slate-100/60 p-2 rounded-lg border border-slate-200/50">
                  <span className="text-sm select-none">⚠️</span>
                  <p className="leading-normal text-[11px]">
                    Alerts blocked. Enable notification permissions in your browser/device settings to receive background updates.
                  </p>
                </div>
              )}
            </div>

            {/* List Body */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                    <Bell className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Clear skies here!</p>
                  <p className="text-[10px] text-slate-400">No task assignments received yet.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const badge = getModuleBadgeConfig(notif.moduleType);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex flex-col gap-1.5 p-4 transition-colors cursor-pointer text-left ${!notif.isRead ? "bg-blue-50/40 hover:bg-blue-50/70" : "hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${badge.bg}`}>
                          {badge.text}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {renderTime(notif.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 items-start justify-between">
                        <p className={`text-xs leading-relaxed flex-1 ${!notif.isRead ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                          {notif.message}
                        </p>
                        {!notif.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id!, e)}
                            className="p-1 rounded bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200/80 cursor-pointer shadow-xs"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {notif.assignedBy && (
                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5 border-t border-dashed border-slate-200/60 pt-1.5">
                          <span>Assigned by: <span className="font-semibold text-slate-500">{notif.assignedBy}</span></span>
                          {notif.projectId && <span className="text-blue-500 font-black flex items-center gap-0.5">Go To Task <ExternalLink className="w-2.5 h-2.5" /></span>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
