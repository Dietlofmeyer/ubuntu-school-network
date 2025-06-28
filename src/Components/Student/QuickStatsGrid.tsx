import { useTranslation } from "react-i18next";
import type { Mark, Activity } from "./types";

interface QuickStatsGridProps {
  subjects: string[];
  latestMarks: Mark[];
  signedUpActivities: Activity[];
  totalDemeritPoints: number;
}

function QuickStatsGrid({
  subjects,
  latestMarks,
  signedUpActivities,
  totalDemeritPoints,
}: QuickStatsGridProps) {
  const { t } = useTranslation();

  return (
    <div className="sdash-quick-stats">
      <div className="sdash-stat-card">
        <div className="sdash-stat-value">{subjects.length}</div>
        <div className="sdash-stat-label">{t("total_subjects")}</div>
      </div>
      <div className="sdash-stat-card">
        <div className="sdash-stat-value">{latestMarks.length}</div>
        <div className="sdash-stat-label">{t("recent_marks")}</div>
      </div>
      <div className="sdash-stat-card">
        <div className="sdash-stat-value">{signedUpActivities.length}</div>
        <div className="sdash-stat-label">{t("my_activities")}</div>
      </div>
      <div className="sdash-stat-card">
        <div className="sdash-stat-value">{totalDemeritPoints}</div>
        <div className="sdash-stat-label">{t("demerit_points")}</div>
      </div>
    </div>
  );
}

export default QuickStatsGrid;
