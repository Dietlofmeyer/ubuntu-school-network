import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Activity, ParticipationStatus } from "../../types/activities";
import { ParticipationStatus as ParticipationStatusConst } from "../../types/activities";
import "./ActivityDetailModal.css";

interface ActivityDetailModalProps {
  activity: Activity;
  isParticipating: boolean;
  participationStatus?: ParticipationStatus;
  onJoin: (activity: Activity, message?: string) => void;
  onWithdraw: (activityId: string) => void;
  onClose: () => void;
}

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isParticipating,
  participationStatus,
  onJoin,
  onWithdraw,
  onClose,
}) => {
  const { t } = useTranslation();
  const [applicationMessage, setApplicationMessage] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
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
    const statusTexts: Record<ParticipationStatus, string> = {
      pending: t("activities.status.pending"),
      approved: t("activities.status.approved"),
      rejected: t("activities.status.rejected"),
      withdrawn: t("activities.status.withdrawn"),
      completed: t("activities.status.completed"),
    };
    return statusTexts[status] || status;
  };

  const handleJoinClick = () => {
    if (activity.requiresApproval) {
      setShowJoinForm(true);
    } else {
      onJoin(activity);
    }
  };

  const handleJoinSubmit = () => {
    onJoin(activity, applicationMessage);
    setShowJoinForm(false);
    setApplicationMessage("");
  };

  const canJoin =
    !isParticipating &&
    activity.status === "active" &&
    activity.currentParticipants < activity.maxParticipants;

  const canWithdraw =
    isParticipating &&
    participationStatus === ParticipationStatusConst.APPROVED;

  return (
    <div className="activity-modal-overlay" onClick={onClose}>
      <div className="activity-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="activity-title-section">
            <div className="activity-category-large">
              <span className="category-icon-large">
                {getCategoryIcon(activity.category)}
              </span>
              <span className="category-text">
                {t(`activities.categories.${activity.category}`)}
              </span>
            </div>
            <h2 className="activity-title-large">{activity.title}</h2>
            <div
              className="activity-status-large"
              style={{ backgroundColor: getStatusColor(activity.status) }}
            >
              {t(`activities.status.${activity.status}`)}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="activity-info-section">
            <h3>{t("activities.description")}</h3>
            <p className="activity-description-full">{activity.description}</p>
          </div>

          <div className="activity-details-grid">
            <div className="detail-section">
              <h4>{t("activities.basicInfo")}</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">
                    {t("activities.teacher")}
                  </span>
                  <span className="detail-value">{activity.teacherName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t("activities.level")}</span>
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
                    {activity.currentParticipants >=
                      activity.maxParticipants && (
                      <span className="full-indicator">
                        {" "}
                        ({t("activities.full")})
                      </span>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">
                    {t("activities.location")}
                  </span>
                  <span className="detail-value">{activity.location}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>{t("activities.schedule")}</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">
                    {t("activities.startDate")}
                  </span>
                  <span className="detail-value">
                    {new Date(
                      activity.startDate.toString()
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">
                    {t("activities.endDate")}
                  </span>
                  <span className="detail-value">
                    {new Date(activity.endDate.toString()).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">
                    {t("activities.meetingDays")}
                  </span>
                  <span className="detail-value">
                    {activity.meetingDays.join(", ")}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">
                    {t("activities.meetingTime")}
                  </span>
                  <span className="detail-value">{activity.meetingTime}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">
                    {t("activities.duration")}
                  </span>
                  <span className="detail-value">
                    {activity.duration} {t("activities.minutes")}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">
                    {t("activities.frequencyLabel")}
                  </span>
                  <span className="detail-value">
                    {t(`activities.frequency.${activity.frequency}`)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {(activity.prerequisites || activity.materials || activity.cost) && (
            <div className="detail-section">
              <h4>{t("activities.requirements")}</h4>
              <div className="detail-grid">
                {activity.prerequisites && (
                  <div className="detail-item full-width">
                    <span className="detail-label">
                      {t("activities.prerequisites")}
                    </span>
                    <span className="detail-value">
                      {activity.prerequisites}
                    </span>
                  </div>
                )}
                {activity.materials && (
                  <div className="detail-item full-width">
                    <span className="detail-label">
                      {t("activities.materials")}
                    </span>
                    <span className="detail-value">{activity.materials}</span>
                  </div>
                )}
                {activity.cost !== undefined && activity.cost > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">{t("activities.cost")}</span>
                    <span className="detail-value">R{activity.cost}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activity.achievements && activity.achievements.length > 0 && (
            <div className="detail-section">
              <h4>{t("activities.possibleAchievements")}</h4>
              <div className="achievements-list">
                {activity.achievements.map((achievement, index) => (
                  <span key={index} className="achievement-badge">
                    🏆 {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isParticipating && participationStatus && (
            <div className="participation-info">
              <h4>{t("activities.yourParticipation")}</h4>
              <div className="participation-status-section">
                <span
                  className={`status-badge-large status-${participationStatus}`}
                >
                  {getParticipationStatusText(participationStatus)}
                </span>
                {participationStatus === ParticipationStatusConst.PENDING && (
                  <p className="status-description">
                    {t("activities.pendingDescription")}
                  </p>
                )}
                {participationStatus === ParticipationStatusConst.APPROVED && (
                  <p className="status-description">
                    {t("activities.approvedDescription")}
                  </p>
                )}
                {participationStatus === ParticipationStatusConst.REJECTED && (
                  <p className="status-description">
                    {t("activities.rejectedDescription")}
                  </p>
                )}
              </div>
            </div>
          )}

          {showJoinForm && (
            <div className="join-form-section">
              <h4>{t("activities.applicationMessage")}</h4>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                placeholder={t("activities.applicationMessagePlaceholder")}
                rows={4}
                className="application-textarea"
              />
              <p className="form-note">{t("activities.applicationNote")}</p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          {showJoinForm ? (
            <>
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowJoinForm(false);
                  setApplicationMessage("");
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn-submit-application"
                onClick={handleJoinSubmit}
                disabled={
                  activity.requiresApproval && !applicationMessage.trim()
                }
              >
                {t("activities.submitApplication")}
              </button>
            </>
          ) : (
            <>
              <button className="btn-close" onClick={onClose}>
                {t("common.close")}
              </button>
              {canJoin && (
                <button className="btn-join" onClick={handleJoinClick}>
                  {activity.requiresApproval
                    ? t("activities.applyToJoin")
                    : t("activities.join")}
                </button>
              )}
              {canWithdraw && (
                <button
                  className="btn-withdraw"
                  onClick={() => onWithdraw(activity.id)}
                >
                  {t("activities.withdraw")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailModal;
