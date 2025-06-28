import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type Note = string | { text: string; date?: string };
type Scores = { [subject: string]: number[] };

function average(arr: number[] | undefined) {
  if (!arr || arr.length === 0) return "-";
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

const subjectKeyMap: { [label: string]: string } = {
  Math: "math",
  English: "english",
  Science: "science",
  History: "history",
  Geography: "geography",
  Art: "art",
  Music: "music",
  Technology: "technology",
  Economics: "economics",
  "Physical Education": "physicalEd",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fafdff",
        borderRadius: 10,
        padding: "0.8rem 1rem",
        marginBottom: 14,
        boxShadow: "0 1px 4px rgba(80,131,175,0.06)",
        border: "1px solid #e3e8f0",
      }}
    >
      {children}
    </div>
  );
}

function StudentCard(props: {
  name: string;
  age: number;
  studentClass: string;
  points: number;
  math: boolean;
  english: boolean;
  science: boolean;
  history: boolean;
  geography: boolean;
  art: boolean;
  music: boolean;
  technology: boolean;
  economics: boolean;
  physicalEd: boolean;
  scores?: Scores;
  tags?: string[];
  activities?: string[];
  address?: string;
  enrollmentDate?: string;
  parentName?: string;
  parentContact?: string;
  medicalInfo?: string;
  notes?: Note[];
}) {
  const { t } = useTranslation();
  const pointlimit = 25;
  const bgColor = props.points < pointlimit ? "#fafdff" : "#fff5f5";
  const subjects = [
    { label: "Math", value: props.math },
    { label: "English", value: props.english },
    { label: "Science", value: props.science },
    { label: "History", value: props.history },
    { label: "Geography", value: props.geography },
    { label: "Art", value: props.art },
    { label: "Music", value: props.music },
    { label: "Technology", value: props.technology },
    { label: "Economics", value: props.economics },
    { label: "Physical Education", value: props.physicalEd },
  ];

  const navigate = useNavigate();
  const [showNotes, setShowNotes] = useState(false);

  const handleManage = () => {
    navigate(`/manage/${props.name}`);
  };

  return (
    <div
      style={{
        maxWidth: 380,
        minWidth: 220,
        margin: "1.2rem",
        padding: "1.3rem 1.2rem 1.1rem 1.2rem",
        border: "1px solid #e3e8f0",
        borderRadius: "16px",
        background: bgColor,
        boxShadow: "0 2px 12px rgba(80,131,175,0.08)",
        color: "#222",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        transition: "box-shadow 0.2s",
        position: "relative",
      }}
    >
      {/* Avatar and Name Row */}
      <Section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "#c7d2fe",
              color: "#23408e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              fontWeight: "bold",
              boxShadow: "0 1px 4px rgba(80,131,175,0.13)",
              flexShrink: 0,
            }}
          >
            {getInitials(props.name)}
          </div>
          <div>
            <div
              style={{ fontWeight: 700, fontSize: "1.15rem", color: "#23408e" }}
            >
              {props.name}
            </div>
            <div
              style={{ fontSize: "0.97rem", color: "#5083af", fontWeight: 500 }}
            >
              {t("class")} {props.studentClass} &nbsp;|&nbsp; {t("age")}{" "}
              {props.age}
            </div>
          </div>
        </div>
        {/* Demerit Points */}
        <div
          style={{
            background: props.points < pointlimit ? "#eaf6ff" : "#ffeaea",
            borderRadius: "7px",
            padding: "0.35rem 0.9rem",
            fontWeight: 600,
            color: props.points < pointlimit ? "#2a4d6c" : "#c0392b",
            fontSize: "1.02rem",
            boxShadow: "0 1px 2px rgba(80,131,175,0.07)",
            alignSelf: "flex-start",
            display: "inline-block",
            marginTop: 8,
          }}
        >
          {t("demerit_points")}: {props.points}
        </div>
      </Section>

      {/* Tags */}
      <Section>
        <h4
          style={{
            margin: "0 0 0.3rem 0",
            fontSize: "1rem",
            color: "#2a4d6c",
            fontWeight: 600,
            letterSpacing: 0.1,
          }}
        >
          {t("tags")}
        </h4>
        {props.tags && props.tags.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 2,
              marginTop: 2,
            }}
          >
            {props.tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  background: "#e0e7ff",
                  color: "#23408e",
                  borderRadius: "6px",
                  padding: "0.13rem 0.7rem",
                  fontSize: "0.91rem",
                  fontWeight: 500,
                  marginRight: 2,
                  marginBottom: 2,
                  letterSpacing: 0.2,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: "#b0b8c1", fontSize: "0.97rem" }}>
            {t("no_tags")}
          </span>
        )}
      </Section>

      {/* Extra Curricular Activities */}
      <Section>
        <h4
          style={{
            margin: "0 0 0.3rem 0",
            fontSize: "1rem",
            color: "#2a4d6c",
            fontWeight: 600,
            letterSpacing: 0.1,
          }}
        >
          {t("extracurricular_activities")}
        </h4>
        {props.activities && props.activities.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {props.activities.map((activity, idx) => (
              <li
                key={idx}
                style={{
                  background: "#e3f2fd",
                  color: "#1565c0",
                  borderRadius: "5px",
                  padding: "0.22rem 0.7rem",
                  fontSize: "0.97rem",
                  fontWeight: 500,
                  marginBottom: 2,
                  boxShadow: "0 1px 2px rgba(80,131,175,0.03)",
                  display: "inline-block",
                }}
              >
                {activity}
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ color: "#b0b8c1", fontSize: "0.97rem" }}>
            {t("none")}
          </span>
        )}
      </Section>

      {/* Subjects & Scores */}
      <Section>
        <h4
          style={{
            margin: "0 0 0.3rem 0",
            fontSize: "1rem",
            color: "#2a4d6c",
            fontWeight: 600,
            letterSpacing: 0.1,
          }}
        >
          {t("subjects")}
        </h4>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {subjects
            .filter((subject) => subject.value)
            .map((subject) => {
              const key = subjectKeyMap[subject.label];
              const subjectScores = props.scores && props.scores[key];
              return (
                <li
                  key={subject.label}
                  style={{
                    background: "#f5faff",
                    margin: 0,
                    padding: "0.22rem 0.7rem",
                    borderRadius: "5px",
                    fontSize: "0.97rem",
                    boxShadow: "0 1px 2px rgba(80,131,175,0.03)",
                    display: "inline-block",
                    color: "#2a4d6c",
                    fontWeight: 500,
                  }}
                >
                  {t(subject.label)}
                  {subjectScores ? (
                    <span style={{ color: "#5083af", fontWeight: 600 }}>
                      : {average(subjectScores)}%
                    </span>
                  ) : (
                    ""
                  )}
                </li>
              );
            })}
        </ul>
      </Section>

      {/* Notes Popup */}
      {showNotes && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.25)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowNotes(false)}
        >
          <div
            style={{
              background: "#fff",
              color: "#1a2636",
              borderRadius: 10,
              padding: "2rem 2.5rem",
              minWidth: 320,
              maxWidth: 400,
              boxShadow: "0 4px 24px rgba(80,131,175,0.18)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowNotes(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 14,
                background: "none",
                border: "none",
                fontSize: "1.3rem",
                color: "#5083af",
                cursor: "pointer",
              }}
              aria-label={t("close")}
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, marginBottom: 18 }}>
              {t("notes_for", { name: props.name })}
            </h3>
            {props.notes && props.notes.length > 0 ? (
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {props.notes.map((note, idx) => {
                  if (typeof note === "string") {
                    return (
                      <li
                        key={idx}
                        style={{
                          background: "#f5faff",
                          color: "#2a4d6c",
                          borderRadius: 6,
                          padding: "0.6rem 1rem",
                          marginBottom: 8,
                          fontSize: "1rem",
                          boxShadow: "0 1px 2px rgba(80,131,175,0.06)",
                        }}
                      >
                        {note}
                      </li>
                    );
                  }
                  if (
                    typeof note === "object" &&
                    note !== null &&
                    typeof note.text === "string"
                  ) {
                    return (
                      <li
                        key={idx}
                        title={note.date || undefined}
                        style={{
                          background: "#f5faff",
                          color: "#2a4d6c",
                          borderRadius: 6,
                          padding: "0.6rem 1rem",
                          marginBottom: 8,
                          fontSize: "1rem",
                          boxShadow: "0 1px 2px rgba(80,131,175,0.06)",
                        }}
                      >
                        {note.date && (
                          <span
                            style={{
                              color: "#5083af",
                              marginRight: 10,
                              fontSize: "0.93rem",
                            }}
                          >
                            {note.date}
                          </span>
                        )}
                        {note.text}
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
            ) : (
              <div style={{ color: "#b0b8c1" }}>
                {t("no_notes_for_student")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage & Notes Buttons */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <button
          style={{
            padding: "0.55rem 1.3rem",
            borderRadius: "7px",
            background: "#e6f0fa",
            color: "#23408e",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "1.04rem",
            boxShadow: "0 1px 4px rgba(80,131,175,0.10)",
            letterSpacing: 0.2,
          }}
          onClick={() => setShowNotes(true)}
        >
          {t("notes")}
        </button>
        <button
          style={{
            padding: "0.55rem 1.3rem",
            borderRadius: "7px",
            background: "#5083af",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "1.04rem",
            boxShadow: "0 1px 4px rgba(80,131,175,0.10)",
            letterSpacing: 0.2,
          }}
          onClick={handleManage}
        >
          {t("manage")}
        </button>
      </div>
    </div>
  );
}

export default StudentCard;
