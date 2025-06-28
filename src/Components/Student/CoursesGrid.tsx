import React from "react";
import { useTranslation } from "react-i18next";

type Props = {
  subjects: string[];
  getSubjectIcon: (subject: string) => string;
  averageBySubject: { [subject: string]: number | null };
};

const CoursesGrid: React.FC<Props> = ({
  subjects,
  getSubjectIcon,
  averageBySubject,
}) => {
  const { t } = useTranslation();

  return (
    <div className="sdash-section sdash-fade-in">
      <div className="sdash-section-header">
        <div className="sdash-section-title">🎓 {t("your_courses")}</div>
        <div className="sdash-section-subtitle">
          {t("subject_performance_overview")}
        </div>
      </div>
      <div className="sdash-section-content">
        {subjects.length === 0 ? (
          <div className="sdash-empty-state">
            <div className="sdash-empty-icon">📚</div>
            <div className="sdash-empty-title">{t("no_courses_yet")}</div>
            <div className="sdash-empty-subtitle">
              {t("courses_will_appear_here")}
            </div>
          </div>
        ) : (
          <div className="sdash-subjects-grid">
            {subjects.map((subject) => (
              <div className="sdash-subject-card" key={subject}>
                <div className="sdash-subject-icon">
                  {getSubjectIcon(subject)}
                </div>
                <div className="sdash-subject-name">{t(subject)}</div>
                <div
                  className={`sdash-subject-average ${
                    averageBySubject[subject] != null
                      ? averageBySubject[subject]! >= 75
                        ? "excellent"
                        : averageBySubject[subject]! >= 60
                        ? "good"
                        : averageBySubject[subject]! >= 50
                        ? "average"
                        : "poor"
                      : ""
                  }`}
                >
                  {averageBySubject[subject] != null
                    ? `${averageBySubject[subject]?.toFixed(1)}%`
                    : t("n_a")}
                </div>
                <div className="sdash-subject-progress">
                  <div
                    className="sdash-subject-progress-bar"
                    style={{
                      width: `${averageBySubject[subject] || 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesGrid;
