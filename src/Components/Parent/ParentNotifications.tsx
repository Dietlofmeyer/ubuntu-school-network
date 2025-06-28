import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";

type Notification = {
  id: string;
  title: string;
  message?: string;
  date: string;
  read?: boolean;
  acknowledged?: boolean;
  type?: string;
  translationKey?: string;
  translationVars?: Record<string, any>;
};

function ParentNotifications() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [ackLoading, setAckLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      setLoading(true);
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setNotifications(userSnap.data().notifications || []);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    };
    fetchNotifications();
  }, [user]);

  const handleAcknowledge = async (notifId: string) => {
    if (!user) return;
    setAckLoading(notifId);
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const notifs: Notification[] = userSnap.data().notifications || [];
    const updatedNotifs = notifs.map((n) =>
      n.id === notifId ? { ...n, acknowledged: true } : n
    );
    // Add to acknowledgedNotifications array (if not already present)
    const acknowledgedNotifications: string[] =
      userSnap.data().acknowledgedNotifications || [];
    if (!acknowledgedNotifications.includes(notifId)) {
      await updateDoc(userRef, {
        notifications: updatedNotifs,
        acknowledgedNotifications: arrayUnion(notifId),
      });
    } else {
      await updateDoc(userRef, { notifications: updatedNotifs });
    }
    setNotifications(updatedNotifs);
    setAckLoading(null);
  };

  const handleDelete = async (notifId: string) => {
    if (!user) return;
    setDeleteLoading(notifId);
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const notifs: Notification[] = userSnap.data().notifications || [];
    const updatedNotifs = notifs.filter((n) => n.id !== notifId);
    await updateDoc(userRef, { notifications: updatedNotifs });
    setNotifications(updatedNotifs);
    setDeleteLoading(null);
  };

  // Helper to get localized message
  const getNotificationMessage = (n: Notification) => {
    if (n.translationKey && n.translationVars) {
      const msg = t(n.translationKey, n.translationVars);
      return typeof msg === "string" ? msg : "";
    }
    // fallback for legacy notifications
    return n.message || "";
  };

  return (
    <div className="parentdash-notifications">
      <h3 style={{ marginTop: 0 }}>{t("notifications")}</h3>
      {loading ? (
        <div style={{ color: "var(--color-muted, #b0b8c1)" }}>
          {t("loading")}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ color: "var(--color-muted, #b0b8c1)" }}>
          {t("no_notifications")}
        </div>
      ) : (
        <ul style={{ paddingLeft: 0, listStyle: "none" }}>
          {notifications
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .map((n) => (
              <li
                key={n.id}
                style={{
                  background: n.acknowledged
                    ? "var(--color-bg-card, #232946)"
                    : "var(--color-accent-bg, #314b7d)",
                  color: "var(--color-text, #eaf1fb)",
                  borderRadius: 8,
                  marginBottom: 10,
                  padding: "0.7rem 1rem",
                  boxShadow:
                    "0 2px 8px var(--color-shadow-card, rgba(80,131,175,0.05))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {n.title ? t(n.title) : ""}
                  </div>
                  <div style={{ fontSize: "0.98rem", margin: "4px 0" }}>
                    {getNotificationMessage(n)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.92rem",
                      color: "var(--color-muted, #b0b8c1)",
                    }}
                  >
                    {new Date(n.date).toLocaleString()}
                  </div>
                  {!n.acknowledged && (
                    <button
                      style={{
                        marginTop: 8,
                        background: "var(--color-primary, #7bb0ff)",
                        color: "var(--color-btn-text, #232946)",
                        border: "none",
                        borderRadius: 6,
                        padding: "0.3rem 1.1rem",
                        fontWeight: 600,
                        fontSize: "1rem",
                        cursor: "pointer",
                      }}
                      onClick={() => handleAcknowledge(n.id)}
                      disabled={ackLoading === n.id}
                    >
                      {ackLoading === n.id
                        ? t("acknowledging")
                        : t("acknowledge")}
                    </button>
                  )}
                  {n.acknowledged && (
                    <span
                      style={{
                        marginLeft: 12,
                        color: "var(--color-primary, #7bb0ff)",
                        fontWeight: 600,
                        fontSize: "1rem",
                      }}
                    >
                      {t("acknowledged")}
                    </span>
                  )}
                </div>
                {n.acknowledged && (
                  <button
                    title={t("delete_notification")}
                    onClick={() => handleDelete(n.id)}
                    disabled={deleteLoading === n.id}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-danger, #e57373)",
                      cursor: "pointer",
                      fontSize: "1.5rem",
                      marginLeft: 8,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {deleteLoading === n.id ? (
                      <span style={{ fontSize: "1rem" }}>{t("deleting")}</span>
                    ) : (
                      <span role="img" aria-label={t("delete_notification")}>
                        🗑️
                      </span>
                    )}
                  </button>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export default ParentNotifications;
