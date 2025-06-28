import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import "./AuditLogs.css";

type UserEditLogDoc = {
  id: string;
  editorId?: string;
  userId?: string;
  changes?: Record<string, any>;
  timestamp?: { seconds: number; nanoseconds: number } | null;
};

type DeletionLogDoc = {
  id: string;
  deletedAt?: string | { seconds: number; nanoseconds: number };
  triggeredBy?: string;
  type?: string;
  userId?: string;
};

function formatDeletedAt(deletedAt: any): string {
  if (!deletedAt) return "";
  if (typeof deletedAt === "string") return deletedAt;
  if (deletedAt.seconds) {
    return new Date(deletedAt.seconds * 1000).toLocaleString();
  }
  return "";
}

function formatTimestamp(ts: any): string {
  if (!ts) return "";
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString();
  }
  return "";
}

// Mask user IDs for privacy (show first 2 and last 2 chars)
function maskId(id?: string) {
  if (!id || id.length < 5) return "***";
  return id.slice(0, 2) + "***" + id.slice(-2);
}

// Mask values that look like PI (email, phone)
function maskValue(key: string, value: any) {
  if (typeof value !== "string") return value;
  if (key.toLowerCase().includes("email")) {
    const [user, domain] = value.split("@");
    if (!domain) return "***";
    return user[0] + "***@" + domain;
  }
  if (key.toLowerCase().includes("phone")) {
    return value.slice(0, 2) + "***" + value.slice(-2);
  }
  if (key.toLowerCase().includes("address")) {
    return value.length > 6 ? value.slice(0, 3) + "***" : "***";
  }
  return value;
}

const AuditLogs: React.FC = () => {
  const [userEditLogs, setUserEditLogs] = useState<UserEditLogDoc[]>([]);
  const [deletionLogs, setDeletionLogs] = useState<DeletionLogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserEditLogs = async () => {
      const snap = await getDocs(
        query(
          collection(db, "userEditLogs"),
          orderBy("timestamp", "desc"),
          limit(10)
        )
      );
      setUserEditLogs(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    };

    const fetchDeletionLogs = async () => {
      const snap = await getDocs(collection(db, "deletionLogs"));
      const logs: DeletionLogDoc[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      function getDeletedAtMillis(log: DeletionLogDoc) {
        if (typeof log.deletedAt === "string") {
          const d = Date.parse(log.deletedAt);
          return isNaN(d) ? 0 : d;
        }
        if (
          log.deletedAt &&
          typeof log.deletedAt === "object" &&
          "seconds" in log.deletedAt
        ) {
          return (log.deletedAt as any).seconds * 1000;
        }
        return 0;
      }
      logs.sort((a, b) => getDeletedAtMillis(b) - getDeletedAtMillis(a));
      setDeletionLogs(logs.slice(0, 10));
    };

    setLoading(true);
    Promise.all([fetchUserEditLogs(), fetchDeletionLogs()])
      .catch((err) => {
        console.error("Error loading AuditLogs data:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="auditlogs-container">
      <button className="auditlogs-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h1>Audit Logs</h1>
      <div className="auditlogs-popianotice">
        <strong>POPIA Notice:</strong> Personal information is masked in these
        logs. Access is restricted and monitored for compliance purposes.
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : userEditLogs.length === 0 && deletionLogs.length === 0 ? (
        <div>No audit logs found.</div>
      ) : (
        <>
          <h3>User Edit Logs</h3>
          <div className="auditlogs-table-wrapper">
            <table className="auditlogs-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Editor</th>
                  <th>Edited User</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {userEditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatTimestamp(log.timestamp)}</td>
                    <td>
                      {maskId(log.editorId) || (
                        <span style={{ color: "#f87171" }}>No editor</span>
                      )}
                    </td>
                    <td>
                      {maskId(log.userId) || (
                        <span style={{ color: "#f87171" }}>No user</span>
                      )}
                    </td>
                    <td>
                      {log.changes
                        ? Object.entries(log.changes)
                            .map(
                              ([key, value]) =>
                                `${key}: ${maskValue(key, value)}`
                            )
                            .join(", ")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Deletion Logs</h3>
          <div className="auditlogs-table-wrapper">
            <table className="auditlogs-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Actor</th>
                  <th>Type</th>
                  <th>User ID</th>
                </tr>
              </thead>
              <tbody>
                {deletionLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDeletedAt(log.deletedAt)}</td>
                    <td>
                      {maskId(log.triggeredBy) || (
                        <span style={{ color: "#f87171" }}>No actor</span>
                      )}
                    </td>
                    <td>{log.type || "unknown type"}</td>
                    <td>
                      {maskId(log.userId) || (
                        <span style={{ color: "#888" }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogs;
