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
type StudentProfile = {
  name: string;
  email: string;
  grade?: string;
  subjects?: string[];
  uid: string;
  homeroomClass?: string;
  demerits?: DemeritRecord[];
  marks?: Mark[];
  reports?: any[];
};

interface SubjectBlockProps {
  subject: string;
  students: StudentProfile[];
  gradeFilter: string;
  t: (key: string, options?: any) => string;
  translateGrade: (grade: string) => string;
  onOpenBulkMark: (subject: string) => void;
  onOpenMark: (student: StudentProfile, subject: string) => void;
  onOpenDemerit: (student: StudentProfile, mode: "add" | "remove") => void;
  openAcknowledgementModal: (
    student: StudentProfile,
    type: "mark" | "demerit",
    markOrDemerit: Mark | DemeritRecord
  ) => void;
  notificationSearch: string;
  filterNotification: (
    student: StudentProfile,
    markOrDemerit: Mark | DemeritRecord,
    type: "mark" | "demerit"
  ) => boolean;
}

const SubjectBlock: React.FC<SubjectBlockProps> = ({
  subject,
  students,
  gradeFilter,
  t,
  translateGrade,
  onOpenBulkMark,
  onOpenMark,
  onOpenDemerit,
  openAcknowledgementModal,
  notificationSearch,
  filterNotification,
}) => {
  return (
    <div className="tdash-mob-subject-block">
      <div className="tdash-mob-subject-title">
        {t(subject)}
        <button
          className="tdash-mob-btn"
          style={{
            marginLeft: 16,
            fontSize: "0.95em",
            padding: "0.2em 0.7em",
          }}
          onClick={() => onOpenBulkMark(subject)}
        >
          {t("add_marks_bulk")}
        </button>
      </div>
      {students
        .filter((student) =>
          gradeFilter ? (student.grade || "") === gradeFilter : true
        )
        .map((student) => {
          const totalDemerits = (student.demerits || []).reduce(
            (sum, d) => sum + d.points,
            0
          );
          const recentMarks = (student.marks || [])
            .filter(
              (m) =>
                m.subject.trim().toLowerCase() === subject.trim().toLowerCase()
            )
            .filter((m) =>
              notificationSearch ? filterNotification(student, m, "mark") : true
            )
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .slice(0, 2);
          return (
            <div className="tdash-mob-card" key={student.uid}>
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
                <div className="tdash-mob-card-label">{t("recent_marks")}:</div>
                <div className="tdash-mob-card-value">
                  {recentMarks.length > 0 ? (
                    recentMarks.map((m, i) => (
                      <div key={i}>
                        <span className="tdash-highlight">
                          {m.score}/{m.total}
                        </span>
                        <span className="tdash-muted" style={{ marginLeft: 6 }}>
                          {m.description}
                        </span>
                        <button
                          className="tdash-mob-btn"
                          style={{
                            marginLeft: 8,
                            fontSize: "0.95em",
                            padding: "0.2em 0.7em",
                          }}
                          onClick={() =>
                            openAcknowledgementModal(student, "mark", m)
                          }
                        >
                          {t("view_acknowledgements")}
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="tdash-muted">{t("no_marks")}</span>
                  )}
                </div>
              </div>
              <div className="tdash-mob-card-row">
                <div className="tdash-mob-card-label">{t("demerits")}:</div>
                <div
                  className={totalDemerits > 0 ? "tdash-danger" : "tdash-ok"}
                >
                  {totalDemerits}
                </div>
              </div>
              <div className="tdash-mob-card-actions">
                <button
                  className="tdash-mob-btn"
                  onClick={() => onOpenDemerit(student, "add")}
                >
                  {t("add_demerit")}
                </button>
                <button
                  className="tdash-mob-btn"
                  onClick={() => onOpenDemerit(student, "remove")}
                >
                  {t("remove_points")}
                </button>
                <button
                  className="tdash-mob-btn"
                  onClick={() => onOpenMark(student, subject)}
                >
                  {t("add_marks")}
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default SubjectBlock;
