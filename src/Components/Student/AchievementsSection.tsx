import { useTranslation } from "react-i18next";
import StudentAwards from "./StudentAwards";
import type { Award, Activity } from "./types";

interface AchievementsSectionProps {
  awards: Award[];
  signedUpActivities: Activity[];
}

function AchievementsSection({
  awards,
  signedUpActivities,
}: AchievementsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="sdash-section sdash-fade-in">
      <div className="sdash-section-header">
        <div className="sdash-section-title">
          🏆 {t("achievements") || "Achievements"}
        </div>
      </div>
      <div className="sdash-section-content">
        {/* New Award System */}
        <StudentAwards showAll={false} maxDisplay={3} />

        {/* Legacy Activities Display */}
        {signedUpActivities.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h4>{t("my_activities") || "My Activities"}</h4>
            {signedUpActivities.slice(0, 3).map((activity, idx) => (
              <div key={idx} className="sdash-mark-card">
                <div className="sdash-mark-info">
                  <div className="sdash-mark-subject">{activity.name}</div>
                  <div className="sdash-mark-details">{activity.teacher}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AchievementsSection;
