import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { AwardCategory, AwardStatus } from "../../types/awards";
import type { AssignedAward, Achievement } from "../../types/awards";
import "./StudentAwards.css";

interface StudentAwardsProps {
  showAll?: boolean;
  maxDisplay?: number;
}

const StudentAwards: React.FC<StudentAwardsProps> = ({
  showAll = false,
  maxDisplay = 6,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [assignedAwards, setAssignedAwards] = useState<AssignedAward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    AwardCategory | "all"
  >("all");

  useEffect(() => {
    if (user?.uid) {
      fetchStudentAwards();
      fetchStudentAchievements();
    }
  }, [user?.uid]);

  const fetchStudentAwards = async () => {
    try {
      // Try query with orderBy first
      let q = query(
        collection(db, "assignedAwards"),
        where("studentId", "==", user?.uid),
        orderBy("assignedAt", "desc")
      );

      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (indexError) {
        // If index is not ready, fallback to query without orderBy
        console.warn(
          "Index not ready, falling back to unordered query:",
          indexError
        );
        q = query(
          collection(db, "assignedAwards"),
          where("studentId", "==", user?.uid)
        );
        snapshot = await getDocs(q);
      }

      const awards: AssignedAward[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AssignedAward[];

      // Sort manually if we used fallback query
      awards.sort((a, b) => {
        if (!a.assignedAt || !b.assignedAt) return 0;

        // Handle different timestamp formats
        const getTimeValue = (timestamp: any) => {
          if (timestamp?.seconds) return timestamp.seconds;
          if (timestamp?.toDate) return timestamp.toDate().getTime();
          if (typeof timestamp === "string")
            return new Date(timestamp).getTime();
          return 0;
        };

        return getTimeValue(b.assignedAt) - getTimeValue(a.assignedAt);
      });

      setAssignedAwards(awards);
    } catch (error) {
      console.error("Error fetching student awards:", error);
    }
  };

  const fetchStudentAchievements = async () => {
    try {
      // Try query with orderBy first
      let q = query(
        collection(db, "achievements"),
        where("studentId", "==", user?.uid),
        where("unlocked", "==", true),
        orderBy("unlockedAt", "desc")
      );

      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (indexError) {
        // If index is not ready, fallback to query without orderBy
        console.warn(
          "Index not ready, falling back to unordered query:",
          indexError
        );
        q = query(
          collection(db, "achievements"),
          where("studentId", "==", user?.uid),
          where("unlocked", "==", true)
        );
        snapshot = await getDocs(q);
      }

      const studentAchievements: Achievement[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Achievement[];

      // Sort manually if we used fallback query
      studentAchievements.sort((a, b) => {
        if (!a.unlockedAt || !b.unlockedAt) return 0;

        // Handle different timestamp formats
        const getTimeValue = (timestamp: any) => {
          if (timestamp?.seconds) return timestamp.seconds;
          if (timestamp?.toDate) return timestamp.toDate().getTime();
          if (typeof timestamp === "string")
            return new Date(timestamp).getTime();
          return 0;
        };

        return getTimeValue(b.unlockedAt) - getTimeValue(a.unlockedAt);
      });

      setAchievements(studentAchievements);
    } catch (error) {
      console.error("Error fetching student achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: AwardCategory) => {
    const icons = {
      [AwardCategory.ACADEMIC]: "📚",
      [AwardCategory.SPORTS]: "⚽",
      [AwardCategory.LEADERSHIP]: "👑",
      [AwardCategory.COMMUNITY_SERVICE]: "🤝",
      [AwardCategory.ATTENDANCE]: "📅",
      [AwardCategory.BEHAVIOR]: "😊",
      [AwardCategory.CREATIVITY]: "🎨",
      [AwardCategory.TEAMWORK]: "👥",
      [AwardCategory.IMPROVEMENT]: "📈",
      [AwardCategory.OTHER]: "⭐",
    };
    return icons[category] || "🏆";
  };

  const getStatusBadge = (status: AwardStatus) => {
    const badges = {
      [AwardStatus.APPROVED]: { text: t("approved"), className: "approved" },
      [AwardStatus.PENDING]: { text: t("pending"), className: "pending" },
      [AwardStatus.REJECTED]: { text: t("rejected"), className: "rejected" },
    };
    return badges[status] || { text: status, className: "default" };
  };

  const filteredAwards = assignedAwards.filter(
    (award) => selectedCategory === "all" || award.category === selectedCategory
  );

  const displayAwards = showAll
    ? filteredAwards
    : filteredAwards.slice(0, maxDisplay);

  if (loading) {
    return <div className="student-awards-loading">Loading awards...</div>;
  }

  if (assignedAwards.length === 0 && achievements.length === 0) {
    return (
      <div className="student-awards-empty">
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3>{t("no_awards_yet")}</h3>
          <p>{t("awards_will_appear_here")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-awards">
      {showAll && (
        <div className="awards-header">
          <h2>{t("my_awards_achievements")}</h2>
          <div className="awards-stats">
            <div className="stat">
              <span className="stat-number">{assignedAwards.length}</span>
              <span className="stat-label">{t("awards_received")}</span>
            </div>
            <div className="stat">
              <span className="stat-number">{achievements.length}</span>
              <span className="stat-label">{t("achievements_unlocked")}</span>
            </div>
          </div>
        </div>
      )}

      {showAll && (
        <div className="awards-filters">
          <div className="category-filter">
            <button
              className={`filter-btn ${
                selectedCategory === "all" ? "active" : ""
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              {t("all_categories")}
            </button>
            {Object.values(AwardCategory).map((category) => (
              <button
                key={category}
                className={`filter-btn ${
                  selectedCategory === category ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryIcon(category)} {t(category.toLowerCase())}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Awards */}
      {displayAwards.length > 0 && (
        <div className="awards-section">
          <h3>{t("awards_received")}</h3>
          <div className="awards-grid">
            {displayAwards.map((award) => (
              <div key={award.id} className="award-card">
                <div className="award-header">
                  <div
                    className="award-icon"
                    style={{ color: award.color || "#6366F1" }}
                  >
                    {award.icon || getCategoryIcon(award.category)}
                  </div>
                  <div
                    className={`award-status ${
                      getStatusBadge(award.status).className
                    }`}
                  >
                    {getStatusBadge(award.status).text}
                  </div>
                </div>
                <div className="award-content">
                  <h4 className="award-title">{award.title}</h4>
                  <p className="award-description">{award.description}</p>
                  {award.reason && (
                    <p className="award-reason">
                      <strong>{t("reason")}:</strong> {award.reason}
                    </p>
                  )}
                  <div className="award-meta">
                    <span className="award-points">
                      +{award.points} {t("points")}
                    </span>
                    <span className="award-date">
                      {typeof award.assignedAt === "string"
                        ? new Date(award.assignedAt).toLocaleDateString()
                        : award.assignedAt.toDate().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="award-footer">
                    <span className="awarded-by">
                      {t("awarded_by")}: {award.assignedByName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="achievements-section">
          <h3>{t("achievements_unlocked")}</h3>
          <div className="achievements-grid">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="achievement-card">
                <div className="achievement-icon">
                  {achievement.icon || "🎯"}
                </div>
                <div className="achievement-content">
                  <h4 className="achievement-title">{achievement.title}</h4>
                  <p className="achievement-description">
                    {achievement.description}
                  </p>
                  <div className="achievement-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                    <span className="progress-text">{t("completed")}</span>
                  </div>
                  <div className="achievement-date">
                    {t("unlocked_on")}:{" "}
                    {typeof achievement.unlockedAt === "string"
                      ? new Date(achievement.unlockedAt).toLocaleDateString()
                      : achievement.unlockedAt.toDate().toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showAll &&
        (assignedAwards.length > maxDisplay || achievements.length > 0) && (
          <div className="awards-footer">
            <button className="view-all-btn">
              {t("view_all_awards")} (
              {assignedAwards.length + achievements.length})
            </button>
          </div>
        )}
    </div>
  );
};

export default StudentAwards;
