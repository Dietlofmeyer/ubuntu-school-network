import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface QuickActionsPanelProps {
  onSelectSubjects: () => void;
  onOpenExtracurriculars: () => void;
  onShowDemeritHistory: () => void;
  onOpenSettings: () => void;
}

function QuickActionsPanel({
  onSelectSubjects,
  onOpenExtracurriculars,
  onShowDemeritHistory,
  onOpenSettings,
}: QuickActionsPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="sdash-section sdash-fade-in">
      <div className="sdash-section-header">
        <div className="sdash-section-title">
          🚀 {t("quick_actions") || "Quick Actions"}
        </div>
      </div>
      <div className="sdash-section-content">
        <div className="sdash-action-buttons">
          {/* Subject Selection Button - Academic Feature */}
          <button className="sdash-action-btn" onClick={onSelectSubjects}>
            <span>📚</span>
            {t("select_subjects") || "Select Subjects"}
          </button>
          <button
            className="sdash-action-btn"
            onClick={() => navigate("/student-activities")}
          >
            <span>🎯</span>
            {t("activities.title") || "Activities"}
          </button>
          <button
            className="sdash-action-btn"
            onClick={() => navigate("/activity-sessions")}
          >
            <span>📅</span>
            {t("activities.sessions.title") || "My Sessions"}
          </button>
          <button
            className="sdash-action-btn secondary"
            onClick={onShowDemeritHistory}
          >
            <span>📋</span>
            {t("demerit_history") || "Demerit History"}
          </button>
          <button
            className="sdash-action-btn secondary"
            onClick={onOpenSettings}
          >
            <span>⚙️</span>
            {t("settings") || "Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuickActionsPanel;
