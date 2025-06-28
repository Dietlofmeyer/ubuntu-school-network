import { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";

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

type Props = {
  childId: string;
  name: string;
  grade?: string;
  homeroomClass?: string;
};

function ParentChildCard({ childId, name, grade, homeroomClass }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkStatus, setUnlinkStatus] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const userRef = doc(db, "users", childId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setReports(userSnap.data().reports || []);
        setMarks(userSnap.data().marks || []);
      } else {
        setReports([]);
        setMarks([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [childId]);

  // Show the latest report card if available
  const latestReport = reports.length
    ? reports.reduce((a, b) =>
        new Date(a.issuedAt) > new Date(b.issuedAt) ? a : b
      )
    : null;

  // Show the latest 3 marks
  const latestMarks = [...marks]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Unlink child function
  const handleUnlink = async () => {
    if (!user) return;
    setUnlinking(true);
    setUnlinkStatus(null);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        children: arrayRemove(childId),
      });
      setUnlinkStatus(
        t("child_unlinked_successfully") || "Child unlinked successfully."
      );
      // Optionally, you can trigger a refresh in the parent component via props/callback
    } catch {
      setUnlinkStatus(t("unlink_failed") || "Failed to unlink child.");
    }
    setUnlinking(false);
  };

  // Simulate deletion request (replace with backend call on Day 15)
  const handleRequestDelete = async () => {
    if (!user) return;
    setDeleting(true);
    setDeleteStatus(null);
    try {
      await addDoc(collection(db, "deletionRequests"), {
        requestType: "child",
        targetId: childId,
        requestedBy: user.uid,
        childName: name,
        timestamp: serverTimestamp(),
        status: "pending",
      });
      setDeleteStatus(
        t("deletion_request_sent") || "Deletion request sent to school."
      );
    } catch (err) {
      setDeleteStatus(
        t("deletion_request_failed") || "Failed to send deletion request."
      );
    }
    setDeleting(false);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="modal-content"
            style={{
              background: "var(--color-bg-card, #232946)",
              color: "var(--color-text, #eaf1fb)",
              borderRadius: 12,
              padding: "2rem 1.5rem",
              minWidth: 320,
              boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ fontWeight: 700, fontSize: "1.15rem", marginBottom: 18 }}
            >
              {t("child_settings")}
            </div>
            {/* Unlink Child */}
            <button
              style={{
                width: "100%",
                background: "var(--color-warning, #f39c12)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0.5rem 0",
                fontWeight: 600,
                fontSize: "1rem",
                marginBottom: 12,
                cursor: "pointer",
              }}
              onClick={handleUnlink}
              disabled={unlinking}
            >
              {unlinking ? t("unlinking") : t("unlink_child")}
            </button>
            {/* Request Data Deletion */}
            <button
              style={{
                width: "100%",
                background: "var(--color-danger, #e74c3c)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0.5rem 0",
                fontWeight: 600,
                fontSize: "1rem",
                marginBottom: 12,
                cursor: "pointer",
              }}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
            >
              {deleting ? t("requesting") : t("request_child_deletion")}
            </button>
            {/* Status/Feedback */}
            {deleteStatus && (
              <div
                style={{
                  color: "var(--color-success, #27ae60)",
                  marginTop: 8,
                  fontSize: "0.97rem",
                  textAlign: "center",
                }}
              >
                {deleteStatus}
              </div>
            )}
            <button
              style={{
                marginTop: 10,
                background: "none",
                color: "var(--color-muted, #b0b8c1)",
                border: "none",
                fontSize: "1rem",
                cursor: "pointer",
                width: "100%",
              }}
              onClick={() => setSettingsOpen(false)}
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.45)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="modal-content"
            style={{
              background: "var(--color-bg-card, #232946)",
              color: "var(--color-text, #eaf1fb)",
              borderRadius: 12,
              padding: "2rem 1.5rem",
              minWidth: 320,
              boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 16 }}
            >
              {t("confirm_child_deletion")}
            </div>
            <div style={{ marginBottom: 18 }}>
              {t("confirm_child_deletion_text", { name })}
            </div>
            <button
              style={{
                width: "100%",
                background: "var(--color-danger, #e74c3c)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0.5rem 0",
                fontWeight: 600,
                fontSize: "1rem",
                marginBottom: 10,
                cursor: "pointer",
              }}
              onClick={handleRequestDelete}
              disabled={deleting}
            >
              {deleting ? t("requesting") : t("confirm")}
            </button>
            <button
              style={{
                width: "100%",
                background: "none",
                color: "var(--color-muted, #b0b8c1)",
                border: "none",
                fontSize: "1rem",
                cursor: "pointer",
              }}
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div
        className="parentdash-child-card"
        style={{
          position: "relative",
          color: "var(--color-text, #eaf1fb)",
          background: "var(--color-bg-card, #232946)",
        }}
      >
        {/* Settings Cog */}
        <button
          aria-label={t("open_settings")}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 3,
            fontSize: 22,
            color: "var(--color-muted, #b0b8c1)",
          }}
          onClick={() => setSettingsOpen(true)}
        >
          <span role="img" aria-label="settings">
            ⚙️
          </span>
        </button>

        {/* Child Card Content */}
        <div className="parentdash-child-header">
          <div>
            <div className="parentdash-child-name">{name}</div>
            <div className="parentdash-child-info">
              <span>
                {t("grade")}: {grade || t("not_set")}
              </span>
              <span>
                {t("homeroom")}: {homeroomClass || t("not_set")}
              </span>
            </div>
          </div>
        </div>
        {unlinkStatus && (
          <div
            style={{
              color: "var(--color-danger, #e74c3c)",
              marginTop: 4,
              fontSize: "0.97rem",
            }}
          >
            {unlinkStatus}
          </div>
        )}
        {loading ? (
          <div
            style={{
              color: "var(--color-muted, #b0b8c1)",
              fontSize: "0.98rem",
            }}
          >
            {t("loading")}
          </div>
        ) : (
          <>
            {/* Latest Report Card */}
            {latestReport ? (
              <div className="parentdash-child-report">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {t("latest_report_card")} ({t("term")} {latestReport.term},{" "}
                  {latestReport.year})
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {latestReport.subjects.map((subj, idx) => (
                    <li key={idx}>
                      {t(subj.subject)}:{" "}
                      {subj.average !== null
                        ? `${subj.average.toFixed(1)}% (${t(subj.comment)})`
                        : t("no_marks")}
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    marginTop: 4,
                    color: "var(--color-muted, #b0b8c1)",
                    fontSize: "0.97rem",
                  }}
                >
                  {t("demerits")}: {latestReport.demerits}
                </div>
              </div>
            ) : (
              <div
                style={{
                  color: "var(--color-muted, #b0b8c1)",
                  fontSize: "0.98rem",
                }}
              >
                {t("no_report_cards")}
              </div>
            )}

            {/* Latest Marks */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {t("recent_marks")}
              </div>
              {latestMarks.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {latestMarks.map((mark, idx) => (
                    <li key={idx}>
                      {t(mark.subject)}: {mark.score}/{mark.total} (
                      {t(mark.description)})
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  style={{
                    color: "var(--color-muted, #b0b8c1)",
                    fontSize: "0.97rem",
                  }}
                >
                  {t("no_marks")}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default ParentChildCard;
