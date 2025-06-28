import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";

interface Notification {
  id: string;
  title: string;
  message: string;
  type:
    | "academic"
    | "behavior"
    | "attendance"
    | "event"
    | "payment"
    | "general";
  priority: "low" | "medium" | "high" | "urgent";
  studentId?: string;
  studentName?: string;
  createdAt: Date;
  read: boolean;
  actionRequired?: boolean;
  actionUrl?: string;
}

interface GuardianNotificationsProps {
  onNavigate?: (tabId: string) => void;
  onNotificationUpdate?: () => Promise<void>;
}

const GuardianNotifications: React.FC<GuardianNotificationsProps> = ({
  onNavigate,
  onNotificationUpdate,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user?.uid) {
      return;
    }

    try {
      setLoading(true);

      // Get notifications for this guardian
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("recipientUid", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const notificationsSnapshot = await getDocs(notificationsQuery);

      const fetchedNotifications: Notification[] =
        notificationsSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
            } as Notification)
        );

      // Generate some sample notifications if none exist
      if (fetchedNotifications.length === 0) {
        const sampleNotifications = generateSampleNotifications();
        setNotifications(sampleNotifications);
      } else {
        setNotifications(fetchedNotifications);
      }
    } catch (error: any) {
      // Fallback to sample notifications
      const sampleNotifications = generateSampleNotifications();
      setNotifications(sampleNotifications);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleNotifications = (): Notification[] => {
    return [
      {
        id: "1",
        title: "Subject Approval Required",
        message:
          "Your child has submitted new subject selections that require your approval.",
        type: "academic",
        priority: "medium",
        studentName: "Sample Student",
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        read: false,
        actionRequired: true,
        actionUrl: "approvals",
      },
      {
        id: "2",
        title: "Excellent Test Results",
        message:
          "Congratulations! Your child scored 95% on the Mathematics test.",
        type: "academic",
        priority: "low",
        studentName: "Sample Student",
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        read: false,
      },
      {
        id: "3",
        title: "Parent-Teacher Conference",
        message:
          "Parent-teacher conferences are scheduled for next week. Please book your slot.",
        type: "event",
        priority: "medium",
        createdAt: new Date(Date.now() - 259200000), // 3 days ago
        read: true,
        actionRequired: true,
      },
      {
        id: "4",
        title: "School Fee Reminder",
        message: "School fees for Term 2 are due by the end of this month.",
        type: "payment",
        priority: "high",
        createdAt: new Date(Date.now() - 432000000), // 5 days ago
        read: true,
        actionRequired: true,
      },
      {
        id: "5",
        title: "Sports Day Event",
        message:
          "Annual Sports Day is scheduled for next Friday. Please confirm attendance.",
        type: "event",
        priority: "low",
        createdAt: new Date(Date.now() - 604800000), // 1 week ago
        read: true,
      },
    ];
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update the notification in Firestore
      await updateDoc(doc(db, "notifications", notificationId), { read: true });

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      // Trigger notification count refresh in parent component
      if (onNotificationUpdate) {
        await onNotificationUpdate();
      }
    } catch (error) {
      // Error handling for marking notification as read
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
    } catch (error) {
      // Error handling for marking all notifications as read
    }
  };

  const handleNotificationAction = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to the appropriate tab if actionUrl is provided
    if (notification.actionUrl && onNavigate) {
      onNavigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const icons = {
      academic: "📚",
      behavior: "⚠️",
      attendance: "📅",
      event: "🎉",
      payment: "💳",
      general: "📢",
    };

    if (priority === "urgent") return "🔴";
    return icons[type as keyof typeof icons] || "📢";
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "#4CAF50",
      medium: "#FF9800",
      high: "#FF5722",
      urgent: "#F44336",
    };
    return colors[priority as keyof typeof colors] || "#757575";
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (showUnreadOnly && notification.read) return false;
    if (filter === "all") return true;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="guardian-tab-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("Loading notifications...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="guardian-tab-content">
      <div className="tab-header">
        <h2>{t("Notifications")}</h2>
        <p className="tab-description">
          {t(
            "Stay updated with your children's school activities and important information"
          )}
        </p>
      </div>

      <div className="notifications-controls">
        <div className="notification-stats">
          <span className="unread-count">
            {unreadCount} {t("unread notifications")}
          </span>
          {unreadCount > 0 && (
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              {t("Mark all as read")}
            </button>
          )}
        </div>

        <div className="notification-filters">
          <div className="filter-group">
            <label>{t("Filter by type")}:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t("All Types")}</option>
              <option value="academic">{t("Academic")}</option>
              <option value="behavior">{t("Behavior")}</option>
              <option value="attendance">{t("Attendance")}</option>
              <option value="event">{t("Events")}</option>
              <option value="payment">{t("Payments")}</option>
              <option value="general">{t("General")}</option>
            </select>
          </div>

          <div className="filter-checkbox">
            <label>
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
              />
              {t("Show unread only")}
            </label>
          </div>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <h3>{t("No Notifications")}</h3>
          <p>
            {showUnreadOnly
              ? t("No unread notifications")
              : t("You're all caught up!")}
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${
                !notification.read ? "unread" : ""
              }`}
              onClick={() => handleNotificationAction(notification)}
            >
              <div className="notification-header">
                <div className="notification-icon">
                  {getNotificationIcon(
                    notification.type,
                    notification.priority
                  )}
                </div>
                <div className="notification-meta">
                  <h3 className="notification-title">{notification.title}</h3>
                  <div className="notification-tags">
                    <span
                      className="priority-tag"
                      style={{
                        backgroundColor: getPriorityColor(
                          notification.priority
                        ),
                      }}
                    >
                      {t(notification.priority)} {t("priority")}
                    </span>
                    <span className="type-tag">{t(notification.type)}</span>
                    {notification.studentName && (
                      <span className="student-tag">
                        {notification.studentName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="notification-time">
                  {notification.createdAt.toLocaleDateString()}
                  {!notification.read && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              </div>

              <div className="notification-body">
                <p className="notification-message">{notification.message}</p>

                {notification.actionRequired && (
                  <div className="notification-actions">
                    <button
                      className="action-btn primary"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent notification card click
                        handleNotificationAction(notification);
                      }}
                    >
                      {t("Take Action")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="notification-settings">
        <h3>{t("Notification Preferences")}</h3>
        <div className="preference-grid">
          <label className="preference-item">
            <input type="checkbox" defaultChecked />
            <span>{t("Email notifications")}</span>
          </label>
          <label className="preference-item">
            <input type="checkbox" defaultChecked />
            <span>{t("SMS notifications for urgent items")}</span>
          </label>
          <label className="preference-item">
            <input type="checkbox" defaultChecked />
            <span>{t("Academic progress updates")}</span>
          </label>
          <label className="preference-item">
            <input type="checkbox" defaultChecked />
            <span>{t("School event reminders")}</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default GuardianNotifications;
