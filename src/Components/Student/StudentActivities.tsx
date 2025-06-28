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
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { Activity, ActivityParticipation } from "../../types/activities";
import {
  ActivityCategory,
  ActivityStatus,
  ActivityLevel,
  ParticipationStatus,
} from "../../types/activities";
import ActivityDetailModal from "./ActivityDetailModal";
import "./StudentActivities.css";

interface StudentActivitiesProps {
  className?: string;
}

const StudentActivities: React.FC<StudentActivitiesProps> = ({ className }) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [myParticipations, setMyParticipations] = useState<
    ActivityParticipation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<"browse" | "my-activities">(
    "browse"
  );
  const [categoryFilter, setCategoryFilter] = useState<
    ActivityCategory | "all"
  >("all");
  const [levelFilter, setLevelFilter] = useState<ActivityLevel | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchMyParticipations();
    }
  }, [user]);

  const fetchActivities = async () => {
    try {
      const activitiesRef = collection(db, "activities");
      const q = query(
        activitiesRef,
        where("schoolId", "==", profile?.schoolId || ""),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const activitiesData: Activity[] = [];

      snapshot.forEach((doc) => {
        activitiesData.push({
          id: doc.id,
          ...doc.data(),
        } as Activity);
      });

      setActivities(activitiesData);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const fetchMyParticipations = async () => {
    try {
      const participationsRef = collection(db, "activityParticipations");
      const q = query(
        participationsRef,
        where("studentId", "==", user?.uid || ""),
        orderBy("applicationDate", "desc")
      );

      const snapshot = await getDocs(q);
      const participationsData: ActivityParticipation[] = [];

      snapshot.forEach((doc) => {
        participationsData.push({
          id: doc.id,
          ...doc.data(),
        } as ActivityParticipation);
      });

      setMyParticipations(participationsData);
    } catch (error) {
      console.error("Error fetching my participations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinActivity = async (activity: Activity, message?: string) => {
    if (!user || !profile) return;

    try {
      const participationData: Omit<ActivityParticipation, "id"> = {
        activityId: activity.id,
        studentId: user.uid,
        studentName: profile.name,
        studentGrade: profile.grade || "",
        applicationDate: Timestamp.now(),
        status: activity.requiresApproval
          ? ParticipationStatus.PENDING
          : ParticipationStatus.APPROVED,
        applicationMessage: message || "",
      };

      await addDoc(collection(db, "activityParticipations"), participationData);

      // Update activity participant count
      const activityRef = doc(db, "activities", activity.id);
      await updateDoc(activityRef, {
        currentParticipants: activity.currentParticipants + 1,
        updatedAt: Timestamp.now(),
      });

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "student_joined_activity",
        performedBy: user.uid,
        targetId: activity.id,
        details: {
          activityTitle: activity.title,
          studentName: profile.name,
          requiresApproval: activity.requiresApproval,
          message: message || "",
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      await fetchActivities();
      await fetchMyParticipations();
      setShowDetailModal(false);
    } catch (error) {
      console.error("Error joining activity:", error);
    }
  };

  const handleWithdrawFromActivity = async (
    participationId: string,
    activityId: string
  ) => {
    if (!user || !profile) return;

    try {
      const participationRef = doc(
        db,
        "activityParticipations",
        participationId
      );
      await updateDoc(participationRef, {
        status: ParticipationStatus.WITHDRAWN,
        reviewedAt: Timestamp.now(),
      });

      // Update activity participant count
      const activity = activities.find((a) => a.id === activityId);
      if (activity) {
        const activityRef = doc(db, "activities", activityId);
        await updateDoc(activityRef, {
          currentParticipants: Math.max(0, activity.currentParticipants - 1),
          updatedAt: Timestamp.now(),
        });
      }

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "student_withdrew_from_activity",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle:
            activities.find((a) => a.id === activityId)?.title || "",
          studentName: profile.name,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      await fetchActivities();
      await fetchMyParticipations();
    } catch (error) {
      console.error("Error withdrawing from activity:", error);
    }
  };

  const getFilteredActivities = () => {
    let filtered = activities;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (activity) => activity.category === categoryFilter
      );
    }

    // Filter by level
    if (levelFilter !== "all") {
      filtered = filtered.filter((activity) => activity.level === levelFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (activity) =>
          activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          activity.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by availability
    if (showAvailableOnly) {
      filtered = filtered.filter(
        (activity) =>
          activity.status === ActivityStatus.ACTIVE &&
          activity.currentParticipants < activity.maxParticipants
      );
    }

    return filtered;
  };

  const getMyActivities = () => {
    return myParticipations
      .map((participation) => {
        const activity = activities.find(
          (a) => a.id === participation.activityId
        );
        return activity ? { ...activity, participation } : null;
      })
      .filter(Boolean) as (Activity & {
      participation: ActivityParticipation;
    })[];
  };

  const isAlreadyParticipating = (activityId: string) => {
    return myParticipations.some(
      (p) =>
        p.activityId === activityId &&
        p.status !== ParticipationStatus.WITHDRAWN &&
        p.status !== ParticipationStatus.REJECTED
    );
  };

  const getParticipationStatus = (activityId: string) => {
    const participation = myParticipations.find(
      (p) => p.activityId === activityId
    );
    return participation?.status;
  };

  const getCategoryIcon = (category: ActivityCategory) => {
    const icons = {
      sports: "⚽",
      academic: "📚",
      arts: "🎨",
      music: "🎵",
      drama: "🎭",
      debate: "🗣️",
      science: "🔬",
      technology: "💻",
      community_service: "🤝",
      leadership: "👑",
      cultural: "🌍",
      clubs: "👥",
      other: "🌟",
    };
    return icons[category] || "🌟";
  };

  const getStatusColor = (status: ActivityStatus) => {
    const colors = {
      active: "var(--success-color)",
      full: "var(--warning-color)",
      closed: "var(--info-color)",
      completed: "var(--secondary-color)",
      cancelled: "var(--error-color)",
      draft: "var(--muted-color)",
    };
    return colors[status] || "var(--muted-color)";
  };

  const getParticipationStatusText = (status: ParticipationStatus) => {
    const statusTexts = {
      pending: t("activities.status.pending"),
      approved: t("activities.status.approved"),
      rejected: t("activities.status.rejected"),
      withdrawn: t("activities.status.withdrawn"),
      completed: t("activities.status.completed"),
    };
    return statusTexts[status] || status;
  };

  if (loading) {
    return (
      <div className={`student-activities ${className || ""}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`student-activities ${className || ""}`}>
      <div className="activities-header">
        <h2>{t("activities.title")}</h2>
        <div className="activities-tabs">
          <button
            className={`tab-button ${activeTab === "browse" ? "active" : ""}`}
            onClick={() => setActiveTab("browse")}
          >
            {t("activities.browse")} ({getFilteredActivities().length})
          </button>
          <button
            className={`tab-button ${
              activeTab === "my-activities" ? "active" : ""
            }`}
            onClick={() => setActiveTab("my-activities")}
          >
            {t("activities.myActivities")} ({getMyActivities().length})
          </button>
        </div>
      </div>

      {activeTab === "browse" && (
        <>
          <div className="activities-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>{t("activities.filters.search")}</label>
                <input
                  type="text"
                  placeholder={t("activities.filters.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label>{t("activities.filters.category")}</label>
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target.value as ActivityCategory | "all"
                    )
                  }
                  className="filter-select"
                >
                  <option value="all">
                    {t("activities.filters.allCategories")}
                  </option>
                  <option value="sports">
                    {t("activities.categories.sports")}
                  </option>
                  <option value="academic">
                    {t("activities.categories.academic")}
                  </option>
                  <option value="arts">
                    {t("activities.categories.arts")}
                  </option>
                  <option value="music">
                    {t("activities.categories.music")}
                  </option>
                  <option value="drama">
                    {t("activities.categories.drama")}
                  </option>
                  <option value="debate">
                    {t("activities.categories.debate")}
                  </option>
                  <option value="science">
                    {t("activities.categories.science")}
                  </option>
                  <option value="technology">
                    {t("activities.categories.technology")}
                  </option>
                  <option value="community_service">
                    {t("activities.categories.communityService")}
                  </option>
                  <option value="leadership">
                    {t("activities.categories.leadership")}
                  </option>
                  <option value="cultural">
                    {t("activities.categories.cultural")}
                  </option>
                  <option value="clubs">
                    {t("activities.categories.clubs")}
                  </option>
                  <option value="other">
                    {t("activities.categories.other")}
                  </option>
                </select>
              </div>

              <div className="filter-group">
                <label>{t("activities.filters.level")}</label>
                <select
                  value={levelFilter}
                  onChange={(e) =>
                    setLevelFilter(e.target.value as ActivityLevel | "all")
                  }
                  className="filter-select"
                >
                  <option value="all">
                    {t("activities.filters.allLevels")}
                  </option>
                  <option value="beginner">
                    {t("activities.levels.beginner")}
                  </option>
                  <option value="intermediate">
                    {t("activities.levels.intermediate")}
                  </option>
                  <option value="advanced">
                    {t("activities.levels.advanced")}
                  </option>
                  <option value="competitive">
                    {t("activities.levels.competitive")}
                  </option>
                </select>
              </div>
            </div>

            <div className="filter-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showAvailableOnly}
                  onChange={(e) => setShowAvailableOnly(e.target.checked)}
                />
                {t("activities.filters.availableOnly")}
              </label>
            </div>
          </div>

          <div className="activities-grid">
            {getFilteredActivities().map((activity) => (
              <div key={activity.id} className="activity-card">
                <div className="activity-header">
                  <div className="activity-category">
                    <span className="category-icon">
                      {getCategoryIcon(activity.category)}
                    </span>
                    <span className="category-text">
                      {t(`activities.categories.${activity.category}`)}
                    </span>
                  </div>
                  <div
                    className="activity-status"
                    style={{ backgroundColor: getStatusColor(activity.status) }}
                  >
                    {t(`activities.status.${activity.status}`)}
                  </div>
                </div>

                <h3 className="activity-title">{activity.title}</h3>
                <p className="activity-description">{activity.description}</p>

                <div className="activity-details">
                  <div className="detail-item">
                    <span className="detail-label">
                      {t("activities.teacher")}
                    </span>
                    <span className="detail-value">{activity.teacherName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">
                      {t("activities.level")}
                    </span>
                    <span className="detail-value">
                      {t(`activities.levels.${activity.level}`)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">
                      {t("activities.participants")}
                    </span>
                    <span className="detail-value">
                      {activity.currentParticipants}/{activity.maxParticipants}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">
                      {t("activities.location")}
                    </span>
                    <span className="detail-value">{activity.location}</span>
                  </div>
                </div>

                <div className="activity-actions">
                  <button
                    className="btn-view-details"
                    onClick={() => {
                      setSelectedActivity(activity);
                      setShowDetailModal(true);
                    }}
                  >
                    {t("activities.viewDetails")}
                  </button>

                  {isAlreadyParticipating(activity.id) ? (
                    <div className="participation-status">
                      <span
                        className={`status-badge status-${getParticipationStatus(
                          activity.id
                        )}`}
                      >
                        {getParticipationStatusText(
                          getParticipationStatus(activity.id)!
                        )}
                      </span>
                    </div>
                  ) : (
                    <button
                      className="btn-join-activity"
                      onClick={() => {
                        setSelectedActivity(activity);
                        setShowDetailModal(true);
                      }}
                      disabled={
                        activity.currentParticipants >= activity.maxParticipants
                      }
                    >
                      {activity.currentParticipants >= activity.maxParticipants
                        ? t("activities.full")
                        : t("activities.join")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {getFilteredActivities().length === 0 && (
            <div className="no-activities">
              <p>{t("activities.noActivitiesFound")}</p>
            </div>
          )}
        </>
      )}

      {activeTab === "my-activities" && (
        <div className="my-activities-list">
          {getMyActivities().map((activity) => (
            <div key={activity.id} className="my-activity-card">
              <div className="activity-info">
                <div className="activity-header">
                  <h3>{activity.title}</h3>
                  <div className="activity-meta">
                    <span className="category-badge">
                      {getCategoryIcon(activity.category)}{" "}
                      {t(`activities.categories.${activity.category}`)}
                    </span>
                    <span
                      className={`status-badge status-${activity.participation.status}`}
                    >
                      {getParticipationStatusText(
                        activity.participation.status
                      )}
                    </span>
                  </div>
                </div>

                <p className="activity-description">{activity.description}</p>

                <div className="activity-schedule">
                  <span>
                    {t("activities.teacher")}: {activity.teacherName}
                  </span>
                  <span>
                    {t("activities.location")}: {activity.location}
                  </span>
                  <span>
                    {t("activities.schedule")}:{" "}
                    {activity.meetingDays.join(", ")} at {activity.meetingTime}
                  </span>
                </div>
              </div>

              <div className="activity-actions">
                <button
                  className="btn-view-details"
                  onClick={() => {
                    setSelectedActivity(activity);
                    setShowDetailModal(true);
                  }}
                >
                  {t("activities.viewDetails")}
                </button>

                {activity.participation.status ===
                  ParticipationStatus.APPROVED && (
                  <button
                    className="btn-withdraw"
                    onClick={() =>
                      handleWithdrawFromActivity(
                        activity.participation.id,
                        activity.id
                      )
                    }
                  >
                    {t("activities.withdraw")}
                  </button>
                )}
              </div>
            </div>
          ))}

          {getMyActivities().length === 0 && (
            <div className="no-activities">
              <p>{t("activities.noMyActivities")}</p>
              <button
                className="btn-browse-activities"
                onClick={() => setActiveTab("browse")}
              >
                {t("activities.browseActivities")}
              </button>
            </div>
          )}
        </div>
      )}

      {showDetailModal && selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          isParticipating={isAlreadyParticipating(selectedActivity.id)}
          participationStatus={getParticipationStatus(selectedActivity.id)}
          onJoin={handleJoinActivity}
          onWithdraw={(activityId: string) => {
            const participation = myParticipations.find(
              (p) => p.activityId === activityId
            );
            if (participation) {
              handleWithdrawFromActivity(participation.id, activityId);
            }
          }}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
};

export default StudentActivities;
