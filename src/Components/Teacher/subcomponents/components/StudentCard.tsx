import React from "react";

type DemeritRecord = {
  points: number;
  reason: string;
  date: string;
  teacher: string;
};
type Mark = {
  subject: string;
  score: number;
  total: number;
  description: string;
  date: string;
  teacher: string;
};
type ReportCard = {
  term: number;
  year: number;
  issuedAt: string;
  subjects: { subject: string; average: number | null; comment: string }[];
  demerits: number;
  teacher: string;
  grade?: string;
  homeroomClass?: string;
};
type StudentProfile = {
  name: string;
  email: string;
  grade?: string;
  subjects?: string[];
  uid: string;
  homeroomClass?: string;
  demerits?: DemeritRecord[];
  marks?: Mark[];
  reports?: ReportCard[];
};

type AckStats = {
  total: number;
  acknowledged: number;
};

interface StudentCardProps {
  student: StudentProfile;
  totalDemerits: number;
  latestAckStats: AckStats | null;
  latestReport: ReportCard | undefined;
  translateGrade: (grade: string) => string;
  t: (key: string, options?: any) => string;
  onAddDemerit: (student: StudentProfile) => void;
  onRemoveDemerit: (student: StudentProfile) => void;
  onShowReport: (
    student: StudentProfile,
    report: ReportCard | undefined
  ) => void;
  onSubmitReport: (student: StudentProfile) => void;
  submittingReportUid: string | null;
  onShowAckDetails: (student: StudentProfile, demerit: DemeritRecord) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  totalDemerits,
  latestAckStats,
  latestReport,
  translateGrade,
  t,
  onAddDemerit,
  onRemoveDemerit,
  onShowReport,
  onSubmitReport,
  submittingReportUid,
  onShowAckDetails,
}) => {
  return (
    <div className="tdash-mob-card">
      <div className="tdash-mob-card-row">
        <div className="tdash-mob-card-avatar">
          {student.name[0].toUpperCase()}
        </div>
        <div className="tdash-mob-card-info">
          <div className="tdash-mob-card-name">{student.name}</div>
          <div className="tdash-mob-card-email">{student.email}</div>
          <div className="tdash-mob-card-grade">
            {student.grade ? translateGrade(student.grade) : ""}
          </div>
        </div>
      </div>
      <div className="tdash-mob-card-row">
        <div className="tdash-mob-card-label">{t("subjects")}:</div>
        <div className="tdash-mob-card-value">
          {student.subjects && student.subjects.length > 0
            ? student.subjects.map((subj, idx) => (
                <span key={subj}>
                  {t(subj)}
                  {idx < student.subjects!.length - 1 ? ", " : ""}
                </span>
              ))
            : "-"}
        </div>
      </div>
      <div className="tdash-mob-card-row">
        <div className="tdash-mob-card-label">{t("demerits")}:</div>
        <div className={totalDemerits > 0 ? "tdash-danger" : "tdash-ok"}>
          {totalDemerits}
        </div>
      </div>
      <div className="tdash-mob-card-row">
        <div className="tdash-mob-card-label">{t("show_ack_stats")}:</div>
        <div>
          {latestAckStats ? (
            <span>
              {t("acknowledged")}: {latestAckStats.acknowledged} /{" "}
              {latestAckStats.total}
              <button
                className="tdash-mob-btn"
                style={{
                  marginLeft: 10,
                  fontSize: "0.95em",
                  padding: "0.2em 0.7em",
                }}
                onClick={() =>
                  onShowAckDetails(
                    student,
                    student.demerits![student.demerits!.length - 1]
                  )
                }
              >
                {t("acknowledgement_details")}
              </button>
            </span>
          ) : (
            <span className="tdash-muted">{t("no_notifications")}</span>
          )}
        </div>
      </div>
      <div className="tdash-mob-card-actions">
        <button className="tdash-mob-btn" onClick={() => onAddDemerit(student)}>
          {t("add_demerit")}
        </button>
        <button
          className="tdash-mob-btn"
          onClick={() => onRemoveDemerit(student)}
        >
          {t("remove_points")}
        </button>
        <button
          className="tdash-mob-btn"
          onClick={() => onShowReport(student, latestReport)}
        >
          {t("report_card")}
        </button>
        <button
          className="tdash-mob-btn"
          onClick={() => onSubmitReport(student)}
        >
          {t("submit_report")}
        </button>
      </div>
    </div>
  );
};

export default StudentCard;
