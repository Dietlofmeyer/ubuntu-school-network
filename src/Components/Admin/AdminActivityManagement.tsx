import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type {
  Activity,
  ActivityParticipation,
  ActivityStatistics,
} from "../../types/activities";
import {
  ActivityStatus,
  ActivityCategory,
  ParticipationStatus,
} from "../../types/activities";
import "./AdminActivityManagement.css";

const AdminActivityManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [participations, setParticipations] = useState<ActivityParticipation[]>(
    []
  );
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "all">(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<
    ActivityCategory | "all"
  >("all");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchParticipations();
    }
  }, [user]);

  useEffect(() => {
    if (activities.length > 0 && participations.length > 0) {
      calculateStatistics();
    }
  }, [activities, participations]);

  const fetchActivities = async () => {
    try {
      const activitiesRef = collection(db, "activities");
      const q = query(
        activitiesRef,
        where("schoolId", "==", profile?.schoolId || ""),
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

  const fetchParticipations = async () => {
    try {
      const participationsRef = collection(db, "activityParticipations");
      const snapshot = await getDocs(participationsRef);
      const participationsData: ActivityParticipation[] = [];

      snapshot.forEach((doc) => {
        const participation = {
          id: doc.id,
          ...doc.data(),
        } as ActivityParticipation;
        if (
          activities.some(
            (activity) => activity.id === participation.activityId
          )
        ) {
          participationsData.push(participation);
        }
      });

      setParticipations(participationsData);
    } catch (error) {
      console.error("Error fetching participations:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = () => {
    const stats: ActivityStatistics = {
      totalActivities: activities.length,
      activeActivities: activities.filter(
        (a) => a.status === ActivityStatus.ACTIVE
      ).length,
      totalParticipants: participations.filter(
        (p) => p.status === ParticipationStatus.APPROVED
      ).length,
      byCategory: {} as Record<ActivityCategory, number>,
      byStatus: {} as Record<ActivityStatus, number>,
      popularActivities: [],
      teacherStats: [],
    };

    // Calculate by category
    Object.values(ActivityCategory).forEach((category) => {
      stats.byCategory[category] = activities.filter(
        (a) => a.category === category
      ).length;
    });

    // Calculate by status
    Object.values(ActivityStatus).forEach((status) => {
      stats.byStatus[status] = activities.filter(
        (a) => a.status === status
      ).length;
    });

    // Calculate popular activities
    stats.popularActivities = activities
      .map((activity) => ({
        activityId: activity.id,
        title: activity.title,
        participantCount: participations.filter(
          (p) =>
            p.activityId === activity.id &&
            p.status === ParticipationStatus.APPROVED
        ).length,
        waitlistCount: participations.filter(
          (p) =>
            p.activityId === activity.id &&
            p.status === ParticipationStatus.PENDING
        ).length,
      }))
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 5);

    // Calculate teacher stats
    const teacherMap = new Map<
      string,
      { name: string; activities: number; participants: number }
    >();

    activities.forEach((activity) => {
      if (!teacherMap.has(activity.teacherId)) {
        teacherMap.set(activity.teacherId, {
          name: activity.teacherName,
          activities: 0,
          participants: 0,
        });
      }

      const teacherStat = teacherMap.get(activity.teacherId)!;
      teacherStat.activities++;
      teacherStat.participants += participations.filter(
        (p) =>
          p.activityId === activity.id &&
          p.status === ParticipationStatus.APPROVED
      ).length;
    });

    stats.teacherStats = Array.from(teacherMap.entries()).map(
      ([teacherId, data]) => ({
        teacherId,
        teacherName: data.name,
        activitiesCount: data.activities,
        totalParticipants: data.participants,
      })
    );

    setStatistics(stats);
  };

  const handleActivityStatusChange = async (
    activityId: string,
    newStatus: ActivityStatus
  ) => {
    if (!user || !profile) return;

    try {
      const activityRef = doc(db, "activities", activityId);
      await updateDoc(activityRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "admin_activity_status_changed",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle:
            activities.find((a) => a.id === activityId)?.title || "",
          newStatus,
          adminName: profile.name,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      await fetchActivities();
    } catch (error) {
      console.error("Error updating activity status:", error);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!user || !profile) return;

    if (!confirm(t("activities.admin.confirmDelete"))) return;

    try {
      // Delete the activity
      await deleteDoc(doc(db, "activities", activityId));

      // Delete all related participations
      const relatedParticipations = participations.filter(
        (p) => p.activityId === activityId
      );
      for (const participation of relatedParticipations) {
        await deleteDoc(doc(db, "activityParticipations", participation.id));
      }

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "admin_activity_deleted",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle:
            activities.find((a) => a.id === activityId)?.title || "",
          participantsCount: relatedParticipations.length,
          adminName: profile.name,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      await fetchActivities();
      await fetchParticipations();
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const getFilteredActivities = () => {
    let filtered = activities;

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (activity) => activity.status === statusFilter
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (activity) => activity.category === categoryFilter
      );
    }

    if (teacherFilter) {
      filtered = filtered.filter((activity) =>
        activity.teacherName.toLowerCase().includes(teacherFilter.toLowerCase())
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (activity) =>
          activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
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

  if (loading) {
    return (
      <div className="admin-activity-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-activity-management">
      <div className="admin-header">
        <h2>{t("activities.admin.title")}</h2>
        <div className="admin-actions">
          <button className="btn-export">
            {t("activities.admin.exportData")}
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="statistics-section">
          <h3>{t("activities.admin.overview")}</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{statistics.totalActivities}</div>
              <div className="stat-label">
                {t("activities.admin.totalActivities")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{statistics.activeActivities}</div>
              <div className="stat-label">
                {t("activities.admin.activeActivities")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{statistics.totalParticipants}</div>
              <div className="stat-label">
                {t("activities.admin.totalParticipants")}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{statistics.teacherStats.length}</div>
              <div className="stat-label">
                {t("activities.admin.activeTeachers")}
              </div>
            </div>
          </div>

          <div className="detailed-stats">
            <div className="popular-activities">
              <h4>{t("activities.admin.popularActivities")}</h4>
              <div className="popular-list">
                {statistics.popularActivities.map((activity, index) => (
                  <div key={activity.activityId} className="popular-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="title">{activity.title}</span>
                    <span className="participants">
                      {activity.participantCount} participants
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="teacher-stats">
              <h4>{t("activities.admin.teacherStatistics")}</h4>
              <div className="teacher-list">
                {statistics.teacherStats.slice(0, 5).map((teacher) => (
                  <div key={teacher.teacherId} className="teacher-item">
                    <span className="name">{teacher.teacherName}</span>
                    <span className="activities">
                      {teacher.activitiesCount} activities
                    </span>
                    <span className="participants">
                      {teacher.totalParticipants} participants
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
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
            <label>{t("activities.admin.status")}</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ActivityStatus | "all")
              }
              className="filter-select"
            >
              <option value="all">{t("activities.admin.allStatuses")}</option>
              <option value="active">{t("activities.status.active")}</option>
              <option value="full">{t("activities.status.full")}</option>
              <option value="closed">{t("activities.status.closed")}</option>
              <option value="completed">
                {t("activities.status.completed")}
              </option>
              <option value="cancelled">
                {t("activities.status.cancelled")}
              </option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t("activities.filters.category")}</label>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as ActivityCategory | "all")
              }
              className="filter-select"
            >
              <option value="all">
                {t("activities.filters.allCategories")}
              </option>
              {Object.values(ActivityCategory).map((category) => (
                <option key={category} value={category}>
                  {t(`activities.categories.${category}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{t("activities.admin.teacher")}</label>
            <input
              type="text"
              placeholder={t("activities.admin.teacherPlaceholder")}
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="activities-section">
        <h3>
          {t("activities.admin.allActivities")} (
          {getFilteredActivities().length})
        </h3>

        {getFilteredActivities().length === 0 ? (
          <div className="no-activities">
            <p>{t("activities.admin.noActivitiesFound")}</p>
          </div>
        ) : (
          <div className="activities-table">
            <div className="table-header">
              <div className="col-title">
                {t("activities.admin.activityTitle")}
              </div>
              <div className="col-teacher">{t("activities.admin.teacher")}</div>
              <div className="col-category">
                {t("activities.admin.category")}
              </div>
              <div className="col-participants">
                {t("activities.admin.participants")}
              </div>
              <div className="col-status">{t("activities.admin.status")}</div>
              <div className="col-actions">{t("activities.admin.actions")}</div>
            </div>

            {getFilteredActivities().map((activity) => (
              <div key={activity.id} className="table-row">
                <div className="col-title">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-description">
                    {activity.description}
                  </div>
                </div>

                <div className="col-teacher">
                  <span className="teacher-name">{activity.teacherName}</span>
                </div>

                <div className="col-category">
                  <div className="category-badge">
                    <span className="category-icon">
                      {getCategoryIcon(activity.category)}
                    </span>
                    <span>
                      {t(`activities.categories.${activity.category}`)}
                    </span>
                  </div>
                </div>

                <div className="col-participants">
                  <span className="participant-count">
                    {activity.currentParticipants}/{activity.maxParticipants}
                  </span>
                  <div className="participant-bar">
                    <div
                      className="participant-fill"
                      style={{
                        width: `${
                          (activity.currentParticipants /
                            activity.maxParticipants) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="col-status">
                  <select
                    value={activity.status}
                    onChange={(e) =>
                      handleActivityStatusChange(
                        activity.id,
                        e.target.value as ActivityStatus
                      )
                    }
                    className={`status-select status-${activity.status}`}
                  >
                    <option value="active">
                      {t("activities.status.active")}
                    </option>
                    <option value="full">{t("activities.status.full")}</option>
                    <option value="closed">
                      {t("activities.status.closed")}
                    </option>
                    <option value="completed">
                      {t("activities.status.completed")}
                    </option>
                    <option value="cancelled">
                      {t("activities.status.cancelled")}
                    </option>
                  </select>
                </div>

                <div className="col-actions">
                  <button
                    className="btn-view"
                    onClick={() => {
                      // TODO: Implement activity detail modal
                      console.log("View activity details:", activity);
                    }}
                    title={t("activities.admin.viewDetails")}
                  >
                    👁️
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteActivity(activity.id)}
                    title={t("activities.admin.deleteActivity")}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivityManagement;
