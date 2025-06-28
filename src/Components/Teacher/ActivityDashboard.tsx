import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type {
  Activity,
  ActivitySession,
  ActivityParticipation,
  ActivityMetrics,
} from "../../types/activities";
import { ParticipationStatus } from "../../types/activities";
import ActivityAnnouncements from "./ActivityAnnouncements";
import ActivityAttendanceTracking from "./ActivityAttendanceTracking";
import "./ActivityDashboard.css";

interface ActivityDashboardProps {
  activityId: string;
  onClose: () => void;
}

const ActivityDashboard: React.FC<ActivityDashboardProps> = ({
  activityId,
  onClose,
}) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<ActivityParticipation[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "sessions"
    | "participants"
    | "announcements"
    | "attendance"
    | "analytics"
  >("overview");

  // Session creation state
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    topics: [""],
    materials: [""],
    homework: "",
  });

  // Participant feedback state
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    null
  );
  const [participantFeedback, setParticipantFeedback] = useState("");
  const [participantScore, setParticipantScore] = useState(50);

  useEffect(() => {
    if (user && activityId) {
      fetchActivityData();
    }
  }, [user, activityId]);

  const fetchActivityData = async () => {
    try {
      await Promise.all([
        fetchActivity(),
        fetchParticipants(),
        fetchSessions(),
        calculateMetrics(),
      ]);
    } catch (error) {
      console.error("Error fetching activity data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchParticipants = async () => {
    try {
      const participationsRef = collection(db, "activityParticipations");
      const q = query(
        participationsRef,
        where("activityId", "==", activityId),
        orderBy("studentName", "asc")
      );

      const snapshot = await getDocs(q);
      const participantsData: ActivityParticipation[] = [];

      snapshot.forEach((doc) => {
        participantsData.push({
          id: doc.id,
          ...doc.data(),
        } as ActivityParticipation);
      });

      setParticipants(participantsData);
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  const fetchSessions = async () => {
    try {
      const sessionsRef = collection(db, "activitySessions");
      const q = query(
        sessionsRef,
        where("activityId", "==", activityId),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(q);
      const sessionsData: ActivitySession[] = [];

      snapshot.forEach((doc) => {
        sessionsData.push({
          id: doc.id,
          ...doc.data(),
        } as ActivitySession);
      });

      setSessions(sessionsData);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  const calculateMetrics = async () => {
    try {
      // Calculate basic metrics
      const approvedParticipants = participants.filter(
        (p) => p.status === ParticipationStatus.APPROVED
      );
      const totalSessions = sessions.length;

      // Calculate average attendance from attendance records
      let totalAttendanceRecords = 0;
      let totalPresentRecords = 0;

      approvedParticipants.forEach((participant) => {
        if (participant.attendanceRecord) {
          totalAttendanceRecords += participant.attendanceRecord.length;
          totalPresentRecords += participant.attendanceRecord.filter(
            (record) => record.present
          ).length;
        }
      });

      const averageAttendance =
        totalAttendanceRecords > 0
          ? (totalPresentRecords / totalAttendanceRecords) * 100
          : 0;
      const completionRate =
        approvedParticipants.length > 0
          ? (approvedParticipants.filter(
              (p) => p.status === ParticipationStatus.APPROVED
            ).length /
              approvedParticipants.length) *
            100
          : 0;

      const metricsData: ActivityMetrics = {
        activityId,
        totalSessions,
        averageAttendance,
        completionRate,
        satisfactionScore: 85, // This would be calculated from feedback
        participantFeedback: {
          positive: 12,
          neutral: 3,
          negative: 1,
        },
      };

      setMetrics(metricsData);
    } catch (error) {
      console.error("Error calculating metrics:", error);
    }
  };

  const handleCreateSession = async () => {
    if (!user || !profile || !newSession.title.trim()) return;

    try {
      const sessionData: Omit<ActivitySession, "id"> = {
        activityId,
        title: newSession.title.trim(),
        description: newSession.description.trim(),
        date: Timestamp.fromDate(new Date(newSession.date)),
        startTime: newSession.startTime,
        endTime: newSession.endTime,
        location: newSession.location.trim(),
        topics: newSession.topics.filter((topic) => topic.trim()),
        materials: newSession.materials.filter((material) => material.trim()),
        homework: newSession.homework.trim(),
      };

      await addDoc(collection(db, "activitySessions"), sessionData);

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "activity_session_created",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle: activity?.title || "",
          sessionTitle: newSession.title,
          sessionDate: newSession.date,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      // Reset form and refresh data
      setNewSession({
        title: "",
        description: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        topics: [""],
        materials: [""],
        homework: "",
      });
      setShowCreateSession(false);
      await fetchSessions();
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user || !profile) return;

    if (!confirm(t("activities.sessions.confirmDelete"))) return;

    try {
      await deleteDoc(doc(db, "activitySessions", sessionId));

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "activity_session_deleted",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle: activity?.title || "",
          sessionId,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      await fetchSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleUpdateParticipantFeedback = async () => {
    if (!user || !profile || !selectedParticipant) return;

    try {
      const participantRef = doc(
        db,
        "activityParticipations",
        selectedParticipant
      );
      await updateDoc(participantRef, {
        feedback: participantFeedback,
        participationScore: participantScore,
      });

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "participant_feedback_updated",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle: activity?.title || "",
          participantId: selectedParticipant,
          score: participantScore,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      setSelectedParticipant(null);
      setParticipantFeedback("");
      setParticipantScore(50);
      await fetchParticipants();
    } catch (error) {
      console.error("Error updating participant feedback:", error);
    }
  };

  const addTopicField = () => {
    setNewSession((prev) => ({
      ...prev,
      topics: [...prev.topics, ""],
    }));
  };

  const addMaterialField = () => {
    setNewSession((prev) => ({
      ...prev,
      materials: [...prev.materials, ""],
    }));
  };

  const updateTopicField = (index: number, value: string) => {
    setNewSession((prev) => ({
      ...prev,
      topics: prev.topics.map((topic, i) => (i === index ? value : topic)),
    }));
  };

  const updateMaterialField = (index: number, value: string) => {
    setNewSession((prev) => ({
      ...prev,
      materials: prev.materials.map((material, i) =>
        i === index ? value : material
      ),
    }));
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getParticipantStatusCounts = () => {
    const counts = {
      approved: 0,
      pending: 0,
      rejected: 0,
      withdrawn: 0,
    };

    participants.forEach((participant) => {
      if (participant.status === ParticipationStatus.APPROVED)
        counts.approved++;
      else if (participant.status === ParticipationStatus.PENDING)
        counts.pending++;
      else if (participant.status === ParticipationStatus.REJECTED)
        counts.rejected++;
      else if (participant.status === ParticipationStatus.WITHDRAWN)
        counts.withdrawn++;
    });

    return counts;
  };

  if (loading) {
    return (
      <div className="activity-dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="activity-dashboard">
        <div className="error-message">
          <p>{t("activities.dashboard.activityNotFound")}</p>
          <button onClick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    );
  }

  const statusCounts = getParticipantStatusCounts();

  return (
    <div className="activity-dashboard">
      <div className="dashboard-header">
        <div className="header-info">
          <h2>{activity.title}</h2>
          <p className="activity-description">{activity.description}</p>
          <div className="activity-meta">
            <span className="teacher-info">
              {t("activities.teacher")}: {activity.teacherName}
            </span>
            <span className="location-info">
              {t("activities.location")}: {activity.location}
            </span>
            <span className="participants-info">
              {t("activities.participants")}: {statusCounts.approved}/
              {activity.maxParticipants}
            </span>
          </div>
        </div>
        <button className="btn-close-dashboard" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="dashboard-tabs">
        {[
          "overview",
          "sessions",
          "participants",
          "announcements",
          "attendance",
          "analytics",
        ].map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab as any)}
          >
            {t(`activities.dashboard.${tab}`)}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {activeTab === "overview" && (
          <div className="overview-section">
            <div className="overview-stats">
              <div className="stat-card">
                <div className="stat-value">{statusCounts.approved}</div>
                <div className="stat-label">
                  {t("activities.dashboard.activeParticipants")}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{sessions.length}</div>
                <div className="stat-label">
                  {t("activities.dashboard.totalSessions")}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {metrics?.averageAttendance.toFixed(1)}%
                </div>
                <div className="stat-label">
                  {t("activities.dashboard.avgAttendance")}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{statusCounts.pending}</div>
                <div className="stat-label">
                  {t("activities.dashboard.pendingApplications")}
                </div>
              </div>
            </div>

            <div className="recent-activity">
              <h3>{t("activities.dashboard.recentSessions")}</h3>
              {sessions.slice(0, 3).map((session) => (
                <div key={session.id} className="recent-session">
                  <div className="session-info">
                    <h4>{session.title}</h4>
                    <p>{session.description}</p>
                    <span className="session-date">
                      {formatDate(session.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="sessions-section">
            <div className="sessions-header">
              <h3>{t("activities.dashboard.sessions")}</h3>
              <button
                className="btn-create-session"
                onClick={() => setShowCreateSession(true)}
              >
                {t("activities.sessions.create")}
              </button>
            </div>

            {showCreateSession && (
              <div className="create-session-form">
                <h4>{t("activities.sessions.createNew")}</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("activities.sessions.title")}</label>
                    <input
                      type="text"
                      value={newSession.title}
                      onChange={(e) =>
                        setNewSession({ ...newSession, title: e.target.value })
                      }
                      placeholder={t("activities.sessions.titlePlaceholder")}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("activities.sessions.date")}</label>
                    <input
                      type="date"
                      value={newSession.date}
                      onChange={(e) =>
                        setNewSession({ ...newSession, date: e.target.value })
                      }
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("activities.sessions.startTime")}</label>
                    <input
                      type="time"
                      value={newSession.startTime}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          startTime: e.target.value,
                        })
                      }
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("activities.sessions.endTime")}</label>
                    <input
                      type="time"
                      value={newSession.endTime}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          endTime: e.target.value,
                        })
                      }
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t("activities.sessions.location")}</label>
                    <input
                      type="text"
                      value={newSession.location}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          location: e.target.value,
                        })
                      }
                      placeholder={t("activities.sessions.locationPlaceholder")}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t("activities.sessions.description")}</label>
                  <textarea
                    value={newSession.description}
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        description: e.target.value,
                      })
                    }
                    placeholder={t(
                      "activities.sessions.descriptionPlaceholder"
                    )}
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label>{t("activities.sessions.topics")}</label>
                  {newSession.topics.map((topic, index) => (
                    <div key={index} className="dynamic-field">
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) =>
                          updateTopicField(index, e.target.value)
                        }
                        placeholder={t("activities.sessions.topicPlaceholder")}
                        className="form-input"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTopicField}
                    className="btn-add-field"
                  >
                    {t("activities.sessions.addTopic")}
                  </button>
                </div>

                <div className="form-group">
                  <label>{t("activities.sessions.materials")}</label>
                  {newSession.materials.map((material, index) => (
                    <div key={index} className="dynamic-field">
                      <input
                        type="text"
                        value={material}
                        onChange={(e) =>
                          updateMaterialField(index, e.target.value)
                        }
                        placeholder={t(
                          "activities.sessions.materialPlaceholder"
                        )}
                        className="form-input"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMaterialField}
                    className="btn-add-field"
                  >
                    {t("activities.sessions.addMaterial")}
                  </button>
                </div>

                <div className="form-group">
                  <label>{t("activities.sessions.homework")}</label>
                  <textarea
                    value={newSession.homework}
                    onChange={(e) =>
                      setNewSession({ ...newSession, homework: e.target.value })
                    }
                    placeholder={t("activities.sessions.homeworkPlaceholder")}
                    rows={2}
                    className="form-textarea"
                  />
                </div>

                <div className="form-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setShowCreateSession(false)}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn-create"
                    onClick={handleCreateSession}
                    disabled={!newSession.title.trim() || !newSession.date}
                  >
                    {t("activities.sessions.create")}
                  </button>
                </div>
              </div>
            )}

            <div className="sessions-list">
              {sessions.length === 0 ? (
                <div className="no-sessions">
                  <p>{t("activities.sessions.noSessions")}</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="session-card">
                    <div className="session-header">
                      <h4>{session.title}</h4>
                      <button
                        className="btn-delete-session"
                        onClick={() => handleDeleteSession(session.id)}
                        title={t("common.delete")}
                      >
                        🗑️
                      </button>
                    </div>

                    <p className="session-description">{session.description}</p>

                    <div className="session-details">
                      <div className="session-time">
                        📅 {formatDate(session.date)} • ⏰ {session.startTime} -{" "}
                        {session.endTime}
                      </div>
                      <div className="session-location">
                        📍 {session.location}
                      </div>
                    </div>

                    {session.topics && session.topics.length > 0 && (
                      <div className="session-topics">
                        <strong>{t("activities.sessions.topics")}:</strong>
                        <ul>
                          {session.topics.map((topic, index) => (
                            <li key={index}>{topic}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {session.materials && session.materials.length > 0 && (
                      <div className="session-materials">
                        <strong>{t("activities.sessions.materials")}:</strong>
                        <ul>
                          {session.materials.map((material, index) => (
                            <li key={index}>{material}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {session.homework && (
                      <div className="session-homework">
                        <strong>{t("activities.sessions.homework")}:</strong>
                        <p>{session.homework}</p>
                      </div>
                    )}

                    {session.cancelled && (
                      <div className="session-cancelled">
                        <strong>{t("activities.sessions.cancelled")}:</strong>{" "}
                        {session.cancellationReason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "participants" && (
          <div className="participants-section">
            <div className="participants-summary">
              <div className="summary-card approved">
                <div className="count">{statusCounts.approved}</div>
                <div className="label">{t("activities.status.approved")}</div>
              </div>
              <div className="summary-card pending">
                <div className="count">{statusCounts.pending}</div>
                <div className="label">{t("activities.status.pending")}</div>
              </div>
              <div className="summary-card rejected">
                <div className="count">{statusCounts.rejected}</div>
                <div className="label">{t("activities.status.rejected")}</div>
              </div>
              <div className="summary-card withdrawn">
                <div className="count">{statusCounts.withdrawn}</div>
                <div className="label">{t("activities.status.withdrawn")}</div>
              </div>
            </div>

            <div className="participants-list">
              {participants.map((participant) => (
                <div key={participant.id} className="participant-card">
                  <div className="participant-info">
                    <h4>{participant.studentName}</h4>
                    <span className="grade-badge">
                      {participant.studentGrade}
                    </span>
                    <span
                      className={`status-badge status-${participant.status}`}
                    >
                      {t(`activities.status.${participant.status}`)}
                    </span>
                  </div>

                  {participant.applicationMessage && (
                    <div className="application-message">
                      <strong>{t("activities.applicationMessage")}:</strong>
                      <p>{participant.applicationMessage}</p>
                    </div>
                  )}

                  {participant.participationScore !== undefined && (
                    <div className="participation-score">
                      <strong>
                        {t("activities.dashboard.participationScore")}:
                      </strong>{" "}
                      {participant.participationScore}/100
                    </div>
                  )}

                  {participant.feedback && (
                    <div className="teacher-feedback">
                      <strong>
                        {t("activities.dashboard.teacherFeedback")}:
                      </strong>
                      <p>{participant.feedback}</p>
                    </div>
                  )}

                  <div className="participant-actions">
                    <button
                      className="btn-feedback"
                      onClick={() => {
                        setSelectedParticipant(participant.id);
                        setParticipantFeedback(participant.feedback || "");
                        setParticipantScore(
                          participant.participationScore || 50
                        );
                      }}
                    >
                      {t("activities.dashboard.giveFeedback")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedParticipant && (
              <div className="feedback-modal">
                <div className="modal-content">
                  <h4>{t("activities.dashboard.participantFeedback")}</h4>

                  <div className="form-group">
                    <label>
                      {t("activities.dashboard.participationScore")} (0-100)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={participantScore}
                      onChange={(e) =>
                        setParticipantScore(Number(e.target.value))
                      }
                      className="score-slider"
                    />
                    <span className="score-display">
                      {participantScore}/100
                    </span>
                  </div>

                  <div className="form-group">
                    <label>{t("activities.dashboard.feedbackNotes")}</label>
                    <textarea
                      value={participantFeedback}
                      onChange={(e) => setParticipantFeedback(e.target.value)}
                      placeholder={t(
                        "activities.dashboard.feedbackPlaceholder"
                      )}
                      rows={4}
                      className="form-textarea"
                    />
                  </div>

                  <div className="modal-actions">
                    <button
                      className="btn-cancel"
                      onClick={() => setSelectedParticipant(null)}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      className="btn-save"
                      onClick={handleUpdateParticipantFeedback}
                    >
                      {t("common.save")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "announcements" && (
          <ActivityAnnouncements activityId={activityId} isTeacherView={true} />
        )}

        {activeTab === "attendance" && (
          <ActivityAttendanceTracking
            activityId={activityId}
            onBack={() => setActiveTab("overview")}
          />
        )}

        {activeTab === "analytics" && metrics && (
          <div className="analytics-section">
            <div className="analytics-grid">
              <div className="metric-card">
                <h4>{t("activities.dashboard.averageAttendance")}</h4>
                <div className="metric-value">
                  {metrics.averageAttendance.toFixed(1)}%
                </div>
                <div className="metric-chart">
                  <div
                    className="chart-bar"
                    style={{ width: `${metrics.averageAttendance}%` }}
                  />
                </div>
              </div>

              <div className="metric-card">
                <h4>{t("activities.dashboard.completionRate")}</h4>
                <div className="metric-value">
                  {metrics.completionRate.toFixed(1)}%
                </div>
                <div className="metric-chart">
                  <div
                    className="chart-bar"
                    style={{ width: `${metrics.completionRate}%` }}
                  />
                </div>
              </div>

              <div className="metric-card">
                <h4>{t("activities.dashboard.satisfactionScore")}</h4>
                <div className="metric-value">
                  {metrics.satisfactionScore}/100
                </div>
                <div className="metric-chart">
                  <div
                    className="chart-bar"
                    style={{ width: `${metrics.satisfactionScore}%` }}
                  />
                </div>
              </div>

              <div className="metric-card">
                <h4>{t("activities.dashboard.participantFeedback")}</h4>
                <div className="feedback-breakdown">
                  <div className="feedback-item positive">
                    👍 {metrics.participantFeedback.positive}{" "}
                    {t("activities.dashboard.positive")}
                  </div>
                  <div className="feedback-item neutral">
                    😐 {metrics.participantFeedback.neutral}{" "}
                    {t("activities.dashboard.neutral")}
                  </div>
                  <div className="feedback-item negative">
                    👎 {metrics.participantFeedback.negative}{" "}
                    {t("activities.dashboard.negative")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityDashboard;
