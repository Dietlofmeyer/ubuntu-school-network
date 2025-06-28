import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../firebase";
import type { Activity, ActivityParticipation } from "../../types/activities";
import {
  ActivityCategory,
  ActivityStatus,
  ActivityLevel,
  MeetingFrequency,
  ParticipationStatus,
} from "../../types/activities";
import ActivityDashboard from "./ActivityDashboard";
import "./TeacherActivityManagement.css";

interface TeacherActivityManagementProps {
  onBack?: () => void;
}

const TeacherActivityManagement: React.FC<TeacherActivityManagementProps> = ({
  onBack,
}) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  // State management
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participations, setParticipations] = useState<ActivityParticipation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardActivityId, setDashboardActivityId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<
    "activities" | "participants" | "sessions"
  >("activities");

  // Form state for creating/editing activities
  const [formData, setFormData] = useState<Partial<Activity>>({
    title: "",
    description: "",
    category: ActivityCategory.CLUBS,
    level: ActivityLevel.BEGINNER,
    status: ActivityStatus.DRAFT,
    maxParticipants: 20,
    location: "",
    meetingDays: [],
    meetingTime: "",
    duration: 60,
    frequency: MeetingFrequency.WEEKLY,
    requiresApproval: false,
    allowWaitlist: true,
    isPublic: true,
  });

  // Statistics
  const [stats, setStats] = useState({
    totalActivities: 0,
    activeActivities: 0,
    totalParticipants: 0,
    pendingApplications: 0,
  });

  useEffect(() => {
    if (user?.uid) {
      fetchTeacherActivities();
      fetchParticipations();
    }
  }, [user?.uid]);

  const fetchTeacherActivities = async () => {
    try {
      const q = query(
        collection(db, "activities"),
        where("teacherId", "==", user?.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const teacherActivities: Activity[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Activity[];

      setActivities(teacherActivities);
      updateStats(teacherActivities);
    } catch (error) {
      console.error("Error fetching teacher activities:", error);
    }
  };

  const fetchParticipations = async () => {
    try {
      // Get all participations for teacher's activities
      const activityIds = activities.map((a) => a.id);
      if (activityIds.length === 0) return;

      const q = query(
        collection(db, "activityParticipations"),
        where("activityId", "in", activityIds)
      );
      const snapshot = await getDocs(q);
      const allParticipations: ActivityParticipation[] = snapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      ) as ActivityParticipation[];

      setParticipations(allParticipations);
    } catch (error) {
      console.error("Error fetching participations:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (teacherActivities: Activity[]) => {
    const activeActivities = teacherActivities.filter(
      (a) =>
        a.status === ActivityStatus.ACTIVE || a.status === ActivityStatus.FULL
    );

    setStats({
      totalActivities: teacherActivities.length,
      activeActivities: activeActivities.length,
      totalParticipants: teacherActivities.reduce(
        (sum, a) => sum + a.currentParticipants,
        0
      ),
      pendingApplications: participations.filter(
        (p) => p.status === ParticipationStatus.PENDING
      ).length,
    });
  };

  const handleCreateActivity = async () => {
    if (!formData.title || !formData.description || !user || !profile) return;

    try {
      const newActivity: Omit<Activity, "id"> = {
        ...(formData as Activity),
        teacherId: user.uid,
        teacherName: profile.name || user.email || "Unknown Teacher",
        currentParticipants: 0,
        startDate: formData.startDate || Timestamp.now(),
        endDate:
          formData.endDate ||
          Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        schoolId: profile.schoolId || "default",
      };

      await addDoc(collection(db, "activities"), newActivity);

      // Log activity creation for audit
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        await logUserEdit({
          userId: user.uid,
          changes: {
            activity: {
              action: "created",
              title: formData.title,
              category: formData.category,
              maxParticipants: formData.maxParticipants,
            },
          },
          editorId: user.uid,
          reason: `Teacher created activity: ${formData.title}`,
        });
      } catch (logError) {
        console.warn("Failed to log activity creation:", logError);
      }

      await fetchTeacherActivities();
      setShowCreateModal(false);
      resetForm();
      alert(`Activity "${formData.title}" created successfully!`);
    } catch (error) {
      console.error("Error creating activity:", error);
      alert("Failed to create activity. Please try again.");
    }
  };

  const handleUpdateActivityStatus = async (
    activityId: string,
    newStatus: ActivityStatus
  ) => {
    try {
      await updateDoc(doc(db, "activities", activityId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      // Update local state
      setActivities(
        activities.map((a) =>
          a.id === activityId ? { ...a, status: newStatus } : a
        )
      );

      // Log status change
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        await logUserEdit({
          userId: user?.uid,
          changes: {
            activity: {
              action: "status_changed",
              activityId,
              newStatus,
              oldStatus: activities.find((a) => a.id === activityId)?.status,
            },
          },
          editorId: user?.uid,
          reason: `Teacher changed activity status to ${newStatus}`,
        });
      } catch (logError) {
        console.warn("Failed to log status change:", logError);
      }

      alert(`Activity status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating activity status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleParticipationResponse = async (
    participationId: string,
    response: "approve" | "reject",
    note?: string
  ) => {
    try {
      const participation = participations.find(
        (p) => p.id === participationId
      );
      if (!participation) return;

      const newStatus =
        response === "approve"
          ? ParticipationStatus.APPROVED
          : ParticipationStatus.REJECTED;

      await updateDoc(doc(db, "activityParticipations", participationId), {
        status: newStatus,
        reviewedBy: user?.uid,
        reviewedAt: Timestamp.now(),
        reviewNote: note || "",
      });

      // Update participant count if approved
      if (response === "approve") {
        const activity = activities.find(
          (a) => a.id === participation.activityId
        );
        if (activity) {
          await updateDoc(doc(db, "activities", participation.activityId), {
            currentParticipants: activity.currentParticipants + 1,
            updatedAt: Timestamp.now(),
          });
        }
      }

      await fetchParticipations();
      await fetchTeacherActivities();

      alert(`Application ${response}d successfully`);
    } catch (error) {
      console.error(`Error ${response}ing application:`, error);
      alert(`Failed to ${response} application. Please try again.`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: ActivityCategory.CLUBS,
      level: ActivityLevel.BEGINNER,
      status: ActivityStatus.DRAFT,
      maxParticipants: 20,
      location: "",
      meetingDays: [],
      meetingTime: "",
      duration: 60,
      frequency: MeetingFrequency.WEEKLY,
      requiresApproval: false,
      allowWaitlist: true,
      isPublic: true,
    });
  };

  const getCategoryIcon = (category: ActivityCategory) => {
    const icons = {
      [ActivityCategory.SPORTS]: "⚽",
      [ActivityCategory.ACADEMIC]: "📚",
      [ActivityCategory.ARTS]: "🎨",
      [ActivityCategory.MUSIC]: "🎵",
      [ActivityCategory.DRAMA]: "🎭",
      [ActivityCategory.DEBATE]: "💬",
      [ActivityCategory.SCIENCE]: "🔬",
      [ActivityCategory.TECHNOLOGY]: "💻",
      [ActivityCategory.COMMUNITY_SERVICE]: "🤝",
      [ActivityCategory.LEADERSHIP]: "👑",
      [ActivityCategory.CULTURAL]: "🌍",
      [ActivityCategory.CLUBS]: "🏛️",
      [ActivityCategory.OTHER]: "⭐",
    };
    return icons[category] || "📋";
  };

  const getStatusColor = (status: ActivityStatus) => {
    const colors = {
      [ActivityStatus.DRAFT]: "var(--color-text-secondary)",
      [ActivityStatus.ACTIVE]: "var(--color-success)",
      [ActivityStatus.FULL]: "var(--color-warning)",
      [ActivityStatus.CLOSED]: "var(--color-info)",
      [ActivityStatus.COMPLETED]: "var(--color-primary)",
      [ActivityStatus.CANCELLED]: "var(--color-error)",
    };
    return colors[status] || "var(--color-text)";
  };

  if (loading) {
    return (
      <div className="teacher-activity-loading">Loading activities...</div>
    );
  }

  // Show ActivityDashboard if selected
  if (showDashboard && dashboardActivityId) {
    return (
      <ActivityDashboard
        activityId={dashboardActivityId}
        onClose={() => {
          setShowDashboard(false);
          setDashboardActivityId(null);
        }}
      />
    );
  }

  return (
    <div className="teacher-activity-management">
      {/* Header */}
      <div className="activity-header">
        {onBack && (
          <button className="activity-back-btn" onClick={onBack}>
            ← {t("back")}
          </button>
        )}
        <div className="header-content">
          <h2>{t("manage_activities")}</h2>
          <p>{t("create_and_manage_extracurricular_activities")}</p>
        </div>
        <button
          className="create-activity-btn"
          onClick={() => setShowCreateModal(true)}
        >
          + {t("create_activity")}
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="activity-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats.totalActivities}</h3>
            <p>{t("total_activities")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.activeActivities}</h3>
            <p>{t("active_activities")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalParticipants}</h3>
            <p>{t("total_participants")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingApplications}</h3>
            <p>{t("pending_applications")}</p>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="activities-section">
        <h3>{t("your_activities")}</h3>
        {activities.length === 0 ? (
          <div className="no-activities">
            <div className="empty-icon">📋</div>
            <h4>{t("no_activities_yet")}</h4>
            <p>{t("create_your_first_activity")}</p>
            <button
              className="create-first-btn"
              onClick={() => setShowCreateModal(true)}
            >
              {t("create_activity")}
            </button>
          </div>
        ) : (
          <div className="activities-grid">
            {activities.map((activity) => (
              <div key={activity.id} className="activity-card">
                <div className="activity-card-header">
                  <div className="activity-icon">
                    {getCategoryIcon(activity.category)}
                  </div>
                  <div
                    className="activity-status"
                    style={{ color: getStatusColor(activity.status) }}
                  >
                    {activity.status}
                  </div>
                </div>
                <div className="activity-card-content">
                  <h4>{activity.title}</h4>
                  <p className="activity-description">{activity.description}</p>
                  <div className="activity-meta">
                    <span>📅 {activity.frequency}</span>
                    <span>
                      👥 {activity.currentParticipants}/
                      {activity.maxParticipants}
                    </span>
                    <span>📍 {activity.location}</span>
                  </div>
                </div>
                <div className="activity-card-actions">
                  <button
                    className="dashboard-btn"
                    onClick={() => {
                      setDashboardActivityId(activity.id);
                      setShowDashboard(true);
                    }}
                    title={t("activities.dashboard.title")}
                  >
                    📊 {t("activities.dashboard.title")}
                  </button>
                  <button
                    className="manage-btn"
                    onClick={() => {
                      setSelectedActivity(activity);
                      setShowManageModal(true);
                    }}
                  >
                    {t("manage")}
                  </button>
                  <select
                    value={activity.status}
                    onChange={(e) =>
                      handleUpdateActivityStatus(
                        activity.id,
                        e.target.value as ActivityStatus
                      )
                    }
                    className="status-select"
                  >
                    {Object.values(ActivityStatus).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Activity Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content create-activity-modal">
            <div className="modal-header">
              <h3>{t("create_new_activity")}</h3>
              <button
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>{t("activity_title")} *</label>
                  <input
                    type="text"
                    value={formData.title || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder={t("enter_activity_title")}
                  />
                </div>
                <div className="form-group">
                  <label>{t("category")} *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as ActivityCategory,
                      })
                    }
                  >
                    {Object.values(ActivityCategory).map((category) => (
                      <option key={category} value={category}>
                        {getCategoryIcon(category)} {t(category)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>{t("description")} *</label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={t("describe_your_activity")}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>{t("max_participants")}</label>
                  <input
                    type="number"
                    value={formData.maxParticipants || 20}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxParticipants: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={100}
                  />
                </div>
                <div className="form-group">
                  <label>{t("level")}</label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        level: e.target.value as ActivityLevel,
                      })
                    }
                  >
                    {Object.values(ActivityLevel).map((level) => (
                      <option key={level} value={level}>
                        {t(level)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t("location")}</label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder={t("where_will_it_take_place")}
                  />
                </div>
                <div className="form-group">
                  <label>{t("meeting_time")}</label>
                  <input
                    type="time"
                    value={formData.meetingTime || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, meetingTime: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>{t("duration_minutes")}</label>
                  <input
                    type="number"
                    value={formData.duration || 60}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: parseInt(e.target.value),
                      })
                    }
                    min={15}
                    max={480}
                  />
                </div>
                <div className="form-group">
                  <label>{t("frequency")}</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        frequency: e.target.value as MeetingFrequency,
                      })
                    }
                  >
                    {Object.values(MeetingFrequency).map((freq) => (
                      <option key={freq} value={freq}>
                        {t(freq)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.requiresApproval || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresApproval: e.target.checked,
                      })
                    }
                  />
                  {t("requires_approval")}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.allowWaitlist || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowWaitlist: e.target.checked,
                      })
                    }
                  />
                  {t("allow_waitlist")}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isPublic || false}
                    onChange={(e) =>
                      setFormData({ ...formData, isPublic: e.target.checked })
                    }
                  />
                  {t("visible_to_all_students")}
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowCreateModal(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="create-btn"
                onClick={handleCreateActivity}
                disabled={!formData.title || !formData.description}
              >
                {t("create_activity")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Activity Modal */}
      {showManageModal && selectedActivity && (
        <div className="modal-overlay">
          <div className="modal-content manage-activity-modal">
            <div className="modal-header">
              <h3>
                {t("manage_activity")}: {selectedActivity.title}
              </h3>
              <button
                className="close-btn"
                onClick={() => setShowManageModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="manage-tabs">
                <button
                  className={`tab-btn ${
                    activeTab === "activities" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("activities")}
                >
                  {t("activity_details")}
                </button>
                <button
                  className={`tab-btn ${
                    activeTab === "participants" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("participants")}
                >
                  {t("participants")} ({selectedActivity.currentParticipants})
                </button>
                <button
                  className={`tab-btn ${
                    activeTab === "sessions" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("sessions")}
                >
                  {t("sessions")}
                </button>
              </div>

              {activeTab === "participants" && (
                <div className="participants-section">
                  {participations
                    .filter((p) => p.activityId === selectedActivity.id)
                    .map((participation) => (
                      <div key={participation.id} className="participant-card">
                        <div className="participant-info">
                          <h4>{participation.studentName}</h4>
                          <span className="grade">
                            {t("grade")} {participation.studentGrade}
                          </span>
                          <span className={`status ${participation.status}`}>
                            {participation.status}
                          </span>
                        </div>
                        {participation.applicationMessage && (
                          <p className="application-message">
                            "{participation.applicationMessage}"
                          </p>
                        )}
                        {participation.status ===
                          ParticipationStatus.PENDING && (
                          <div className="participant-actions">
                            <button
                              className="approve-btn"
                              onClick={() =>
                                handleParticipationResponse(
                                  participation.id,
                                  "approve"
                                )
                              }
                            >
                              {t("approve")}
                            </button>
                            <button
                              className="reject-btn"
                              onClick={() =>
                                handleParticipationResponse(
                                  participation.id,
                                  "reject"
                                )
                              }
                            >
                              {t("reject")}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherActivityManagement;
