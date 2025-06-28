import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { Activity, ActivityAnnouncement } from "../../types/activities";
import "./ActivityAnnouncements.css";

interface ActivityAnnouncementsProps {
  activityId: string;
  isTeacherView: boolean;
}

const ActivityAnnouncements: React.FC<ActivityAnnouncementsProps> = ({
  activityId,
  isTeacherView,
}) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const [announcements, setAnnouncements] = useState<ActivityAnnouncement[]>(
    []
  );
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "reminder" | "change" | "cancellation",
    urgent: false,
  });

  useEffect(() => {
    fetchActivity();
    fetchAnnouncements();
  }, [activityId]);

  const fetchActivity = async () => {
    try {
      const activityDoc = await getDocs(
        query(collection(db, "activities"), where("id", "==", activityId))
      );

      if (!activityDoc.empty) {
        const activityData = activityDoc.docs[0].data() as Activity;
        setActivity(activityData);
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const announcementsRef = collection(db, "activityAnnouncements");
      const q = query(
        announcementsRef,
        where("activityId", "==", activityId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const announcementsData: ActivityAnnouncement[] = [];

      snapshot.forEach((doc) => {
        announcementsData.push({
          id: doc.id,
          ...doc.data(),
        } as ActivityAnnouncement);
      });

      setAnnouncements(announcementsData);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (
      !user ||
      !profile ||
      !newAnnouncement.title.trim() ||
      !newAnnouncement.message.trim()
    ) {
      return;
    }

    try {
      const announcementData: Omit<ActivityAnnouncement, "id"> = {
        activityId,
        title: newAnnouncement.title.trim(),
        message: newAnnouncement.message.trim(),
        type: newAnnouncement.type,
        urgent: newAnnouncement.urgent,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "activityAnnouncements"), announcementData);

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "activity_announcement_created",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle: activity?.title || "",
          announcementTitle: newAnnouncement.title,
          announcementType: newAnnouncement.type,
          urgent: newAnnouncement.urgent,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      // Reset form
      setNewAnnouncement({
        title: "",
        message: "",
        type: "info",
        urgent: false,
      });
      setShowCreateForm(false);

      // Refresh announcements
      await fetchAnnouncements();
    } catch (error) {
      console.error("Error creating announcement:", error);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!user || !profile) return;

    try {
      await deleteDoc(doc(db, "activityAnnouncements", announcementId));

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "activity_announcement_deleted",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle: activity?.title || "",
          announcementId,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      await fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  const getAnnouncementIcon = (type: string) => {
    const icons = {
      info: "ℹ️",
      reminder: "⏰",
      change: "📝",
      cancellation: "❌",
    };
    return icons[type as keyof typeof icons] || "ℹ️";
  };

  const getAnnouncementColor = (type: string) => {
    const colors = {
      info: "var(--info-color)",
      reminder: "var(--warning-color)",
      change: "var(--primary-color)",
      cancellation: "var(--error-color)",
    };
    return colors[type as keyof typeof colors] || "var(--info-color)";
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="activity-announcements">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-announcements">
      <div className="announcements-header">
        <h3>{t("activities.announcements.title")}</h3>
        {isTeacherView && (
          <button
            className="btn-create-announcement"
            onClick={() => setShowCreateForm(true)}
          >
            {t("activities.announcements.create")}
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="create-announcement-form">
          <h4>{t("activities.announcements.createNew")}</h4>

          <div className="form-group">
            <label>{t("activities.announcements.title")}</label>
            <input
              type="text"
              value={newAnnouncement.title}
              onChange={(e) =>
                setNewAnnouncement({
                  ...newAnnouncement,
                  title: e.target.value,
                })
              }
              placeholder={t("activities.announcements.titlePlaceholder")}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>{t("activities.announcements.message")}</label>
            <textarea
              value={newAnnouncement.message}
              onChange={(e) =>
                setNewAnnouncement({
                  ...newAnnouncement,
                  message: e.target.value,
                })
              }
              placeholder={t("activities.announcements.messagePlaceholder")}
              rows={4}
              className="form-textarea"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t("activities.announcements.type")}</label>
              <select
                value={newAnnouncement.type}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    type: e.target.value as any,
                  })
                }
                className="form-select"
              >
                <option value="info">
                  {t("activities.announcements.types.info")}
                </option>
                <option value="reminder">
                  {t("activities.announcements.types.reminder")}
                </option>
                <option value="change">
                  {t("activities.announcements.types.change")}
                </option>
                <option value="cancellation">
                  {t("activities.announcements.types.cancellation")}
                </option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newAnnouncement.urgent}
                  onChange={(e) =>
                    setNewAnnouncement({
                      ...newAnnouncement,
                      urgent: e.target.checked,
                    })
                  }
                />
                {t("activities.announcements.urgent")}
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-cancel"
              onClick={() => {
                setShowCreateForm(false);
                setNewAnnouncement({
                  title: "",
                  message: "",
                  type: "info",
                  urgent: false,
                });
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              className="btn-create"
              onClick={handleCreateAnnouncement}
              disabled={
                !newAnnouncement.title.trim() || !newAnnouncement.message.trim()
              }
            >
              {t("activities.announcements.create")}
            </button>
          </div>
        </div>
      )}

      <div className="announcements-list">
        {announcements.length === 0 ? (
          <div className="no-announcements">
            <p>{t("activities.announcements.noAnnouncements")}</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`announcement-card ${
                announcement.urgent ? "urgent" : ""
              }`}
            >
              <div className="announcement-header">
                <div className="announcement-type">
                  <span
                    className="type-icon"
                    style={{ color: getAnnouncementColor(announcement.type) }}
                  >
                    {getAnnouncementIcon(announcement.type)}
                  </span>
                  <span className="type-text">
                    {t(`activities.announcements.types.${announcement.type}`)}
                  </span>
                  {announcement.urgent && (
                    <span className="urgent-badge">
                      {t("activities.announcements.urgent")}
                    </span>
                  )}
                </div>

                {isTeacherView && (
                  <button
                    className="btn-delete-announcement"
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                    title={t("common.delete")}
                  >
                    🗑️
                  </button>
                )}
              </div>

              <h4 className="announcement-title">{announcement.title}</h4>
              <p className="announcement-message">{announcement.message}</p>

              <div className="announcement-footer">
                <span className="announcement-date">
                  {formatDate(announcement.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityAnnouncements;
