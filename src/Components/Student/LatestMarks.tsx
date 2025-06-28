import React from "react";
import { useTranslation } from "react-i18next";

type Mark = {
  subject: string;
  score: number;
  total: number;
  description: string;
  date: string;
  teacher: string;
};

type Props = {
  marks: Mark[];
};

const LatestMarks: React.FC<Props> = ({ marks }) => {
  const { t } = useTranslation();

  return (
    <div className="sdash-section sdash-fade-in">
      <div className="sdash-section-header">
        <div className="sdash-section-title">📊 {t("latest_marks")}</div>
        <div className="sdash-section-subtitle">
          {t("recent_assessment_results")}
        </div>
      </div>
      <div className="sdash-section-content">
        {marks.length === 0 ? (
          <div className="sdash-empty-state">
            <div className="sdash-empty-icon">📝</div>
            <div className="sdash-empty-title">{t("no_marks_yet")}</div>
            <div className="sdash-empty-subtitle">
              {t("marks_will_appear_here")}
            </div>
          </div>
        ) : (
          <div className="sdash-marks-container">
            {marks.map((mark, idx) => (
              <div className="sdash-mark-card" key={idx}>
                <div className="sdash-mark-info">
                  <div className="sdash-mark-subject">{t(mark.subject)}</div>
                  <div className="sdash-mark-details">{mark.description}</div>
                  <div className="sdash-mark-details">
                    {new Date(mark.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="sdash-mark-score">
                  <div
                    className={`sdash-mark-value ${
                      mark.total
                        ? (mark.score / mark.total) * 100 >= 75
                          ? "excellent"
                          : (mark.score / mark.total) * 100 >= 60
                          ? "good"
                          : (mark.score / mark.total) * 100 >= 50
                          ? "average"
                          : "poor"
                        : "poor"
                    }`}
                  >
                    {mark.total
                      ? `${Math.round((mark.score / mark.total) * 100)}%`
                      : t("n_a")}
                  </div>
                  <div className="sdash-mark-total">
                    {mark.score}/{mark.total}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestMarks;
