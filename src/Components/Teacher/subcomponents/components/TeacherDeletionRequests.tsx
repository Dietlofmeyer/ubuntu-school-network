import { useEffect, useState } from "react";
import { db } from "../../../../firebase";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";

type DeletionRequest = {
  id: string;
  childName?: string;
  parentName?: string;
  requestedBy?: string;
  status: string;
  timestamp: any;
  requestType?: string;
};

const TeacherDeletionRequests = ({
  t,
}: {
  t: (key: string, opts?: any) => string;
}) => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const q = query(collection(db, "deletionRequests"));
    const snap = await getDocs(q);
    setRequests(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DeletionRequest[]
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: "approved" | "denied") => {
    await updateDoc(doc(db, "deletionRequests", id), { status: action });
    fetchRequests();
  };

  // Sort requests by timestamp (latest first)
  const sortedRequests = [...requests].sort((a, b) => {
    const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
    const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
    return bTime - aTime;
  });

  const parentRequests = sortedRequests.filter(
    (r) => r.requestType === "parent"
  );
  const childRequests = sortedRequests.filter(
    (r) => r.requestType !== "parent"
  );

  return (
    <section style={{ margin: "2rem 0" }}>
      <h3>{t("parent_deletion_requests")}</h3>
      {loading ? (
        <div>{t("loading")}</div>
      ) : parentRequests.length === 0 ? (
        <div>{t("no_parent_deletion_requests")}</div>
      ) : (
        <ul>
          {parentRequests.map((req) => (
            <li key={req.id} style={{ marginBottom: 12 }}>
              {t("parent_name")}:{" "}
              {(req.parentName || req.requestedBy) && (
                <strong>{req.parentName || req.requestedBy}</strong>
              )}
              {" — "}
              {t("status")}: {req.status}
              {req.timestamp?.toDate
                ? " (" + req.timestamp.toDate().toLocaleString() + ")"
                : ""}
              {req.status === "pending" && (
                <>
                  {" "}
                  <button
                    onClick={() => handleAction(req.id, "approved")}
                    style={{
                      background: "var(--color-success)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 12px",
                      marginRight: 8,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    {t("approve")}
                  </button>
                  <button
                    onClick={() => handleAction(req.id, "denied")}
                    style={{
                      background: "var(--color-danger)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 12px",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    {t("deny")}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ marginTop: "2rem" }}>{t("child_deletion_requests")}</h3>
      {loading ? (
        <div>{t("loading")}</div>
      ) : childRequests.length === 0 ? (
        <div>{t("no_child_deletion_requests")}</div>
      ) : (
        <ul>
          {childRequests.map((req) => (
            <li key={req.id} style={{ marginBottom: 12 }}>
              {t("child_name")}: <strong>{req.childName}</strong>
              {" — "}
              {t("status")}: {req.status}
              {req.timestamp?.toDate
                ? " (" + req.timestamp.toDate().toLocaleString() + ")"
                : ""}
              {req.status === "pending" && (
                <>
                  {" "}
                  <button
                    onClick={() => handleAction(req.id, "approved")}
                    style={{
                      background: "var(--color-success)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 12px",
                      marginRight: 8,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    {t("approve")}
                  </button>
                  <button
                    onClick={() => handleAction(req.id, "denied")}
                    style={{
                      background: "var(--color-danger)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 12px",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    {t("deny")}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default TeacherDeletionRequests;
