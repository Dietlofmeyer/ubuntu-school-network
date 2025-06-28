import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { Activity, ActivitySession } from "../../types/activities";
import { ParticipationStatus } from "../../types/activities";
import "./ActivitySessions.css";

interface ActivitySessionsProps {
  onBack?: () => void;
}

const ActivitySessions: React.FC<ActivitySessionsProps> = ({ onBack }) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const [sessions, setSessions] = useState<
    (ActivitySession & { activity: Activity })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "today">(
    "upcoming"
  );

  useEffect(() => {
    fetchSessions();
  }, [user, profile]);

  const fetchSessions = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);

      // First, get all activities the student is approved for
      const participationsQuery = query(
        collection(db, "activityParticipations"),
        where("studentId", "==", user.uid),
        where("status", "==", ParticipationStatus.APPROVED)
      );

      const participationsSnapshot = await getDocs(participationsQuery);
      const activityIds = participationsSnapshot.docs.map(
        (doc) => doc.data().activityId
      );

      if (activityIds.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Get all activities
      const activitiesQuery = query(collection(db, "activities"));
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const activities = activitiesSnapshot.docs.reduce((acc, doc) => {
        const activity = { id: doc.id, ...doc.data() } as Activity;
        if (activityIds.includes(activity.id)) {
          acc[activity.id] = activity;
        }
        return acc;
      }, {} as Record<string, Activity>);

      // Get all sessions for these activities
      const sessionsQuery = query(
        collection(db, "activitySessions"),
        orderBy("date", "asc")
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsList = sessionsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as ActivitySession))
        .filter((session) => activityIds.includes(session.activityId))
        .map((session) => ({
          ...session,
          activity: activities[session.activityId],
        }));

      setSessions(sessionsList);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionDate = (date: Timestamp | string): Date => {
    if (typeof date === "string") {
      return new Date(date);
    }
    return date.toDate();
  };

  const getFilteredSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return sessions.filter((session) => {
      const sessionDate = getSessionDate(session.date);

      switch (filter) {
        case "today":
          return sessionDate >= today && sessionDate < tomorrow;
        case "upcoming":
          return sessionDate >= now;
        case "all":
        default:
          return true;
      }
    });
  };

  const formatDate = (date: Timestamp | string) => {
    return getSessionDate(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Timestamp | string) => {
    return getSessionDate(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isSessionToday = (date: Timestamp | string) => {
    const today = new Date();
    const sessionDate = getSessionDate(date);
    return today.toDateString() === sessionDate.toDateString();
  };

  const isSessionUpcoming = (date: Timestamp | string) => {
    const now = new Date();
    const sessionDate = getSessionDate(date);
    return sessionDate > now;
  };

  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const filteredSessions = getFilteredSessions();

  if (loading) {
    return (
      <div className="activity-sessions">
        <div className="sessions-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p>{t("loading")}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-sessions">
      <div className="sessions-header">
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            ← {t("back")}
          </button>
        )}
        <div className="header-content">
          <h2>{t("activities.sessions.title")}</h2>
          <p>{t("activities.sessions.subtitle")}</p>
        </div>
      </div>

      <div className="sessions-filters">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === "today" ? "active" : ""}`}
            onClick={() => setFilter("today")}
          >
            {t("activities.sessions.today")}
          </button>
          <button
            className={`filter-tab ${filter === "upcoming" ? "active" : ""}`}
            onClick={() => setFilter("upcoming")}
          >
            {t("activities.sessions.upcoming")}
          </button>
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            {t("activities.sessions.all")}
          </button>
        </div>
      </div>

      <div className="sessions-content">
        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>{t("activities.sessions.noSessions")}</h3>
            <p>{t("activities.sessions.noSessionsDesc")}</p>
          </div>
        ) : (
          <div className="sessions-list">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`session-card ${
                  isSessionToday(session.date) ? "today" : ""
                } ${!isSessionUpcoming(session.date) ? "past" : ""}`}
              >
                <div className="session-header">
                  <div className="session-activity">
                    <h4>{session.activity.title}</h4>
                    <span className="activity-category">
                      {t(`activities.categories.${session.activity.category}`)}
                    </span>
                  </div>
                  <div className="session-status">
                    {isSessionToday(session.date) && (
                      <span className="status-badge today">
                        {t("activities.sessions.today")}
                      </span>
                    )}
                    {!isSessionUpcoming(session.date) && (
                      <span className="status-badge past">
                        {t("activities.sessions.past")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="session-details">
                  <div className="session-info">
                    <div className="info-item">
                      <span className="info-label">
                        {t("activities.sessions.sessionTitle")}:
                      </span>
                      <span className="info-value">{session.title}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">
                        {t("activities.sessionDate")}:
                      </span>
                      <span className="info-value">
                        {formatDate(session.date)}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">
                        {t("activities.sessionTime")}:
                      </span>
                      <span className="info-value">
                        {formatTime(session.date)}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">
                        {t("activities.duration")}:
                      </span>
                      <span className="info-value">
                        {calculateDuration(session.startTime, session.endTime)}{" "}
                        {t("activities.minutes")}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">
                        {t("activities.location")}:
                      </span>
                      <span className="info-value">
                        {session.location || session.activity.location}
                      </span>
                    </div>
                  </div>

                  {session.description && (
                    <div className="session-description">
                      <h5>{t("activities.description")}:</h5>
                      <p>{session.description}</p>
                    </div>
                  )}

                  {session.materials && session.materials.length > 0 && (
                    <div className="session-materials">
                      <h5>{t("activities.materials")}:</h5>
                      <ul>
                        {session.materials.map((material, index) => (
                          <li key={index}>{material}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitySessions;
