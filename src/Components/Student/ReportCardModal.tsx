import React from "react";
import type { ReportCard } from "./studentDash";
import { useTranslation } from "react-i18next";
import "./ReportCardModal.css";

type Props = {
  report: ReportCard;
  studentName: string;
  onClose: () => void;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

const ReportCardModal: React.FC<Props> = ({ report, studentName, onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="rc-modal-bg">
      <div className="rc-modal">
        <div className="rc-card">
          <header className="rc-header">
            <div className="rc-school-logo" aria-label={t("school")}>
              🎓
            </div>
            <div className="rc-school-name">{t("springfield_high_school")}</div>
            <div className="rc-title">{t("end_of_term_report_card")}</div>
            <div className="rc-term">
              {t("term")} {report.term} &mdash; {report.year}
            </div>
          </header>
          <section className="rc-student-info">
            <div>
              <strong>{t("student")}:</strong> {studentName}
            </div>
            <div>
              <strong>{t("grade")}:</strong> {report.grade || t("n_a")}
            </div>
            <div>
              <strong>{t("homeroom")}:</strong>{" "}
              {report.homeroomClass || t("n_a")}
            </div>
          </section>
          <section className="rc-subjects">
            {report.subjects.map((row, idx) => (
              <div className="rc-subject-card" key={idx}>
                <div className="rc-label">{t("subject")}</div>
                <div className="rc-value">{t(row.subject)}</div>
                <div className="rc-label">{t("term_average")}</div>
                <div className="rc-value">
                  {row.average !== null ? (
                    <span
                      style={{
                        color:
                          row.average >= 75
                            ? "#7bb0ff"
                            : row.average >= 50
                            ? "#ffe066"
                            : "#ff6b6b",
                        fontWeight: 700,
                      }}
                    >
                      {row.average.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="rc-muted">{t("n_a")}</span>
                  )}
                </div>
                <div className="rc-label">{t("comment")}</div>
                <div className="rc-value">{row.comment}</div>
              </div>
            ))}
          </section>
          <section className="rc-footer">
            <div>
              <strong>{t("demerit_points")}:</strong> {report.demerits}
            </div>
            <div>
              <strong>{t("homeroom_teacher")}:</strong> {report.teacher}
            </div>
            <div>
              <strong>{t("issued")}:</strong> {formatDate(report.issuedAt)}
            </div>
          </section>
        </div>
        <div className="rc-actions">
          <button type="button" onClick={onClose} className="rc-btn">
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportCardModal;
