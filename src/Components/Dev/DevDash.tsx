import React, { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import "./DevDash.css";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth, signOut } from "firebase/auth";
import ErrorTestComponent from "./ErrorTestComponent";
import type { ErrorReport } from "../../types/errorReporting";

type UserDoc = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

type FeedbackDoc = {
  id: string;
  subject?: string;
  userEmail?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  message?: string;
};

const DevDash: React.FC = () => {
  const { profile } = useAuth();

  // Add schools to state
  const [userStats, setUserStats] = useState<{
    total: number;
    admin: number;
    principal: number;
    staff: number;
    teacher: number;
    guardian: number;
    student: number;
    developer: number;
    schools: number;
    recent: { name: string; email: string; role: string; createdAt: string }[];
  } | null>(null);

  const [signups, setSignups] = useState<{ date: string; count: number }[]>([]);
  const [feedback, setFeedback] = useState<FeedbackDoc[]>([]);
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== "developer") return;

    // Fetch user stats
    const fetchUserStats = async () => {
      const snap = await getDocs(collection(db, "users"));
      const users: UserDoc[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const roles = [
        "admin",
        "principal",
        "staff",
        "teacher",
        "guardian",
        "student",
        "developer",
      ];
      const stats: any = { total: users.length };
      roles.forEach((role) => {
        stats[role] = users.filter((u) => u.role === role).length;
      });

      // Fetch schools count
      const schoolsSnap = await getDocs(collection(db, "schools"));
      stats.schools = schoolsSnap.size;

      // Recent signups (last 5)
      const recent = users
        .filter((u) => u.createdAt && typeof u.createdAt.seconds === "number")
        .sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        )
        .slice(0, 5)
        .map((u) => ({
          name: u.name || "Unknown",
          email: u.email || "Unknown",
          role: u.role || "Unknown",
          createdAt:
            u.createdAt && typeof u.createdAt.seconds === "number"
              ? new Date(u.createdAt.seconds * 1000).toLocaleString()
              : "",
        }));
      stats.recent = recent;
      setUserStats(stats);
    };

    // Analytics: signups per day (last 7 days)
    const fetchSignups = async () => {
      const snap = await getDocs(collection(db, "users"));
      const users: UserDoc[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const days: { [date: string]: number } = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0");
        days[key] = 0;
      }
      users.forEach((u) => {
        if (u.createdAt && typeof u.createdAt.seconds === "number") {
          const d = new Date(u.createdAt.seconds * 1000);
          const key =
            d.getFullYear() +
            "-" +
            String(d.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(d.getDate()).padStart(2, "0");
          // Increment count if the signup date is in the last 7 days
          if (days.hasOwnProperty(key)) {
            days[key]++;
          }
        }
      });
      setSignups(
        Object.entries(days).map(([date, count]) => ({ date, count }))
      );
    };

    // Feedback (last 10)
    const fetchFeedback = async () => {
      const snap = await getDocs(
        query(
          collection(db, "feedback"),
          orderBy("createdAt", "desc"),
          limit(10)
        )
      );
      setFeedback(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    };

    // Error Reports (oldest first, last 20)
    const fetchErrorReports = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "errorReports"),
            orderBy("createdAt", "asc"),
            limit(20)
          )
        );
        const reports = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp:
              data.timestamp?.toDate() ||
              data.createdAt?.toDate() ||
              new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            resolvedAt: data.resolvedAt?.toDate() || undefined,
          } as ErrorReport;
        });
        setErrorReports(reports);
      } catch (error) {
        // If errorReports collection doesn't exist yet, just set empty array
        setErrorReports([]);
      }
    };

    setLoading(true);
    Promise.all([
      fetchUserStats(),
      fetchSignups(),
      fetchFeedback(),
      fetchErrorReports(),
    ]).finally(() => setLoading(false));
  }, [profile]);

  const handleArmageddon = async () => {
    if (
      !window.confirm(
        "Are you sure? This will delete ALL users except developers from Firestore and Auth!"
      )
    )
      return;

    try {
      const functions = getFunctions();
      const armageddon = httpsCallable(
        functions,
        "armageddonDeleteNonDevelopers"
      );
      const result = await armageddon();
      const data = result.data as { deletedCount: number };
      alert(
        `Armageddon complete! Deleted ${data.deletedCount} non-developer users from Firestore and Auth.`
      );
    } catch (err: any) {
      alert(
        "Armageddon failed: " +
          (err?.message || err?.toString() || "Unknown error")
      );
    }
  };

  const handleLogout = async () => {
    await signOut(getAuth());
    window.location.reload(); // Or navigate to login page if you have routing
  };

  const handleResolveError = async (errorId: string) => {
    try {
      const errorRef = doc(db, "errorReports", errorId);
      await updateDoc(errorRef, {
        status: "resolved",
        resolvedAt: serverTimestamp(),
        resolvedBy: profile?.email || "Developer",
        updatedAt: serverTimestamp(),
      });

      // Update the local state to reflect the change immediately
      setErrorReports((prevReports) =>
        prevReports.map((report) =>
          report.id === errorId
            ? {
                ...report,
                status: "resolved" as const,
                resolvedAt: new Date(),
                resolvedBy: profile?.email || "Developer",
                updatedAt: new Date(),
              }
            : report
        )
      );

      alert("Error report marked as resolved!");
    } catch (error) {
      alert("Failed to resolve error report. Please try again.");
    }
  };

  if (profile?.role !== "developer") {
    return (
      <div className="devdash-unauthorized">
        <h2>Access Denied</h2>
        <p>You do not have permission to view the Developer Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="devdash-container">
      {/* Add a dashboard header with logout button */}
      <header
        className="devdash-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "var(--color-primary)",
          }}
        >
          Developer Dashboard
        </h1>
        <button
          className="devdash-logout-btn"
          style={{
            background: "#222",
            color: "#fff",
            borderRadius: "6px",
            padding: "0.5rem 1.2rem",
            fontWeight: 600,
            fontSize: "1rem",
            border: "none",
            cursor: "pointer",
          }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      {/* Error Testing Component */}
      <ErrorTestComponent />

      <section className="devdash-section">
        <h2>User Stats</h2>
        {loading ? (
          <div>Loading...</div>
        ) : userStats ? (
          <>
            <div className="devdash-stats-cards-row">
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.total}</div>
                <div className="devdash-stats-label">Total Users</div>
              </div>
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.admin}</div>
                <div className="devdash-stats-label">Admins</div>
              </div>
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.principal}</div>
                <div className="devdash-stats-label">Principals</div>
              </div>
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.staff}</div>
                <div className="devdash-stats-label">Staff</div>
              </div>
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.teacher}</div>
                <div className="devdash-stats-label">Teachers</div>
              </div>
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.guardian}</div>
                <div className="devdash-stats-label">Guardians</div>
              </div>
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.student}</div>
                <div className="devdash-stats-label">Students</div>
              </div>
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.developer}</div>
                <div className="devdash-stats-label">Developers</div>
              </div>
              <div className="devdash-stats-card">
                <div className="devdash-stats-value">{userStats.schools}</div>
                <div className="devdash-stats-label">Schools</div>
              </div>
            </div>
            <div className="devdash-signups-section">
              <h3>Recent Signups</h3>
              <ul className="devdash-signups-list">
                {(userStats.recent || []).map((u, i) => (
                  <li key={i}>
                    <span className="devdash-signup-name">{u.name}</span>
                    <span className={`role-badge role-${u.role}`}>
                      {u.role}
                    </span>
                    <span className="devdash-signup-date">{u.createdAt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </section>

      <section className="devdash-section">
        <h2>Analytics (Signups Last 7 Days)</h2>
        {loading ? (
          <div>Loading...</div>
        ) : signups.length > 0 ? (
          <>
            <div className="devdash-signups-row">
              {/* Reverse the signups array so the latest date is on the left */}
              {[...signups].reverse().map((s) => (
                <div className="devdash-signups-analytics-card" key={s.date}>
                  <div className="devdash-signups-analytics-date">{s.date}</div>
                  <div className="devdash-signups-analytics-value">
                    {s.count}
                  </div>
                  <div className="devdash-stats-label">Signups</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem" }}>
              <Link
                to="/user-signups-analytics"
                className="devdash-viewmore-btn"
              >
                View more analytics &rarr;
              </Link>
            </div>
          </>
        ) : (
          <div>No analytics found.</div>
        )}
      </section>

      <section className="devdash-section">
        <h2>Feedback Review</h2>
        {loading ? (
          <div>Loading...</div>
        ) : feedback.length > 0 ? (
          <ul>
            {feedback.map((f) => (
              <li key={f.id}>
                <strong>{f.subject || "No subject"}</strong> from{" "}
                {f.userEmail || "Unknown"} <br />
                <span className="devdash-feedback-date">
                  {f.createdAt && typeof f.createdAt.seconds === "number"
                    ? new Date(f.createdAt.seconds * 1000).toLocaleString()
                    : ""}
                </span>
                <div>{f.message || ""}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div>No feedback found.</div>
        )}
      </section>

      <section className="devdash-section">
        <h2>Error Reports Dashboard</h2>
        {loading ? (
          <div>Loading...</div>
        ) : errorReports.length > 0 ? (
          <div className="devdash-error-table-container">
            <div className="devdash-error-stats">
              <div className="devdash-error-stat">
                <span className="devdash-error-stat-value">
                  {errorReports.length}
                </span>
                <span className="devdash-error-stat-label">Total Reports</span>
              </div>
              <div className="devdash-error-stat">
                <span className="devdash-error-stat-value">
                  {errorReports.filter((r) => r.status === "open").length}
                </span>
                <span className="devdash-error-stat-label">Open</span>
              </div>
              <div className="devdash-error-stat">
                <span className="devdash-error-stat-value">
                  {
                    errorReports.filter((r) => r.status === "in-progress")
                      .length
                  }
                </span>
                <span className="devdash-error-stat-label">In Progress</span>
              </div>
              <div className="devdash-error-stat">
                <span className="devdash-error-stat-value">
                  {errorReports.filter((r) => r.status === "resolved").length}
                </span>
                <span className="devdash-error-stat-label">Resolved</span>
              </div>
              <div className="devdash-error-stat">
                <span className="devdash-error-stat-value">
                  {errorReports.filter((r) => r.severity === "critical").length}
                </span>
                <span className="devdash-error-stat-label">Critical</span>
              </div>
            </div>

            <table className="devdash-error-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>User Role</th>
                  <th>URL</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {errorReports.map((error) => (
                  <tr
                    key={error.id}
                    className={`devdash-error-row severity-${error.severity} status-${error.status}`}
                  >
                    <td className="devdash-error-time">
                      {error.createdAt.toLocaleString()}
                    </td>
                    <td className="devdash-error-title">
                      <div title={error.description}>
                        {error.title || "Untitled"}
                      </div>
                      {error.errorMessage && (
                        <div className="devdash-error-message">
                          {error.errorMessage.length > 50
                            ? error.errorMessage.substring(0, 50) + "..."
                            : error.errorMessage}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`devdash-error-type type-${error.type}`}>
                        {error.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`devdash-error-severity severity-${error.severity}`}
                      >
                        {error.severity}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`devdash-error-status status-${error.status}`}
                      >
                        {error.status}
                      </span>
                    </td>
                    <td className="devdash-error-role">
                      {error.userRole || "unknown"}
                    </td>
                    <td className="devdash-error-url">
                      <div title={error.url}>
                        {error.url
                          ? error.url.split("/").pop() || error.url
                          : "N/A"}
                      </div>
                    </td>
                    <td className="devdash-error-actions">
                      <button
                        className="devdash-error-action-btn"
                        onClick={() => {
                          const details = {
                            ID: error.id,
                            Title: error.title,
                            Description: error.description,
                            "Error Message": error.errorMessage,
                            "Stack Trace": error.stackTrace,
                            "Console Errors": error.consoleErrors,
                            "User Role": error.userRole,
                            "User Agent": error.userAgent,
                            URL: error.url,
                            Viewport: `${error.viewport.width}x${error.viewport.height}`,
                            "Session ID": error.sessionId,
                            "School ID": error.schoolId,
                            "Build Version": error.buildVersion,
                            "Contact Email": error.contactEmail,
                            "Admin Notes": error.adminNotes,
                            "Created At": error.createdAt.toLocaleString(),
                            "Updated At": error.updatedAt.toLocaleString(),
                            "Resolved At":
                              error.resolvedAt?.toLocaleString() ||
                              "Not resolved",
                            "Resolved By": error.resolvedBy || "N/A",
                          };
                          alert(JSON.stringify(details, null, 2));
                        }}
                        title="View full details"
                      >
                        👁️
                      </button>
                      {error.status !== "resolved" && (
                        <button
                          className="devdash-error-resolve-btn"
                          onClick={() => {
                            if (
                              window.confirm("Mark this error as resolved?")
                            ) {
                              handleResolveError(error.id);
                            }
                          }}
                          title="Mark as resolved"
                        >
                          ✓
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>No error reports found.</div>
        )}
      </section>

      <section className="devdash-section">
        <h2>Deletion Requests</h2>
        {/* TODO: Add deletion requests management here */}
      </section>

      <section className="devdash-section">
        <h2>
          <Link to="/school-registration-review">
            School Registration Review
          </Link>
        </h2>
        <div>
          Review and approve/reject pending school registration requests on the{" "}
          <Link to="/school-registration-review">
            School Registration Review
          </Link>{" "}
          page.
        </div>
      </section>

      <section className="devdash-section">
        <h2>
          <Link to="/audit-logs">Audit Logs</Link>
        </h2>
        <div>
          View all user edit and deletion logs on the{" "}
          <Link to="/audit-logs">Audit Logs</Link> page.
        </div>
      </section>

      <section className="devdash-section">
        <h2>Developer Management</h2>
        {/* TODO: Add developer management tools (add/remove devs) here */}
      </section>

      {/* Armageddon button: Deletes all users except developers (Firestore only) */}
      {profile?.role === "developer" && (
        <button
          className="devdash-armageddon-btn"
          style={{ background: "red", color: "#fff", margin: "2rem 0" }}
          onClick={handleArmageddon}
        >
          Armageddon: Delete All Non-Developer Users
        </button>
      )}
    </div>
  );
};

export default DevDash;
