import { useTranslation } from "react-i18next";

interface NotificationBannerProps {
  needsSubjectSelection: boolean;
  onSelectSubjects: () => void;
}

function NotificationBanner({
  needsSubjectSelection,
  onSelectSubjects,
}: NotificationBannerProps) {
  const { t } = useTranslation();

  if (!needsSubjectSelection) return null;

  return (
    <div className="sdash-notification-banner">
      <div className="sdash-notification-content">
        <div className="sdash-notification-icon">📚</div>
        <div className="sdash-notification-text">
          <h3>
            {t("subject_selection_required") || "Subject Selection Required"}
          </h3>
          <p>
            {t("please_select_your_subjects_for_this_academic_year") ||
              "Please select your subjects for this academic year"}
          </p>
        </div>
        <button className="sdash-notification-btn" onClick={onSelectSubjects}>
          {t("select_subjects") || "Select Subjects"}
        </button>
      </div>
    </div>
  );
}

export default NotificationBanner;
